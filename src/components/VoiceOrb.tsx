import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Keyboard,
  Languages,
  WifiOff,
  AlertCircle,
  ShieldAlert,
  Maximize2,
} from 'lucide-react';
import { LanguageMode } from '../types';
import { ArcReactorHud, HudMenuId } from './ArcReactorHud';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'acting' | 'speaking';

interface VoiceOrbProps {
  state: AssistantState;
  transcript: string;
  isOnline: boolean;
  languageMode: LanguageMode;
  audioVolume?: number;
  micError?: string | null;
  onLanguageToggle: () => void;
  onMicClick: () => void;
  onTextSubmit: (text: string) => void;
  onQuickChip: (chipText: string) => void;
  onSelectMenu: (menuId: HudMenuId) => void;
  onOpenFullScreenHud?: () => void;
  onOpenSOS?: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  transcript,
  isOnline,
  languageMode,
  audioVolume = 0,
  micError,
  onLanguageToggle,
  onMicClick,
  onTextSubmit,
  onQuickChip,
  onSelectMenu,
  onOpenFullScreenHud,
  onOpenSOS,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTypingOpen, setIsTypingOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-open typing if mic has an error
  useEffect(() => {
    if (micError) {
      setIsTypingOpen(true);
    }
  }, [micError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onTextSubmit(inputText.trim());
      setInputText('');
    }
  };

  const handleHudMenu = (menuId: HudMenuId) => {
    if (menuId === 'ai') {
      setIsTypingOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return;
    }
    onSelectMenu(menuId);
  };

  const quickChips = [
    { label: 'Main kaisa lag raha hoon?', cmd: 'Camera kholo aur dekho main kaisa lag raha hoon' },
    { label: 'Camera kholo', cmd: 'Camera kholo' },
    { label: 'Mujhse pyari baat karo', cmd: 'Boss, aap abhi kya kar rahe ho? Mujhse baat karo' },
    { label: 'WhatsApp kholo', cmd: 'WhatsApp kholo' },
    { label: 'Emergency SOS', cmd: 'Emergency SOS' },
    { label: 'All apps dikhao', cmd: 'Mere phone mein installed apps dikhao' },
    { label: 'Torch toggle karo', cmd: 'Torch on karo' },
    { label: 'Alarm schedule karo', cmd: 'Mujhe subah 6 baje utha dena' },
  ];

  const getStatusText = () => {
    switch (state) {
      case 'listening':
        return {
          title: 'Ab boliye...',
          sub: 'Hinglish ya English me command bolein',
          color: 'text-cyan-300',
        };
      case 'thinking':
        return {
          title: 'Soch rahi hoon...',
          sub: 'Ganesh ji ki command process ho rahi hai',
          color: 'text-sky-300',
        };
      case 'acting':
        return {
          title: 'Kaam kar rahi hoon...',
          sub: 'Surakshit action execute kiya ja raha hai',
          color: 'text-cyan-200',
        };
      case 'speaking':
        return {
          title: 'Bol rahi hoon...',
          sub: 'Active selected voice me jawab sunaya ja raha hai',
          color: 'text-emerald-300',
        };
      default:
        return {
          title: 'J. A. R. V. I. S. Core Ready',
          sub: isOnline ? 'Online (Gemini AI + Selected Voice)' : 'Offline Engine (Fast Local Core)',
          color: 'text-slate-200',
        };
    }
  };

  const status = getStatusText();

  return (
    <div className="flex flex-col items-center justify-center px-3 pt-2 pb-3 w-full max-w-md mx-auto">
      {/* Top Status & SOS / Full HUD Controls */}
      <div className="flex items-center justify-center flex-wrap gap-2 mb-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isOnline
              ? 'bg-cyan-950/50 text-cyan-200 border-cyan-500/35'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          }`}
        >
          {isOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Online AI Active
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              Offline Fast Core
            </>
          )}
        </span>

        {onOpenFullScreenHud && (
          <button
            type="button"
            onClick={onOpenFullScreenHud}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-950/70 transition whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full HUD</span>
          </button>
        )}

        {onOpenSOS && (
          <button
            type="button"
            onClick={onOpenSOS}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60 transition whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>SOS</span>
          </button>
        )}
      </div>

      {/* Tony Stark Arc Reactor Holographic HUD + 6 Circular Menu Options */}
      <ArcReactorHud
        state={state}
        audioVolume={audioVolume}
        onCoreClick={onMicClick}
        onSelectMenu={handleHudMenu}
        size="embedded"
      />

      {/* Dynamic Voice Status Caption */}
      <div className="text-center mt-2 space-y-0.5">
        <h3 className={`text-sm font-hud font-bold tracking-wider ${status.color}`}>
          {status.title}
        </h3>
        <p className="text-[11px] text-slate-400">{status.sub}</p>
      </div>

      {/* Live Speech Transcript Feedback */}
      {transcript && (
        <div className="mt-2.5 px-4 py-2 bg-[#040c1a]/95 border border-cyan-500/40 rounded-xl text-xs text-cyan-100 max-w-sm text-center shadow-[0_0_15px_rgba(0,212,255,0.18)]">
          "{transcript}"
        </div>
      )}

      {/* Microphone Error Banner */}
      {micError && (
        <div className="mt-2.5 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <div className="font-semibold">Microphone Notification:</div>
            <p className="text-slate-300">
              {micError === 'permission-denied'
                ? 'Mic permission block hai. Kripya browser URL bar me lock icon dabakar permission allow karein, ya neeche type karein.'
                : micError === 'no-speech'
                ? 'Koi aawaz nahi suni gayi. Kripya dobara dabakar bolein ya type karein.'
                : micError}
            </p>
          </div>
        </div>
      )}

      {/* Typing Fallback & Language Toggle */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !isTypingOpen;
            setIsTypingOpen(next);
            if (next) {
              setTimeout(() => inputRef.current?.focus(), 60);
            }
          }}
          className="min-h-[38px] text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/25 hover:border-cyan-400/50 transition"
        >
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isTypingOpen ? 'Hide Input' : 'Type Command'}</span>
        </button>

        <button
          type="button"
          onClick={onLanguageToggle}
          className="min-h-[38px] text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/25 hover:border-cyan-400/50 transition"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{languageMode === 'hi-IN' ? 'Lang: Hinglish' : 'Lang: English'}</span>
        </button>
      </div>

      {/* Typing Command Input */}
      {isTypingOpen && (
        <form
          onSubmit={handleSubmit}
          className="w-full mt-2.5 flex items-center gap-2 bg-[#040a16] border border-cyan-500/40 rounded-xl p-1.5 focus-within:border-cyan-400 transition shadow-lg"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Command type karein (e.g. 'Camera kholo')..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="min-h-[36px] min-w-[36px] p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg transition flex items-center justify-center"
            aria-label="Send command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Quick Voice Command Suggestions */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-md">
        {quickChips.map((chip, idx) => (
          <button
            key={`${chip.label}-${idx}`}
            type="button"
            onClick={() => onQuickChip(chip.cmd)}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#040a16]/90 hover:bg-cyan-950/70 text-slate-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-500/40 transition"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
