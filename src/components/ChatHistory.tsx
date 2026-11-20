import React from 'react';
import {
  Volume2,
  Sparkles,
  User,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { ChatMessage, EmotionTone } from '../types';

interface ChatHistoryProps {
  messages: ChatMessage[];
  onReplayAudio: (text: string, base64Audio?: string, emotion?: EmotionTone) => void;
  onOpenWhatsAppModal: (recipient?: string, message?: string, phone?: string) => void;
  onOpenQRModal: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  onReplayAudio,
  onOpenWhatsAppModal,
  onOpenQRModal,
}) => {
  const getEmotionBadge = (emotion?: EmotionTone) => {
    switch (emotion) {
      case 'happy':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">Happy</span>;
      case 'warm':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">Warm</span>;
      case 'empathetic':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-medium">Caring</span>;
      case 'calm':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium">Calm</span>;
      case 'serious':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-medium">Security</span>;
      case 'urgent':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-600 text-white font-bold animate-pulse">SOS Urgent</span>;
      case 'encouraging':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">Energetic</span>;
      default:
        return null;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center text-cyan-300 mb-3 shadow-[0_0_20px_rgba(0,212,255,0.15)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-hud font-bold tracking-wide text-cyan-100">
          Namaste Ganesh Ji! Main J. A. R. V. I. S. Hoon
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          Arc Reactor Core dabakar Hinglish ya English me bolein. Jaise—
        </p>
        <div className="mt-3 flex flex-wrap gap-2 justify-center max-w-sm">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#040a16] border border-cyan-500/25 text-slate-300">
            "Turn on Smart Bulb"
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#040a16] border border-cyan-500/25 text-slate-300">
            "WhatsApp kholo"
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#040a16] border border-cyan-500/25 text-slate-300">
            "Emergency SOS"
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#040a16] border border-cyan-500/25 text-slate-300">
            "Camera kholo"
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 px-2 py-2">
      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';
        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500">
              {isAssistant ? (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-300 font-hud tracking-wider">J. A. R. V. I. S.</span>
                  {getEmotionBadge(msg.emotion)}
                </>
              ) : (
                <>
                  <span className="text-slate-300">Ganesh (Boss)</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              )}
              <span>•</span>
              <span className="font-mono-hud">
                {msg.timestamp.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div
              className={`max-w-[90%] rounded-2xl p-3.5 shadow-lg ${
                isAssistant
                  ? 'bg-[#040b18]/95 border border-cyan-500/25 text-slate-100 rounded-tl-sm'
                  : 'bg-gradient-to-r from-cyan-700 to-sky-700 border border-cyan-400/40 text-white rounded-tr-sm shadow-cyan-900/30'
              }`}
            >
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* WhatsApp Action Card */}
              {isAssistant && msg.actionType === 'SEND_WHATSAPP' && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp Draft Ready</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Permission Required
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 italic">
                    Recipient: <strong>{msg.actionDetails?.recipient || 'Friend'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded-lg mt-1 border border-slate-800">
                    "{msg.actionDetails?.message || '...'}"
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenWhatsAppModal(
                        msg.actionDetails?.recipient,
                        msg.actionDetails?.message,
                        msg.actionDetails?.phone
                      )
                    }
                    className="mt-2 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>Review &amp; Send WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* QR Payment Card */}
              {isAssistant && msg.actionType === 'SCAN_PAYMENT' && (
                <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                  <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold mb-1.5">
                    <span className="flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Camera QR Scanner Ready</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenQRModal}
                    className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>Open Camera QR Scanner</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Unauthorized attempt security badge */}
              {isAssistant && msg.actionDetails?.feature === 'unauthorized_attempt' && (
                <div className="mt-2.5 p-2 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between text-xs text-red-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    <span>Protected Feature Access Blocked</span>
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono-hud">
                    Owner Auth Required
                  </span>
                </div>
              )}

              {/* Safety Advice */}
              {isAssistant && msg.safetyAdvice && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[10px] text-amber-300/90">
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span>{msg.safetyAdvice}</span>
                </div>
              )}

              {/* Replay Button */}
              {isAssistant && (
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onReplayAudio(msg.text, msg.audioBase64, msg.emotion)}
                    className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 transition py-1 px-2 rounded-md hover:bg-cyan-950/60 border border-transparent hover:border-cyan-500/30"
                    title="Dobara sunein"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Dobara Sunein</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
