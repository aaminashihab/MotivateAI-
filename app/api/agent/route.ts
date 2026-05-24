import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Tool } from '@google/generative-ai';
import clientPromise from '@/lib/mongodb';
import { getMcpClients } from '@/lib/agent/mcpClient';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

// Helper to convert MCP JSON Schema to Gemini Schema Type
function mcpTypeToGeminiType(type: string): SchemaType {
  switch (type) {
    case 'string': return SchemaType.STRING;
    case 'number': return SchemaType.NUMBER;
    case 'integer': return SchemaType.INTEGER;
    case 'boolean': return SchemaType.BOOLEAN;
    case 'array': return SchemaType.ARRAY;
    case 'object': return SchemaType.OBJECT;
    default: return SchemaType.STRING;
  }
}

// Convert MCP tool to Gemini Function Declaration
function mcpToolToGeminiTool(mcpTool: any): FunctionDeclaration {
  const properties: any = {};
  if (mcpTool.inputSchema?.properties) {
    for (const [key, prop] of Object.entries<any>(mcpTool.inputSchema.properties)) {
      properties[key] = {
        type: mcpTypeToGeminiType(prop.type),
        description: prop.description || '',
      };
    }
  }

  return {
    name: mcpTool.name.replace(/-/g, '_'), // Gemini names must match ^[a-zA-Z0-9_]+$
    description: mcpTool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties,
      required: mcpTool.inputSchema?.required || [],
    },
  };
}

function sanitizeGoalInput(input: string): string {
  if (typeof input !== 'string') return '';
  let sanitized = input.slice(0, 100);

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?instructions/gi,
    /system\s+prompt/gi,
    /forget\s+(everything|all)/gi,
    /you\s+must\s+now/gi,
    /developer\s+mode/gi,
    /act\s+as\s+a/gi,
    /jailbreak/gi,
    /bypass\s+rules/gi
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

export async function POST(req: Request) {
  try {
    const { goal } = await req.json();

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    if (typeof goal !== 'string') {
      return NextResponse.json({ error: 'Goal must be a string' }, { status: 400 });
    }

    const sanitizedGoal = sanitizeGoalInput(goal);

    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY provided. Using mock data.");
      return getFallbackData(sanitizedGoal);
    }

    let mcpClients: Record<string, any> = {};
    let allMcpTools: any[] = [];
    let toolRegistry: Record<string, string> = {}; // tool_name -> client_id
    let geminiTools: Tool[] = [];
    
    // Attempt to connect to MCP and fetch tools
    try {
      mcpClients = await getMcpClients();
      
      for (const [clientId, client] of Object.entries(mcpClients)) {
        try {
          const toolsResponse = await client.listTools();
          const tools = toolsResponse.tools;
          allMcpTools = [...allMcpTools, ...tools];
          
          tools.forEach((t: any) => {
             toolRegistry[t.name.replace(/-/g, '_')] = clientId;
          });
        } catch (e) {
          console.error(`Failed to list tools for ${clientId}:`, e);
        }
      }
      
      const functionDeclarations = allMcpTools.map(mcpToolToGeminiTool);
      if (functionDeclarations.length > 0) {
        geminiTools = [{ functionDeclarations }];
      }
    } catch (mcpErr) {
      console.error("MCP Server connection failed. Continuing without tools.", mcpErr);
    }

    const systemInstruction = `You are MotivateAI, an autonomous agent helping someone build consistency.
You have access to GitHub via MCP. If the goal is coding-related, USE YOUR TOOLS to search GitHub repositories or read files to find REAL project ideas, tutorials, or code to base your plan on!

You ALSO have access to MongoDB via MCP. You can query the 'motivateai' database to fetch user session histories, past goals, or performance data to deeply personalize the session plan based on their past behavior.

Break the goal down into an immediate, actionable, step-by-step 1-hour session based on real data if possible.
Provide realistic time estimates (in minutes) for each micro-task. Keep tasks short (10-30 mins max) to prevent burnout.

You MUST return a JSON structure adhering to this schema:
{
  "tasks": [
    {
      "title": "Short Task Name",
      "duration": number,
      "details": "One sentence describing exactly what to do."
    }
  ]
}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      tools: geminiTools.length > 0 ? geminiTools : undefined,
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  duration: { type: SchemaType.NUMBER },
                  details: { type: SchemaType.STRING }
                },
                required: ['title', 'duration', 'details']
              }
            }
          },
          required: ['tasks']
        }
      }
    });

    const userPrompt = `The user wants to achieve this goal: "${sanitizedGoal}". Please break this goal down into a step-by-step 1-hour session.`;

    // Agent Loop
    const chat = model.startChat();
    let response = await chat.sendMessage(userPrompt);
    let responseText = response.response.text();
    let functionCalls = response.response.functionCalls();

    // Multi-turn loop to handle tool calls
    let loopCount = 0;
    while (functionCalls && functionCalls.length > 0 && loopCount < 3) {
      loopCount++;
      const call = functionCalls[0];
      console.log(`Agent executing MCP Tool: ${call.name}`);
      
      // Map back from Gemini name (underscores) to MCP name (might have dashes)
      const mcpTool = allMcpTools.find(t => t.name.replace(/-/g, '_') === call.name);
      const targetClientId = toolRegistry[call.name];
      const targetClient = mcpClients[targetClientId];
      
      let toolResultText = "";
      if (mcpTool && targetClient) {
        try {
          const result = await targetClient.callTool({
            name: mcpTool.name,
            arguments: call.args as Record<string, unknown>,
          });
          toolResultText = JSON.stringify(result);
        } catch (e: any) {
          toolResultText = `Error calling tool: ${e.message}`;
        }
      } else {
        toolResultText = "Tool not found or target MCP client not connected.";
      }

      // Send the result back to Gemini
      response = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: { result: toolResultText }
        }
      }]);
      
      responseText = response.response.text();
      functionCalls = response.response.functionCalls();
    }
    
    // Extract JSON block
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let finalJsonText = responseText;
    if (jsonMatch) {
      finalJsonText = jsonMatch[0];
    } else {
      finalJsonText = finalJsonText.replace(/```json/g, '').replace(/```/g, ''); // Fallback cleanup
    }
    
    const parsedData = JSON.parse(finalJsonText);

    // Log to DB
    try {
        const client = await clientPromise;
        const db = client.db('motivateai');
        await db.collection('history').insertOne({
            goal,
            tasks: parsedData.tasks,
            timestamp: new Date()
        });
    } catch (dbError) {
        console.error("MongoDB error (history log):", dbError);
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Agent API Error:', error);
    return getFallbackData('API Error');
  }
}

function getFallbackData(goal: string) {
  return NextResponse.json({
    tasks: [
      { title: "Introduction & Setup", duration: 15, details: "Basic setup and overview of your goal." },
      { title: "Core Concepts", duration: 30, details: "Deep dive into the main concepts." },
      { title: "Practice Activity", duration: 25, details: "Hands-on practice." },
      { title: "Review", duration: 10, details: "Review what was learned." }
    ]
  });
}
