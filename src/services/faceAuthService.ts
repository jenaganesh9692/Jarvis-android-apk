/**
 * Face Authentication & Eye Blink Liveness Detection Service for J. A. R. V. I. S.
 * Voluntary Face Recognition using WebCam stream & Canvas geometric/contrast sampling.
 * Honest biometric heuristics with explicit camera indicators, eye-blink liveness anti-spoofing, and PIN fallback.
 */

import { FaceProfile } from '../types';

const FACE_PROFILE_STORAGE_KEY = 'jarvis_owner_face_profile';

export const DEFAULT_FACE_PROFILE: FaceProfile = {
  enrolled: false,
  ownerName: 'Ganesh',
  faceMetrics: {
    brightness: 0,
    contrast: 0,
    aspectRatio: 1.33,
    landmarkEstimate: 0,
    eyeRegionVariance: 0,
  },
};

export function loadFaceProfile(): FaceProfile {
  if (typeof window === 'undefined') return DEFAULT_FACE_PROFILE;
  try {
    const raw = localStorage.getItem(FACE_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_FACE_PROFILE;
    return { ...DEFAULT_FACE_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FACE_PROFILE;
  }
}

export function saveFaceProfile(profile: FaceProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FACE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save face profile:', e);
  }
}

export function deleteFaceProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(FACE_PROFILE_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to delete face profile:', e);
  }
}

export interface FrameMetrics {
  brightness: number;
  contrast: number;
  aspectRatio: number;
  landmarkEstimate: number;
  eyeRegionVariance: number;
  eyesVisible: boolean;
}

/**
 * Analyze a video frame rendered on Canvas to extract facial geometric, luminance & eye-region metrics
 */
export function analyzeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): FrameMetrics | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalLuminance = 0;
  let pixelCount = 0;
  const luminances: number[] = [];

  // Focus on center 50% oval region where face aligns
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const rx = canvas.width * 0.25;
  const ry = canvas.height * 0.35;

  // Eye region coordinates within the facial oval (upper-middle band)
  const eyeYMin = cy - ry * 0.25;
  const eyeYMax = cy + ry * 0.08;
  const eyeXMin = cx - rx * 0.65;
  const eyeXMax = cx + rx * 0.65;

  const eyeLuminances: number[] = [];

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.0) {
        const idx = (y * canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;
        luminances.push(lum);
        pixelCount++;

        // Sample eye-band pixels
        if (y >= eyeYMin && y <= eyeYMax && x >= eyeXMin && x <= eyeXMax) {
          eyeLuminances.push(lum);
        }
      }
    }
  }

  if (pixelCount === 0) return null;

  const avgLum = Math.round(totalLuminance / pixelCount);

  // Calculate contrast standard deviation for overall face
  let sumSqDiff = 0;
  for (const lum of luminances) {
    sumSqDiff += Math.pow(lum - avgLum, 2);
  }
  const contrast = Math.round(Math.sqrt(sumSqDiff / pixelCount));

  // Calculate standard deviation specifically in the eye-band
  let eyeVariance = 0;
  if (eyeLuminances.length > 10) {
    const eyeAvg = eyeLuminances.reduce((a, b) => a + b, 0) / eyeLuminances.length;
    let eyeSqSum = 0;
    for (const lum of eyeLuminances) {
      eyeSqSum += Math.pow(lum - eyeAvg, 2);
    }
    eyeVariance = Math.round(Math.sqrt(eyeSqSum / eyeLuminances.length));
  }

  // Estimate landmark ratio (features like eyebrows/eyes have distinct dark bands)
  const landmarkEstimate = Math.min(100, Math.max(10, Math.round(contrast * 1.4)));
  const eyesVisible = eyeVariance >= 14 && avgLum >= 25;

  return {
    brightness: avgLum,
    contrast,
    aspectRatio: Number((canvas.width / canvas.height).toFixed(2)),
    landmarkEstimate,
    eyeRegionVariance: eyeVariance,
    eyesVisible,
  };
}

/**
 * Eye Blink Liveness Detector State
 * Monitors variance dips in the eye region to detect natural eye blinks (anti-spoofing)
 */
export interface BlinkTrackerState {
  baselineVariance: number;
  framesAnalyzed: number;
  inBlink: boolean;
  blinkStartTime: number;
  blinkCount: number;
  lastBlinkTime: number;
  history: number[];
}

export function createBlinkTracker(): BlinkTrackerState {
  return {
    baselineVariance: 0,
    framesAnalyzed: 0,
    inBlink: false,
    blinkStartTime: 0,
    blinkCount: 0,
    lastBlinkTime: 0,
    history: [],
  };
}

export function processFrameBlink(
  tracker: BlinkTrackerState,
  currentEyeVariance: number,
  now: number = Date.now()
): {
  blinkDetected: boolean;
  blinkCount: number;
  inBlink: boolean;
  eyesVisible: boolean;
} {
  tracker.framesAnalyzed++;
  tracker.history.push(currentEyeVariance);
  if (tracker.history.length > 20) {
    tracker.history.shift();
  }

  const eyesVisible = currentEyeVariance >= 12;

  // Initialize or update running baseline variance of open eyes
  if (tracker.baselineVariance === 0 && currentEyeVariance > 15) {
    tracker.baselineVariance = currentEyeVariance;
  } else if (!tracker.inBlink && currentEyeVariance > 18) {
    // Gently update baseline when eyes are steadily open
    tracker.baselineVariance = tracker.baselineVariance * 0.85 + currentEyeVariance * 0.15;
  }

  let blinkDetected = false;
  const thresholdDip = Math.max(12, tracker.baselineVariance * 0.65);

  if (!tracker.inBlink) {
    // Eye variance dips significantly below baseline (eye closing)
    if (tracker.baselineVariance > 18 && currentEyeVariance < thresholdDip) {
      tracker.inBlink = true;
      tracker.blinkStartTime = now;
    }
  } else {
    // Currently in a potential blink
    const elapsedMs = now - tracker.blinkStartTime;

    // Normal natural blink takes between 80ms and 500ms
    if (currentEyeVariance >= tracker.baselineVariance * 0.8) {
      // Eye opened back up!
      if (elapsedMs >= 70 && elapsedMs <= 600) {
        tracker.blinkCount++;
        tracker.lastBlinkTime = now;
        blinkDetected = true;
      }
      tracker.inBlink = false;
    } else if (elapsedMs > 700) {
      // Too long to be a natural blink (eyes kept shut or head turned away)
      tracker.inBlink = false;
    }
  }

  return {
    blinkDetected,
    blinkCount: tracker.blinkCount,
    inBlink: tracker.inBlink,
    eyesVisible,
  };
}

/**
 * Compare live frame metrics with enrolled profile
 * Evaluates match with graceful "inconclusive" handling instead of jumping to conclusions
 */
export function verifyFaceFrame(
  liveMetrics: FrameMetrics,
  storedProfile: FaceProfile,
  options?: { requireBlink?: boolean; blinkCount?: number }
): {
  status: 'verified' | 'mismatch' | 'inconclusive';
  isMatch: boolean;
  confidenceScore: number;
  reason: string;
} {
  if (!storedProfile.enrolled) {
    return {
      status: 'inconclusive',
      isMatch: false,
      confidenceScore: 0,
      reason: 'Face profile enrolled nahi hai. Settings se enroll karein ya PIN use karein.',
    };
  }

  if (liveMetrics.brightness < 25) {
    return {
      status: 'inconclusive',
      isMatch: false,
      confidenceScore: 20,
      reason: 'Roshni bahut kam hai. Verification inconclusive; kripya roshni me aayein ya PIN use karein.',
    };
  }

  const contrastDiff = Math.abs(liveMetrics.contrast - storedProfile.faceMetrics.contrast);
  const landmarkDiff = Math.abs(liveMetrics.landmarkEstimate - storedProfile.faceMetrics.landmarkEstimate);

  // Calculate heuristic match score
  let score = 100 - (contrastDiff * 0.8 + landmarkDiff * 0.6);
  score = Math.max(15, Math.min(96, Math.round(score)));

  // If blink is required and not detected
  if (options?.requireBlink && (options.blinkCount || 0) < 1) {
    return {
      status: 'inconclusive',
      isMatch: false,
      confidenceScore: Math.min(score, 50),
      reason: 'Natural eye blink verify nahi ho saka (Inconclusive). Suraksha ke liye PIN fallback use karein.',
    };
  }

  if (score >= 65) {
    return {
      status: 'verified',
      isMatch: true,
      confidenceScore: score,
      reason: 'Ganesh ji ka face verification safal raha.',
    };
  } else if (score >= 45) {
    // Borderline match: Treat as inconclusive, NEVER automatically assume theft
    return {
      status: 'inconclusive',
      isMatch: false,
      confidenceScore: score,
      reason: 'Camera angle ya roshni ke karan verification anishchit (Inconclusive) hai. Fallback PIN use karein.',
    };
  } else {
    return {
      status: 'mismatch',
      isMatch: false,
      confidenceScore: score,
      reason: 'Chehra match nahi hua. Anadhikrit istemaal rokne ke liye phone PIN protect hai.',
    };
  }
}
