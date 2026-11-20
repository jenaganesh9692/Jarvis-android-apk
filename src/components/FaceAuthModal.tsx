import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Trash2,
  KeyRound,
  Eye,
  Info,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { FaceProfile } from '../types';
import {
  loadFaceProfile,
  saveFaceProfile,
  deleteFaceProfile,
  analyzeVideoFrame,
  verifyFaceFrame,
  createBlinkTracker,
  processFrameBlink,
  BlinkTrackerState,
} from '../services/faceAuthService';
import { playChime } from '../services/speechService';

interface FaceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessVerified?: () => void;
}

export const FaceAuthModal: React.FC<FaceAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessVerified,
}) => {
  const [profile, setProfile] = useState<FaceProfile>(loadFaceProfile);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [mode, setMode] = useState<'enroll' | 'test'>('test');

  // Eye Blink Liveness State
  const [blinkCount, setBlinkCount] = useState(0);
  const [eyesVisible, setEyesVisible] = useState(false);
  const [isTrackingBlink, setIsTrackingBlink] = useState(false);

  const [verificationResult, setVerificationResult] = useState<{
    status: 'verified' | 'mismatch' | 'inconclusive';
    isMatch: boolean;
    confidenceScore: number;
    reason: string;
  } | null>(null);

  const [showPinFallback, setShowPinFallback] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<BlinkTrackerState>(createBlinkTracker());
  const blinkIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = loadFaceProfile();
      setProfile(stored);
      setVerificationResult(null);
      setShowPinFallback(false);
      setPinError('');
      setStatusMessage('');
      setBlinkCount(0);
      setMode(stored.enrolled ? 'test' : 'enroll');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
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
      startBlinkMonitoring();
    } catch (err: any) {
      console.warn('Front camera access denied:', err);
      setCameraError('Camera access denied. Browser settings me camera permission allow karein.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTrackingBlink(false);
  };

  const startBlinkMonitoring = () => {
    trackerRef.current = createBlinkTracker();
    setIsTrackingBlink(true);

    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }

    blinkIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

      const metrics = analyzeVideoFrame(videoRef.current, canvasRef.current);
      if (!metrics) return;

      setEyesVisible(metrics.eyesVisible);

      const blinkRes = processFrameBlink(trackerRef.current, metrics.eyeRegionVariance);
      if (blinkRes.blinkDetected) {
        setBlinkCount(blinkRes.blinkCount);
        playChime('acting');
      }
    }, 150);
  };

  if (!isOpen) return null;

  const handleEnrollFace = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    playChime('start');
    setStatusMessage('Face alignment scan ho raha hai. Camera me dekhein...');

    setTimeout(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const metrics = analyzeVideoFrame(videoRef.current, canvasRef.current);

      if (!metrics || metrics.brightness < 20) {
        setIsAnalyzing(false);
        playChime('alert');
        setStatusMessage('Roshni kam hai ya chehra theek se dikhai nahi de raha. Kripya roshni me aayein.');
        return;
      }

      const updatedProfile: FaceProfile = {
        enrolled: true,
        enrolledDate: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        ownerName: 'Ganesh',
        faceMetrics: {
          brightness: metrics.brightness,
          contrast: metrics.contrast,
          aspectRatio: metrics.aspectRatio,
          landmarkEstimate: metrics.landmarkEstimate,
          eyeRegionVariance: metrics.eyeRegionVariance,
        },
      };

      saveFaceProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsAnalyzing(false);
      setMode('test');
      playChime('success');
      setStatusMessage('Ganesh ji ka Face Profile safaltapoorvak save ho gaya hai!');
    }, 900);
  };

  const handleVerifyFace = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    setVerificationResult(null);
    playChime('start');
    setStatusMessage('Analyzing face features and eye blink liveness...');

    setTimeout(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const liveMetrics = analyzeVideoFrame(videoRef.current, canvasRef.current);

      if (!liveMetrics) {
        setIsAnalyzing(false);
        playChime('alert');
        setStatusMessage('Video frame capture nahi ho saka.');
        return;
      }

      const res = verifyFaceFrame(liveMetrics, profile, {
        requireBlink: true,
        blinkCount,
      });

      setIsAnalyzing(false);
      setVerificationResult(res);

      if (res.status === 'verified') {
        playChime('success');
        setStatusMessage(`Face & Blink verification pass! (Confidence: ${res.confidenceScore}%).`);
        if (onSuccessVerified) {
          setTimeout(() => {
            onSuccessVerified();
            onClose();
          }, 1200);
        }
      } else if (res.status === 'inconclusive') {
        playChime('alert');
        setStatusMessage(`Verification Inconclusive: ${res.reason}`);
        setShowPinFallback(true);
      } else {
        playChime('alert');
        setStatusMessage(`Chehra match nahi hua (${res.confidenceScore}%). Kripya PIN use karein.`);
        setShowPinFallback(true);
      }
    }, 800);
  };

  const handleDeleteProfile = () => {
    deleteFaceProfile();
    setProfile(loadFaceProfile());
    setVerificationResult(null);
    setBlinkCount(0);
    setMode('enroll');
    setStatusMessage('Face profile data delete kar diya gaya hai (Privacy Clean).');
    playChime('click');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === '1234') {
      playChime('success');
      setPinError('');
      setStatusMessage('Owner PIN safalta se verify ho gaya!');
      if (onSuccessVerified) {
        setTimeout(() => {
          onSuccessVerified();
          onClose();
        }, 800);
      }
    } else {
      playChime('alert');
      setPinError('Galat PIN. Default owner PIN "1234" hai.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Face Verification &amp; Eye-Blink Security
              </h3>
              <p className="text-xs text-slate-400">
                Voluntary Biometric Anti-Spoofing &amp; Anti-Theft Guard
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

        {/* Clear Visible Active Camera Indicator (Requirement 5) */}
        <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span className={isCameraActive ? 'text-emerald-300 font-medium' : 'text-slate-400'}>
              {isCameraActive ? 'Front Camera Active (100% On-Device / Private)' : 'Camera Off'}
            </span>
          </div>
          {profile.enrolled && (
            <span className="text-[11px] font-semibold text-cyan-300">
              Enrolled: {profile.enrolledDate || 'Active'}
            </span>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-3 flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setMode('enroll')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'enroll'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {profile.enrolled ? 'Update / Re-Enroll' : '1. Enroll Face'}
          </button>
          <button
            onClick={() => setMode('test')}
            disabled={!profile.enrolled}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'test'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white disabled:opacity-40'
            }`}
          >
            2. Test Verification &amp; Blink
          </button>
        </div>

        {/* Camera Viewport with Facial Guide Oval */}
        <div className="mt-3 relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-lg">
          {cameraError ? (
            <div className="p-6 text-center text-xs text-rose-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
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

              {/* Facial Alignment Oval */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-44 h-56 rounded-[50%] border-2 border-dashed ${
                    eyesVisible
                      ? 'border-emerald-400 shadow-[0_0_15px_#10b981]'
                      : 'border-cyan-400 animate-pulse'
                  }`}
                />
              </div>

              {/* Status Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="text-xs font-semibold text-cyan-200">
                    Scanning Face Landmarks &amp; Eye Band...
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Eye Blink & Liveness Feedback Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Eyes Visible:</span>
            <span className={eyesVisible ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {eyesVisible ? 'Detected ✓' : 'Align Eyes...'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Live Blinks:</span>
            <span className={blinkCount > 0 ? 'text-emerald-400 font-bold' : 'text-cyan-300 font-semibold'}>
              {blinkCount > 0 ? `${blinkCount} Blinked ✓` : 'Blink Eyes 👀'}
            </span>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200">
            {statusMessage}
          </div>
        )}

        {/* Verification Result Card (Graceful Inconclusive Handling) */}
        {verificationResult && (
          <div
            className={`mt-3 p-3.5 rounded-xl border text-xs space-y-1 ${
              verificationResult.status === 'verified'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : verificationResult.status === 'inconclusive'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5">
              {verificationResult.status === 'verified' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Face &amp; Eye-Blink Verified (Score: {verificationResult.confidenceScore}%)</span>
                </>
              ) : verificationResult.status === 'inconclusive' ? (
                <>
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Verification Inconclusive (Score: {verificationResult.confidenceScore}%)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Face Mismatch Detected</span>
                </>
              )}
            </div>
            <div className="text-slate-300 text-[11px]">{verificationResult.reason}</div>
          </div>
        )}

        {/* Secondary PIN Fallback */}
        {showPinFallback && (
          <form
            onSubmit={handlePinSubmit}
            className="mt-3 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <KeyRound className="w-4 h-4" />
              <span>Owner PIN Fallback Authentication</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Owner PIN (Default: 1234)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-center tracking-widest text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Verify PIN
              </button>
            </div>
            {pinError && <div className="text-[11px] text-rose-400">{pinError}</div>}
          </form>
        )}

        {/* Privacy & Hardware Boundaries Transparency Note */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Privacy &amp; Data Control (100% Client-Side):</span>
          </div>
          <p className="leading-relaxed">
            Biometric analysis sirf browser me client-side execute hoti hai. Koi bhi photo ya biometric data kisi server par upload nahi hota. Aap jab chahein niche diye button se apna enrolled face data permanently delete kar sakte hain.
          </p>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {profile.enrolled && (
            <button
              onClick={handleDeleteProfile}
              disabled={isAnalyzing}
              className="px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-xl border border-rose-500/20 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Face Data</span>
            </button>
          )}

          {mode === 'enroll' ? (
            <button
              onClick={handleEnrollFace}
              disabled={isAnalyzing || !isCameraActive}
              className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-600/20 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{profile.enrolled ? 'Re-Enroll Face' : 'Enroll My Face (Ganesh)'}</span>
            </button>
          ) : (
            <button
              onClick={handleVerifyFace}
              disabled={isAnalyzing || !isCameraActive}
              className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Verify Face &amp; Eye Blink</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
