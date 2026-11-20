// Speech recognition & Synthesis Service for Hindi, Hinglish and English
// Configured with ChatGPT-Inspired Voice Experience for J. A. R. V. I. S.
// Supports 9 Natural AI Voice Archetypes, Custom Voice Uploads, Dual Engines (Gemini TTS & Device Speech)

import {
  EmotionTone,
  FemaleVoiceOption,
  ProfessionalVoiceOption,
  VoiceArchetype,
  VoiceArchetypeId,
  SpeakingStyle,
  VoiceEngineMode,
  CustomUploadedVoice,
  VoiceSourceType,
} from '../types';
import {
  speakWithCustomUploadedVoice,
  getMasterCustomClip,
  playCustomAudio,
} from './customVoiceService';

let audioContext: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;

const VOICE_SETTINGS_STORAGE_KEY = 'jarvis_professional_voice_settings';
const CUSTOM_VOICE_STORAGE_KEY = 'jarvis_custom_uploaded_voice';
const LEGACY_STORAGE_KEY = 'jarvis_female_voice_settings';

export interface VoiceSettings {
  sourceType: VoiceSourceType; // 'builtin' | 'custom_recorded'
  voiceURI: string;
  pitch: number; // 0.80 to 1.20 (default 1.00 for natural baseline)
  rate: number;  // 0.75 to 1.30 (default 1.00 for natural cadence)
  volume: number; // 0.1 to 1.0
  voiceName?: string;
  languageLabel?: string;
  archetypeId: VoiceArchetypeId;
  speakingStyle: SpeakingStyle;
  engineMode: VoiceEngineMode;
  customVoice?: CustomUploadedVoice | null;
  activeCustomClipId?: string;
}

// 9 ChatGPT-Inspired Voice Archetypes
export const VOICE_ARCHETYPES: VoiceArchetype[] = [
  {
    id: 'natural_female',
    title: 'Natural Female',
    gender: 'Female',
    tagline: 'Balanced, clear & lifelike daily companion',
    styleDescription: 'Expressive everyday conversational female voice with natural inflections',
    geminiVoice: 'Kore',
    defaultPitch: 1.00,
    defaultRate: 1.00,
    accentColor: '#06b6d4',
    sampleHindi: 'Namaste Ganesh sir, main J. A. R. V. I. S. hoon. Aaj aapki kya madad kar sakti hoon?',
    sampleEnglish: 'Greetings Ganesh sir. J. A. R. V. I. S. natural female voice engine calibrated and online.',
    isPopular: true,
  },
  {
    id: 'warm_female',
    title: 'Warm Female',
    gender: 'Female',
    tagline: 'Caring, comforting & empathetic companion',
    styleDescription: 'Kind, gentle, soothing conversation with empathetic cadence',
    geminiVoice: 'Kore',
    defaultPitch: 0.98,
    defaultRate: 0.95,
    accentColor: '#f59e0b',
    sampleHindi: 'Aap kaise hain Ganesh ji? Tension mat lijiye, main yahan aapki poori madad ke liye hoon.',
    sampleEnglish: 'Hello Ganesh sir. Take a breath, I am here to help you through your day smoothly.',
    isPopular: true,
  },
  {
    id: 'friendly_female',
    title: 'Friendly Female',
    gender: 'Female',
    tagline: 'Upbeat, cheerful & companionable buddy',
    styleDescription: 'Bright, lively, smiling conversational tone full of positive energy',
    geminiVoice: 'Zephyr',
    defaultPitch: 1.04,
    defaultRate: 1.02,
    accentColor: '#ec4899',
    sampleHindi: 'Arre waah Ganesh sir! Batayein aaj kaunsa kamaal ka task complete karna hai!',
    sampleEnglish: 'Hey Ganesh! Great to hear from you. What awesome thing are we working on today?',
  },
  {
    id: 'professional_female',
    title: 'Professional Female',
    gender: 'Female',
    tagline: 'Crisp, articulate & executive presence',
    styleDescription: 'Formal, precise executive briefing tone for productivity & decisions',
    geminiVoice: 'Kore',
    defaultPitch: 1.00,
    defaultRate: 1.00,
    accentColor: '#3b82f6',
    sampleHindi: 'Namaste sir. J. A. R. V. I. S. executive assistant ready hai. Sabhi tasks schedule hain.',
    sampleEnglish: 'Good day Ganesh sir. Executive briefing ready. All systems and schedules are synchronized.',
  },
  {
    id: 'soft_female',
    title: 'Soft Female',
    gender: 'Female',
    tagline: 'Gentle, serene & bedtime companion',
    styleDescription: 'Quiet, peaceful, whisper-soft tone ideal for relaxing & night routines',
    geminiVoice: 'Kore',
    defaultPitch: 0.94,
    defaultRate: 0.90,
    accentColor: '#8b5cf6',
    sampleHindi: 'Shanti se aaraam kijiye Ganesh sir. Sabhi alarms set ho gaye hain, shubh ratri.',
    sampleEnglish: 'Rest peacefully Ganesh sir. All alarms are secured. Sleep well and recharge.',
  },
  {
    id: 'natural_male',
    title: 'Natural Male',
    gender: 'Male',
    tagline: 'Realistic, clear & modern companion',
    styleDescription: 'Clear, modern, articulate conversational male voice with warm timbre',
    geminiVoice: 'Puck',
    defaultPitch: 1.00,
    defaultRate: 1.00,
    accentColor: '#10b981',
    sampleHindi: 'Namaste Ganesh bhai! Main J. A. R. V. I. S. hoon. Boliye, phone me kya open karein?',
    sampleEnglish: 'Hey there Ganesh. J. A. R. V. I. S. natural male voice ready. What do you need today?',
    isPopular: true,
  },
  {
    id: 'deep_male',
    title: 'Deep Male (Stark JARVIS)',
    gender: 'Male',
    tagline: 'Resonant, baritone & iconic Stark AI',
    styleDescription: 'Deep, resonant, British/Stark baritone with calm executive confidence',
    geminiVoice: 'Fenrir',
    defaultPitch: 0.88,
    defaultRate: 0.96,
    accentColor: '#ef4444',
    sampleHindi: 'Greetings Ganesh sir. Stark systems online. Command process karne ke liye bilkul taiyar hoon.',
    sampleEnglish: 'Good day, Mr. Ganesh. Stark Industries security and automation online. At your service, sir.',
    isPopular: true,
  },
  {
    id: 'friendly_male',
    title: 'Friendly Male',
    gender: 'Male',
    tagline: 'Energetic, approachable & casual buddy',
    styleDescription: 'Casual, supportive, high-morale bro tone with lively pacing',
    geminiVoice: 'Puck',
    defaultPitch: 1.02,
    defaultRate: 1.02,
    accentColor: '#f97316',
    sampleHindi: 'Kaisa chal raha hai Ganesh sir? Chaliye aaj ke sabhi kaam chutki me nipta dete hain!',
    sampleEnglish: 'How is it going, Ganesh? Let’s crush today’s goals together, I am right here with you!',
  },
  {
    id: 'professional_male',
    title: 'Professional Male',
    gender: 'Male',
    tagline: 'Polished, dignified & composed executive',
    styleDescription: 'Formal, dignified, composed business tone for operations & management',
    geminiVoice: 'Charon',
    defaultPitch: 0.96,
    defaultRate: 0.98,
    accentColor: '#6366f1',
    sampleHindi: 'Namaste Ganesh ji. J. A. R. V. I. S. professional briefing engine aapke aadesh ki pratiksha kar raha hai.',
    sampleEnglish: 'Good day sir. J. A. R. V. I. S. professional systems ready. Awaiting your operational directive.',
  },
];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  sourceType: 'builtin',
  voiceURI: '',
  pitch: 1.0,  // Pure natural human pitch
  rate: 1.0,   // Professional clear cadence
  volume: 1.0,
  voiceName: 'Natural Female (Default AI)',
  languageLabel: 'Hindi / Indian English',
  archetypeId: 'natural_female',
  speakingStyle: 'conversational',
  engineMode: 'hybrid',
  customVoice: null,
};

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_VOICE_SETTINGS,
        ...parsed,
        sourceType: parsed.sourceType === 'custom_recorded' ? 'custom_recorded' : 'builtin',
        pitch: typeof parsed.pitch === 'number' ? Math.max(0.80, Math.min(1.20, parsed.pitch)) : 1.0,
        rate: typeof parsed.rate === 'number' ? Math.max(0.75, Math.min(1.30, parsed.rate)) : 1.0,
        volume: typeof parsed.volume === 'number' ? Math.max(0.1, Math.min(1.0, parsed.volume)) : 1.0,
        archetypeId: parsed.archetypeId || 'natural_female',
        speakingStyle: parsed.speakingStyle || 'conversational',
        engineMode: parsed.engineMode || 'hybrid',
      };
    }

    // Check legacy key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      return {
        ...DEFAULT_VOICE_SETTINGS,
        voiceURI: parsed.voiceURI || '',
        pitch: 1.0,
        rate: 1.0,
      };
    }
    return DEFAULT_VOICE_SETTINGS;
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

/**
 * Switch global voice source between ready-made AI voices and owner's recorded voice
 * Guarantees permanent persistence and prevents automatic changes
 */
export function setGlobalVoiceSource(
  sourceType: VoiceSourceType,
  archetypeId?: VoiceArchetypeId,
  clipId?: string
): VoiceSettings {
  const current = loadVoiceSettings();
  const updated: VoiceSettings = {
    ...current,
    sourceType,
    ...(archetypeId ? { archetypeId } : {}),
    ...(clipId ? { activeCustomClipId: clipId } : {}),
  };
  saveVoiceSettings(updated);
  return updated;
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save voice settings:', e);
  }
}

export function loadCustomUploadedVoice(): CustomUploadedVoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_VOICE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomUploadedVoice(voice: CustomUploadedVoice): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_VOICE_STORAGE_KEY, JSON.stringify(voice));
  } catch (e) {
    console.warn('Failed to save custom uploaded voice:', e);
  }
}

export function removeCustomUploadedVoice(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CUSTOM_VOICE_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to remove custom uploaded voice:', e);
  }
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Chime sound when microphone begins, finishes, or acts
export function playChime(type: 'start' | 'success' | 'alert' | 'click' | 'acting') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'acting') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(280, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

// Stop any currently playing speech
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Filter exclusively professional Hindi and English voices
 */
export function getProfessionalHindiEnglishVoices(): ProfessionalVoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const seenKeys = new Set<string>();
  const list: ProfessionalVoiceOption[] = [];

  for (const v of voices) {
    const lang = (v.lang || '').toLowerCase();
    const name = v.name || '';
    const lowerName = name.toLowerCase();

    // STRICT FILTER: ONLY Hindi or English
    const isHindi = lang.startsWith('hi') || lowerName.includes('hindi');
    const isIndianEnglish = lang.startsWith('en-in') || lowerName.includes('india');
    const isBritishEnglish = lang.startsWith('en-gb') || lowerName.includes('uk') || lowerName.includes('british');
    const isUSEnglish = lang.startsWith('en-us') || (lang.startsWith('en') && !isIndianEnglish && !isBritishEnglish);

    if (!isHindi && !isIndianEnglish && !isBritishEnglish && !isUSEnglish) {
      continue;
    }

    const dedupKey = `${v.voiceURI || name}___${lang}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    // Gender detection
    const isExplicitMale =
      lowerName.includes('male') ||
      lowerName.includes('david') ||
      lowerName.includes('george') ||
      lowerName.includes('guy') ||
      lowerName.includes('rishi') ||
      lowerName.includes('pradeep') ||
      lowerName.includes('daniel') ||
      lowerName.includes('james') ||
      lowerName.includes('oliver');

    const isExplicitFemale =
      lowerName.includes('female') ||
      lowerName.includes('zira') ||
      lowerName.includes('swara') ||
      lowerName.includes('samantha') ||
      lowerName.includes('victoria') ||
      lowerName.includes('karen') ||
      lowerName.includes('veena') ||
      lowerName.includes('priya') ||
      lowerName.includes('sangeeta') ||
      lowerName.includes('natural');

    const gender: 'Female' | 'Male' = isExplicitMale ? 'Male' : (isExplicitFemale ? 'Female' : 'Female');

    // Language label
    let languageLabel = 'English (US)';
    if (isHindi) languageLabel = 'Hindi (Hinglish)';
    else if (isIndianEnglish) languageLabel = 'English (India)';
    else if (isBritishEnglish) languageLabel = 'English (UK / Stark)';

    // Provider detection
    let provider = 'System Voice';
    if (lowerName.includes('google')) provider = 'Google Speech Engine';
    else if (lowerName.includes('microsoft')) provider = 'Microsoft Neural';
    else if (lowerName.includes('apple') || lowerName.includes('siri')) provider = 'Apple Voice';

    const isRecommended =
      isHindi ||
      isIndianEnglish ||
      lowerName.includes('google') ||
      lowerName.includes('natural') ||
      lowerName.includes('swara') ||
      lowerName.includes('samantha') ||
      lowerName.includes('daniel');

    list.push({
      voiceURI: v.voiceURI,
      name,
      lang: v.lang,
      languageLabel,
      gender,
      provider,
      isRecommended,
    });
  }

  list.sort((a, b) => {
    const getScore = (item: ProfessionalVoiceOption) => {
      let score = 0;
      if (item.languageLabel.includes('Hindi')) score += 100;
      else if (item.languageLabel.includes('India')) score += 70;
      else if (item.languageLabel.includes('UK')) score += 50;
      else score += 20;

      if (item.provider.includes('Google')) score += 15;
      if (item.isRecommended) score += 10;
      return score;
    };
    return getScore(b) - getScore(a);
  });

  return list;
}

// Backwards-compatibility alias for existing components
export function getAvailableFemaleVoices(): FemaleVoiceOption[] {
  const all = getProfessionalHindiEnglishVoices();
  return all.map((v) => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    isFemale: v.gender === 'Female',
    provider: v.provider,
  }));
}

// Modulate pitch and rate with human professional restraint (NO squeaky chipmunk pitch!)
function calculateEmotionAcoustics(
  basePitch: number,
  baseRate: number,
  emotion?: EmotionTone,
  speakingStyle?: SpeakingStyle
): { pitch: number; rate: number } {
  let pitch = basePitch;
  let rate = baseRate;

  // Emotional tone adjustments (bounded strictly)
  switch (emotion) {
    case 'happy':
      pitch = Math.min(pitch + 0.03, 1.08);
      rate = Math.min(rate + 0.04, 1.10);
      break;
    case 'warm':
      pitch = Math.max(pitch - 0.01, 0.96);
      rate = Math.max(rate - 0.02, 0.96);
      break;
    case 'empathetic':
      pitch = Math.max(pitch - 0.03, 0.94);
      rate = Math.max(rate - 0.04, 0.92);
      break;
    case 'calm':
      pitch = Math.max(pitch - 0.03, 0.93);
      rate = Math.max(rate - 0.05, 0.90);
      break;
    case 'serious':
      pitch = Math.max(pitch - 0.04, 0.88);
      rate = Math.max(rate - 0.02, 0.95);
      break;
    case 'urgent':
      pitch = Math.min(pitch + 0.04, 1.08);
      rate = Math.min(rate + 0.08, 1.15);
      break;
    case 'encouraging':
      pitch = Math.min(pitch + 0.02, 1.06);
      rate = Math.min(rate + 0.03, 1.06);
      break;
    default:
      break;
  }

  // Speaking style adjustments
  switch (speakingStyle) {
    case 'conversational':
      break;
    case 'executive':
      rate = Math.max(rate - 0.02, 0.95);
      break;
    case 'warm':
      pitch = Math.max(pitch - 0.02, 0.94);
      rate = Math.max(rate - 0.03, 0.94);
      break;
    case 'enthusiastic':
      pitch = Math.min(pitch + 0.03, 1.08);
      rate = Math.min(rate + 0.04, 1.12);
      break;
    case 'calm':
      pitch = Math.max(pitch - 0.04, 0.90);
      rate = Math.max(rate - 0.06, 0.88);
      break;
    default:
      break;
  }

  return {
    pitch: Math.max(0.80, Math.min(1.20, pitch)),
    rate: Math.max(0.75, Math.min(1.30, rate)),
  };
}

/**
 * Analyze an uploaded user voice sample file (.wav, .mp3, .m4a, .ogg)
 * Computes duration, pitch frequency (f0) profile, and recommends optimal synthesis settings
 */
export async function analyzeUploadedVoiceSample(file: File): Promise<CustomUploadedVoice> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const durationSec = Math.round(audioBuffer.duration * 10) / 10;
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Scan multiple frames across the audio for pitch detection via autocorrelation
  const frameSize = 2048;
  const pitchEstimates: number[] = [];

  const step = Math.max(1, Math.floor((channelData.length - frameSize) / 12));
  for (let offset = 0; offset < channelData.length - frameSize; offset += step) {
    // Check frame energy
    let sumSquares = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = channelData[offset + i];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / frameSize);
    if (rms < 0.02) continue; // skip silence

    // Autocorrelation for pitch estimation
    let bestCorrelation = 0;
    let bestPeriod = -1;
    const minPeriod = Math.floor(sampleRate / 350); // ~350Hz high
    const maxPeriod = Math.floor(sampleRate / 75);  // ~75Hz low

    for (let lag = minPeriod; lag <= maxPeriod; lag++) {
      let corr = 0;
      for (let i = 0; i < frameSize - lag; i++) {
        corr += channelData[offset + i] * channelData[offset + i + lag];
      }
      if (corr > bestCorrelation) {
        bestCorrelation = corr;
        bestPeriod = lag;
      }
    }

    if (bestPeriod > 0) {
      const pitch = sampleRate / bestPeriod;
      if (pitch >= 75 && pitch <= 350) {
        pitchEstimates.push(pitch);
      }
    }
  }

  // Calculate median / average detected pitch
  let detectedPitchHz = 160;
  if (pitchEstimates.length > 0) {
    pitchEstimates.sort((a, b) => a - b);
    detectedPitchHz = Math.round(pitchEstimates[Math.floor(pitchEstimates.length / 2)]);
  }

  // Determine gender profile & synthesis tuning
  let detectedGender: 'Female' | 'Male' | 'Neutral' = 'Neutral';
  let recommendedPitch = 1.00;
  let recommendedRate = 1.00;

  if (detectedPitchHz < 150) {
    detectedGender = 'Male';
    // Deeper baritone
    recommendedPitch = detectedPitchHz < 115 ? 0.88 : 0.94;
    recommendedRate = 0.98;
  } else if (detectedPitchHz >= 170) {
    detectedGender = 'Female';
    // Mezzo / Soprano
    recommendedPitch = detectedPitchHz > 220 ? 1.06 : 1.01;
    recommendedRate = 1.00;
  } else {
    detectedGender = 'Neutral';
    recommendedPitch = 1.00;
    recommendedRate = 1.00;
  }

  // Convert to Base64 Data URL for in-app preview
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const customVoice: CustomUploadedVoice = {
    id: `custom_voice_${Date.now()}`,
    fileName: file.name,
    fileSize: file.size,
    durationSec,
    audioDataUrl: dataUrl,
    detectedGender,
    detectedPitchHz,
    recommendedPitch,
    recommendedRate,
    uploadedAt: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    authorizedByOwner: true,
  };

  saveCustomUploadedVoice(customVoice);
  return customVoice;
}

/**
 * Play Gemini TTS WAV Audio
 */
export async function playGeminiAudio(base64Wav: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopSpeaking();
    try {
      const audioUrl = `data:audio/wav;base64,${base64Wav}`;
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };
      audio.play().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Play local speech synthesis with active archetype & settings
 */
export function speakWithActiveVoice(
  text: string,
  emotion: EmotionTone = 'warm'
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    const settings = loadVoiceSettings();
    const archetype = VOICE_ARCHETYPES.find((a) => a.id === settings.archetypeId);
    const custom = settings.customVoice || loadCustomUploadedVoice();
    const isCustom = settings.sourceType === 'custom_recorded';

    let isMaleArchetype = archetype?.gender === 'Male';
    let basePitch = settings.pitch;
    let baseRate = settings.rate;

    if (isCustom && custom) {
      isMaleArchetype = custom.detectedGender === 'Male';
      basePitch = custom.recommendedPitch ?? settings.pitch;
      baseRate = custom.recommendedRate ?? settings.rate;
    }

    const { pitch, rate } = calculateEmotionAcoustics(
      basePitch,
      baseRate,
      emotion,
      settings.speakingStyle
    );

    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = Math.max(0.1, Math.min(1.0, settings.volume));

    const voices = window.speechSynthesis.getVoices();

    // 1. Try saved user-chosen specific voiceURI (if builtin mode)
    let targetVoice = (!isCustom && settings.voiceURI) ? voices.find((v) => v.voiceURI === settings.voiceURI) : null;

    // 2. If none, match according to gender & language
    if (!targetVoice) {
      if (isMaleArchetype) {
        targetVoice =
          voices.find((v) => (v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('rishi')) && (v.lang.startsWith('en') || v.lang.startsWith('hi'))) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-gb') || v.lang.toLowerCase().startsWith('en-in')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          voices[0];
      } else {
        targetVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('hi') && v.name.toLowerCase().includes('google')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-in') && v.name.toLowerCase().includes('google')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
          voices.find((v) => v.name.toLowerCase().includes('samantha')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          voices[0];
      }
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = 'hi-IN';
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

// Backwards compatibility alias
export function speakWithFemaleVoice(
  text: string,
  emotion: EmotionTone = 'warm'
): Promise<void> {
  return speakWithActiveVoice(text, emotion);
}

let isCloudTtsQuotaExhausted = false;

export function getIsCloudTtsQuotaExhausted(): boolean {
  return isCloudTtsQuotaExhausted;
}

export function setIsCloudTtsQuotaExhausted(val: boolean) {
  isCloudTtsQuotaExhausted = val;
}

/**
 * Preview an archetype voice (supports Gemini cloud TTS & local device synthesis preview)
 */
export async function previewArchetypeVoice(options: {
  archetypeId: VoiceArchetypeId;
  sampleText?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  engineMode?: VoiceEngineMode;
  speakingStyle?: SpeakingStyle;
}): Promise<void> {
  stopSpeaking();
  const archetype = VOICE_ARCHETYPES.find((a) => a.id === options.archetypeId);
  const text = options.sampleText || archetype?.sampleHindi || 'Namaste Ganesh sir, main J. A. R. V. I. S. hoon.';
  const engine = options.engineMode || 'hybrid';
  const pitch = options.pitch ?? archetype?.defaultPitch ?? 1.0;
  const rate = options.rate ?? archetype?.defaultRate ?? 1.0;

  // Try Studio Gemini TTS API if engine mode is cloud or hybrid and quota is available
  if ((engine === 'gemini_tts' || engine === 'hybrid') && !isCloudTtsQuotaExhausted) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          archetype: options.archetypeId,
          voiceName: archetype?.geminiVoice || 'Kore',
          style: archetype?.styleDescription,
          speakingStyle: options.speakingStyle || 'conversational',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.quotaExhausted) {
          isCloudTtsQuotaExhausted = true;
        } else if (data.audioBase64) {
          await playGeminiAudio(data.audioBase64);
          return;
        }
      }
    } catch (err) {
      // Seamlessly fall back to on-device synthesis
    }
  }

  // Fallback to local device speech synthesis tuned to archetype pitch & rate
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = Math.max(0.80, Math.min(1.20, pitch));
    utterance.rate = Math.max(0.75, Math.min(1.30, rate));
    utterance.volume = options.volume ?? 1.0;

    const voices = window.speechSynthesis.getVoices();
    const isMale = archetype?.gender === 'Male';

    let targetVoice: SpeechSynthesisVoice | undefined;
    if (isMale) {
      targetVoice =
        voices.find((v) => (v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('rishi')) && (v.lang.startsWith('en') || v.lang.startsWith('hi'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-gb') || v.lang.toLowerCase().startsWith('en-in')) ||
        voices[0];
    } else {
      targetVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('hi') && v.name.toLowerCase().includes('google')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
        voices[0];
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Preview raw voice URI (for local system voice tab)
 */
export function previewVoice(
  voiceURI: string,
  sampleText?: string,
  pitch: number = 1.0,
  rate: number = 1.0
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    stopSpeaking();

    const voices = window.speechSynthesis.getVoices();
    const target = voices.find((v) => v.voiceURI === voiceURI);

    const isHindi = target?.lang.toLowerCase().startsWith('hi');
    const text = sampleText || (isHindi
      ? 'Namaste Ganesh ji! Main J. A. R. V. I. S. hoon, aapka personal voice assistant.'
      : 'Greetings Ganesh. J. A. R. V. I. S. voice engine calibrated and online.');

    const utterance = new SpeechSynthesisUtterance(text);
    if (target) {
      utterance.voice = target;
      utterance.lang = target.lang;
    }

    utterance.pitch = Math.max(0.80, Math.min(1.20, pitch));
    utterance.rate = Math.max(0.75, Math.min(1.30, rate));

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak full response from assistant
 * Prioritizes high-fidelity Gemini TTS when online, with instant local fallback
 */
export async function speakResponse(
  textHinglish: string,
  isOffline: boolean = false,
  emotion: EmotionTone = 'warm',
  instantLocal: boolean = false
): Promise<void> {
  stopSpeaking();

  const settings = loadVoiceSettings();

  // If user selected Custom Recorded Voice, strictly honor this global choice everywhere in JARVIS
  if (settings.sourceType === 'custom_recorded') {
    try {
      const handled = await speakWithCustomUploadedVoice('', textHinglish);
      if (handled) return;
    } catch (err) {
      console.warn('Custom clip playback fallback:', err);
    }
    // Synthesize using custom voice acoustic parameters
    await speakWithActiveVoice(textHinglish, emotion);
    return;
  }

  // If user selected instant local mode, offline, or cloud quota is exhausted, use on-device speech directly
  if (instantLocal || isOffline || settings.engineMode === 'local_device' || isCloudTtsQuotaExhausted) {
    await speakWithActiveVoice(textHinglish, emotion);
    return;
  }

  // Try Studio Gemini Cloud TTS
  try {
    const archetype = VOICE_ARCHETYPES.find((a) => a.id === settings.archetypeId);
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textHinglish,
        archetype: settings.archetypeId,
        voiceName: archetype?.geminiVoice || 'Kore',
        style: archetype?.styleDescription,
        speakingStyle: settings.speakingStyle,
        emotion,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.quotaExhausted) {
        isCloudTtsQuotaExhausted = true;
      } else if (data.audioBase64) {
        await playGeminiAudio(data.audioBase64);
        return;
      }
    }
  } catch (err) {
    // Graceful fallback to on-device speech
  }

  // Fallback to local device speech synthesis
  await speakWithActiveVoice(textHinglish, emotion);
}


// Speech Recognition with Hindi, Hinglish and English support
export interface SpeechRecognitionController {
  start: () => void;
  stop: () => void;
  setLanguage: (lang: 'hi-IN' | 'en-IN') => void;
  isAvailable: boolean;
}

export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  initialLang: 'hi-IN' | 'en-IN' = 'hi-IN'
): SpeechRecognitionController {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    return {
      start: () => onError('Speech recognition is not supported in this browser'),
      stop: () => {},
      setLanguage: () => {},
      isAvailable: false,
    };
  }

  let isStarted = false;
  let hasResult = false;
  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = initialLang;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isStarted = true;
    hasResult = false;
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      hasResult = true;
      onResult(finalTranscript.trim(), true);
    } else if (interimTranscript) {
      onResult(interimTranscript.trim(), false);
    }
  };

  recognition.onerror = (event: any) => {
    const errorType = event.error || 'unknown';
    console.warn('Speech recognition error event:', errorType);
    isStarted = false;

    if (errorType === 'aborted') {
      return;
    }

    if (errorType === 'no-speech') {
      onError('no-speech');
      return;
    }

    if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
      onError('permission-denied');
      return;
    }

    if (errorType === 'network') {
      onError('network-error');
      return;
    }

    onError(`error: ${errorType}`);
  };

  recognition.onend = () => {
    isStarted = false;
    onEnd();
  };

  return {
    start: () => {
      try {
        if (!isStarted) {
          recognition.start();
        }
      } catch (err) {
        console.warn('Recognition start caught error:', err);
      }
    },
    stop: () => {
      try {
        if (isStarted) {
          recognition.stop();
        }
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    },
    setLanguage: (lang: 'hi-IN' | 'en-IN') => {
      recognition.lang = lang;
    },
    isAvailable: true,
  };
}
