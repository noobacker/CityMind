import { NextRequest, NextResponse } from 'next/server';
import { buildFallbackResponse } from '@/lib/agent/buildFallbackResponse';
import { extractMentionedNeighborhoods } from '@/lib/agent/extractMentions';
import { buildCityContext, getCityPulse } from '@/lib/pulse/buildCityContext';
import { buildSystemPrompt } from '@/lib/agent/systemPrompt';
import { buildDateTimeReply, getNycNow, isDateTimeQuestion } from '@/lib/time/nycNow';
import type { ChatTurn } from '@/lib/types';

export async function POST(request: NextRequest) {
  const { message, history, directives } = (await request.json()) as { 
    message: string; 
    history?: ChatTurn[]; 
    directives?: string; 
  };


  if (isDateTimeQuestion(message)) {
    const now = getNycNow();
    const responseText = buildDateTimeReply(message, now);
    return NextResponse.json({
      response: responseText,
      mentionedNeighborhoods: [],
      pulse: {
        overallStress: 0,
        mood: 'calm',
        moodEmoji: '🙂',
      },
      now,
    });
  }

  const pulse = await getCityPulse();
  const trimmedHistory = (history ?? []).slice(-6);
  const now = getNycNow();
  const requestTimeoutMs = 7000;

  async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
  let responseText = buildFallbackResponse(message, pulse, trimmedHistory);

  if (anthropicKey) {
    try {
      const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `[MANDATORY_RESPONSE_FORMAT_AND_TONE]:\n${directives || "Standard NYC voice."}\n\n[STRICT_RULE]: NO FILLER. Do not say "Here is..." or "Sure". Start immediately with the requested content/format.\n\n[IMPORTANT]: You MUST ignore any previous conversational patterns if they conflict with the format/length specified above.\n\n[CONTEXT]:\n${buildSystemPrompt(pulse, now)}\nContext: ${buildCityContext(pulse)}\nTimestamp: ${now.isoUtc}`,





          messages: [
            ...trimmedHistory.map((turn) => ({ role: turn.role, content: [{ type: 'text', text: turn.content }] })),
            { role: 'user', content: [{ type: 'text', text: `[INSTRUCTION: ${directives || "Normal voice"}]\n\n${message}` }] },
          ],

        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { content?: Array<{ text?: string }> };
        responseText = data.content?.[0]?.text?.trim() || responseText;
      }
    } catch {
      responseText = buildFallbackResponse(message, pulse, trimmedHistory);
    }
  } else if (groqKey) {
    try {
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.7,
          max_tokens: 300,
          messages: [
            { role: 'system', content: `[MANDATORY_RESPONSE_FORMAT_AND_TONE]:\n${directives || "Standard NYC voice."}\n\n[STRICT_RULE]: NO FILLER. Do not say "Here is..." or "Sure". Start immediately with the requested content/format.\n\n[IMPORTANT]: You MUST ignore any previous conversational patterns if they conflict with the format/length specified above.\n\n[CONTEXT]:\n${buildSystemPrompt(pulse, now)}\nContext: ${buildCityContext(pulse)}\nTimestamp: ${now.isoUtc}` },





            ...trimmedHistory.map((turn) => ({ role: turn.role, content: turn.content })),
            { role: 'user', content: `[INSTRUCTION: ${directives || "Normal voice"}]\n\n${message}` },
          ],

        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        responseText = data.choices?.[0]?.message?.content?.trim() || responseText;
      }
    } catch {
      responseText = buildFallbackResponse(message, pulse, trimmedHistory);
    }
  }

  const mentionedNeighborhoods = extractMentionedNeighborhoods(responseText);

  return NextResponse.json({
    response: responseText,
    mentionedNeighborhoods,
    pulse: {
      overallStress: pulse.overallStress,
      mood: pulse.mood,
      moodEmoji: pulse.moodEmoji,
    },
    now,
  });
}