/**
 * Vision & AI Girlfriend Companion Service for J. A. R. V. I. S.
 * Handles user-activated camera vision, honest surroundings observation,
 * affectionate companion dialogue, and privacy-preserving frame analysis.
 */

import { CompanionPersonalityMode, VisionObservation } from '../types';
import { speakResponse } from './speechService';

const COMPANION_MODE_STORAGE_KEY = 'jarvis_companion_personality_mode';

export const COMPANION_SUGGESTIONS = [
  { id: 'look', label: 'Main kaisa lag raha hoon?', prompt: 'Main abhi kaisa lag raha hoon? Mujhe dekh kar bataiye na.' },
  { id: 'activity', label: 'Dekho main kya kar raha hoon', prompt: 'Dekho main abhi kya kar raha hoon boss? Aap bataiye.' },
  { id: 'surroundings', label: 'Mera aas-paas kaisa hai?', prompt: 'Mere aas-paas kya dikh raha hai? Room aur surroundings observe karein.' },
  { id: 'sweet_chat', label: 'Mujhse pyari baat karo', prompt: 'Boss se thodi pyari, caring aur affectionate baat karo.' },
];

export function loadCompanionMode(): CompanionPersonalityMode {
  if (typeof window === 'undefined') return 'girlfriend';
  try {
    const saved = localStorage.getItem(COMPANION_MODE_STORAGE_KEY);
    return saved === 'stark' ? 'stark' : 'girlfriend';
  } catch {
    return 'girlfriend';
  }
}

export function saveCompanionMode(mode: CompanionPersonalityMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMPANION_MODE_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Failed to save companion mode:', e);
  }
}

/**
 * Capture frame from HTMLVideoElement onto an off-screen canvas and analyze via Gemini Vision
 */
export async function analyzeLiveFrame(
  videoElement: HTMLVideoElement,
  userPrompt?: string,
  facingMode: 'user' | 'environment' = 'user',
  shouldSpeak: boolean = true
): Promise<VisionObservation> {
  const canvas = document.createElement('canvas');
  const width = Math.min(videoElement.videoWidth || 640, 960);
  const height = Math.min(videoElement.videoHeight || 480, 720);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be created');
  }

  // If front camera, flip horizontally so it matches mirror preview
  if (facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

  const response = await fetch('/api/assistant/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      userPrompt,
      facingMode,
      companionMode: loadCompanionMode(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API responded with status ${response.status}`);
  }

  const data: VisionObservation = await response.json();

  // Speak out the observation using J. A. R. V. I. S. active selected voice when not muted
  if (shouldSpeak && data.textHindi) {
    try {
      await speakResponse(data.textHindi, false, data.emotion || 'warm');
    } catch (e) {
      console.warn('Spoken voice playback failed:', e);
    }
  }

  return data;
}
