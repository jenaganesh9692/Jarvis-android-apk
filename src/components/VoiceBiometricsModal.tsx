import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  ShieldCheck,
  AlertCircle,
  Activity,
  CheckCircle2,
  Trash2,
  RefreshCw,
  KeyRound,
  Volume2,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
} from 'lucide-react';
import { VoiceProfile, VoiceSampleFeature } from '../types';
import {
  loadVoiceProfile,
  saveVoiceProfile,
  deleteVoiceProfile,
  sampleVoiceFrequency,
  verifySpeakerMatch,
  setOwnerAuthenticated,
} from '../services/voiceBiometricsService';
import { loadSecuritySettings } from '../services/securityService';
import { playChime, speakResponse } from '../services/speechService';

interface VoiceBiometricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessVerified?: () => void;
}

const ENROLLMENT_STEPS = [
  {
    step: 1,
    label: 'Sample 1: Wake Phrase',
    promptHindi: 'Kripya bolein: "Hey J. A. R. V. I. S."',
    subtext: 'Normal conversational tone me bolein',
  },
  {
    step: 2,
    label: 'Sample 2: Owner Identity',
    promptHindi: 'Kripya bolein: "Hey J. A. R. V. I. S., main Ganesh hoon"',
    subtext: 'Spoken cadence aur voice identity record ho rahi hai',
  },
  {
    step: 3,
    label: 'Sample 3: Command Verification',
    promptHindi: 'Kripya bolein: "J. A. R. V. I. S., screen on karo"',
    subtext: 'Acoustic pitch spectrum aur timbre calculate ho raha hai',
  },
];

export const VoiceBiometricsModal: React.FC<VoiceBiometricsModalProps> = ({
  isOpen,
  onClose,
  onSuccessVerified,
}) => {
  const [profile, setProfile] = useState<VoiceProfile>(loadVoiceProfile);
  const [isRecording, setIsRecording] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [currentHz, setCurrentHz] = useState(0);
  const [currentCentroid, setCurrentCentroid] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Multi-step enrollment state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [collectedSamples, setCollectedSamples] = useState<VoiceSampleFeature[]>([]);

  // Testing & Verification Result state
  const [testResult, setTestResult] = useState<{
    similarityScore: number;
    isMatch: boolean;
    samplePitchHz: number;
    profilePitchHz: number;
    spectralCentroid: number;
    reason: string;
    recommendPin: boolean;
  } | null>(null);

  // PIN fallback
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProfile(loadVoiceProfile());
      setTestResult(null);
      setShowPinInput(false);
      setPinError('');
      setStatusMessage('');
      setCurrentStepIndex(0);
      setCollectedSamples([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Run 1 step of multi-sample enrollment
   */
  const handleRecordStep = async () => {
    const stepConfig = ENROLLMENT_STEPS[currentStepIndex];
    try {
      setIsRecording(true);
      setRecordingProgress(0);
      setStatusMessage(stepConfig.promptHindi);
      playChime('start');

      const sampleResult = await sampleVoiceFrequency((progress, hz, centroid) => {
        setRecordingProgress(progress);
        if (hz > 0) setCurrentHz(hz);
        if (centroid > 0) setCurrentCentroid(centroid);
      }, 3000);

      const newSample: VoiceSampleFeature = {
        pitchHz: sampleResult.averagePitchHz,
        spectralCentroid: sampleResult.spectralCentroid,
        zeroCrossingRate: sampleResult.zeroCrossingRate,
        sampleDurationMs: sampleResult.durationMs,
        timestamp: Date.now(),
      };

      const nextSamples = [...collectedSamples, newSample];
      setCollectedSamples(nextSamples);
      setIsRecording(false);
      playChime('success');

      if (currentStepIndex < ENROLLMENT_STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setStatusMessage(`Sample ${currentStepIndex + 1} capture ho gaya! Agle step par tap karein.`);
      } else {
        // All 3 samples collected -> compile final profile
        const pitches = nextSamples.map((s) => s.pitchHz);
        const centroids = nextSamples.map((s) => s.spectralCentroid);
        const avgPitch = Math.round(pitches.reduce((a, b) => a + b, 0) / pitches.length);
        const avgCentroid = Math.round(centroids.reduce((a, b) => a + b, 0) / centroids.length);
        const minPitch = Math.min(...pitches);
        const maxPitch = Math.max(...pitches);

        // Variance
        const variance = Math.round(
          Math.sqrt(pitches.reduce((acc, p) => acc + Math.pow(p - avgPitch, 2), 0) / pitches.length)
        );

        const newProfile: VoiceProfile = {
          enrolled: true,
          enrolledDate: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          ownerName: 'Ganesh',
          averagePitchHz: avgPitch,
          pitchRangeHz: [Math.max(70, minPitch - 15), maxPitch + 15],
          sampleCount: nextSamples.length,
          confidenceScore: 94,
          spectralCentroidAvg: avgCentroid,
          pitchVariance: variance,
          samples: nextSamples,
        };

        saveVoiceProfile(newProfile);
        setProfile(newProfile);
        setOwnerAuthenticated(true, 30, 94);
        setStatusMessage('Voice Profile safaltapoorvak enroll ho gaya! Ganesh ji ki 3-sample frequency harmonics save ho gayi hain.');
      }
    } catch (err: any) {
      setIsRecording(false);
      playChime('alert');
      setStatusMessage('Microphone access error: ' + (err?.message || 'Mic permission check karein'));
    }
  };

  /**
   * Test live speaker verification against enrolled baseline
   */
  const handleTestSpeakerVerification = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setRecordingProgress(0);
      setStatusMessage('Aawaz ka sample analyze kiya ja raha hai. Kripya bolein: "Hey J. A. R. V. I. S."...');
      playChime('start');

      const result = await verifySpeakerMatch((progress, hz, centroid) => {
        setRecordingProgress(progress);
        if (hz > 0) setCurrentHz(hz);
        if (centroid > 0) setCurrentCentroid(centroid);
      });

      setIsTesting(false);
      setTestResult(result);

      if (result.isMatch) {
        playChime('success');
        setOwnerAuthenticated(true, 20, result.similarityScore);
        setStatusMessage(`Owner Verified! Ganesh ji ki aawaz match hui (Match score: ${result.similarityScore}%).`);
        if (onSuccessVerified) {
          setTimeout(() => {
            onSuccessVerified();
            onClose();
          }, 1200);
        }
      } else {
        playChime('alert');
        setStatusMessage(
          `Unauthorized Speaker Detected! Match score: ${result.similarityScore}%. Security warning: "Ye Ganesh ka mobile hai..."`
        );
        speakResponse(
          'Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein.',
          false,
          'serious'
        );
        setShowPinInput(true);
      }
    } catch (err: any) {
      setIsTesting(false);
      playChime('alert');
      setStatusMessage('Voice verification me dikkat: ' + (err?.message || 'Mic access check karein'));
      setShowPinInput(true);
    }
  };

  const handleDeleteProfile = () => {
    deleteVoiceProfile();
    setProfile(loadVoiceProfile());
    setTestResult(null);
    setCurrentStepIndex(0);
    setCollectedSamples([]);
    setStatusMessage('Voice profile delete kar diya gaya hai.');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = loadSecuritySettings().ownerPin || '1234';
    if (pinCode === correctPin) {
      playChime('success');
      setOwnerAuthenticated(true, 20, 95);
      setPinError('');
      setStatusMessage('PIN safalta se verify ho gaya! Ganesh ji authorized.');
      if (onSuccessVerified) {
        setTimeout(() => {
          onSuccessVerified();
          onClose();
        }, 800);
      }
    } else {
      playChime('alert');
      setPinError('Galat PIN. Kripya apna valid owner PIN enter karein.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Owner Voice Biometrics (Ganesh)
              </h3>
              <p className="text-xs text-slate-400">
                Acoustic Frequency Harmonics & Speaker Verification
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

        {/* Enrollment Status Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enrollment Status
            </span>
            {profile.enrolled ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled (Ganesh)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Not Enrolled
              </span>
            )}
          </div>

          {profile.enrolled ? (
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Fundamental Pitch</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {profile.averagePitchHz} Hz
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Timbre Centroid</div>
                <div className="text-sm font-bold text-indigo-300 mt-0.5">
                  {profile.spectralCentroidAvg || 1100} Hz
                </div>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Samples Enrolled</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {profile.sampleCount || 3} Passes
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 leading-relaxed">
              J. A. R. V. I. S. ko sirf Ganesh ji ki aawaz pehchanne ke liye 3 multi-sample voice recordings enroll karein. Anya kisi ki aawaz aane par protected commands block rahenge.
            </div>
          )}
        </div>

        {/* Multi-Step Guided Enrollment Section */}
        {(!profile.enrolled || collectedSamples.length > 0) && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Multi-Sample Enrollment Steps ({currentStepIndex + 1}/3)
              </span>
              <span className="text-[11px] text-slate-400">
                {collectedSamples.length} of 3 captured
              </span>
            </div>

            {/* Stepper bar */}
            <div className="grid grid-cols-3 gap-2">
              {ENROLLMENT_STEPS.map((s, idx) => (
                <div
                  key={s.step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx < collectedSamples.length
                      ? 'bg-emerald-400'
                      : idx === currentStepIndex
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Current Step Instruction */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center space-y-1">
              <div className="text-xs font-bold text-white">
                {ENROLLMENT_STEPS[currentStepIndex].label}
              </div>
              <div className="text-xs text-cyan-300 font-medium">
                {ENROLLMENT_STEPS[currentStepIndex].promptHindi}
              </div>
              <div className="text-[11px] text-slate-400">
                {ENROLLMENT_STEPS[currentStepIndex].subtext}
              </div>
            </div>

            {/* Record Step Action */}
            <button
              onClick={handleRecordStep}
              disabled={isRecording || isTesting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-bounce text-white' : ''}`} />
              {isRecording ? 'Recording & Analyzing Harmonic Spectrum...' : `Record Sample ${currentStepIndex + 1}`}
            </button>
          </div>
        )}

        {/* Live Audio / Frequency Monitor */}
        {(isRecording || isTesting) && (
          <div className="mt-4 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-2 text-center animate-pulse">
            <div className="text-xs text-cyan-300 font-medium flex items-center justify-center gap-1.5">
              <Volume2 className="w-4 h-4 animate-spin" />
              {isRecording ? 'Extracting Vocal Harmonics & Formants...' : 'Comparing Speaker Profile against Ganesh...'}
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
              <div>
                <div className="text-[10px] text-slate-400">Fundamental Pitch</div>
                <div className="text-xl font-mono font-bold text-cyan-400">
                  {currentHz > 0 ? `${currentHz} Hz` : 'Listening...'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Spectral Centroid</div>
                <div className="text-xl font-mono font-bold text-indigo-400">
                  {currentCentroid > 0 ? `${currentCentroid} Hz` : '--'}
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 h-full transition-all duration-75"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && !isRecording && !isTesting && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
            {statusMessage}
          </div>
        )}

        {/* Test Result Card */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs space-y-2 ${
              testResult.isMatch
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {testResult.isMatch ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Authorized Owner Match: Ganesh
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 text-rose-400" />
                    Unauthorized Speaker Detected!
                  </>
                )}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-black/40 font-mono">
                {testResult.similarityScore}% Match
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {testResult.reason}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
              <div>Sample: {testResult.samplePitchHz} Hz</div>
              <div>Ganesh Baseline: {testResult.profilePitchHz} Hz</div>
            </div>
          </div>
        )}

        {/* PIN Fallback Form */}
        {showPinInput && (
          <form
            onSubmit={handlePinSubmit}
            className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <KeyRound className="w-4 h-4" />
              Owner PIN Fallback Verification
            </div>
            <p className="text-[11px] text-slate-400">
              Voice match anishchit hone ya galat person bolne par Ganesh ji apna Owner PIN (Default: 1234) darj karein.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Owner PIN (1234)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center tracking-widest text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition"
              >
                Verify PIN
              </button>
            </div>
            {pinError && <div className="text-xs text-rose-400">{pinError}</div>}
          </form>
        )}

        {/* Privacy & Architecture Guarantee */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            100% Local Device Privacy Guarantee
          </div>
          <p>
            Audio frequency calculation poori tarah aapke device par browser Web Audio API Analyser dwara local mathematical feature extraction se hoti hai. Koi bhi audio recording kisi bhi server par transmit ya store nahi hoti.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-wrap gap-2 justify-end border-t border-slate-800 pt-3">
          {profile.enrolled && (
            <>
              <button
                onClick={handleDeleteProfile}
                disabled={isRecording || isTesting}
                className="px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg border border-rose-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset Profile
              </button>
              <button
                onClick={handleTestSpeakerVerification}
                disabled={isRecording || isTesting}
                className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" /> Test Voice Match
              </button>
            </>
          )}

          {profile.enrolled && collectedSamples.length === 0 && (
            <button
              onClick={() => {
                setCollectedSamples([]);
                setCurrentStepIndex(0);
                setStatusMessage('Re-enrollment shuru karein.');
              }}
              className="px-3.5 py-2 text-xs font-medium bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/30 rounded-lg transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-Enroll 3 Samples
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
