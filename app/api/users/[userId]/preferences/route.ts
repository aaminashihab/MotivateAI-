import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const client = await clientPromise;
    const db = client.db('motivateai');
    
    const user = await db.collection<any>('users').findOne({ _id: userId });
    
    if (!user || !user.preferences) {
      return NextResponse.json({}, { status: 404 });
    }
    
    return NextResponse.json(user.preferences);
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const preferences = await request.json();
    const client = await clientPromise;
    const db = client.db('motivateai');

    await db.collection<any>('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          _id: userId,
          preferences, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Failed to save preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
