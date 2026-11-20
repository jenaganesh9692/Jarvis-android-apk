import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Info,
  Smartphone,
  Eye,
  Camera,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  EyeOff,
} from 'lucide-react';
import {
  GANESH_WARNING_PHRASE,
  playGaneshWarningSpoken,
  playSecuritySiren,
  stopSecuritySiren,
  setIsLocked,
  triggerHapticWarning,
} from '../services/securityService';
import { TouchSecuritySettings, SecurityAlertEvent, FaceProfile } from '../types';
import {
  loadFaceProfile,
  analyzeVideoFrame,
  verifyFaceFrame,
  createBlinkTracker,
  processFrameBlink,
  BlinkTrackerState,
} from '../services/faceAuthService';
import { playChime } from '../services/speechService';

interface SecureLockShieldProps {
  settings: TouchSecuritySettings;
  latestAlert?: SecurityAlertEvent | null;
  onUnlockSuccess: () => void;
}

export const SecureLockShield: React.FC<SecureLockShieldProps> = ({
  settings,
  latestAlert,
  onUnlockSuccess,
}) => {
  const [faceProfile, setFaceProfile] = useState<FaceProfile>(loadFaceProfile);
  const [authMode, setAuthMode] = useState<'pin' | 'face'>(() => {
    const profile = loadFaceProfile();
    return profile.enrolled && settings.faceVerificationEnabled ? 'face' : 'pin';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceStatusText, setFaceStatusText] = useState('Camera open ho raha hai...');
  const [blinkCount, setBlinkCount] = useState(0);
  const [eyesDetected, setEyesDetected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    status: 'verified' | 'mismatch' | 'inconclusive';
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<BlinkTrackerState>(createBlinkTracker());
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    setFaceProfile(loadFaceProfile());
  }, []);

  // Handle camera start/stop when switching to face mode
  useEffect(() => {
    if (authMode === 'face') {
      startFrontCamera();
    } else {
      stopFrontCamera();
    }
    return () => {
      stopFrontCamera();
    };
  }, [authMode]);

  const startFrontCamera = async () => {
    setCameraError(null);
    setVerificationFeedback(null);
    setBlinkCount(0);
    setEyesDetected(false);
    trackerRef.current = createBlinkTracker();
    setFaceStatusText('Camera frame verify kiya ja raha hai...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      startLivenessLoop();
    } catch (err: any) {
      console.warn('Front camera access denied in lock shield:', err);
      setCameraError('Camera access unavailable. Niche Master PIN use karein.');
      setIsCameraActive(false);
      setAuthMode('pin');
    }
  };

  const stopFrontCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startLivenessLoop = () => {
    let loopCount = 0;
    trackerRef.current = createBlinkTracker();

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
      loopCount++;

      const metrics = analyzeVideoFrame(videoRef.current, canvasRef.current);
      if (!metrics) return;

      setEyesDetected(metrics.eyesVisible);

      // Track blinks
      const blinkRes = processFrameBlink(trackerRef.current, metrics.eyeRegionVariance);
      if (blinkRes.blinkCount > blinkCount) {
        setBlinkCount(blinkRes.blinkCount);
        playChime('start');
      }

      // After 2.5 seconds (or once a blink is detected and face matches)
      if (loopCount >= 18 || (blinkRes.blinkCount >= 1 && loopCount >= 8)) {
        evaluateBiometricLiveness(metrics, blinkRes.blinkCount);
      }
    }, 150);
  };

  const evaluateBiometricLiveness = (metrics: any, detectedBlinks: number) => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsVerifying(true);

    const result = verifyFaceFrame(metrics, faceProfile, {
      requireBlink: settings.eyeBlinkDetectionEnabled,
      blinkCount: detectedBlinks,
    });

    setIsVerifying(false);

    if (result.status === 'verified') {
      playChime('success');
      setVerificationFeedback({
        status: 'verified',
        message: 'Face & Live Eye Blink match! Ganesh ji verified.',
      });
      setTimeout(() => {
        stopFrontCamera();
        stopSecuritySiren();
        setIsLocked(false);
        onUnlockSuccess();
      }, 900);
    } else if (result.status === 'inconclusive') {
      playChime('alert');
      triggerHapticWarning();
      setVerificationFeedback({
        status: 'inconclusive',
        message: 'Inconclusive: ' + result.reason + '. Kripya PIN enter karein.',
      });
      setFaceStatusText('Verification inconclusive. Security warning issued.');
      if (settings.spokenWarningEnabled) {
        playGaneshWarningSpoken();
      }
    } else {
      playChime('alert');
      triggerHapticWarning();
      setVerificationFeedback({
        status: 'mismatch',
        message: 'Face mismatch: Unauthorized attempt detected.',
      });
      setFaceStatusText('Face match nahi hua. Security warning aur siren active.');
      if (settings.sirenAlarmEnabled) {
        playSecuritySiren(8);
      }
      if (settings.spokenWarningEnabled) {
        playGaneshWarningSpoken();
      }
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setPinError(null);

      // Auto-check if 4 digits
      if (nextPin.length === settings.ownerPin.length) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClear = () => {
    setPinInput('');
    setPinError(null);
  };

  const verifyPin = (pinToTest: string) => {
    if (pinToTest === settings.ownerPin) {
      // Unlock success
      stopFrontCamera();
      stopSecuritySiren();
      setIsLocked(false);
      onUnlockSuccess();
    } else {
      // Wrong PIN
      setIsShaking(true);
      triggerHapticWarning();
      setPinError('Galat PIN (Wrong PIN)! Keval Ganesh ji hi unlock kar sakte hain.');
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
      }, 700);
    }
  };

  const handlePlayWarningAgain = async () => {
    setIsSpeaking(true);
    await playGaneshWarningSpoken();
    setIsSpeaking(false);
  };

  const handleStopSiren = () => {
    stopSecuritySiren();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 select-none overflow-y-auto animate-in fade-in"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(220, 38, 38, 0.28) 0%, rgba(2, 6, 23, 0.98) 75%)',
      }}
    >
      {/* Top Warning Header */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <div className="w-18 h-18 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-9 h-9 text-red-500 animate-bounce" />
          </div>
          <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
            LOCKED
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Anti-Theft Security Shield Active</span>
        </span>

        {/* Exact Spoken Warning Quote Box */}
        <div className="w-full max-w-sm p-3.5 rounded-2xl bg-red-900/40 border-2 border-red-500/60 shadow-xl shadow-red-950/80 mb-3 text-center">
          <p className="text-xs font-bold text-red-200 uppercase tracking-wide mb-1">
            Security Spoken Warning:
          </p>
          <blockquote className="text-sm font-extrabold text-white leading-snug">
            "{GANESH_WARNING_PHRASE}"
          </blockquote>
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <button
              onClick={handlePlayWarningAgain}
              disabled={isSpeaking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Bol rahi hoon...' : 'Warning Dobara Sunein'}</span>
            </button>
            <button
              onClick={handleStopSiren}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Siren Stop</span>
            </button>
          </div>
        </div>

        {/* Trigger details & Truthful Lock Status */}
        <div className="w-full max-w-sm space-y-2 text-left">
          {latestAlert && (
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Trigger: {latestAlert.detailsHindi}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{latestAlert.timestamp}</span>
            </div>
          )}

          {/* Truthful Lock Status Card */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>In-App Data Shield: Locked &amp; Protected</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                DATA SAFE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Ganesh ji ka personal data, messages, phone contacts aur assistant controls PIN ke peeche locked hain.
            </p>
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200/90 leading-tight">
              <strong>Android Device Policy Truth:</strong> Browser sandbox me chalne ki wajah se ye pure OS hardware screen ko direct lock nahi kar sakti. OS-wide lock ke liye native Android APK me <em>Device Administration (DevicePolicyManager.lockNow)</em> permission lagti hai jo Vivo Settings &gt; Security &gt; Device Administrators me Ganesh ji enable kar sakte hain.
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Mode Switch (Owner PIN vs Face & Blink Unlock) */}
      <div className="w-full max-w-xs mx-auto py-2">
        <div className="flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold mb-3">
          <button
            onClick={() => setAuthMode('pin')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              authMode === 'pin'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Owner PIN</span>
          </button>

          <button
            onClick={() => setAuthMode('face')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              authMode === 'face'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Face &amp; Blink</span>
          </button>
        </div>

        {/* AUTH MODE 1: FACE & EYE BLINK VERIFICATION */}
        {authMode === 'face' ? (
          <div className="space-y-2.5">
            {/* Live Camera Viewfinder */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-700 flex items-center justify-center shadow-lg">
              {/* Visible Camera Indicator */}
              <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between text-[10px] bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  FRONT CAMERA ACTIVE
                </span>
                <span className="text-[9px] text-slate-400">Eye-Blink Anti-Spoof</span>
              </div>

              {cameraError ? (
                <div className="p-4 text-center text-xs text-rose-300">
                  <p>{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Face Alignment Oval */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-36 h-48 rounded-[50%] border-2 border-dashed ${
                        eyesDetected
                          ? 'border-emerald-400 shadow-[0_0_15px_#10b981]'
                          : 'border-cyan-400 animate-pulse'
                      }`}
                    />
                  </div>

                  {isVerifying && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
                      <span className="text-xs font-bold text-cyan-200">
                        Checking Liveness &amp; Owner Face...
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Liveness & Blink Status Pills */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Eyes Visible:</span>
                <span className={eyesDetected ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
                  {eyesDetected ? 'Detected ✓' : 'Detecting...'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Eye Blink:</span>
                <span className={blinkCount > 0 ? 'text-emerald-400 font-bold' : 'text-cyan-300 font-medium'}>
                  {blinkCount > 0 ? `${blinkCount} Blinked ✓` : 'Blink Eyes 👀'}
                </span>
              </div>
            </div>

            {/* Verification Result Toast */}
            {verificationFeedback && (
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  verificationFeedback.status === 'verified'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : verificationFeedback.status === 'inconclusive'
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : 'bg-red-950/60 border-red-500/50 text-red-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {verificationFeedback.status === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{verificationFeedback.message}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAuthMode('pin')}
                className="flex-1 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Use PIN Instead
              </button>
              <button
                onClick={startFrontCamera}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          /* AUTH MODE 2: OWNER PIN PAD (SECURE FALLBACK) */
          <div>
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-200">
                  Ganesh Ji Ka Owner PIN Darj Karein
                </h3>
              </div>

              {/* PIN Dots Display */}
              <div
                className={`flex justify-center gap-3 py-1 ${
                  isShaking ? 'animate-bounce text-red-500' : ''
                }`}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      i < pinInput.length
                        ? 'bg-red-500 border-red-400 scale-110 shadow-sm shadow-red-500/50'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-[11px] text-red-400 font-bold mt-1 animate-pulse">
                  {pinError}
                </p>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 px-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-red-600/30 border border-slate-800 text-lg font-bold text-slate-100 transition-all active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-lg font-bold text-slate-100 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 active:scale-95"
              >
                ⌫ Del
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-2.5">
              Default Owner PIN: <span className="font-mono text-cyan-400 font-bold">{settings.ownerPin}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
