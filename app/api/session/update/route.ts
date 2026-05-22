import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SessionLog } from '@/lib/types/sessionLog';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, tasksCompleted, tasksSkipped, taskCount, sessionRating, abandoned } = body;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('motivateai');
    
    const completionRatio = taskCount > 0 ? (tasksCompleted / taskCount) * 100 : 0;
    
    const session = await db.collection<SessionLog>('sessions').findOne({ userId, sessionId });
    
    if (session) {
      const updatedTasks = session.tasks.map((task, index) => {
        if (index < tasksCompleted) {
          return {
            ...task,
            completed: true,
            actualDuration: task.estimatedDuration
          };
        }
        return task;
      });

        const updateData: any = {
          completedAt: new Date(),
          tasksCompleted: tasksCompleted,
          completionRatio: completionRatio,
          tasks: updatedTasks as any,
          updatedAt: new Date()
        };

        if (sessionRating !== undefined) {
          updateData.sessionRating = sessionRating;
        }
        
        if (tasksSkipped !== undefined) {
          updateData.tasksSkipped = tasksSkipped;
        }

        if (abandoned !== undefined) {
          updateData.abandoned = abandoned;
        }

        await db.collection<SessionLog>('sessions').updateOne(
          { userId, sessionId },
          { $set: updateData }
        );

      // --- Day 3: Make Optimizations Real ---
      // If session is fully completed, check total completed sessions
      if (tasksCompleted >= taskCount && taskCount > 0) {
        const completedSessionsCount = await db.collection('sessions').countDocuments({ 
          userId, 
          completedAt: { $exists: true } 
        });

        // Trigger optimization engine every 5 sessions
        if (completedSessionsCount > 0 && completedSessionsCount % 5 === 0) {
          try {
            // We do a non-blocking background fetch to the optimization route
            const baseUrl = request.headers.get('origin') || `http://${request.headers.get('host')}`;
            fetch(`${baseUrl}/api/user/${userId}/optimize`, {
              method: 'POST'
            }).catch(e => console.warn('Background optimization failed:', e));
          } catch (e) {
            console.warn('Failed to trigger background optimization:', e);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating session:', error.message);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
