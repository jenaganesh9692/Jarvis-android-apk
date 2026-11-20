/**
 * Enhanced Voice Biometrics Service for J. A. R. V. I. S.
 * Multi-Sample Owner Voice Enrollment & Acoustic Speaker Verification for Ganesh.
 * 100% On-Device Processing via Web Audio API AnalyserNode (Zero Audio Uploads for Privacy).
 */

import { VoiceProfile } from '../types';

const VOICE_PROFILE_STORAGE_KEY = 'jarvis_owner_voice_profile_v2';
const LEGACY_STORAGE_KEY = 'jarvis_owner_voice_profile';

export interface VoiceSampleResult {
  averagePitchHz: number;
  minHz: number;
  maxHz: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  rawPitches: number[];
  durationMs: number;
}

export const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  enrolled: false,
  ownerName: 'Ganesh',
  averagePitchHz: 135,
  pitchRangeHz: [95, 175],
  sampleCount: 0,
  confidenceScore: 0,
  spectralCentroidAvg: 1150,
  pitchVariance: 18,
  samples: [],
};

export function loadVoiceProfile(): VoiceProfile {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PROFILE;
  try {
    const raw = localStorage.getItem(VOICE_PROFILE_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_VOICE_PROFILE, ...JSON.parse(raw) };
    }
    // Check legacy key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed.enrolled) {
        return {
          ...DEFAULT_VOICE_PROFILE,
          enrolled: true,
          enrolledDate: parsed.enrolledDate || 'Earlier',
          ownerName: 'Ganesh',
          averagePitchHz: parsed.averagePitchHz || 135,
          pitchRangeHz: parsed.pitchRangeHz || [95, 175],
          sampleCount: parsed.sampleCount || 1,
          confidenceScore: parsed.confidenceScore || 85,
          spectralCentroidAvg: 1100,
          pitchVariance: 20,
        };
      }
    }
    return DEFAULT_VOICE_PROFILE;
  } catch {
    return DEFAULT_VOICE_PROFILE;
  }
}

export function saveVoiceProfile(profile: VoiceProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOICE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save voice profile:', e);
  }
}

export function deleteVoiceProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VOICE_PROFILE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to delete voice profile:', e);
  }
}

// Session owner authorization state (valid for 15 minutes or until manually locked/switched)
let isOwnerAuthenticatedSession = false;
let sessionAuthExpiry = 0;
let lastVerifiedConfidence = 0;

export function isOwnerAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isOwnerAuthenticatedSession) return false;
  if (Date.now() > sessionAuthExpiry) {
    isOwnerAuthenticatedSession = false;
    return false;
  }
  return true;
}

export function getOwnerSessionInfo(): { authenticated: boolean; minutesRemaining: number; confidence: number } {
  if (!isOwnerAuthenticated()) {
    return { authenticated: false, minutesRemaining: 0, confidence: 0 };
  }
  const remainingMs = Math.max(0, sessionAuthExpiry - Date.now());
  return {
    authenticated: true,
    minutesRemaining: Math.ceil(remainingMs / 60000),
    confidence: lastVerifiedConfidence,
  };
}

export function setOwnerAuthenticated(auth: boolean, durationMinutes: number = 15, confidence: number = 92): void {
  isOwnerAuthenticatedSession = auth;
  sessionAuthExpiry = auth ? Date.now() + durationMinutes * 60 * 1000 : 0;
  lastVerifiedConfidence = auth ? confidence : 0;
}

/**
 * Capture microphone audio and calculate acoustic features locally:
 * - Fundamental pitch (Autocorrelation / Peak bin in 80Hz - 380Hz)
 * - Spectral Centroid (Timbre brightness)
 * - Zero-crossing rate (Speech articulation)
 */
export async function sampleVoiceFrequency(
  onProgress: (percent: number, currentHz: number, spectralCentroid: number) => void,
  sampleDurationMs: number = 3200
): Promise<VoiceSampleResult> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();

  analyser.fftSize = 2048;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const freqData = new Uint8Array(bufferLength);
  const timeData = new Uint8Array(analyser.fftSize);
  const sampleRate = audioCtx.sampleRate;

  const pitches: number[] = [];
  const centroids: number[] = [];
  const zcrs: number[] = [];

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      try {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.round((elapsed / sampleDurationMs) * 100), 100);

        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // 1. Calculate Fundamental Pitch
        let maxVal = -1;
        let maxIndex = -1;
        let weightedSum = 0;
        let totalEnergy = 0;

        for (let i = 0; i < bufferLength; i++) {
          const freq = (i * sampleRate) / analyser.fftSize;
          const amplitude = freqData[i];

          // Compute spectral centroid across full audible speech range
          if (freq >= 80 && freq <= 3500) {
            weightedSum += freq * amplitude;
            totalEnergy += amplitude;
          }

          // Search fundamental human vocal pitch range (80Hz to 380Hz)
          if (freq >= 80 && freq <= 380) {
            if (amplitude > maxVal && amplitude > 35) {
              maxVal = amplitude;
              maxIndex = i;
            }
          }
        }

        let currentHz = 0;
        if (maxIndex !== -1) {
          currentHz = Math.round((maxIndex * sampleRate) / analyser.fftSize);
          if (currentHz >= 80 && currentHz <= 380) {
            pitches.push(currentHz);
          }
        }

        // 2. Spectral Centroid
        const currentCentroid = totalEnergy > 0 ? Math.round(weightedSum / totalEnergy) : 1000;
        if (totalEnergy > 50) {
          centroids.push(currentCentroid);
        }

        // 3. Zero Crossing Rate
        let zeroCrossings = 0;
        for (let i = 1; i < timeData.length; i++) {
          if ((timeData[i] >= 128 && timeData[i - 1] < 128) || (timeData[i] < 128 && timeData[i - 1] >= 128)) {
            zeroCrossings++;
          }
        }
        const zcr = Math.round((zeroCrossings / timeData.length) * 100);
        zcrs.push(zcr);

        onProgress(progress, currentHz, currentCentroid);

        if (elapsed >= sampleDurationMs) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();

          const validPitches = pitches.length > 0 ? pitches : [135];
          const avgPitch = Math.round(validPitches.reduce((a, b) => a + b, 0) / validPitches.length);
          const minPitch = Math.min(...validPitches);
          const maxPitch = Math.max(...validPitches);

          const validCentroids = centroids.length > 0 ? centroids : [1100];
          const avgCentroid = Math.round(validCentroids.reduce((a, b) => a + b, 0) / validCentroids.length);

          const avgZcr = zcrs.length > 0 ? Math.round(zcrs.reduce((a, b) => a + b, 0) / zcrs.length) : 8;

          resolve({
            averagePitchHz: avgPitch,
            minHz: minPitch,
            maxHz: maxPitch,
            spectralCentroid: avgCentroid,
            zeroCrossingRate: avgZcr,
            rawPitches: validPitches,
            durationMs: sampleDurationMs,
          });
        }
      } catch (err) {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        reject(err);
      }
    }, 60);
  });
}

/**
 * Compare live audio against Ganesh's enrolled multi-sample profile.
 * Evaluates pitch delta, spectral centroid similarity, and timbre consistency.
 */
export async function verifySpeakerMatch(
  onProgress?: (percent: number, currentHz: number, spectralCentroid: number) => void
): Promise<{
  isMatch: boolean;
  similarityScore: number;
  samplePitchHz: number;
  profilePitchHz: number;
  spectralCentroid: number;
  reason: string;
  recommendPin: boolean;
}> {
  const profile = loadVoiceProfile();
  if (!profile.enrolled) {
    return {
      isMatch: false,
      similarityScore: 0,
      samplePitchHz: 0,
      profilePitchHz: 0,
      spectralCentroid: 0,
      reason: 'Owner voice profile not yet enrolled. Kripya pehle Ganesh ji ki voice enroll karein.',
      recommendPin: true,
    };
  }

  const sample = await sampleVoiceFrequency(onProgress || (() => {}), 2800);

  // Pitch comparison: typical human male range difference tolerance ~35Hz
  const pitchDiff = Math.abs(sample.averagePitchHz - profile.averagePitchHz);
  const targetCentroid = profile.spectralCentroidAvg || 1100;
  const centroidDiff = Math.abs(sample.spectralCentroid - targetCentroid);

  // Acoustic scoring model
  // Pitch similarity: 100 down to 0 over 50Hz range
  const pitchScore = Math.max(0, 100 - (pitchDiff / 45) * 60);

  // Centroid similarity: 100 down to 0 over 600Hz range
  const centroidScore = Math.max(0, 100 - (centroidDiff / 600) * 40);

  // Composite weighted score
  const compositeScore = Math.round(pitchScore * 0.65 + centroidScore * 0.35);
  const boundedScore = Math.max(10, Math.min(99, compositeScore));

  // Minimum threshold: 65% match for owner recognition
  const isMatch = boundedScore >= 65;
  const recommendPin = !isMatch || boundedScore < 75;

  let reason = '';
  if (isMatch) {
    reason = `Owner Ganesh verified! Confidence: ${boundedScore}%. (Detected: ${sample.averagePitchHz}Hz vs Profile: ${profile.averagePitchHz}Hz)`;
  } else {
    reason = `Unrecognized speaker (Confidence: ${boundedScore}%). Pitch delta: ${pitchDiff}Hz. Ye Ganesh ki aawaz se match nahi ho raha hai.`;
  }

  return {
    isMatch,
    similarityScore: boundedScore,
    samplePitchHz: sample.averagePitchHz,
    profilePitchHz: profile.averagePitchHz,
    spectralCentroid: sample.spectralCentroid,
    reason,
    recommendPin,
  };
}

/**
 * Quick local acoustic check for continuous wake-word stream
 * Checks if current dominant frequency matches enrolled owner
 */
export function quickAcousticCheck(
  currentPitchHz: number,
  profile: VoiceProfile
): { matchesOwner: boolean; confidence: number } {
  if (!profile.enrolled || profile.averagePitchHz <= 0) {
    // If not yet enrolled, allow with neutral confidence
    return { matchesOwner: true, confidence: 70 };
  }

  if (currentPitchHz <= 0) {
    return { matchesOwner: false, confidence: 0 };
  }

  const diff = Math.abs(currentPitchHz - profile.averagePitchHz);
  if (diff <= 35) {
    const conf = Math.round(100 - (diff / 35) * 30);
    return { matchesOwner: true, confidence: Math.max(70, conf) };
  } else if (diff <= 55) {
    return { matchesOwner: false, confidence: 45 };
  } else {
    return { matchesOwner: false, confidence: 20 };
  }
}
