import React, { useState } from 'react';
import { X, Minimize2, Headphones, Keyboard, Send, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ArcReactorHud, HudMenuId } from './ArcReactorHud';
import { AssistantState } from './VoiceOrb';
import { backgroundWakeService } from '../services/backgroundWakeService';

interface StarkFullScreenHudProps {
  isOpen: boolean;
  onClose: () => void;
  state: AssistantState;
  audioVolume?: number;
  transcript: string;
  latestAssistantReply?: string;
  isBackgroundWakeActive: boolean;
  onCoreClick: () => void;
  onSelectMenu: (menuId: HudMenuId) => void;
  onOpenVoiceStudio: () => void;
  onTextSubmit: (text: string) => void;
}

export const StarkFullScreenHud: React.FC<StarkFullScreenHudProps> = ({
  isOpen,
  onClose,
  state,
  audioVolume = 0,
  transcript,
  latestAssistantReply,
  isBackgroundWakeActive,
  onCoreClick,
  onSelectMenu,
  onOpenVoiceStudio,
  onTextSubmit,
}) => {
  const [showTyping, setShowTyping] = useState(false);
  const [commandInput, setCommandInput] = useState('');

  if (!isOpen) return null;

  const wakeCaps = backgroundWakeService.getCapabilities();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandInput.trim()) {
      onTextSubmit(commandInput.trim());
      setCommandInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[42] stark-hud-grid text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto animate-hud-expand"
      role="dialog"
      aria-modal="true"
      aria-label="J. A. R. V. I. S. Full-Screen Holographic HUD"
    >
      {/* Top Stark HUD Bar */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between gap-3 border-b border-cyan-500/25 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00d4ff] animate-pulse shrink-0" />
            <h2 className="font-hud text-xs sm:text-sm font-bold tracking-[0.22em] text-cyan-200 truncate">
              J. A. R. V. I. S. // HUD
            </h2>
          </div>
          <p className="text-[11px] font-mono-hud text-slate-400 mt-0.5 flex items-center gap-1.5">
            {!wakeCaps.supported ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate text-amber-300">
                  Wake unsupported in browser — Tap Core or type
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {isBackgroundWakeActive
                    ? '"Hey JARVIS" Active • Say "JARVIS close" to exit'
                    : 'Holographic Core Active • Say "JARVIS close" to exit'}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenVoiceStudio}
            className="min-h-[44px] px-3 rounded-xl bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Voice Studio"
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            title="Minimize HUD"
          >
            <Minimize2 className="w-4 h-4 text-cyan-300" />
            <span className="hidden sm:inline">Minimize</span>
            <X className="w-4 h-4 sm:hidden" />
          </button>
        </div>
      </div>

      {/* Central Full-Screen Circular Arc Reactor + 6 Interactive Menu Options */}
      <div className="flex-1 flex flex-col items-center justify-center py-3">
        <ArcReactorHud
          state={state}
          audioVolume={audioVolume}
          onCoreClick={onCoreClick}
          onSelectMenu={(menuId) => {
            if (menuId === 'ai') {
              setShowTyping(true);
              return;
            }
            onSelectMenu(menuId);
          }}
          size="fullscreen"
        />
      </div>

      {/* Bottom Live Transcript & Reply Console */}
      <div className="w-full max-w-xl mx-auto space-y-2.5 pt-2 border-t border-cyan-500/20">
        {transcript ? (
          <div className="px-3.5 py-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 text-xs text-cyan-100 text-center font-medium">
            "{transcript}"
          </div>
        ) : latestAssistantReply ? (
          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-800 text-xs text-slate-200 text-center line-clamp-2">
            {latestAssistantReply}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center">
            Core tap karein ya bolein — band karne ke liye "JARVIS close" bolein.
          </p>
        )}

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowTyping((prev) => !prev)}
            className="min-h-[44px] px-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-200 hover:bg-cyan-950/60 flex items-center gap-1.5 transition"
          >
            <Keyboard className="w-4 h-4" />
            <span>{showTyping ? 'Hide Command Input' : 'Type Command'}</span>
          </button>
        </div>

        {showTyping && (
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 bg-slate-950 border border-cyan-500/40 rounded-xl p-1.5"
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Command type karein (e.g. Camera kholo)..."
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="min-h-[40px] px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
