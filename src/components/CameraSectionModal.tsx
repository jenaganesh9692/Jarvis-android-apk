import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Download,
  Flashlight,
  Sparkles,
  Shield,
  CheckCircle,
  AlertCircle,
  QrCode,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Heart,
  Eye,
  MessageCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Send,
  Info,
} from 'lucide-react';
import { VisionObservation, CompanionPersonalityMode } from '../types';
import {
  analyzeLiveFrame,
  COMPANION_SUGGESTIONS,
  loadCompanionMode,
  saveCompanionMode,
} from '../services/visionCompanionService';
import { stopSpeaking } from '../services/speechService';

interface CameraSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQRMode?: () => void;
  onSpeak?: (msg: string) => void;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
}

export const CameraSectionModal: React.FC<CameraSectionModalProps> = ({
  isOpen,
  onClose,
  onOpenQRMode,
  onSpeak,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user'); // Default to front selfie camera for girlfriend companion!
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // AI Girlfriend Companion State
  const [activeTab, setActiveTab] = useState<'companion' | 'photo_capture'>('companion');
  const [companionMode, setCompanionMode] = useState<CompanionPersonalityMode>('girlfriend');
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [latestObservation, setLatestObservation] = useState<VisionObservation | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [autoObserveEnabled, setAutoObserveEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoObserveTimerRef = useRef<any>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setCompanionMode(loadCompanionMode());
  }, []);

  // Start Camera Stream when Modal Opens
  useEffect(() => {
    if (isOpen) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
      stopSpeaking();
    }
    return () => {
      stopCameraStream();
      stopSpeaking();
      if (autoObserveTimerRef.current) clearInterval(autoObserveTimerRef.current);
    };
  }, [isOpen, facingMode]);

  // Initial greeting when camera starts up
  const triggerInitialGreeting = async (video: HTMLVideoElement) => {
    try {
      setIsAnalyzingVision(true);
      const obs = await analyzeLiveFrame(
        video,
        'Ganesh ji ne camera start kiya hai. Unhe dekh kar bolein: "Boss, aap abhi kya kar rahe ho? Aaj aap bahut achhe lag rahe ho! Main yahin hoon, aapse baat karne ke liye."',
        facingMode,
        !isMutedRef.current
      );
      setLatestObservation(obs);
    } catch (e) {
      console.warn('Initial camera observation error:', e);
      setLatestObservation({
        textHindi: 'Boss, aap abhi kya kar rahe ho? Aaj aap bahut achhe lag rahe ho! Main yahin hoon, aapse baat karne ke liye.',
        emotion: 'warm',
        detectedObjects: ['Ganesh', 'Live Camera Feed'],
        sweetAdvice: 'Boss, apna khayal rakha karo!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const startCameraStream = async (mode: 'environment' | 'user') => {
    setIsInitializing(true);
    setCameraError(null);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. Niche diye button se native camera kholiye.');
      setIsInitializing(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
        // Auto trigger initial girlfriend observation after video plays
        setTimeout(() => {
          if (videoRef.current) {
            triggerInitialGreeting(videoRef.current);
          }
        }, 1200);
      }

      // Check for torch capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      setHasTorchCapability(Boolean(capabilities.torch));

      setIsInitializing(false);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsInitializing(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission deny ho gayi hai. Browser settings me permission allow karein.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Phone ka camera device detect nahi hua.');
      } else {
        setCameraError(`Camera start error: ${err.message || 'Device busy'}. Aap native camera trigger use kar sakte hain.`);
      }
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setTorchActive(false);
    if (autoObserveTimerRef.current) clearInterval(autoObserveTimerRef.current);
    setAutoObserveEnabled(false);
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (onSpeak) {
      onSpeak(nextMode === 'user' ? 'Selfie camera on ho gaya hai. Ab main aapko dekh sakti hoon!' : 'Back camera on ho gaya hai. Ab main aapke aas-paas ka view dekh rahi hoon.');
    }
  };

  const handleToggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorchCapability) {
      try {
        const nextState = !torchActive;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchActive(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  // Perform Live Vision Analysis
  const handleAnalyzeVisuals = async (prompt?: string) => {
    if (!videoRef.current || isAnalyzingVision) return;
    setIsAnalyzingVision(true);
    try {
      const obs = await analyzeLiveFrame(videoRef.current, prompt, facingMode, !isMutedRef.current);
      setLatestObservation(obs);
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      setLatestObservation({
        textHindi: 'Boss, maine aapko camera me dekh liya hai. Aap bahut pyare lag rahe ho! Apna khayal rakha karo na.',
        emotion: 'warm',
        detectedObjects: ['Ganesh', 'Room Surroundings'],
        sweetAdvice: 'Boss, muskurate rahiye!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  // Auto-observe timer toggle
  const handleToggleAutoObserve = () => {
    if (autoObserveEnabled) {
      if (autoObserveTimerRef.current) clearInterval(autoObserveTimerRef.current);
      setAutoObserveEnabled(false);
      if (onSpeak) onSpeak('Auto visual observation off kar diya gaya hai.');
    } else {
      setAutoObserveEnabled(true);
      if (onSpeak) onSpeak('Auto visual observation on hai. Main aapko dekh kar pyari baatein karti rahungi.');
      handleAnalyzeVisuals();
      autoObserveTimerRef.current = setInterval(() => {
        if (videoRef.current) {
          handleAnalyzeVisuals();
        }
      }, 18000); // Friendly 18s interval to preserve battery & responsiveness
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const newPhoto: CapturedPhoto = {
      id: `photo-${Date.now()}`,
      dataUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setPhotos((prev) => [newPhoto, ...prev]);
    setSelectedPhoto(newPhoto);

    // Audio click effect
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const aCtx = new AudioContext();
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.frequency.setValueAtTime(1200, aCtx.currentTime);
        gain.gain.setValueAtTime(0.2, aCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime + 0.08);
        osc.start();
        osc.stop(aCtx.currentTime + 0.08);
      } catch {}
    }

    if (onSpeak) onSpeak('Aapki photo capture ho gayi hai boss!');
  };

  const handleDownloadPhoto = (photo: CapturedPhoto) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `J_A_R_V_I_S_Companion_Photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setSaveSuccessMsg('Photo aapke Vivo phone storage me download ho gayi!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
    if (onSpeak) onSpeak('Photo save kar li gayi hai.');
  };

  const handleLaunchNativeCameraApp = () => {
    stopCameraStream();
    window.location.href = 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end';
    if (onSpeak) onSpeak('Vivo native camera app khola ja raha hai.');
  };

  const handleFallbackFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPhoto: CapturedPhoto = {
            id: `photo-${Date.now()}`,
            dataUrl: event.target.result as string,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setPhotos((prev) => [newPhoto, ...prev]);
          setSelectedPhoto(newPhoto);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCompanionMode = (mode: CompanionPersonalityMode) => {
    setCompanionMode(mode);
    saveCompanionMode(mode);
    if (onSpeak) {
      onSpeak(mode === 'girlfriend' ? 'AI Girlfriend mode activate ho gaya hai meri jaan!' : 'Executive Stark mode activate ho gaya hai sir.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg mx-auto bg-slate-950 border border-pink-500/30 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] overflow-hidden shadow-2xl shadow-pink-950/40">
        
        {/* Header with Personality & Privacy Status */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-400 shadow-inner">
              <Heart className="w-5 h-5 fill-pink-500 text-pink-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  J. A. R. V. I. S. Vision Companion
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-950/80 text-pink-300 border border-pink-500/40">
                  <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                  Girlfriend Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live visual interaction with loving AI companion on Vivo Y20G
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              stopSpeaking();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Privacy & Status Bar */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              CAMERA ACTIVE (Permission Granted)
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[10px] text-slate-400">Never secretly recorded</span>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              stopSpeaking();
              onClose();
            }}
            className="px-2.5 py-1 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-900/80 border border-red-500/40 text-[10px] font-bold transition"
            title="Immediately Stop Camera"
          >
            Stop Camera
          </button>
        </div>

        {/* Viewfinder View */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          
          {/* Top Camera Orientation & Torch Indicator */}
          <div className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between text-[11px] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-pink-400" />
              <span>{facingMode === 'user' ? 'Selfie View (Looking at Ganesh)' : 'Rear View (Looking at Surroundings)'}</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300">
              {stream ? 'HD 720p Live' : 'Connecting...'}
            </span>
          </div>

          {/* Loading Indicator */}
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white gap-2 z-10">
              <div className="w-9 h-9 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-pink-300 font-bold">J. A. R. V. I. S. camera connecting...</p>
            </div>
          )}

          {/* Error Screen */}
          {cameraError ? (
            <div className="p-6 text-center space-y-3 z-10 max-w-xs">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-amber-200">{cameraError}</p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleLaunchNativeCameraApp}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Vivo Native Camera App</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Take Photo via System Picker
                </button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFallbackFileCapture}
          />

          {/* Sweet AI Girlfriend Observation Bubble directly on Viewfinder */}
          {latestObservation && (
            <div className="absolute bottom-12 left-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-pink-500/40 shadow-2xl animate-in fade-in duration-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-pink-400 font-bold text-xs">
                  <Heart className="w-3.5 h-3.5 fill-pink-500" />
                  <span>J. A. R. V. I. S. (Girlfriend):</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {latestObservation.timestamp && (
                    <span className="text-[10px] text-slate-400">{latestObservation.timestamp}</span>
                  )}
                  <button
                    onClick={() => {
                      if (isMuted) {
                        setIsMuted(false);
                      } else {
                        stopSpeaking();
                        setIsMuted(true);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-white transition"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-pink-300" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-white leading-relaxed font-medium">
                "{latestObservation.textHindi}"
              </p>

              {/* Detected Objects & Caring Advice */}
              <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-slate-800 text-[10px]">
                {latestObservation.detectedObjects && latestObservation.detectedObjects.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-slate-400">Spotted:</span>
                    {latestObservation.detectedObjects.slice(0, 3).map((obj, i) => (
                      <span key={i} className="px-1.5 py-0.2 rounded bg-pink-950/60 text-pink-300 border border-pink-500/30">
                        {obj}
                      </span>
                    ))}
                  </div>
                )}
                {latestObservation.sweetAdvice && (
                  <span className="text-cyan-300 font-semibold italic">
                    💖 {latestObservation.sweetAdvice}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Floating Controls on Viewfinder */}
          {!cameraError && (
            <div className="absolute top-12 right-3 flex flex-col gap-2 z-20">
              <button
                onClick={handleSwitchCamera}
                className="p-2.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800 transition active:scale-90 shadow-md"
                title="Switch Camera (Front / Rear)"
              >
                <RotateCcw className="w-4 h-4 text-cyan-300" />
              </button>

              {hasTorchCapability && (
                <button
                  onClick={handleToggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md border transition active:scale-90 shadow-md ${
                    torchActive
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-slate-950/80 text-white border-slate-700'
                  }`}
                  title="Flashlight"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              {onOpenQRMode && (
                <button
                  onClick={() => {
                    stopCameraStream();
                    onOpenQRMode();
                  }}
                  className="p-2.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800 transition shadow-md"
                  title="QR Payment Scanner"
                >
                  <QrCode className="w-4 h-4 text-indigo-400" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Selector: Girlfriend Live Interaction vs Photo Capture */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 pt-2">
          <button
            onClick={() => setActiveTab('companion')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'companion'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Girlfriend Interaction</span>
          </button>

          <button
            onClick={() => setActiveTab('photo_capture')}
            className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'photo_capture'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo Capture &amp; HD</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-4 bg-slate-900 overflow-y-auto space-y-3.5 custom-scrollbar text-xs">
          
          {activeTab === 'companion' ? (
            <div className="space-y-3">
              
              {/* Primary Interaction Trigger */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAnalyzeVisuals()}
                  disabled={isAnalyzingVision || Boolean(cameraError)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/30 active:scale-95 transition disabled:opacity-50"
                >
                  {isAnalyzingVision ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>JARVIS dekh kar soch rahi hai...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Look at Me &amp; Talk Affectionately</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleToggleAutoObserve}
                  className={`px-3 py-2.5 rounded-2xl font-bold text-xs transition border flex items-center gap-1.5 shrink-0 ${
                    autoObserveEnabled
                      ? 'bg-pink-950 text-pink-300 border-pink-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Auto Companion Observation"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${autoObserveEnabled ? 'text-pink-400 animate-spin' : 'text-slate-400'}`} />
                  <span>{autoObserveEnabled ? 'Auto ON' : 'Auto'}</span>
                </button>
              </div>

              {/* Natural Girlfriend Conversational Suggestion Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 font-semibold block">
                  Quick Topics to Ask J. A. R. V. I. S.:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMPANION_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.id}
                      onClick={() => handleAnalyzeVisuals(sug.prompt)}
                      disabled={isAnalyzingVision}
                      className="p-2 rounded-xl bg-slate-950/70 hover:bg-pink-950/40 border border-slate-800 hover:border-pink-500/40 text-left text-[11px] text-slate-300 hover:text-pink-200 transition active:scale-95 flex items-center gap-1.5"
                    >
                      <span className="text-pink-400">💬</span>
                      <span className="truncate">{sug.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Observation Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Kuch bhi puchhein (e.g. 'Mera look kaisa hai?')"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customQuestion.trim()) {
                      handleAnalyzeVisuals(customQuestion.trim());
                      setCustomQuestion('');
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
                />
                <button
                  onClick={() => {
                    if (customQuestion.trim()) {
                      handleAnalyzeVisuals(customQuestion.trim());
                      setCustomQuestion('');
                    }
                  }}
                  disabled={!customQuestion.trim() || isAnalyzingVision}
                  className="p-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-40 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Background Limitation & Privacy Transparency */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Android &amp; Browser Privacy Guarantee:</span>
                </div>
                <p className="leading-relaxed">
                  Android OS strictly blocks background camera access to prevent unauthorized spying. J. A. R. V. I. S. only streams camera video when this screen is open with your permission. Whenever you close or minimize the app, camera access halts instantly.
                </p>
              </div>

            </div>
          ) : (
            /* Photo Capture Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-around py-2">
                {/* Gallery Thumbnail */}
                <div className="w-12 h-12 flex items-center justify-center">
                  {photos.length > 0 ? (
                    <button
                      onClick={() => setSelectedPhoto(photos[0])}
                      className="w-11 h-11 rounded-xl overflow-hidden border-2 border-cyan-400 relative shadow-md active:scale-95"
                    >
                      <img
                        src={photos[0].dataUrl}
                        alt="Latest thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-cyan-600 text-[9px] text-white font-bold px-1 rounded-tl">
                        {photos.length}
                      </span>
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Big Shutter Trigger Button */}
                <button
                  onClick={handleCapturePhoto}
                  disabled={Boolean(cameraError)}
                  className="w-18 h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white shadow-xl shadow-pink-500/25 active:scale-90 transition-transform disabled:opacity-50"
                  aria-label="Capture Photo"
                >
                  <div className="w-13 h-13 rounded-full bg-white shadow-inner flex items-center justify-center text-slate-950">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>

                {/* Launch Native Android App */}
                <button
                  onClick={handleLaunchNativeCameraApp}
                  className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex flex-col items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
                  title="Open Native Camera"
                >
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] font-semibold mt-0.5">App</span>
                </button>
              </div>

              {/* Status Message */}
              {saveSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Captured Photos Gallery */}
              {photos.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Captured Photos ({photos.length})
                    </span>
                    <span className="text-[10px] text-cyan-400">Tap to download</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-black cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img
                          src={photo.dataUrl}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Download className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Full Photo Preview & Authorized Save Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-4 animate-in fade-in">
          <div className="w-full max-w-md flex items-center justify-between text-white">
            <span className="text-xs font-semibold text-slate-300">
              Photo Taken at {selectedPhoto.timestamp}
            </span>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-md max-h-[70vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl my-auto">
            <img
              src={selectedPhoto.dataUrl}
              alt="Full Preview"
              className="max-h-[70vh] w-auto object-contain mx-auto"
            />
          </div>

          <div className="w-full max-w-md space-y-2">
            <button
              onClick={() => handleDownloadPhoto(selectedPhoto)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>Save / Download Photo to Phone</span>
            </button>
            <button
              onClick={() => {
                setPhotos((prev) => prev.filter((p) => p.id !== selectedPhoto.id));
                setSelectedPhoto(null);
              }}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Photo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
