import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Lock,
  Mic,
  Camera,
  ExternalLink,
  Download,
  Flame,
} from 'lucide-react';

interface VivoSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VivoSetupGuideModal: React.FC<VivoSetupGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>J. A. R. V. I. S. Setup & Android Guide</span>
              </h2>
              <p className="text-xs text-slate-400">Vivo Y20G (Funtouch OS) System & Permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Section 1: Working Features */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Live Working Features in J. A. R. V. I. S.</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-slate-100">Hinglish Voice Commands:</strong> Mic button ("Ab boliye") dabakar Hinglish ya English me bolein.
              </li>
              <li>
                <strong className="text-slate-100">Natural Female Voice:</strong> Realistic, expressive female voice synthesis with emotion modulation.
              </li>
              <li>
                <strong className="text-slate-100">Screen-Edge Neon Glow:</strong> Google Assistant style 4-corner animated border during voice interaction.
              </li>
              <li>
                <strong className="text-slate-100">Connected IoT Devices:</strong> Smart Bulb, Android TV, Bluetooth Speaker, Smart Watch, and Secondary Phone controls.
              </li>
              <li>
                <strong className="text-slate-100">Owner Biometrics:</strong> Acoustic frequency sampling for Ganesh & Face ID verification with PIN fallback.
              </li>
              <li>
                <strong className="text-slate-100">Touch & Motion Security:</strong> Auto-lock in-app shield with exact warning phrase: <em>"Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein."</em>
              </li>
              <li>
                <strong className="text-slate-100">Owner Voice & Fallback PIN:</strong> Ganesh ji ke enrolled voice profile ya Master PIN (1234) ke bina privileged commands execute nahi hote.
              </li>
              <li>
                <strong className="text-slate-100">Emergency SOS:</strong> 1-tap call, WhatsApp SOS draft, and live Google Maps GPS location sharing link.
              </li>
            </ul>
          </div>

          {/* Section 2: Browser Permissions */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>2. Essential Permissions</span>
            </div>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <Mic className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-100">Microphone Permission:</p>
                  <p className="text-[11px] text-slate-400">
                    Voice commands sunne aur Ganesh ji ki acoustic frequency sample karne ke liye zaroori hai.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <Camera className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-100">Camera & Torch Permission:</p>
                  <p className="text-[11px] text-slate-400">
                    QR code scanner, flashlight aur camera face verification ke liye zaroori hai. (Privacy indicator hamesha screen par dikhta hai).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Android Device Administrator & Lock Boundaries */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>3. Android OS Security &amp; Device Admin Setup</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Browser preview / PWA me chalte waqt sandbox restrictions ke tehat full Android device screen ko bina permission lock nahi kiya ja sakta; isliye J. A. R. V. I. S. data-protecting **In-App Security Shield** lock activate karti hai.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <strong className="text-cyan-300 block">Native Android Device Admin Enable Karne Ke Steps:</strong>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[10px]">
                <li>Phone ki <strong>Settings &gt; Security &gt; Device Administrators</strong> me jayein.</li>
                <li>Agar aapne APK compile karke install kiya hai, to <strong>J. A. R. V. I. S. Device Admin</strong> ko toggle karein.</li>
                <li><strong>"Activate this device admin app"</strong> select karein. Isse app ko authorized <code className="text-cyan-300">DevicePolicyManager.lockNow()</code> hardware lock privilege mil jata hai.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
