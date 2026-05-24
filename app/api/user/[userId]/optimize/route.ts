import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SessionLog } from '@/lib/types/sessionLog';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID must be a string' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('motivateai');
    
    const userDoc = await db.collection('users').findOne({ _id: userId as any });
    const preferences = userDoc?.preferences || {
      breakLength: 5,
      preferredSessionTime: 'morning',
      maxSession: 60,
      difficultyLevel: 'intermediate'
    };

    const sessions = await db.collection<SessionLog>('sessions')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    // Prepare analytics summary for Gemini (fallback to mock data for demo if no sessions)
    const analytics = sessions.length > 0 ? {
      totalSessionsAnalyzed: sessions.length,
      averageCompletionRate: Math.round(sessions.reduce((sum, s) => sum + (s.completionRatio || 0), 0) / sessions.length),
      averageSessionDuration: Math.round(sessions.reduce((sum, s) => sum + (s.totalSessionTime || 0), 0) / sessions.length),
    } : {
      totalSessionsAnalyzed: 7,
      averageCompletionRate: 65,
      averageSessionDuration: 45,
    };

    const prompt = `
      You are an AI learning coach analyzing a user's learning patterns.
      
      Current user preferences:
      - Break length: ${preferences.minBreakDuration || 5} minutes
      - Preferred Time: ${preferences.preferredSessionTime || 'morning'}
      - Max session: ${preferences.maxSessionDuration || 60} minutes
      - Difficulty: ${preferences.difficultyLevel || 'intermediate'}
      
      Analytics from last ${analytics.totalSessionsAnalyzed} sessions:
      Average Completion Rate: ${analytics.averageCompletionRate}%
      Average Session Duration: ${analytics.averageSessionDuration} min
      
      Identify 1-2 specific optimizations that would improve performance.
      For each, provide a BEFORE/AFTER comparison with a percentage improvement estimate.
      
      Return ONLY a valid JSON array of objects.
      Each object must match this schema exactly:
      {
        "type": "break_length" | "session_time" | "task_duration" | "difficulty",
        "before": "string describing what it was before",
        "after": "string describing what it is now",
        "improvementPercent": number (estimated impact e.g., 23),
        "reasoning": "Simple 1 sentence user-friendly explanation",
        "aiReasoning": "Detailed technical explanation of why this was changed",
        "newPreferences": {
          "minBreakDuration"?: number,
          "preferredSessionTime"?: "morning" | "afternoon" | "evening",
          "maxSessionDuration"?: number,
          "difficultyLevel"?: "beginner" | "intermediate" | "expert"
        }
      }
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    
    // Parse the JSON response robustly
    let jsonText = result.response.text().trim();
    
    // Extract everything between the first [ and the last ]
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }

    let generatedOptimizations: any[] = [];
    try {
      generatedOptimizations = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse Gemini output:', jsonText);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Format the optimizations and apply preferences
    const optimizationsToSave = [];
    let updatedPreferences = { ...preferences };

    for (const opt of generatedOptimizations) {
      const optimizationEntry = {
        id: crypto.randomUUID(),
        type: opt.type,
        before: opt.before,
        after: opt.after,
        reason: opt.reasoning,
        impact: opt.improvementPercent,
        timestamp: new Date(),
        aiReasoning: opt.aiReasoning
      };
      optimizationsToSave.push(optimizationEntry);

      if (opt.newPreferences) {
        updatedPreferences = { ...updatedPreferences, ...opt.newPreferences };
      }
    }

    // Save to DB
    await db.collection('users').updateOne(
      { _id: userId as any },
      { 
        $set: { 
          preferences: updatedPreferences,
          updatedAt: new Date()
        },
        $push: {
          optimizations: { $each: optimizationsToSave, $position: 0 } as any
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      optimizations: optimizationsToSave,
      newPreferences: updatedPreferences
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Failed to generate optimizations:', error);
    return NextResponse.json({ error: 'Failed to generate optimizations' }, { status: 500 });
  }
}
