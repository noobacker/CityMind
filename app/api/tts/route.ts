import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { text, provider = 'huggingface', voice_id = '21m00Tcm4TlvDq8ikWAM', model_id = 'eleven_multilingual_v2' } = await req.json();
  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  if (provider === 'elevenlabs') {
    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenApiKey) {
      return NextResponse.json({ error: 'Missing Eleven Labs API key' }, { status: 500 });
    }
    // Eleven Labs API endpoint - uses voice_id (UUID), not voice name
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?optimize_streaming_latency=0`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, model_id }),
      });
      if (!response.ok) {
        const err = await response.text();
        console.error('[elevenlabs-tts] API error:', response.status, err);
        return NextResponse.json({ error: `ElevenLabs API error: ${err}` }, { status: response.status });
      }
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('[elevenlabs-tts] Fetch error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  } else {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Hugging Face API key' }, { status: 500 });
    }
    const response = await fetch('https://api-inference.huggingface.co/models/canopylabs/orpheus-v1-english', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify({ inputs: text }),
    });
    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    });
  }
}
