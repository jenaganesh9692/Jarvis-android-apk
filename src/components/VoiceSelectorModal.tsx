import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  X,
  Play,
  Square,
  Check,
  Sparkles,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Languages,
  Headphones,
  Upload,
  Mic,
  Activity,
  Cpu,
  Info,
  Radio,
  Trash2,
  ExternalLink,
  Music,
  CheckCircle2,
} from 'lucide-react';
import {
  VoiceArchetype,
  VoiceArchetypeId,
  SpeakingStyle,
  VoiceEngineMode,
  CustomUploadedVoice,
  CustomVoiceClip,
  ProfessionalVoiceOption,
  VoiceSourceType,
} from '../types';
import {
  VOICE_ARCHETYPES,
  loadVoiceSettings,
  saveVoiceSettings,
  loadCustomUploadedVoice,
  saveCustomUploadedVoice,
  removeCustomUploadedVoice,
  analyzeUploadedVoiceSample,
  previewArchetypeVoice,
  previewVoice,
  stopSpeaking,
  getProfessionalHindiEnglishVoices,
  DEFAULT_VOICE_SETTINGS,
  VoiceSettings,
  setGlobalVoiceSource,
} from '../services/speechService';
import {
  getAllCustomVoiceClips,
  saveCustomVoiceClip,
  deleteCustomVoiceClip,
  setActiveMasterClip,
  processAudioFile,
  playCustomAudio,
  stopCustomAudio,
  loadCustomVoiceSettings,
} from '../services/customVoiceService';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceSelected?: (settings: VoiceSettings) => void;
}

type TabType = 'archetypes' | 'custom_upload' | 'tuning' | 'device_voices';

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  onVoiceSelected,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('archetypes');
  const [sourceType, setSourceType] = useState<VoiceSourceType>('builtin');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<VoiceArchetypeId>('natural_female');
  const [pitch, setPitch] = useState<number>(1.0);
  const [rate, setRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>('conversational');
  const [engineMode, setEngineMode] = useState<VoiceEngineMode>('hybrid');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Female' | 'Male'>('all');
  const [sampleLanguage, setSampleLanguage] = useState<'hindi' | 'english'>('hindi');

  // Preview state
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Custom Upload and Clips state
  const [customVoice, setCustomVoice] = useState<CustomUploadedVoice | null>(null);
  const [savedClips, setSavedClips] = useState<CustomVoiceClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Device Voices state
  const [deviceVoices, setDeviceVoices] = useState<ProfessionalVoiceOption[]>([]);
  const [selectedDeviceURI, setSelectedDeviceURI] = useState<string>('');

  // Live Recording state
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const loadAllClips = async () => {
    try {
      const clips = await getAllCustomVoiceClips();
      setSavedClips(clips);
      const cSettings = loadCustomVoiceSettings();
      if (cSettings.activeMasterClipId) {
        setActiveClipId(cSettings.activeMasterClipId);
      } else if (clips.length > 0) {
        setActiveClipId(clips[0].id);
      }
    } catch (e) {
      console.warn('Failed to load custom voice clips:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const current = loadVoiceSettings();
    setSourceType(current.sourceType || 'builtin');
    setSelectedArchetypeId(current.archetypeId || 'natural_female');
    setPitch(current.pitch ?? 1.0);
    setRate(current.rate ?? 1.0);
    setVolume(current.volume ?? 1.0);
    setSpeakingStyle(current.speakingStyle || 'conversational');
    setEngineMode(current.engineMode || 'hybrid');
    setSelectedDeviceURI(current.voiceURI || '');

    const savedCustom = loadCustomUploadedVoice();
    setCustomVoice(savedCustom);
    loadAllClips();

    const updateDeviceVoices = () => {
      const list = getProfessionalHindiEnglishVoices();
      setDeviceVoices(list);
    };
    updateDeviceVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateDeviceVoices;
    }

    return () => {
      stopSpeaking();
      stopCustomAudio();
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setFeedbackMessage('');
    }, 2500);
  };

  const filteredArchetypes = VOICE_ARCHETYPES.filter((a) => {
    if (genderFilter === 'Female') return a.gender === 'Female';
    if (genderFilter === 'Male') return a.gender === 'Male';
    return true;
  });

  const activeArchetype = VOICE_ARCHETYPES.find((a) => a.id === selectedArchetypeId);

  // Switch between Built-in AI Voices and Custom Recorded Voice
  const handleSwitchSourceType = (newSourceType: VoiceSourceType) => {
    setSourceType(newSourceType);
    const updated = setGlobalVoiceSource(
      newSourceType,
      selectedArchetypeId,
      activeClipId
    );
    showToast(
      newSourceType === 'custom_recorded'
        ? 'Switched to My Recorded Voice. J. A. R. V. I. S. will now speak with your recorded voice everywhere!'
        : `Switched to Ready-Made AI Voice (${activeArchetype?.title || 'Built-in'}). Saved permanently!`
    );
    if (onVoiceSelected) onVoiceSelected(updated);
  };

  // Preview an Archetype Voice
  const handlePreviewArchetype = async (archetype: VoiceArchetype) => {
    if (previewingId === archetype.id) {
      stopSpeaking();
      setPreviewingId(null);
      return;
    }

    stopCustomAudio();
    setPlayingClipId(null);
    setPreviewingId(archetype.id);
    const sampleText = sampleLanguage === 'hindi' ? archetype.sampleHindi : archetype.sampleEnglish;

    try {
      await previewArchetypeVoice({
        archetypeId: archetype.id,
        sampleText,
        pitch,
        rate,
        volume,
        engineMode,
        speakingStyle,
      });
    } finally {
      setPreviewingId(null);
    }
  };

  // Select and Activate an Archetype
  const handleSelectArchetype = (archetype: VoiceArchetype) => {
    setSelectedArchetypeId(archetype.id);
    setPitch(archetype.defaultPitch);
    setRate(archetype.defaultRate);
    setSourceType('builtin');

    const updated: VoiceSettings = {
      sourceType: 'builtin',
      archetypeId: archetype.id,
      voiceName: `${archetype.title} (Gemini ${archetype.geminiVoice})`,
      languageLabel: 'Hindi / English',
      pitch: archetype.defaultPitch,
      rate: archetype.defaultRate,
      volume,
      speakingStyle,
      engineMode,
      voiceURI: selectedDeviceURI,
      customVoice,
    };

    saveVoiceSettings(updated);
    showToast(`Active Assistant Voice set to ${archetype.title}. Saved permanently!`);
    if (onVoiceSelected) onVoiceSelected(updated);
  };

  // Preview a Custom Voice Clip
  const handlePreviewClip = async (clip: CustomVoiceClip) => {
    if (playingClipId === clip.id) {
      stopCustomAudio();
      setPlayingClipId(null);
      return;
    }

    stopSpeaking();
    setPreviewingId(null);
    setPlayingClipId(clip.id);

    try {
      await playCustomAudio(clip);
    } finally {
      setPlayingClipId(null);
    }
  };

  // Set a Custom Voice Clip as Active Master Voice
  const handleSelectCustomClip = async (clip: CustomVoiceClip) => {
    setActiveClipId(clip.id);
    setSourceType('custom_recorded');
    await setActiveMasterClip(clip.id);

    const updated: VoiceSettings = {
      sourceType: 'custom_recorded',
      archetypeId: 'custom_uploaded',
      voiceName: `My Recorded Voice (${clip.name})`,
      languageLabel: 'Owner Custom Voice',
      pitch: clip.dominantPitchHz && clip.dominantPitchHz < 150 ? 0.92 : 1.02,
      rate: 1.0,
      volume,
      speakingStyle,
      engineMode,
      voiceURI: selectedDeviceURI,
      customVoice: customVoice || {
        id: clip.id,
        fileName: clip.name,
        fileSize: clip.fileSizeBytes,
        durationSec: clip.durationSeconds,
        audioDataUrl: clip.audioDataUrl,
        detectedGender: clip.dominantPitchHz && clip.dominantPitchHz < 150 ? 'Male' : 'Female',
        detectedPitchHz: clip.dominantPitchHz || 150,
        recommendedPitch: clip.dominantPitchHz && clip.dominantPitchHz < 150 ? 0.92 : 1.02,
        recommendedRate: 1.0,
        uploadedAt: clip.createdAt,
        authorizedByOwner: true,
      },
      activeCustomClipId: clip.id,
    };

    saveVoiceSettings(updated);
    showToast(`Active Assistant Voice set to My Recorded Voice: "${clip.name}". Saved everywhere in J. A. R. V. I. S.!`);
    if (onVoiceSelected) onVoiceSelected(updated);
  };

  // Delete a Custom Voice Clip
  const handleDeleteClip = async (clipId: string) => {
    await deleteCustomVoiceClip(clipId);
    await loadAllClips();
    showToast('Voice clip removed.');
  };

  // Handle Audio File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsAnalyzing(true);
    try {
      const clip = await processAudioFile(file, 'master');
      await saveCustomVoiceClip(clip);

      const analyzed = await analyzeUploadedVoiceSample(file);
      setCustomVoice(analyzed);
      await loadAllClips();

      // Automatically select as active custom voice
      await handleSelectCustomClip(clip);
    } catch (err: any) {
      console.error('Audio upload failed:', err);
      setUploadError(err?.message || 'Audio file analyze karne me dikkat aayi. Kripya valid MP3 ya WAV chunein.');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Live Microphone Recording
  const handleStartRecording = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const fileName = `Ganesh_Live_Voice_${new Date().toLocaleTimeString('en-IN', { hour12: false }).replace(/:/g, '-')}.webm`;
        const file = new File([blob], fileName, { type: 'audio/webm' });

        setIsAnalyzing(true);
        try {
          const clip = await processAudioFile(file, 'master');
          await saveCustomVoiceClip(clip);

          const analyzed = await analyzeUploadedVoiceSample(file);
          setCustomVoice(analyzed);
          await loadAllClips();

          // Immediately activate as assistant voice
          await handleSelectCustomClip(clip);
        } catch (err: any) {
          setUploadError('Recording analysis failed: ' + err?.message);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingSample(true);
      setRecordedSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev >= 15) {
            handleStopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setUploadError('Microphone permission required for voice sample recording.');
    }
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingSample(false);
  };

  const handleDeleteCustomVoice = () => {
    removeCustomUploadedVoice();
    setCustomVoice(null);
    if (sourceType === 'custom_recorded') {
      setSourceType('builtin');
      setSelectedArchetypeId('natural_female');
      setPitch(1.0);
      setRate(1.0);
    }
    showToast('Custom voice removed. Reverted to Ready-Made AI Voice.');
  };

  const handleSaveAll = () => {
    const isCustom = sourceType === 'custom_recorded';
    const archetype = VOICE_ARCHETYPES.find((a) => a.id === selectedArchetypeId);
    const updated: VoiceSettings = {
      sourceType,
      archetypeId: isCustom ? 'custom_uploaded' : selectedArchetypeId,
      voiceName: isCustom
        ? `My Recorded Voice (${customVoice?.fileName || 'Custom Audio'})`
        : `${archetype?.title || 'Natural Voice'} (Gemini ${archetype?.geminiVoice || 'Kore'})`,
      languageLabel: isCustom ? 'Owner Custom Voice' : 'Hindi / English',
      pitch,
      rate,
      volume,
      speakingStyle,
      engineMode,
      voiceURI: selectedDeviceURI,
      customVoice,
      activeCustomClipId: activeClipId,
    };

    saveVoiceSettings(updated);
    showToast('Voice configuration permanently saved for J. A. R. V. I. S.!');
    if (onVoiceSelected) onVoiceSelected(updated);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleResetAcoustics = () => {
    stopSpeaking();
    setPitch(1.0);
    setRate(1.0);
    setVolume(1.0);
    setSpeakingStyle('conversational');
    setEngineMode('hybrid');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  J. A. R. V. I. S. Voice Studio
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  Dual Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose between your own recorded voice or 9 ready-made professional AI voices
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              stopCustomAudio();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Voice Status & Primary Dual Switcher */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Assistant Voice:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {sourceType === 'custom_recorded'
                  ? `🎙️ My Recorded Voice (${customVoice?.fileName || 'Custom Clip'})`
                  : `🤖 Built-in AI: ${activeArchetype?.title || 'Natural Female'}`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Applied everywhere across all spoken responses
            </span>
          </div>

          {/* Dual Source Quick Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSwitchSourceType('builtin')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                sourceType === 'builtin'
                  ? 'bg-gradient-to-r from-cyan-950/90 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/50 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  sourceType === 'builtin' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Ready-Made AI Voices</div>
                  <div className="text-[10px] text-slate-400 truncate">9 Voices • Female &amp; Male</div>
                </div>
              </div>
              {sourceType === 'builtin' && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold shrink-0 shadow-sm">
                  ACTIVE
                </span>
              )}
            </button>

            <button
              onClick={() => handleSwitchSourceType('custom_recorded')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                sourceType === 'custom_recorded'
                  ? 'bg-gradient-to-r from-emerald-950/90 to-slate-900 border-emerald-400 shadow-lg shadow-emerald-950/50 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  sourceType === 'custom_recorded' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Mic className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">My Recorded Voice</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {savedClips.length > 0 ? `${savedClips.length} Saved Clips` : 'Record or Upload'}
                  </div>
                </div>
              </div>
              {sourceType === 'custom_recorded' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold shrink-0 shadow-sm">
                  ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('archetypes')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'archetypes'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready-Made AI Voices (9)</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_upload')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'custom_upload'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>My Recorded Voice</span>
            {(savedClips.length > 0 || customVoice) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tuning')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tuning'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Acoustics &amp; Style</span>
          </button>

          <button
            onClick={() => setActiveTab('device_voices')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'device_voices'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Device Voices ({deviceVoices.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">

          {/* TAB 1: 9 READY-MADE AI VOICES */}
          {activeTab === 'archetypes' && (
            <div className="space-y-3.5">
              
              {/* Audition Language & Gender Filter */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 mr-1">Preview Sentence:</span>
                  <button
                    onClick={() => setSampleLanguage('hindi')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      sampleLanguage === 'hindi'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Hindi (Hinglish)
                  </button>
                  <button
                    onClick={() => setSampleLanguage('english')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      sampleLanguage === 'english'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    English (Stark)
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setGenderFilter('all')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                      genderFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({VOICE_ARCHETYPES.length})
                  </button>
                  <button
                    onClick={() => setGenderFilter('Female')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                      genderFilter === 'Female' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Female (5)
                  </button>
                  <button
                    onClick={() => setGenderFilter('Male')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                      genderFilter === 'Male' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Male (4)
                  </button>
                </div>
              </div>

              {/* Archetype Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredArchetypes.map((archetype) => {
                  const isSelected = sourceType === 'builtin' && selectedArchetypeId === archetype.id;
                  const isPlaying = previewingId === archetype.id;

                  return (
                    <div
                      key={archetype.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-950 border-cyan-400 shadow-xl shadow-cyan-950/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: archetype.accentColor }}
                            />
                            <h3 className="font-bold text-white text-xs">{archetype.title}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            {archetype.isPopular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Popular
                              </span>
                            )}
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {archetype.gender}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-cyan-300 font-medium">
                          {archetype.tagline}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {archetype.styleDescription}
                        </p>

                        <div className="text-[9px] text-slate-500 flex items-center gap-1 pt-0.5">
                          <span>Model: Gemini {archetype.geminiVoice}</span>
                          <span>•</span>
                          <span>Pitch: {archetype.defaultPitch.toFixed(2)}x</span>
                        </div>
                      </div>

                      {/* Card Action Buttons: Preview & Set Active */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handlePreviewArchetype(archetype)}
                          className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            isPlaying
                              ? 'bg-amber-500 text-slate-950 animate-pulse shadow-md shadow-amber-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Preview Voice</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSelectArchetype(archetype)}
                          className={`py-1.5 px-3 rounded-xl font-bold text-xs transition flex items-center gap-1 shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'bg-slate-800/80 hover:bg-cyan-600 hover:text-white text-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <span>Set as Active</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MY RECORDED VOICE (RECORD OR UPLOAD) */}
          {activeTab === 'custom_upload' && (
            <div className="space-y-4">
              
              {/* Privacy and Technical Transparency Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Custom Recorded Voice Control</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ganesh sir, aap apni aawaz live record kar sakte hain ya apna audio sample upload kar sakte hain. Jab aap isse active karenge, J. A. R. V. I. S. aapki recorded voice ko sabhi greetings, conversations, commands aur notifications me use karegi!
                </p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                  <Info className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Permanent Storage: Audio aapke device me securely save rehta hai aur restart ke baad bhi active rehta hai.</span>
                </div>
              </div>

              {/* Upload & Live Record Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-400 bg-slate-950/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-white text-xs">Audio Recording Upload Karein</span>
                  <span className="text-[10px] text-slate-400">MP3, WAV, M4A, OGG, WebM (Max 25MB)</span>
                </div>

                {/* Live Mic Recorder */}
                <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center gap-2 text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                    isRecordingSample ? 'bg-red-600 text-white animate-pulse' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    <Mic className="w-6 h-6" />
                  </div>
                  
                  {isRecordingSample ? (
                    <div className="space-y-1 w-full">
                      <span className="font-bold text-red-400 text-xs">Recording Live... ({recordedSeconds}s / 15s)</span>
                      <p className="text-[10px] text-slate-400">Bolein: "Namaste, main Ganesh hoon, J. A. R. V. I. S. meri voice assistant hai."</p>
                      <button
                        onClick={handleStopRecording}
                        className="mt-2 w-full py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                      >
                        Stop &amp; Set As Voice
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="font-bold text-white text-xs">Live Voice Record Karein</span>
                      <p className="text-[10px] text-slate-400">Mic par bolkar instant custom voice profile banayein</p>
                      <button
                        onClick={handleStartRecording}
                        className="mt-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Start Live Recording
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isAnalyzing && (
                <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-center space-y-2 animate-pulse">
                  <Activity className="w-6 h-6 mx-auto text-cyan-400 animate-spin" />
                  <p className="font-bold text-cyan-300 text-xs">Audio Decode &amp; Calibration Chal Raha Hai...</p>
                  <p className="text-[10px] text-slate-400">Fundamental pitch, waveform aur volume normalize ho raha hai</p>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center">
                  {uploadError}
                </div>
              )}

              {/* Saved Voice Clips Library */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-400" />
                    My Saved Voice Library ({savedClips.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click Preview to hear • Set as active anytime
                  </span>
                </div>

                {savedClips.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                    <Mic className="w-7 h-7 mx-auto text-slate-600 mb-1.5" />
                    <p className="font-medium text-xs text-slate-300">Abhi tak koi voice record ya upload nahi hui</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Upar button se live record karein ya audio file upload karein</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedClips.map((clip) => {
                      const isActiveClip = sourceType === 'custom_recorded' && activeClipId === clip.id;
                      const isPlaying = playingClipId === clip.id;

                      return (
                        <div
                          key={clip.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isActiveClip
                              ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Preview Button */}
                            <button
                              onClick={() => handlePreviewClip(clip)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 ${
                                isPlaying
                                  ? 'bg-amber-500 text-slate-950 animate-pulse shadow-md shadow-amber-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                              }`}
                              title={isPlaying ? 'Stop Preview' : 'Listen Preview'}
                            >
                              {isPlaying ? (
                                <Square className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-xs truncate">{clip.name}</h4>
                                {isActiveClip && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ACTIVE VOICE
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {clip.durationSeconds}s duration • {clip.dominantPitchHz ? `${clip.dominantPitchHz} Hz pitch` : 'Owner Audio'} • {clip.createdAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Set As Active Button */}
                            <button
                              onClick={() => handleSelectCustomClip(clip)}
                              className={`py-1.5 px-3 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                                isActiveClip
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                  : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300'
                              }`}
                            >
                              {isActiveClip ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Active Everywhere</span>
                                </>
                              ) : (
                                <span>Use As Active Voice</span>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteClip(clip.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-slate-800"
                              title="Delete clip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Analyzed Custom Voice Profile Card if available */}
              {customVoice && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{customVoice.fileName}</h4>
                        <p className="text-[10px] text-slate-400">
                          {customVoice.durationSec}s audio • Uploaded: {customVoice.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteCustomVoice}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Detected Pitch (f0)</span>
                      <span className="font-mono font-bold text-cyan-300 text-xs">
                        {customVoice.detectedPitchHz} Hz
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Vocal Range</span>
                      <span className="font-bold text-emerald-300 text-xs">
                        {customVoice.detectedGender}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Target Tuning</span>
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {customVoice.recommendedPitch.toFixed(2)}x Pitch
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: ACOUSTIC FINE-TUNING */}
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              
              {/* Speaking Style Selector */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Speaking Style (Tone &amp; Expression)
                  </span>
                  <span className="text-[10px] text-cyan-300 uppercase font-semibold">{speakingStyle}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'conversational', label: 'Conversational', icon: '💬', desc: 'Natural everyday buddy' },
                    { id: 'executive', label: 'Executive', icon: '👔', desc: 'Formal, crisp & precise' },
                    { id: 'warm', label: 'Warm & Caring', icon: '❤️', desc: 'Gentle, comforting' },
                    { id: 'enthusiastic', label: 'Enthusiastic', icon: '⚡', desc: 'Upbeat, high-morale' },
                    { id: 'calm', label: 'Calm Bedtime', icon: '🌙', desc: 'Relaxed, peaceful' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSpeakingStyle(style.id as SpeakingStyle)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        speakingStyle === style.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md shadow-cyan-950/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders (Speed, Pitch, Volume) */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Speed, Pitch &amp; Volume Controls
                  </span>
                  <button
                    onClick={handleResetAcoustics}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                {/* Speaking Speed */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Speaking Speed (Cadence):</span>
                    <span className="font-mono font-bold text-cyan-300">{rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.30"
                    step="0.05"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>0.75x (Deliberate)</span>
                    <span className="text-cyan-400 font-semibold">1.00x (Natural)</span>
                    <span>1.30x (Swift)</span>
                  </div>
                </div>

                {/* Voice Pitch */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Voice Pitch (Fundamental Frequency):</span>
                    <span className="font-mono font-bold text-cyan-300">{pitch.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.20"
                    step="0.05"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>0.80x (Deep Baritone)</span>
                    <span className="text-cyan-400 font-semibold">1.00x (Human Baseline)</span>
                    <span>1.20x (Crisp Alto)</span>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Voice Volume:</span>
                    <span className="font-mono font-bold text-cyan-300">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* AI Engine Mode Selector */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  Voice Engine Mode
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setEngineMode('hybrid')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      engineMode === 'hybrid'
                        ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">🔄 Smart Hybrid (Rec)</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Online par Studio Gemini TTS, offline par 0ms local device speech
                    </p>
                  </button>

                  <button
                    onClick={() => setEngineMode('gemini_tts')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      engineMode === 'gemini_tts'
                        ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">☁️ Studio AI Voice</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Gemini 3.8 Flash TTS neural audio with expressive vocal inflections
                    </p>
                  </button>

                  <button
                    onClick={() => setEngineMode('local_device')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      engineMode === 'local_device'
                        ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">⚡ Instant Local</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      0ms instant playback, purely native on Android/Vivo phone
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: DEVICE SYSTEM VOICES */}
          {activeTab === 'device_voices' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                <span>BROWSER / ANDROID ENGINE VOICES ({deviceVoices.length})</span>
                <span>HINDI &amp; ENGLISH EXCLUSIVE</span>
              </div>

              {deviceVoices.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <Languages className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                  <p>Koi device voice load nahi hui. Android Chrome settings me Text-to-Speech check karein.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {deviceVoices.map((v, idx) => {
                    const isSelected = selectedDeviceURI === v.voiceURI;
                    const isPlaying = previewingId === v.voiceURI;

                    return (
                      <div
                        key={`${v.voiceURI}-${idx}`}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-950/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={async () => {
                              if (isPlaying) {
                                stopSpeaking();
                                setPreviewingId(null);
                                return;
                              }
                              setPreviewingId(v.voiceURI);
                              try {
                                await previewVoice(v.voiceURI, undefined, pitch, rate);
                              } finally {
                                setPreviewingId(null);
                              }
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${
                              isPlaying
                                ? 'bg-amber-500 text-black animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                            }`}
                          >
                            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs truncate">{v.name}</span>
                              {v.isRecommended && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Rec
                                </span>
                              )}
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {v.gender}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              <span className="text-cyan-300 font-medium">{v.languageLabel}</span> • {v.provider}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDeviceURI(v.voiceURI);
                            setSourceType('builtin');
                            const updated: VoiceSettings = {
                              sourceType: 'builtin',
                              archetypeId: selectedArchetypeId,
                              voiceName: v.name,
                              languageLabel: v.languageLabel,
                              pitch,
                              rate,
                              volume,
                              speakingStyle,
                              engineMode: 'local_device',
                              voiceURI: v.voiceURI,
                              customVoice,
                            };
                            saveVoiceSettings(updated);
                            showToast(`Device voice "${v.name}" selected.`);
                            if (onVoiceSelected) onVoiceSelected(updated);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Toast Notification Banner */}
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-center font-bold text-xs flex items-center justify-center gap-2 animate-in fade-in shadow-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMessage || 'Voice settings updated for J. A. R. V. I. S.!'}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              stopSpeaking();
              stopCustomAudio();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Close
          </button>
          
          <button
            onClick={handleSaveAll}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save &amp; Apply Voice Everywhere in J. A. R. V. I. S.</span>
          </button>
        </div>

      </div>
    </div>
  );
};
