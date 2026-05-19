import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Tool } from '@google/generative-ai';
import clientPromise from '@/lib/mongodb';
import { getMcpClient } from '@/lib/agent/mcpClient';

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

export async function POST(req: Request) {
  try {
    const { goal } = await req.json();

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY provided. Using mock data.");
      return getFallbackData(goal);
    }

    let mcpClient;
    let mcpTools: any[] = [];
    let geminiTools: Tool[] = [];
    
    // Attempt to connect to MCP and fetch tools
    try {
      mcpClient = await getMcpClient();
      const toolsResponse = await mcpClient.listTools();
      mcpTools = toolsResponse.tools;
      
      const functionDeclarations = mcpTools.map(mcpToolToGeminiTool);
      if (functionDeclarations.length > 0) {
        geminiTools = [{ functionDeclarations }];
      }
    } catch (mcpErr) {
      console.error("MCP Server connection failed. Continuing without tools.", mcpErr);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      tools: geminiTools.length > 0 ? geminiTools : undefined
    });

    const systemInstruction = `You are MotivateAI, an autonomous agent helping someone build consistency.
The user wants to achieve this goal: "${goal}".
You have access to GitHub via MCP. If the goal is coding-related, USE YOUR TOOLS to search GitHub repositories or read files to find REAL project ideas, tutorials, or code to base your plan on!

Break the goal down into an immediate, actionable, step-by-step 1-hour session based on real data if possible.
Provide realistic time estimates (in minutes) for each micro-task. Keep tasks short (10-30 mins max) to prevent burnout.

Final output MUST strictly be in this JSON format without markdown blocks:
{
  "tasks": [
    {
      "title": "Short Task Name",
      "duration": 15,
      "details": "One sentence describing exactly what to do."
    }
  ]
}`;

    // Agent Loop
    const chat = model.startChat();
    let response = await chat.sendMessage(systemInstruction);
    let responseText = response.response.text();
    let functionCalls = response.response.functionCalls();

    // Multi-turn loop to handle tool calls
    let loopCount = 0;
    while (functionCalls && functionCalls.length > 0 && loopCount < 3) {
      loopCount++;
      const call = functionCalls[0];
      console.log(`Agent executing MCP Tool: ${call.name}`);
      
      // Map back from Gemini name (underscores) to MCP name (might have dashes)
      const mcpTool = mcpTools.find(t => t.name.replace(/-/g, '_') === call.name);
      
      let toolResultText = "";
      if (mcpTool && mcpClient) {
        try {
          const result = await mcpClient.callTool({
            name: mcpTool.name,
            arguments: call.args as Record<string, unknown>,
          });
          toolResultText = JSON.stringify(result);
        } catch (e: any) {
          toolResultText = `Error calling tool: ${e.message}`;
        }
      } else {
        toolResultText = "Tool not found or MCP client not connected.";
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
