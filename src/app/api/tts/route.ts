import { NextRequest, NextResponse } from 'next/server';

const MAX_TEXT_LENGTH = 5000;

function getOpenAI() {
  // Lazy-init to avoid build-time error when OPENAI_API_KEY is not set
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require('openai').default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  const body = await req.json();
  let text: string = body.text ?? '';
  const language: string = body.language ?? 'en';

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  // Cap length to control cost
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  try {
    const openai = getOpenAI();

    // Translate if not English
    if (language !== 'en' && LANGUAGE_NAMES[language]) {
      const translation = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Translate the following technical documentation text to ${LANGUAGE_NAMES[language]}. Keep code terms, command names, and tool names untranslated. Output only the translation, nothing else.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      });
      text = translation.choices[0]?.message?.content ?? text;
    }

    // Generate speech
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24h
      },
    });
  } catch (err) {
    console.error('TTS error:', err);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
