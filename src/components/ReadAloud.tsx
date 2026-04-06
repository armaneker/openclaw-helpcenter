'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, Globe, Loader2 } from 'lucide-react';

type Status = 'idle' | 'loading' | 'playing' | 'paused';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
];

function extractPageText(): string {
  const article = document.querySelector('article');
  if (!article) return '';

  // Clone to avoid modifying the DOM
  const clone = article.cloneNode(true) as HTMLElement;

  // Remove code blocks, nav elements, and the header itself
  clone.querySelectorAll('pre, code, nav, .not-prose').forEach((el) => el.remove());

  // Get clean text
  const text = clone.textContent ?? '';
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

export default function ReadAloud() {
  const [status, setStatus] = useState<Status>('idle');
  const [language, setLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(async () => {
    if (status === 'playing') {
      audioRef.current?.pause();
      setStatus('paused');
      return;
    }

    if (status === 'paused' && audioRef.current) {
      audioRef.current.play();
      setStatus('playing');
      return;
    }

    // Fresh play — fetch audio
    cleanup();
    setStatus('loading');

    const text = extractPageText();
    if (!text) {
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!res.ok) {
        console.error('TTS API error:', res.status);
        setStatus('idle');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setStatus('idle');
        cleanup();
      });

      audio.addEventListener('error', () => {
        setStatus('idle');
        cleanup();
      });

      await audio.play();
      setStatus('playing');
    } catch (err) {
      console.error('TTS failed:', err);
      setStatus('idle');
    }
  }, [status, language, cleanup]);

  const handleStop = useCallback(() => {
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  const handleLanguageChange = useCallback(
    (code: string) => {
      setLanguage(code);
      setShowLangMenu(false);
      // If currently playing, stop — user will need to press play again for new language
      if (status !== 'idle') {
        cleanup();
        setStatus('idle');
      }
    },
    [status, cleanup]
  );

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="flex items-center gap-1.5 ml-auto relative">
      {/* Play / Pause */}
      <button
        onClick={handlePlay}
        disabled={status === 'loading'}
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-wait"
        title={status === 'playing' ? 'Pause' : 'Listen to this page'}
      >
        {status === 'loading' ? (
          <Loader2 size={14} className="text-brand-400 animate-spin" />
        ) : status === 'playing' ? (
          <Pause size={14} className="text-brand-400" />
        ) : (
          <Play size={14} className="text-gray-400 hover:text-brand-400" />
        )}
      </button>

      {/* Stop (only visible when playing or paused) */}
      {(status === 'playing' || status === 'paused') && (
        <button
          onClick={handleStop}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-gray-800"
          title="Stop"
        >
          <Square size={12} className="text-gray-400 hover:text-gray-200" />
        </button>
      )}

      {/* Language selector */}
      <div className="relative">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          title="Select language"
        >
          <Globe size={12} />
          <span className="hidden sm:inline">{currentLang?.label}</span>
        </button>

        {showLangMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowLangMenu(false)}
            />
            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    lang.code === language
                      ? 'text-brand-400 bg-gray-800/50'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
