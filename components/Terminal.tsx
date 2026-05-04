'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatResponsePayload, ChatTurn, CityPulse } from '@/lib/types';
import { useCity } from './CityProvider';

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface TerminalProps {
  pulse: CityPulse;
  highlightedNeighborhoods: string[];
  onHighlightedNeighborhoodsChange: (names: string[]) => void;
}

function pickUniquePrompts(pulse: CityPulse): string[] {
  const hot = Object.entries(pulse.neighborhoods)
    .sort((a, b) => b[1].stress - a[1].stress)
    .slice(0, 3)
    .map(([name]) => name);

  const districts = Object.entries(pulse.boroughs)
    .sort((a, b) => b[1].stress - a[1].stress)
    .map(([id]) => pulse.boroughLabels[id] ?? id);

  const cityName = pulse.cityName;
  const fallbackHood = Object.keys(pulse.neighborhoods)[0] ?? cityName;

  const basePrompts = [
    `What is the single biggest pressure in ${hot[0] ?? 'the city'} right now?`,
    `Give me the fastest fix for ${hot[0] ?? 'the roughest block'}'s top issue.`,
    `Which district looks the most stable, and why?`,
    `Where should I look if I want to help the worst block first?`,
    `Give me a calm version of ${cityName}'s status in one sentence.`,
    `What should I watch in ${districts[0] ?? cityName} today?`,
    `What would make ${hot[1] ?? 'that area'} feel better in 48 hours?`,
    `Is the current stress in ${hot[2] ?? fallbackHood} an anomaly or a trend?`,
    `Tell me about the neural synchrony between ${districts[0] ?? cityName} and ${districts[1] ?? cityName}.`,
    `I'm in ${hot[0] ?? fallbackHood} right now, what should I avoid?`,
    `Find me a neighborhood that is 'holding its breath' right now.`,
    `Which district is 'inhaling' the most stress from its neighbors?`,
    `Is ${hot[0] ?? fallbackHood}'s stress a 'headache' or a 'fever'?`,
  ];

  return [...basePrompts].sort(() => Math.random() - 0.5).slice(0, 4);
}

async function sendMessage(
  message: string,
  history: ChatTurn[],
  directives: string | undefined,
  city: { id: string; lat: number; lon: number; name: string; country: string; countryCode: string; isCustom?: boolean },
): Promise<ChatResponsePayload> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, directives, city }),
  });
  if (!response.ok) throw new Error('Chat request failed');
  return response.json() as Promise<ChatResponsePayload>;
}

export function Terminal({ pulse, highlightedNeighborhoods, onHighlightedNeighborhoodsChange }: TerminalProps) {
  const { city } = useCity();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'huggingface' | 'elevenlabs'>('huggingface');
  const [directives, setDirectives] = useState('Friendly, concise, in bullet points, under 10 words each.\n1st point : area name and surrounding.\n2nd point : issue in brief\n3rd point : how to resolve (upto 20 words for this point).');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('citymind_console_directives') || localStorage.getItem('nyc_console_directives');
    if (saved) setDirectives(saved);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('citymind_console_directives', directives);
    }
  }, [directives, isInitialized]);

  useEffect(() => {
    setHistory([]);
  }, [pulse.cityId]);

  const [showSettings, setShowSettings] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const starterPrompts = useMemo(() => pickUniquePrompts(pulse), [pulse.cityId, pulse.timestamp]);

  async function speakResponse(text: string) {
    if (!voiceEnabled || typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          provider: ttsProvider,
          voice_id: '21m00Tcm4TlvDq8ikWAM',
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[TTS] API error (${ttsProvider}):`, res.status, errorText);
        throw new Error(`TTS API error: ${errorText}`);
      }
      const contentType = res.headers.get('Content-Type');
      const audioData = await res.arrayBuffer();
      const blob = new Blob([audioData], { type: contentType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 0.92;
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[TTS] Fatal error:', err);
      if (window.speechSynthesis) {
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 0.95;
        utterance.volume = 0.92;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handleMicClick() {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setHistory((current) => [...current, { role: 'assistant', content: 'Mic input is not supported in this browser.' }]);
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new RecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) setInput((current) => `${current}${current ? ' ' : ''}${transcript}`);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    await submitMessage(trimmed);
  }

  async function handlePromptClick(message: string) {
    if (isSending) return;
    await submitMessage(message);
  }

  async function submitMessage(message: string) {
    const nextHistory = [...history, { role: 'user', content: message } as ChatTurn];
    setHistory(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const payload = await sendMessage(message, nextHistory.slice(-6), directives, {
        id: city.id,
        lat: city.lat,
        lon: city.lon,
        name: city.name,
        country: city.country,
        countryCode: city.countryCode,
        isCustom: city.isCustom,
      });
      setHistory((current) => [...current, { role: 'assistant', content: payload.response }]);
      onHighlightedNeighborhoodsChange(payload.mentionedNeighborhoods);
      speakResponse(payload.response);
    } catch {
      setHistory((current) => [...current, { role: 'assistant', content: 'The line is noisy. Try that again.' }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="terminalShell">
      <div className="terminalWindow">
        <div className="terminalHeader">
          <span>{pulse.cityName.toUpperCase()} CONSOLE</span>
          <div className="headerActions">
            <button
              type="button"
              className={`settingsToggle ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              SETTINGS
            </button>
            <span className="moodLabel">{pulse.mood.toUpperCase()}</span>
          </div>
        </div>
        {showSettings && (
          <div className="directivesPanel">
            <div className="panelTitle">BEHAVIOR_DIRECTIVES (NLP)</div>
            <textarea
              value={directives}
              onChange={(e) => setDirectives(e.target.value)}
              placeholder="e.g. Professional tone, under 15 words, use 3 bullet points..."
            />
            <div className="panelHint">The city will adapt its neural response to these instructions.</div>
            <button type="button" className="saveSettingsBtn" onClick={() => setShowSettings(false)}>
              APPLY & CLOSE_CORE
            </button>
          </div>
        )}

        <div className="terminalMetaRow">
          <span>Voice is optional.</span>
          <label className="selectWrap" htmlFor="tts-provider-select">
            <span>TTS</span>
            <select
              id="tts-provider-select"
              value={ttsProvider}
              onChange={(event) => setTtsProvider(event.target.value as 'huggingface' | 'elevenlabs')}
            >
              <option value="huggingface">Hugging Face</option>
              <option value="elevenlabs">Eleven Labs</option>
            </select>
          </label>
        </div>
        <div className="terminalOutput" role="log" aria-live="polite">
          {history.length === 0 && isInitialized ? (
            <div className="starterPanel">
              <p className="starterKicker">Start by asking something specific.</p>
              <div className="starterChips">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="starterChip"
                    onClick={() => void handlePromptClick(prompt)}
                    disabled={isSending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {history.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className="messageRow">
              <p className={turn.role === 'user' ? 'userLine' : 'assistantLine'}>
                {turn.role === 'assistant' && <span className="promptLabel">{pulse.cityName.toUpperCase()}:</span>}
                {turn.content}
              </p>
              {turn.role === 'assistant' && (
                <div className="sourceCitation">
                  REF: <a href={`https://open-meteo.com/en/forecast?latitude=${city.lat}&longitude=${city.lon}`} target="_blank" rel="noreferrer">OPEN-METEO (LIVE WEATHER)</a> ·{' '}
                  <a href="https://openweathermap.org/api/air-pollution" target="_blank" rel="noreferrer">OPENWEATHER (AQI)</a>
                  {pulse.cityIdentity?.id === 'nyc' && (
                    <> · <a href="https://opendata.cityofnewyork.us/" target="_blank" rel="noreferrer">NYC OPEN DATA</a></>
                  )}
                  {pulse.cityIdentity?.isCustom && (
                    <> · <a href={`https://www.openstreetmap.org/#map=13/${city.lat}/${city.lon}`} target="_blank" rel="noreferrer">OPENSTREETMAP</a></>
                  )}
                </div>
              )}

            </div>
          ))}

          {isSending ? <p className="thinkingLine">{pulse.cityName.toUpperCase()}: composing from live feeds...</p> : null}
          <div ref={bottomRef} />
        </div>
        <form className="terminalComposer" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ask about ${pulse.cityName}, a district, or a fix...`}
            aria-label={`Message ${pulse.cityName}`}
          />
          <button type="button" onClick={handleMicClick} disabled={isSending}>
            {isListening ? 'LISTENING...' : 'MIC'}
          </button>
          <button type="button" onClick={() => setVoiceEnabled((value) => !value)}>
            {voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
          </button>
          <button type="submit" disabled={isSending}>
            {isSending ? 'SENDING...' : 'SEND'}
          </button>
        </form>
        {highlightedNeighborhoods.length > 0 ? (
          <div className="highlightStrip">FOCUS: {highlightedNeighborhoods.join(', ')}</div>
        ) : null}
      </div>
    </section>
  );
});

Terminal.displayName = 'Terminal';
