import React from 'react';
import { Mic, MicOff, Smartphone, AlertTriangle } from 'lucide-react';
import { isOwnerAuthenticated } from '../services/voiceBiometricsService';
import { backgroundWakeService } from '../services/backgroundWakeService';

interface BackgroundServiceBarProps {
  isRunning: boolean;
  onToggleService: () => void;
  audioVolume?: number;
  dominantPitchHz?: number;
  onOpenSettings?: () => void;
  onOpenVoiceProfile?: () => void;
  isOwnerEnrolled?: boolean;
}

export const BackgroundServiceBar: React.FC<BackgroundServiceBarProps> = ({
  isRunning,
  onToggleService,
  dominantPitchHz = 0,
  onOpenSettings,
  onOpenVoiceProfile,
  isOwnerEnrolled = false,
}) => {
  const isOwnerSessionActive = isOwnerAuthenticated();
  const wakeCaps = backgroundWakeService.getCapabilities();

  return (
    <div className="w-full px-3 py-1.5 border-b border-cyan-500/20 bg-[#030814]/95 backdrop-blur-md transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!wakeCaps.supported ? (
            <div className="flex items-center gap-2 text-amber-300 text-xs min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-amber-200 truncate">
                  Wake-Word Unsupported on This Browser
                </span>
                <span className="text-[9px] text-slate-400 truncate">
                  Web Speech API nahi mila — Tap JARVIS core or type commands
                </span>
              </div>
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 truncate">
                  <span className="font-hud tracking-wider text-[10px]">
                    {wakeCaps.isNativeAndroidBackground ? 'WAKE ACTIVE' : 'FOREGROUND WAKE'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/90 border border-cyan-500/35 text-cyan-200">
                    "Hey JARVIS"
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                  <span>Owner: Ganesh</span>
                  {isOwnerSessionActive ? (
                    <span className="text-emerald-400 font-semibold">Auth OK</span>
                  ) : isOwnerEnrolled ? (
                    <span className="text-cyan-400">Guarded</span>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenVoiceProfile}
                      className="text-amber-400 underline hover:text-amber-300"
                    >
                      Enroll Voice
                    </button>
                  )}
                  {dominantPitchHz > 0 && (
                    <span className="text-cyan-300 font-mono-hud text-[9px]">
                      {dominantPitchHz}Hz
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs min-w-0">
              <span className="h-2 w-2 rounded-full bg-slate-600 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-slate-200 truncate">
                  Wake Standby • Say "Hey JARVIS"
                </span>
                <span className="text-[9px] text-slate-500 truncate">
                  {wakeCaps.isNativeAndroidBackground
                    ? 'Native background wake ready'
                    : 'Active while page open (Browser OS limits background mic)'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!wakeCaps.supported ? (
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
              Unsupported
            </span>
          ) : isRunning ? (
            <button
              type="button"
              onClick={onToggleService}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
              title="Stop Wake Listening"
            >
              <MicOff className="w-3 h-3 text-rose-400" />
              <span>Turn Off</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleService}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition shadow-[0_0_12px_rgba(0,212,255,0.18)]"
              title="Activate Hey JARVIS Wake Word"
            >
              <Mic className="w-3 h-3 text-cyan-300" />
              <span>Enable Wake</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-200 hover:bg-slate-800/80 transition"
              title="Background Diagnostics"
              aria-label="Background Settings"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
