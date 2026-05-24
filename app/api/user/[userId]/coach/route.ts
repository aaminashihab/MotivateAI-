import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { analyzeUserBehavior } from '@/lib/services/behaviorAnalyzer';
import { SessionLog } from '@/lib/types/sessionLog';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID must be a string' }, { status: 400 });
    }

    let sessions: SessionLog[] = [];
    let streak = 0;

    try {
      const client = await clientPromise;
      const db = client.db('motivateai');
      
      sessions = await db.collection<SessionLog>('sessions')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray() as any;

      // Calculate streak from users collection if available (fallback logic)
      const userDoc = await db.collection('users').findOne({ _id: userId as any });
      if (userDoc && userDoc.streak) {
        streak = userDoc.streak;
      }
    } catch (dbError) {
      console.warn('MongoDB connection failed for coach route. Using mock data.');
      sessions = [];
    }

    // Default basic message if Gemini API is missing or fails
    let coachMessage = "Keep up the great work! Ready for another session today?";

    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        const profile = analyzeUserBehavior(sessions);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        let prompt = `You are an empathetic, motivating AI learning coach. 
Write a short, punchy 1-2 sentence message to the user when they open their dashboard today.
DO NOT use markdown, emojis are okay. Make it sound human and encouraging.

User Context:
- Current Streak: ${streak} days
- Sessions Completed Recently: ${sessions.length}
- Overall Completion Rate: ${profile.overallCompletionRate.toFixed(0)}%
- Engagement Level: ${profile.signals.engagementLevel}
`;

        if (sessions.length > 0) {
          const lastSession = sessions[0];
          const daysSinceLast = Math.floor((Date.now() - new Date(lastSession.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
          const sanitizedGoal = typeof lastSession.goal === 'string' 
            ? lastSession.goal.slice(0, 60).replace(/ignore|prompt|instruction|system|developer/gi, '') 
            : 'learning goal';
          prompt += `- Days since last session: ${daysSinceLast}\n`;
          prompt += `- Last goal: "${sanitizedGoal}"\n`;

          if (daysSinceLast > 2) {
             prompt += `\nThe user hasn't logged in for a few days. Welcome them back warmly without guilt-tripping them. Ask what got in the way or encourage them to start small today.`;
          } else if (streak >= 3) {
             prompt += `\nThe user is on a solid streak! Celebrate their consistency.`;
          } else if (profile.overallCompletionRate > 80) {
             prompt += `\nThe user has a high completion rate. Acknowledge their strong focus and execution.`;
          } else {
             prompt += `\nThe user has struggled to complete sessions recently. Give a short tip on building momentum by just starting.`;
          }
        } else {
          prompt += `\nThis is a brand new user! Give them a warm welcome and encourage them to set their first goal.`;
        }

        const result = await model.generateContent(prompt);
        coachMessage = result.response.text().trim();
      } catch (geminiError) {
        console.error("Gemini API Error in Coach Route:", geminiError);
      }
    }

    return NextResponse.json({ message: coachMessage }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to generate coach message:', error);
    return NextResponse.json({ error: 'Failed to generate coach message' }, { status: 500 });
  }
}
