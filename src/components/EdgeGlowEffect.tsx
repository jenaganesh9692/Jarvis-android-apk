import React from 'react';
import { AssistantState } from './VoiceOrb';

interface EdgeGlowEffectProps {
  state: AssistantState;
}

/**
 * 4-Corner Holographic Screen-Edge Energy Frame (Tony Stark HUD Style)
 */
export const EdgeGlowEffect: React.FC<EdgeGlowEffectProps> = ({ state }) => {
  const isActive = state === 'listening' || state === 'speaking' || state === 'thinking' || state === 'acting';

  if (!isActive) return null;

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';

  const edgeGradientX = isSpeaking
    ? 'from-emerald-400 via-cyan-400 to-sky-400 shadow-[0_0_18px_#34d399]'
    : isListening
    ? 'from-cyan-400 via-sky-400 to-slate-200 shadow-[0_0_18px_#00d4ff]'
    : 'from-sky-400 via-cyan-300 to-indigo-400 shadow-[0_0_18px_#38bdf8]';

  const edgeGradientY = isSpeaking
    ? 'from-emerald-400 via-cyan-400 to-sky-400 shadow-[0_0_18px_#34d399]'
    : isListening
    ? 'from-cyan-400 via-sky-500 to-cyan-300 shadow-[0_0_18px_#00d4ff]'
    : 'from-sky-500 via-cyan-400 to-indigo-400 shadow-[0_0_18px_#38bdf8]';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
        {/* Top / Bottom / Left / Right Energy Beams */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${edgeGradientX} animate-pulse`} />
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${edgeGradientX} animate-pulse`} />
        <div className={`absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b ${edgeGradientY} animate-pulse`} />
        <div className={`absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b ${edgeGradientY} animate-pulse`} />

        {/* Corner Holographic Flares */}
        <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-cyan-400/25 blur-2xl animate-pulse" />
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-sky-400/25 blur-2xl animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-sky-500/25 blur-2xl animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-cyan-400/25 blur-2xl animate-pulse" />

        {/* Listening Telemetry Pill */}
        {isListening && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1 bg-[#030a17]/95 border border-cyan-400/50 rounded-full shadow-[0_0_24px_rgba(0,212,255,0.45)] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-hud text-[10px] tracking-[0.18em] text-cyan-200">
              LISTENING • AB BOLIYE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
