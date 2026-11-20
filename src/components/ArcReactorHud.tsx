import React, { useMemo } from 'react';
import {
  Mic,
  Loader2,
  Volume2,
  Camera,
  Grid,
  Sliders,
  Activity,
  Sparkles,
} from 'lucide-react';
import { AssistantState } from './VoiceOrb';

export type HudMenuId = 'voice' | 'camera' | 'apps' | 'settings' | 'status' | 'ai';

interface ArcReactorHudProps {
  state: AssistantState;
  audioVolume?: number;
  onCoreClick: () => void;
  onSelectMenu: (menuId: HudMenuId) => void;
  activeMenu?: string;
  size?: 'embedded' | 'fullscreen';
}

interface MenuNode {
  id: HudMenuId;
  label: string;
  angleDeg: number;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_NODES: MenuNode[] = [
  { id: 'voice', label: 'Voice', angleDeg: 0, icon: Mic },
  { id: 'camera', label: 'Camera', angleDeg: 60, icon: Camera },
  { id: 'apps', label: 'Apps', angleDeg: 120, icon: Grid },
  { id: 'settings', label: 'Settings', angleDeg: 180, icon: Sliders },
  { id: 'status', label: 'Status', angleDeg: 240, icon: Activity },
  { id: 'ai', label: 'AI Chat', angleDeg: 300, icon: Sparkles },
];

export const ArcReactorHud: React.FC<ArcReactorHudProps> = ({
  state,
  audioVolume = 0,
  onCoreClick,
  onSelectMenu,
  activeMenu,
  size = 'embedded',
}) => {
  const voiceStateMeta = useMemo(() => {
    switch (state) {
      case 'listening':
        return {
          badge: 'LISTENING',
          statusLabel: 'LISTENING',
          accent: 'text-cyan-300 border-cyan-400/60 bg-cyan-950/70',
          ringStroke: '#22d3ee',
          glowClass: 'shadow-[0_0_45px_rgba(0,212,255,0.65)]',
        };
      case 'thinking':
      case 'acting':
        return {
          badge: 'THINKING',
          statusLabel: 'THINKING',
          accent: 'text-sky-200 border-sky-400/60 bg-sky-950/70',
          ringStroke: '#38bdf8',
          glowClass: 'shadow-[0_0_40px_rgba(56,189,248,0.55)]',
        };
      case 'speaking':
        return {
          badge: 'SPEAKING',
          statusLabel: 'SPEAKING',
          accent: 'text-emerald-300 border-emerald-400/60 bg-emerald-950/70',
          ringStroke: '#34d399',
          glowClass: 'shadow-[0_0_45px_rgba(52,211,153,0.55)]',
        };
      default:
        return {
          badge: 'JARVIS',
          statusLabel: 'READY',
          accent: 'text-cyan-200 border-cyan-500/40 bg-slate-950/80',
          ringStroke: '#00d4ff',
          glowClass: 'shadow-[0_0_28px_rgba(0,212,255,0.28)]',
        };
    }
  }, [state]);

  // Precompute 32 radial visualizer bars (audio-responsive + state-modulated)
  const visualizerBars = useMemo(() => {
    const count = 32;
    const normalizedVol = Math.min(1, Math.max(0, audioVolume / 80));
    const baseLevel =
      state === 'listening'
        ? Math.max(0.32, normalizedVol)
        : state === 'speaking'
        ? Math.max(0.45, normalizedVol * 0.9 + 0.25)
        : state === 'thinking' || state === 'acting'
        ? 0.35
        : Math.max(0.12, normalizedVol * 0.45);

    return Array.from({ length: count }, (_, idx) => {
      const wave =
        state === 'idle'
          ? 0.15 + 0.12 * Math.sin(idx * 0.8)
          : baseLevel * (0.55 + 0.45 * Math.abs(Math.sin(idx * 0.65 + normalizedVol * 5)));
      const lengthPx = 5 + Math.round(wave * 15);
      const angle = (idx * 360) / count;
      return { idx, angle, lengthPx, opacity: 0.35 + wave * 0.6 };
    });
  }, [audioVolume, state]);

  // 60 precision degree ticks on outer calibration ring
  const degreeTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      i,
      angle: i * 6,
      major: i % 5 === 0,
    }));
  }, []);

  const containerSizeClass =
    size === 'fullscreen'
      ? 'w-[336px] h-[336px] sm:w-[420px] sm:h-[420px]'
      : 'w-[320px] h-[320px] sm:w-[376px] sm:h-[376px]';

  const coreSizeClass =
    size === 'fullscreen'
      ? 'w-[116px] h-[116px] sm:w-[138px] sm:h-[138px]'
      : 'w-[104px] h-[104px] sm:w-[122px] sm:h-[122px]';

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Main Circular Holographic HUD Arena */}
      <div className={`relative flex items-center justify-center ${containerSizeClass}`}>
        {/* Ambient Holographic Core Halo */}
        <div
          className={`absolute inset-10 rounded-full transition-opacity duration-500 pointer-events-none ${
            state === 'idle' ? 'opacity-35' : 'opacity-75'
          }`}
          style={{
            background:
              state === 'speaking'
                ? 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, rgba(0,212,255,0.08) 48%, transparent 72%)'
                : 'radial-gradient(circle, rgba(0,212,255,0.25) 0%, rgba(14,165,233,0.09) 48%, transparent 72%)',
          }}
        />

        {/* Subtle Scanning Sweep Overlay inside Core Circle */}
        <div className="absolute inset-[24%] rounded-full overflow-hidden pointer-events-none border border-cyan-500/20">
          <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-cyan-400/15 to-cyan-300/35 animate-hud-scan" />
        </div>

        {/* Subtle Holographic Particles */}
        <span className="absolute top-[18%] left-[22%] w-1 h-1 rounded-full bg-cyan-300 animate-hud-particle pointer-events-none" />
        <span
          className="absolute top-[25%] right-[19%] w-1.5 h-1.5 rounded-full bg-sky-300/80 animate-hud-particle pointer-events-none"
          style={{ animationDelay: '0.8s' }}
        />
        <span
          className="absolute bottom-[22%] left-[20%] w-1 h-1 rounded-full bg-slate-200/80 animate-hud-particle pointer-events-none"
          style={{ animationDelay: '1.6s' }}
        />
        <span
          className="absolute bottom-[20%] right-[24%] w-1 h-1 rounded-full bg-cyan-400 animate-hud-particle pointer-events-none"
          style={{ animationDelay: '2.4s' }}
        />

        {/* Rotating SVG Concentric Rings + Audio-Responsive Visualizer */}
        <svg
          viewBox="0 0 360 360"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="jarvisReactorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.24" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#02050b" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="180" cy="180" r="158" fill="url(#jarvisReactorGlow)" />

          {/* Outer Silver Orbit Track */}
          <circle
            cx="180"
            cy="180"
            r="134"
            fill="none"
            stroke="rgba(148, 163, 184, 0.22)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* Outer Precision Degree Calibration Ring (Slow CW) */}
          <g className="origin-center animate-hud-cw-slow" style={{ transformOrigin: '180px 180px' }}>
            <circle
              cx="180"
              cy="180"
              r="112"
              fill="none"
              stroke="rgba(0, 212, 255, 0.28)"
              strokeWidth="1"
            />
            {degreeTicks.map((tick) => {
              const rad = (tick.angle * Math.PI) / 180;
              const r1 = tick.major ? 105 : 108;
              const r2 = 113;
              const x1 = 180 + r1 * Math.cos(rad);
              const y1 = 180 + r1 * Math.sin(rad);
              const x2 = 180 + r2 * Math.cos(rad);
              const y2 = 180 + r2 * Math.sin(rad);
              return (
                <line
                  key={tick.i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={tick.major ? '#cbd5e1' : 'rgba(34, 211, 238, 0.45)'}
                  strokeWidth={tick.major ? '1.5' : '0.8'}
                />
              );
            })}
          </g>

          {/* Mid Segmented Stark Arc Ring (CCW) */}
          <g className="origin-center animate-hud-ccw-med" style={{ transformOrigin: '180px 180px' }}>
            <circle
              cx="180"
              cy="180"
              r="95"
              fill="none"
              stroke={voiceStateMeta.ringStroke}
              strokeOpacity="0.55"
              strokeWidth="2.2"
              strokeDasharray="48 24 16 24 64 28"
              strokeLinecap="round"
            />
            <circle
              cx="180"
              cy="180"
              r="88"
              fill="none"
              stroke="rgba(226, 232, 240, 0.35)"
              strokeWidth="1"
              strokeDasharray="18 42"
            />
          </g>

          {/* Inner Turbine Ring (Fast CW) */}
          <g
            className={`origin-center ${
              state === 'thinking' || state === 'acting' || state === 'listening'
                ? 'animate-hud-cw-fast'
                : 'animate-hud-cw-slow'
            }`}
            style={{ transformOrigin: '180px 180px' }}
          >
            <circle
              cx="180"
              cy="180"
              r="78"
              fill="none"
              stroke="#00d4ff"
              strokeOpacity="0.65"
              strokeWidth="1.8"
              strokeDasharray="12 18 4 18"
            />
          </g>

          {/* Radial Audio-Responsive Equalizer Ring */}
          <g>
            {visualizerBars.map((bar) => {
              const rad = (bar.angle * Math.PI) / 180;
              const innerR = 64;
              const outerR = innerR + bar.lengthPx;
              const x1 = 180 + innerR * Math.cos(rad);
              const y1 = 180 + innerR * Math.sin(rad);
              const x2 = 180 + outerR * Math.cos(rad);
              const y2 = 180 + outerR * Math.sin(rad);
              return (
                <line
                  key={bar.idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={state === 'speaking' ? '#34d399' : '#22d3ee'}
                  strokeOpacity={bar.opacity}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>

        {/* Energy Ripple Rings during Active Listening / Speaking */}
        {(state === 'listening' || state === 'speaking') && (
          <>
            <span
              className={`absolute w-32 h-32 rounded-full border pointer-events-none animate-hud-ripple ${
                state === 'speaking' ? 'border-emerald-400/60' : 'border-cyan-400/70'
              }`}
            />
            <span
              className={`absolute w-32 h-32 rounded-full border pointer-events-none animate-hud-ripple ${
                state === 'speaking' ? 'border-emerald-300/40' : 'border-sky-300/50'
              }`}
              style={{ animationDelay: '0.9s' }}
            />
          </>
        )}

        {/* Central Arc Reactor Core Button */}
        <button
          type="button"
          onClick={onCoreClick}
          aria-label={state === 'listening' ? 'Stop listening' : 'Activate J. A. R. V. I. S. voice'}
          className={`relative z-20 flex flex-col items-center justify-center rounded-full transition-transform duration-300 active:scale-95 border-2 ${coreSizeClass} ${
            state === 'listening'
              ? 'bg-gradient-to-b from-cyan-950 via-sky-950 to-slate-950 border-cyan-300 text-cyan-200 scale-105'
              : state === 'speaking'
              ? 'bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 border-emerald-300 text-emerald-200 scale-105'
              : state === 'thinking' || state === 'acting'
              ? 'bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950 border-sky-300 text-sky-200'
              : 'bg-gradient-to-b from-slate-900 via-[#040c1a] to-[#02050b] border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:scale-105'
          } ${voiceStateMeta.glowClass}`}
        >
          {/* Metallic Silver Inner Bezel */}
          <span className="absolute inset-1.5 rounded-full border border-slate-300/30 pointer-events-none" />
          {/* Arc Reactor Radial Coil Ring */}
          <span
            className={`absolute inset-3 rounded-full border-2 border-dashed pointer-events-none ${
              state === 'speaking'
                ? 'border-emerald-400/60 animate-hud-cw-fast'
                : 'border-cyan-400/60 animate-hud-core'
            }`}
          />

          <div className="relative z-10 flex flex-col items-center justify-center gap-1">
            {state === 'thinking' || state === 'acting' ? (
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-sky-300 animate-spin" />
            ) : state === 'speaking' ? (
              <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 animate-pulse" />
            ) : (
              <Mic
                className={`w-7 h-7 sm:w-8 sm:h-8 ${
                  state === 'listening' ? 'text-white drop-shadow-[0_0_8px_#00d4ff]' : 'text-cyan-300'
                }`}
              />
            )}

            <span className="font-hud text-[9px] sm:text-[10px] font-bold tracking-[0.18em] text-slate-100">
              {voiceStateMeta.badge}
            </span>
          </div>
        </button>

        {/* 6 Radial Interactive Circular Menu Options */}
        {MENU_NODES.map((node) => {
          const rad = (node.angleDeg * Math.PI) / 180;
          const radiusPct = 37;
          const leftPct = 50 + radiusPct * Math.sin(rad);
          const topPct = 50 - radiusPct * Math.cos(rad);
          const IconComp = node.icon;
          const isSelected = activeMenu === node.id;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectMenu(node.id)}
              style={{
                left: `${leftPct.toFixed(2)}%`,
                top: `${topPct.toFixed(2)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={node.label}
              className="group absolute z-30 flex flex-col items-center justify-center focus:outline-none"
            >
              <span
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 backdrop-blur-md ${
                  isSelected
                    ? 'bg-cyan-500/25 border-cyan-300 text-white shadow-[0_0_18px_rgba(0,212,255,0.6)]'
                    : 'bg-[#040b18]/90 border-cyan-500/40 group-hover:border-cyan-300 group-hover:bg-cyan-950/80 text-cyan-300 group-hover:text-white shadow-[0_0_12px_rgba(0,212,255,0.18)]'
                }`}
              >
                <IconComp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-[#02050b]/90 border border-slate-700/70 text-[9px] font-hud tracking-wider text-slate-200 group-hover:text-cyan-200 whitespace-nowrap">
                {node.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explicit Voice State Readout Pill */}
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-hud tracking-[0.18em] ${voiceStateMeta.accent}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-cyan-400 animate-ping'
                : state === 'speaking'
                ? 'bg-emerald-400 animate-pulse'
                : state === 'thinking' || state === 'acting'
                ? 'bg-sky-400 animate-pulse'
                : 'bg-cyan-500/70'
            }`}
          />
          <span>STATE: {voiceStateMeta.statusLabel}</span>
        </span>
      </div>
    </div>
  );
};
