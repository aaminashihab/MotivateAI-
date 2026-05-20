import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // Fallback to mock data if no API key is provided
    if (!apiKey) {
      console.log("No YOUTUBE_API_KEY found, using mock fallback data.");
      return NextResponse.json({
        videoId: 'dQw4w9WgXcQ', // Placeholder ID (e.g., a well-known video) or any educational video
        title: `Mock Video for: ${query}`,
        channelTitle: "Mock Learning Channel"
      });
    }

    const durationParam = searchParams.get('duration');
    let durationFilter = '';
    
    if (durationParam) {
      const minutes = parseInt(durationParam, 10);
      if (!isNaN(minutes)) {
        if (minutes < 4) {
          durationFilter = '&videoDuration=short';
        } else if (minutes <= 20) {
          durationFilter = '&videoDuration=medium';
        } else {
          durationFilter = '&videoDuration=long';
        }
      }
    }

    // Call real YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(
        query + ' tutorial'
      )}&type=video${durationFilter}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return NextResponse.json({
        videoId: video.id.videoId,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
      });
    } else {
      console.warn("No videos found, using fallback.");
      return NextResponse.json({
        videoId: 'jfKfPfyJRdk', 
        title: "Lofi hip hop radio - beats to relax/study to",
        channelTitle: "Lofi Girl"
      });
    }
  } catch (error) {
    console.error('YouTube API Error:', error);
    // Graceful fallback to avoid breaking the UI
    return NextResponse.json({
      videoId: 'jfKfPfyJRdk', 
      title: "Lofi hip hop radio - beats to relax/study to",
      channelTitle: "Lofi Girl"
    });
  }
}
