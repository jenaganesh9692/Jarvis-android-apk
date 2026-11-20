/**
 * Custom Uploaded Voice Service for J. A. R. V. I. S.
 * Allows Ganesh to upload his own audio files (.mp3, .wav, .m4a, .ogg) or record live.
 * All default robotic voices can be completely disabled so J. A. R. V. I. S. speaks ONLY with the uploaded voice!
 */

import { CustomVoiceClip, CustomVoiceSettings } from '../types';

const STORAGE_KEY_SETTINGS = 'jarvis_custom_voice_settings_v1';
const DB_NAME = 'JarvisCustomVoiceDB';
const DB_VERSION = 1;
const STORE_CLIPS = 'clips';

let currentAudioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

export const DEFAULT_CUSTOM_VOICE_SETTINGS: CustomVoiceSettings = {
  useOnlyCustomVoice: true, // Default to ONLY using custom uploaded voice as requested by user
  activeMasterClipId: undefined,
  clips: [],
};

// IndexedDB Helper
function openCustomVoiceDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        db.createObjectStore(STORE_CLIPS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
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

/**
 * Load Custom Voice Settings from localStorage
 */
export function loadCustomVoiceSettings(): CustomVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_VOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CUSTOM_VOICE_SETTINGS,
        ...parsed,
        useOnlyCustomVoice: parsed.useOnlyCustomVoice !== undefined ? parsed.useOnlyCustomVoice : true,
      };
    }
  } catch (err) {
    console.warn('Failed to load custom voice settings:', err);
  }
  return DEFAULT_CUSTOM_VOICE_SETTINGS;
}

/**
 * Save Custom Voice Settings to localStorage
 */
export function saveCustomVoiceSettings(settings: CustomVoiceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save custom voice settings:', err);
  }
}

/**
 * Fetch all saved voice clips from IndexedDB (with fallback)
 */
export async function getAllCustomVoiceClips(): Promise<CustomVoiceClip[]> {
  try {
    const db = await openCustomVoiceDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_CLIPS], 'readonly');
      const store = transaction.objectStore(STORE_CLIPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    // Fallback: load from settings in localStorage
    const s = loadCustomVoiceSettings();
    return s.clips || [];
  }
}

/**
 * Get active master voice clip
 */
export async function getMasterCustomClip(): Promise<CustomVoiceClip | null> {
  const clips = await getAllCustomVoiceClips();
  if (clips.length === 0) return null;

  const settings = loadCustomVoiceSettings();
  if (settings.activeMasterClipId) {
    const found = clips.find((c) => c.id === settings.activeMasterClipId);
    if (found) return found;
  }

  // Fallback to first master or first available clip
  const master = clips.find((c) => c.category === 'master');
  return master || clips[0] || null;
}

/**
 * Save a custom voice clip to IndexedDB and update settings
 */
export async function saveCustomVoiceClip(clip: CustomVoiceClip): Promise<void> {
  try {
    const db = await openCustomVoiceDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_CLIPS], 'readwrite');
      const store = transaction.objectStore(STORE_CLIPS);
      const request = store.put(clip);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, storing clip metadata:', err);
  }

  // Also update metadata in settings
  const settings = loadCustomVoiceSettings();
  const existingIdx = settings.clips.findIndex((c: CustomVoiceClip) => c.id === clip.id);
  const clipMetaOnly: CustomVoiceClip = {
    ...clip,
    // Store truncated or full if small
    audioDataUrl: clip.audioDataUrl.length < 500000 ? clip.audioDataUrl : '',
  };

  const updatedClips = [...settings.clips];
  if (existingIdx >= 0) {
    updatedClips[existingIdx] = clipMetaOnly;
  } else {
    updatedClips.push(clipMetaOnly);
  }

  saveCustomVoiceSettings({
    ...settings,
    useOnlyCustomVoice: true, // Always prioritize custom voice
    activeMasterClipId: settings.activeMasterClipId || clip.id,
    clips: updatedClips,
  });
}

/**
 * Delete a custom voice clip
 */
export async function deleteCustomVoiceClip(clipId: string): Promise<void> {
  try {
    const db = await openCustomVoiceDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_CLIPS], 'readwrite');
      const store = transaction.objectStore(STORE_CLIPS);
      const request = store.delete(clipId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }

  const settings = loadCustomVoiceSettings();
  const updatedClips = settings.clips.filter((c: CustomVoiceClip) => c.id !== clipId);
  saveCustomVoiceSettings({
    ...settings,
    activeMasterClipId: settings.activeMasterClipId === clipId ? (updatedClips[0]?.id || undefined) : settings.activeMasterClipId,
    clips: updatedClips,
  });
}

/**
 * Set a specific clip as the active master voice clip
 */
export async function setActiveMasterClip(clipId: string): Promise<void> {
  const settings = loadCustomVoiceSettings();
  saveCustomVoiceSettings({
    ...settings,
    useOnlyCustomVoice: true,
    activeMasterClipId: clipId,
  });
}

/**
 * Read File, Decode Audio, and Extract Duration, Pitch, Waveform
 */
export async function processAudioFile(
  file: File,
  category: 'master' | 'greeting' | 'action' | 'warning' | 'custom' = 'master'
): Promise<CustomVoiceClip> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const audioDataUrl = reader.result as string;
        const arrayBuffer = await file.arrayBuffer();
        const ctx = getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

        // 1. Calculate duration
        const durationSeconds = Math.round(audioBuffer.duration * 10) / 10;

        // 2. Compute 24-point normalized waveform
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / 24);
        const waveformPreview: number[] = [];
        let maxPeak = 0.001;

        for (let i = 0; i < 24; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j] || 0);
          }
          const avg = sum / blockSize;
          if (avg > maxPeak) maxPeak = avg;
          waveformPreview.push(avg);
        }

        const normalizedWaveform = waveformPreview.map((v) =>
          Math.min(1.0, Math.max(0.12, Math.round((v / maxPeak) * 100) / 100))
        );

        // 3. Estimate fundamental pitch
        const sampleRate = audioBuffer.sampleRate;
        let dominantPitchHz = 145;
        try {
          // Autocorrelation on center slice
          const sliceLen = Math.min(2048, channelData.length);
          const offset = Math.max(0, Math.floor(channelData.length / 2) - Math.floor(sliceLen / 2));
          const slice = channelData.slice(offset, offset + sliceLen);
          let bestR = 0;
          let bestLag = -1;

          for (let lag = Math.floor(sampleRate / 450); lag <= Math.floor(sampleRate / 75); lag++) {
            let r = 0;
            for (let i = 0; i < sliceLen - lag; i++) {
              r += slice[i] * slice[i + lag];
            }
            if (r > bestR) {
              bestR = r;
              bestLag = lag;
            }
          }
          if (bestLag > 0) {
            dominantPitchHz = Math.round(sampleRate / bestLag);
          }
        } catch {
          dominantPitchHz = 145;
        }

        const clip: CustomVoiceClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category,
          audioDataUrl,
          durationSeconds,
          fileSizeBytes: file.size,
          fileType: file.type || 'audio/mpeg',
          createdAt: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          dominantPitchHz,
          waveformPreview: normalizedWaveform,
        };

        resolve(clip);
      } catch (err) {
        reject(new Error(`Failed to decode audio file: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Play an audio clip or data URL
 */
export function playCustomAudio(clipOrDataUrl: CustomVoiceClip | string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopCustomAudio();

    const dataUrl = typeof clipOrDataUrl === 'string' ? clipOrDataUrl : clipOrDataUrl.audioDataUrl;
    if (!dataUrl) {
      resolve();
      return;
    }

    try {
      const audio = new Audio(dataUrl);
      currentAudioElement = audio;

      audio.onended = () => {
        currentAudioElement = null;
        resolve();
      };

      audio.onerror = (e) => {
        currentAudioElement = null;
        console.warn('Audio playback error:', e);
        resolve();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play was interrupted:', err);
          currentAudioElement = null;
          resolve();
        });
      }
    } catch (err) {
      console.warn('Custom audio playback exception:', err);
      currentAudioElement = null;
      resolve();
    }
  });
}

/**
 * Stop any running custom audio
 */
export function stopCustomAudio(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
    currentAudioElement = null;
  }
}

/**
 * Check if custom audio is playing
 */
export function isCustomAudioPlaying(): boolean {
  return currentAudioElement !== null && !currentAudioElement.paused;
}

/**
 * Speak using the uploaded custom voice
 * Returns true if a custom voice clip was found and played; false otherwise.
 */
export async function speakWithCustomUploadedVoice(
  actionType?: string,
  text?: string
): Promise<boolean> {
  const settings = loadCustomVoiceSettings();
  if (!settings.useOnlyCustomVoice) {
    return false;
  }

  const clips = await getAllCustomVoiceClips();
  if (clips.length === 0) {
    return false;
  }

  // 1. Check for specific action match if clips are categorized
  let matchedClip: CustomVoiceClip | null = null;
  const lowerText = (text || '').toLowerCase();

  if (lowerText.includes('namaste') || lowerText.includes('hello') || lowerText.includes('greetings')) {
    matchedClip = clips.find((c) => c.category === 'greeting') || null;
  } else if (lowerText.includes('warning') || lowerText.includes('alert') || lowerText.includes('suraksha')) {
    matchedClip = clips.find((c) => c.category === 'warning') || null;
  } else if (lowerText.includes('ho gaya') || lowerText.includes('success') || lowerText.includes('khol')) {
    matchedClip = clips.find((c) => c.category === 'action') || null;
  }

  // 2. Default to active master clip
  if (!matchedClip) {
    if (settings.activeMasterClipId) {
      matchedClip = clips.find((c) => c.id === settings.activeMasterClipId) || null;
    }
    if (!matchedClip) {
      matchedClip = clips[0];
    }
  }

  if (matchedClip && matchedClip.audioDataUrl) {
    await playCustomAudio(matchedClip);
    return true;
  }

  return false;
}
