import React, { useState } from 'react';
import {
  X,
  BookOpen,
  FileText,
  Shield,
  Layers,
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  Cpu,
  History,
  Smartphone,
} from 'lucide-react';

interface ProjectMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DocTab = 'instructions' | 'features' | 'architecture' | 'permissions' | 'changelog' | 'deployment';

export const ProjectMemoryModal: React.FC<ProjectMemoryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DocTab>('instructions');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>J. A. R. V. I. S. Project Memory</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  v3.9.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Permanent Documentation, Features & Architecture Charter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-1.5 overflow-x-auto py-2.5 border-b border-slate-800/80 custom-scrollbar flex-shrink-0 text-xs">
          {[
            { id: 'instructions', label: 'Instructions', icon: FileText },
            { id: 'features', label: 'Features (14/14)', icon: Sparkles },
            { id: 'architecture', label: 'Architecture', icon: Cpu },
            { id: 'permissions', label: 'Permissions', icon: Shield },
            { id: 'deployment', label: 'Deploy & Multi-Phone', icon: Smartphone },
            { id: 'changelog', label: 'Changelog', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DocTab)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 custom-scrollbar text-xs text-slate-300 pr-1">
          {activeTab === 'instructions' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                <div className="text-xs font-bold text-cyan-300">
                  Permanent Project Charter & Rules
                </div>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                  <li><strong>Official Name:</strong> Strictly <code>J. A. R. V. I. S.</code> with spaces and periods everywhere.</li>
                  <li><strong>Authorized Owner:</strong> Ganesh (<code>jenaganesh9692@gmail.com</code>).</li>
                  <li><strong>Voice Persona:</strong> Natural, emotionally expressive female voice in Roman Hindi / Hinglish.</li>
                  <li><strong>Non-Destructive Updates:</strong> All future prompts modify existing code in-place. Purane working features kabhi delete ya reset nahi honge.</li>
                  <li><strong>Zero Password Sharing:</strong> Google account password ya phone lock PIN kabhi prompt me nahi maanga jata.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-2.5">
              {[
                { name: '1. Background Wake Word', desc: '"Hey J. A. R. V. I. S." bolte hi activate hoti hai aur follow-up commands sunti hai bina har baar app kholne ki zaroorat ke.' },
                { name: '2. Owner Voice Recognition', desc: 'Ganesh ji ki 3-sample frequency harmonics se speaker verify hota hai. Doosre vyakti par warning alert bolti hai.' },
                { name: '3. Touch & Motion Anti-Theft Guard', desc: 'Phone uthane ya screen chhoone par siren bajti hai aur lock shield activate hota hai.' },
                { name: '4. Emergency SOS Hub', desc: 'Parents ko 1-tap call, GPS location link ke sath SMS, aur camera video proof record karta hai.' },
                { name: '5. Camera Hub', desc: 'Live HD viewfinder, photo capture, save aur gallery switch.' },
                { name: '6. Apps Launcher & Intents', desc: 'Chrome, YouTube, Google Maps, WhatsApp, Instagram, Facebook aur settings deep-links.' },
                { name: '7. Hardware Flashlight & Brightness', desc: 'Hardware torch toggle aur in-app screen dimmer control.' },
                { name: '8. Smart Home IoT Devices', desc: 'Bulb, TV mute/power, speaker aur smart watch simulated controller.' },
                { name: '9. Alarms & Bedtime Sleep Mode', desc: 'Voice-set alarms (snooze/dismiss) aur raat ko sweet sleep mode announcement.' },
                { name: '10. Instant ZIP Export', desc: 'Poore project ka complete 1-click source code ZIP download (/api/export-project).' },
                { name: '11. Voice Studio (Custom & Built-in Voices)', desc: 'Apni khud ki recorded/uploaded voice ya built-in AI/Browser voices select karein aur permanent save rakhein.' },
                { name: '12. Smart Camera & AI Girlfriend Mode', desc: 'Explicit camera permission ke saath live visual interaction aur caring AI companion personality.' },
                { name: '13. Stark Holographic Circular HUD', desc: 'Arc Reactor core, rotating SVG rings, audio visualizer, 6 radial quick actions aur "Hey J. A. R. V. I. S." full-screen HUD.' },
                { name: '14. Authorized AI Call Assistant', desc: 'Native Android InCallService & CallScreeningService se authorized call answering aur instant "mujhe baat karni hai" human handoff.' },
              ].map((f, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {f.name}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-cyan-300 font-bold">Client-Server & Android Flow</div>
                <div className="text-slate-400">
                  [Client UI / Stark HUD] --(Web Audio FFT & Speech API)--&gt; Local Biometrics (Zero Upload)
                  <br />
                  [Client UI] --(POST /api/assistant/chat, /vision, /call-reply)--&gt; [Server: Gemini 3.8 Flash]
                  <br />
                  [Client UI] --(window.JarvisAndroidCallBridge)--&gt; [JarvisInCallService.kt &amp; CallScreeningService.kt]
                  <br />
                  [Android APK Package] --(JarvisForegroundService.kt)--&gt; Persistent Mic Daemon
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-2.5 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-300">Microphone:</span>
                <p className="text-slate-400">Wake-word detection aur voice commands ke liye. Local mathematical feature extraction hoti hai, audio kisi server par stream nahi hota.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-300">Camera:</span>
                <p className="text-slate-400">Photo lene aur SOS emergency video record karne ke liye.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-300">Screen Wake Lock & Battery Saver Exemption:</span>
                <p className="text-slate-400">Background me J. A. R. V. I. S. ko active rakhne ke liye Android Doze mode se exemption di jati hai.</p>
              </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2">
                <div className="text-xs font-bold text-cyan-300">Live Central Cloud App URL</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Aap is link ko kisi bhi Android phone par kholkar ek hi central J. A. R. V. I. S. assistant use kar sakte hain:
                </p>
                <a
                  href="https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-slate-950 border border-slate-800 text-cyan-300 block font-mono text-[11px] hover:underline break-all"
                >
                  https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-[11px]">
                <div className="font-bold text-white">Same Assistant on Every Phone:</div>
                <p className="text-slate-400 leading-relaxed">
                  Har phone par same central version chalegi. Phone ke local permissions aur alarm schedules har device par alag aur safe rahenge. Future me jo bhi update aap yahan karenge, wo sabhi devices par bina re-install kiye automatically refresh ho jayenge!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-cyan-300">v3.9.0 (Current)</div>
                <div className="text-slate-400">Advanced AI Call Assistant with explicit authorization gates, instant "JARVIS, mujhe baat karni hai" human takeover, native Android InCallService + CallScreeningService + JarvisCallBridge.</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-slate-300">v3.8.0</div>
                <div className="text-slate-400">Stark Holographic Circular HUD, Arc Reactor core, audio-responsive visualizer, full-screen wake HUD, System Status modal, Roman Hindi UI standardization.</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-slate-300">v3.5.0 - v3.7.0</div>
                <div className="text-slate-400">Voice Studio (Custom recorded/uploaded voice + built-in presets), Smart Camera Live Vision &amp; AI Girlfriend companion personality.</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-slate-300">v3.2.0</div>
                <div className="text-slate-400">Permanent Project Management System, Multi-Device Portability, and documentation suite.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0 text-xs">
          <a
            href="/api/export-project"
            download="j-a-r-v-i-s-assistant-project.zip"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Project ZIP</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
