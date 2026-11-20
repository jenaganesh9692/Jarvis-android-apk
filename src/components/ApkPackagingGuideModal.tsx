import React, { useEffect, useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  Terminal,
  ExternalLink,
  Code2,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  Bot,
  HelpCircle,
  Send,
} from 'lucide-react';

interface ApkPackagingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncSnapshot {
  syncedAt: string;
  app: string;
  owner: string;
  version: string;
  androidPackage: string;
  liveUrl: string;
  exportZipUrl: string;
  openApiSchemaUrl: string;
  githubWorkflowReady: boolean;
  androidProjectReady: boolean;
  chatgptSyncReady: boolean;
  components: string[];
  services: string[];
  androidFiles: string[];
  features: string[];
}

interface HelpTopicResponse {
  topic: string;
  title: string;
  steps: string[];
  notes?: string[];
}

type GuideTab = 'github' | 'chatgpt' | 'pwa_local';

const FALLBACK_LIVE_URL =
  'https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app';

export const ApkPackagingGuideModal: React.FC<ApkPackagingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('github');
  const [syncData, setSyncData] = useState<SyncSnapshot | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [helpTopic, setHelpTopic] = useState<string>('chatgpt-connect');
  const [helpData, setHelpData] = useState<HelpTopicResponse | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [isAskingHelp, setIsAskingHelp] = useState(false);

  const fetchLiveSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/chatgpt/sync');
      if (!res.ok) throw new Error('Sync server unreachable');
      const data: SyncSnapshot = await res.json();
      setSyncData(data);
    } catch {
      setSyncError('Live server sync abhi offline hai (local cached context use ho raha hai).');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchHelpTopic = async (topic: string) => {
    setHelpTopic(topic);
    try {
      const res = await fetch(`/api/chatgpt/help?topic=${encodeURIComponent(topic)}`);
      if (!res.ok) return;
      const data: HelpTopicResponse = await res.json();
      setHelpData(data);
    } catch {
      // ignore non-fatal
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchLiveSync();
    fetchHelpTopic(helpTopic);
  }, [isOpen]);

  if (!isOpen) return null;

  const liveUrl = syncData?.liveUrl || FALLBACK_LIVE_URL;
  const openApiUrl = syncData?.openApiSchemaUrl || `${FALLBACK_LIVE_URL}/chatgpt/openapi.json`;

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      setCopiedKey(null);
    }
  };

  const buildChatGptSyncPrompt = (): string => {
    const version = syncData?.version || '3.9.0';
    const componentsList =
      syncData?.components?.length ? syncData.components.join(', ') : 'ArcReactorHud, StarkFullScreenHud, VoiceSelectorModal, CameraSectionModal, CallAssistantModal, ApkPackagingGuideModal';
    const androidFilesList =
      syncData?.androidFiles?.length ? syncData.androidFiles.join(', ') : 'MainActivity.kt, JarvisCallBridge.kt, JarvisInCallService.kt, JarvisCallScreeningService.kt, JarvisForegroundService.kt';

    return [
      `Tum mere "J. A. R. V. I. S." Android & Web Assistant project (v${version}) ke Build & Help Companion ho.`,
      `Rules: Sirf Romanized Hindi (Hinglish) ya simple English me jawab do (NO Devanagari script). Purane features kabhi delete mat karo.`,
      ``,
      `=== LIVE SYNCED PROJECT DETAILS ===`,
      `- Owner: Ganesh`,
      `- Android Package / Namespace: com.jarvis.assistant (minSdk 26, targetSdk 34, AGP 8.3.2, Gradle 8.7, Java 17)`,
      `- Published Cloud Run URL: ${liveUrl}`,
      `- Project ZIP Export URL: ${liveUrl}/api/export-project`,
      `- Live Sync JSON URL: ${liveUrl}/api/chatgpt/sync`,
      `- GitHub APK Build Workflow: .github/workflows/build-apk.yml (${syncData?.githubWorkflowReady === false ? 'Pending' : 'Ready'})`,
      `- Active UI Components: ${componentsList}`,
      `- Native Android Kotlin Files: ${androidFilesList}`,
      ``,
      `Jab main GitHub APK build error, Gradle issue, Vivo Android permission, ya naya feature prompt poochun, to isi synced project ke hisab se step-by-step mobile-friendly help do. Samajh gaye?`,
    ].join('\n');
  };

  const handleCopyCustomInstructions = async () => {
    try {
      const res = await fetch('/api/chatgpt/instructions');
      if (res.ok) {
        const data = await res.json();
        if (data?.instructions) {
          await handleCopy('gpt_instructions', data.instructions);
          return;
        }
      }
    } catch {
      // fallback below
    }
    await handleCopy('gpt_instructions', buildChatGptSyncPrompt());
  };

  const handleAskBuildHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = customQuestion.trim();
    if (!q || isAskingHelp) return;
    setIsAskingHelp(true);
    try {
      const res = await fetch('/api/chatgpt/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, topic: helpTopic }),
      });
      const data = await res.json();
      setCustomAnswer(data?.answer || 'Koi response nahi mila, kripya dobara koshish karein.');
    } catch {
      setCustomAnswer('Help server se connect nahi ho paya. Kripya internet check karein.');
    } finally {
      setIsAskingHelp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                J. A. R. V. I. S. — GitHub APK &amp; ChatGPT Sync
              </h3>
              <p className="text-[11px] text-slate-400">
                Mobile Cloud APK Builder, ChatGPT Live Sync &amp; Installation Guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 py-2.5 border-b border-slate-800 flex-shrink-0 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('github')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'github'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>GitHub APK</span>
          </button>

          <button
            onClick={() => setActiveTab('chatgpt')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'chatgpt'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>ChatGPT Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa_local')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'pwa_local'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>PWA &amp; Local</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-4 text-xs text-slate-300 pr-1">
          {activeTab === 'github' && (
            <>
              {/* Mobile-Only GitHub Cloud APK Build */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-400/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Mobile Par Direct .APK Banayein (GitHub Cloud Build)
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {syncData?.githubWorkflowReady ? 'Workflow Ready' : 'No PC Needed'}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Is project me <code className="text-cyan-300">.github/workflows/build-apk.yml</code> aur poora native <code className="text-cyan-300">android/</code> Gradle project pehle se ready hai. Mobile se APK banane ke liye ye 5 steps follow karein:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-200 text-[11px]">
                  <li>
                    Neeche diye gaye <strong>Export .ZIP</strong> button se <code className="text-cyan-300">j-a-r-v-i-s-assistant-project.zip</code> phone me download karke extract karein.
                  </li>
                  <li>
                    Apne phone ke browser me <strong>github.com</strong> kholein aur ek naya repository (e.g. <code className="text-cyan-300">jarvis-apk</code>) banayein.
                  </li>
                  <li>
                    Extracted files (including hidden <code className="text-cyan-300">.github/workflows/build-apk.yml</code> aur <code className="text-cyan-300">android/</code> folder) ko GitHub repo me upload/commit karein.
                  </li>
                  <li>
                    GitHub repo ke <strong>Actions</strong> tab me jayein &rarr; <strong>&quot;Build JARVIS Android APK&quot;</strong> select karke <strong>Run workflow</strong> dabayein.
                  </li>
                  <li>
                    2-3 minute me build complete hone par neeche <strong>Artifacts &rarr; JARVIS-Android-APK</strong> download karke <code className="text-emerald-300">app-debug.apk</code> phone me install karein!
                  </li>
                </ol>
              </div>

              {/* Technical Comparison */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Web Preview vs Native Android APK Capabilities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Active in Web &amp; APK:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Live Camera Vision &amp; AI Girlfriend Mode</li>
                      <li>Voice Studio (Custom Recorded + Built-in Voices)</li>
                      <li>Stark Circular HUD &amp; &quot;Hey JARVIS&quot; Voice Trigger</li>
                      <li>Emergency SOS, Alarms, Anti-Theft &amp; Apps Launcher</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                    <span className="font-bold text-indigo-300 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      Unlocked in Compiled APK:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Native Android Call Assistant (<code className="text-indigo-300">InCallService</code>)</li>
                      <li>Foreground Wake Service (<code className="text-indigo-300">JarvisForegroundService</code>)</li>
                      <li>Hybrid Online AI + Offline Bundled Fallback</li>
                      <li>Standalone Home Screen App (<code className="text-indigo-300">com.jarvis.assistant</code>)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'chatgpt' && (
            <>
              {/* Live Sync Status Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    ChatGPT &amp; J. A. R. V. I. S. Live Sync Status
                  </div>
                  <button
                    onClick={fetchLiveSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>

                {syncError && (
                  <p className="text-[11px] text-amber-300">{syncError}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Project Version</span>
                    <span className="font-mono font-bold text-cyan-300">
                      v{syncData?.version || '3.9.0'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">GitHub APK Setup</span>
                    <span className="font-bold text-emerald-300">
                      {syncData?.githubWorkflowReady === false ? 'Pending' : 'Ready & Synced'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Modules Synced</span>
                    <span className="font-mono font-bold text-white">
                      {syncData ? `${syncData.components.length} UI / ${syncData.androidFiles.length} APK` : '25 UI / 5 APK'}
                    </span>
                  </div>
                </div>

                {syncData?.syncedAt && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Last Synced: {new Date(syncData.syncedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Method A: Free ChatGPT Mobile App 1-Tap Sync */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Option 1: ChatGPT Mobile App Instant Sync (Free &amp; Fast)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Apne phone ke ChatGPT app ko turant is project ke latest code, GitHub APK workflow aur Android setup ke sath sync karne ke liye neeche button dabakar prompt copy karein aur ChatGPT chat me paste kar dein:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy('sync_prompt', buildChatGptSyncPrompt())}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-600/25"
                  >
                    {copiedKey === 'sync_prompt' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied Sync Prompt!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy ChatGPT Sync Prompt</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyCustomInstructions}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 text-xs font-semibold transition"
                  >
                    {copiedKey === 'gpt_instructions' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Copied GPT Instructions!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Custom GPT Instructions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Method B: Custom GPT Actions OpenAPI Sync */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  Option 2: Custom GPT Actions (Automatic Live Cloud Sync)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                  <li>ChatGPT me <strong>Explore GPTs &rarr; Create &rarr; Configure &rarr; Actions</strong> kholein.</li>
                  <li><strong>Import from URL</strong> me ye live OpenAPI Schema URL paste karein:</li>
                </ol>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300">
                  <span className="break-all flex-1">{openApiUrl}</span>
                  <button
                    onClick={() => handleCopy('openapi_url', openApiUrl)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex-shrink-0"
                    title="Copy OpenAPI URL"
                  >
                    {copiedKey === 'openapi_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Authentication <strong>None</strong> rakhein. Ab ChatGPT automatically <code className="text-cyan-300">/api/chatgpt/sync</code> se aapke project ke latest modules aur APK build help read kar sakega.
                </p>
              </div>

              {/* Built-in Build & Help Quick Troubleshooter */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Instant Build &amp; Sync Help Center
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'chatgpt-connect', label: 'ChatGPT Sync' },
                    { id: 'github-apk', label: 'GitHub APK' },
                    { id: 'gradle-error', label: 'Gradle Fixes' },
                    { id: 'android-permissions', label: 'Vivo Permissions' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => fetchHelpTopic(item.id)}
                      className={`py-1.5 px-2 rounded-lg font-medium border transition ${
                        helpTopic === item.id
                          ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {helpData && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="font-bold text-cyan-300">{helpData.title}</div>
                    <ul className="space-y-1 text-slate-300">
                      {helpData.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleAskBuildHelp} className="flex gap-2">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Build error ya setup sawal likhein..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isAskingHelp || !customQuestion.trim()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAskingHelp ? '...' : 'Ask'}</span>
                  </button>
                </form>

                {customAnswer && (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-slate-200 whitespace-pre-line">
                    {customAnswer}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'pwa_local' && (
            <>
              {/* Live Deployment Links */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Live Deployment Links
                </div>
                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800">
                    <span className="text-emerald-400 font-bold block text-[10px] uppercase">
                      Published Public Web App Link:
                    </span>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline break-all block mt-0.5"
                    >
                      {liveUrl}
                    </a>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800">
                    <span className="text-indigo-400 font-bold block text-[10px] uppercase">
                      Development &amp; Live Test Link:
                    </span>
                    <a
                      href="https://ais-dev-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-300 hover:underline break-all block mt-0.5"
                    >
                      https://ais-dev-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app
                    </a>
                  </div>
                </div>
              </div>

              {/* Instant PWA Direct Install */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Instant Android Home Screen App (PWA 1-Tap Install)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300 text-[11px]">
                  <li>Phone ke Google Chrome me <strong>{liveUrl}</strong> kholein.</li>
                  <li>Chrome ke top-right <strong>3 Dots Menu (⋮)</strong> par tap karein.</li>
                  <li><strong>&quot;Install app&quot;</strong> ya <strong>&quot;Add to Home screen&quot;</strong> select karein.</li>
                  <li>Home screen par J. A. R. V. I. S. ka icon aa jayega jo fullscreen native app ki tarah khulta hai.</li>
                </ol>
              </div>

              {/* Local Gradle Build */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Local Standalone .APK Build (Gradle)
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1 select-all">
                  <div>npm install &amp;&amp; npm run build</div>
                  <div>mkdir -p android/app/src/main/assets/dist &amp;&amp; cp -r dist/* android/app/src/main/assets/dist/</div>
                  <div>cd android &amp;&amp; gradle assembleDebug</div>
                </div>
              </div>

              {/* Security & Preservation Policy */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  Security &amp; Project Preservation
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Google Password ya Gemini API Key kabhi kisi prompt ya sync link me share nahi hoti.</li>
                  <li>Saare project configs (<code className="text-cyan-300">.github/</code>, <code className="text-cyan-300">.chatgpt/</code>, <code className="text-cyan-300">android/</code>) ZIP export me included hain.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <a
            href="/api/export-project"
            download="j-a-r-v-i-s-assistant-project.zip"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-cyan-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Full .ZIP</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
