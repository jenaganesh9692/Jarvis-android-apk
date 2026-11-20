import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Grid,
  Sliders,
  HelpCircle,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  ShieldAlert,
  Layers,
  Cpu,
  Camera,
  Phone,
} from 'lucide-react';
import { VivoHeader } from './components/VivoHeader';
import { VoiceOrb, AssistantState } from './components/VoiceOrb';
import { ChatHistory } from './components/ChatHistory';
import { WhatsAppSenderModal } from './components/WhatsAppSenderModal';
import { QRScannerModal } from './components/QRScannerModal';
import { CameraSectionModal } from './components/CameraSectionModal';
import { SettingsController } from './components/SettingsController';
import { AppsLauncher } from './components/AppsLauncher';
import { VivoSetupGuideModal } from './components/VivoSetupGuideModal';
import { PermissionsPrivacyModal } from './components/PermissionsPrivacyModal';
import { EmergencyModal } from './components/EmergencyModal';
import { SecureLockShield } from './components/SecureLockShield';
import { EdgeGlowEffect } from './components/EdgeGlowEffect';
import { ConnectedDevicesHub } from './components/ConnectedDevicesHub';
import { VoiceBiometricsModal } from './components/VoiceBiometricsModal';
import { FaceAuthModal } from './components/FaceAuthModal';
import { ApkPackagingGuideModal } from './components/ApkPackagingGuideModal';
import { AlarmScheduleModal } from './components/AlarmScheduleModal';
import { BackgroundServiceBar } from './components/BackgroundServiceBar';
import { ProjectMemoryModal } from './components/ProjectMemoryModal';
import { VoiceSelectorModal } from './components/VoiceSelectorModal';
import { StarkFullScreenHud } from './components/StarkFullScreenHud';
import { SystemStatusModal } from './components/SystemStatusModal';
import { HudMenuId } from './components/ArcReactorHud';
import { CallAssistantModal } from './components/CallAssistantModal';
import {
  syncNativeCallAuthorizations,
  executeSwitchToHumanMode,
} from './services/callAssistantService';
import {
  AlarmItem,
  NightScheduleSettings,
  loadAlarms,
  loadNightSchedule,
  saveNightSchedule,
  startAlarmSound,
  stopAlarmSound,
  snoozeAlarm,
  dismissAlarm,
} from './services/alarmScheduleService';
import {
  ChatMessage,
  AssistantResponse,
  LanguageMode,
  AppPermission,
  TouchSecuritySettings,
  SecurityAlertEvent,
  EmotionTone,
} from './types';
import { sendVoicePrompt } from './services/geminiService';
import { processOfflineCommand, isFastPathCommand } from './services/offlineEngine';
import {
  isOwnerAuthenticated,
  setOwnerAuthenticated,
  loadVoiceProfile,
} from './services/voiceBiometricsService';
import {
  backgroundWakeService,
  loadBackgroundConfig,
  saveBackgroundConfig,
} from './services/backgroundWakeService';
import {
  createSpeechRecognizer,
  SpeechRecognitionController,
  speakResponse,
  stopSpeaking,
  playChime,
} from './services/speechService';
import { toggleFlashlight } from './services/torchService';
import {
  isPermissionAllowed,
  loadPermissions,
  requestBrowserPermission,
  savePermissionPreference,
} from './services/permissionService';
import {
  loadSecuritySettings,
  saveSecuritySettings,
  getIsLocked,
  setIsLocked,
  playGaneshWarningSpoken,
  playSecuritySiren,
  stopSecuritySiren,
  logSecurityAlert,
  triggerHapticWarning,
  triggerSecurityLockAction,
} from './services/securityService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'devices' | 'emergency' | 'apps' | 'settings'>('assistant');
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('hi-IN');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>(loadPermissions());

  // Modals state
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{ recipient?: string; message?: string; phone?: string }>({});
  const [isQROpen, setIsQROpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isVoiceBiometricsOpen, setIsVoiceBiometricsOpen] = useState(false);
  const [isFaceAuthOpen, setIsFaceAuthOpen] = useState(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState(false);
  const [isProjectMemoryOpen, setIsProjectMemoryOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const [isFullScreenHudOpen, setIsFullScreenHudOpen] = useState(false);
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(false);
  const [isCallAssistantOpen, setIsCallAssistantOpen] = useState(false);
  const [callExternalCommand, setCallExternalCommand] = useState<'switch_human' | 'switch_ai' | 'open_call_assistant' | null>(null);
  const [activeRingingAlarm, setActiveRingingAlarm] = useState<AlarmItem | null>(null);

  // Background Voice Activation ("Hey J. A. R. V. I. S.") state
  const [isBackgroundListening, setIsBackgroundListening] = useState(false);
  const [backgroundAudioVol, setBackgroundAudioVol] = useState(0);
  const [backgroundDominantHz, setBackgroundDominantHz] = useState(0);
  const [voiceProfile, setVoiceProfile] = useState(loadVoiceProfile);

  const speechRecognizerRef = useRef<SpeechRecognitionController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Touch & Motion Security State
  const [securitySettings, setSecuritySettings] = useState<TouchSecuritySettings>(loadSecuritySettings);
  const [isLocked, setIsLockedState] = useState<boolean>(getIsLocked);
  const [latestAlert, setLatestAlert] = useState<SecurityAlertEvent | null>(null);
  const [armCountdown, setArmCountdown] = useState<number | null>(null);
  const [lockGraceCountdown, setLockGraceCountdown] = useState<number | null>(null);
  const [screenBrightness, setScreenBrightness] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_screen_brightness');
      const parsed = saved ? parseInt(saved, 10) : 100;
      return Number.isFinite(parsed) ? parsed : 100;
    }
    return 100;
  });

  const handleBrightnessChange = (val: number) => {
    setScreenBrightness(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_screen_brightness', val.toString());
    }
  };

  const isArmedRef = useRef(securitySettings.isArmed);
  const isLockedRef = useRef(isLocked);
  const securitySettingsRef = useRef(securitySettings);
  const isMutedRef = useRef(isMuted);
  const isFullScreenHudOpenRef = useRef(isFullScreenHudOpen);
  const assistantStateRef = useRef<AssistantState>(assistantState);
  const lastMotionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const isTriggeringAlertRef = useRef(false);
  const unauthorizedAttemptsRef = useRef(0);

  // Grace Period countdown before auto-locking on repeated unauthorized attempts
  useEffect(() => {
    if (lockGraceCountdown === null) return;
    if (lockGraceCountdown > 0) {
      const timer = setTimeout(() => {
        setLockGraceCountdown(lockGraceCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockGraceCountdown === 0) {
      setLockGraceCountdown(null);
      // Trigger Lock Shield
      const lockResult = triggerSecurityLockAction();
      setIsLockedState(true);
      isLockedRef.current = true;
      const alertEvent = logSecurityAlert({
        triggerType: 'manual_test',
        detailsHindi: 'Unauthorized attempts ke baad security lock activate hua',
        nativeOsLockConfirmed: lockResult.nativeOsLockConfirmed,
      });
      setLatestAlert(alertEvent);
      playChime('alert');
    }
  }, [lockGraceCountdown]);

  useEffect(() => {
    isArmedRef.current = securitySettings.isArmed;
    securitySettingsRef.current = securitySettings;
  }, [securitySettings]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isFullScreenHudOpenRef.current = isFullScreenHudOpen;
  }, [isFullScreenHudOpen]);

  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Arming Countdown Timer (5-second grace window to place phone down)
  useEffect(() => {
    if (armCountdown === null) return;
    if (armCountdown > 0) {
      const timer = setTimeout(() => {
        setArmCountdown(armCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (armCountdown === 0) {
      const updated: TouchSecuritySettings = {
        ...securitySettings,
        enabled: true,
        isArmed: true,
      };
      setSecuritySettings(updated);
      saveSecuritySettings(updated);
      isArmedRef.current = true;
      setArmCountdown(null);
      playChime('acting');
    }
  }, [armCountdown, securitySettings]);

  // Motion and Touch Alert Listener (Autonomous: No "Hey J. A. R. V. I. S." required)
  useEffect(() => {
    if (
      !securitySettings.enabled ||
      !securitySettings.isArmed ||
      !securitySettings.antiTheftSecurityEnabled ||
      isLocked
    ) {
      return;
    }

    const sensitivityThresholds: Record<'low' | 'medium' | 'high', number> = {
      low: 6.5,
      medium: 3.5,
      high: 2.0,
    };
    const threshold = sensitivityThresholds[securitySettings.sensitivity] || 3.5;

    // Movement / Pickup detection
    const handleMotion = (event: DeviceMotionEvent) => {
      if (isLockedRef.current || isTriggeringAlertRef.current || !isArmedRef.current) return;
      if (!securitySettingsRef.current.autoLockOnMotion) return;

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      if (lastMotionRef.current) {
        const dx = Math.abs(acc.x - lastMotionRef.current.x);
        const dy = Math.abs(acc.y - lastMotionRef.current.y);
        const dz = Math.abs(acc.z - lastMotionRef.current.z);
        const deltaMagnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (deltaMagnitude > threshold) {
          handleTriggerUnauthorizedAlert(
            'motion',
            'Phone hilaya ya uthaya gaya (Movement / Pickup Detected)'
          );
        }
      }

      lastMotionRef.current = { x: acc.x, y: acc.y, z: acc.z };
    };

    // Screen Touch detection
    const handleScreenTouch = () => {
      if (isLockedRef.current || isTriggeringAlertRef.current || !isArmedRef.current) return;
      if (!securitySettingsRef.current.autoLockOnTouch) return;

      handleTriggerUnauthorizedAlert(
        'touch',
        'Screen chhooi gayi (Unauthorized Screen Touch Detected)'
      );
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    window.addEventListener('pointerdown', handleScreenTouch, { capture: true, passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('pointerdown', handleScreenTouch, { capture: true });
    };
  }, [securitySettings.enabled, securitySettings.isArmed, securitySettings.antiTheftSecurityEnabled, securitySettings.sensitivity, isLocked]);

  // Autonomous Alarm & Night Schedule Monitor
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      const todayStr = now.toISOString().split('T')[0];

      // 1. Check Alarms
      const currentAlarms = loadAlarms();
      for (const alarm of currentAlarms) {
        if (!alarm.enabled) continue;

        if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) {
          continue;
        }

        if (alarm.time === timeStr && now.getSeconds() === 0) {
          setActiveRingingAlarm(alarm);
          startAlarmSound();
          if (!isMutedRef.current) {
            speakResponse(
              `Utho boss! Subah ke ${alarm.time} baj chuke hain. Aapka alarm baj raha hai.`,
              !isOnline,
              'happy'
            );
          }
          break;
        }
      }

      // 2. Check Night Bedtime Cutoff Announcement (e.g. 22:30)
      const schedule = loadNightSchedule();
      if (
        schedule.sleepModeEnabled &&
        schedule.autoSleepAnnouncement &&
        schedule.bedtime === timeStr &&
        now.getSeconds() === 0
      ) {
        if (schedule.lastSleepAnnouncedDate !== todayStr) {
          saveNightSchedule({ ...schedule, lastSleepAnnouncedDate: todayStr, isSleepingNow: true });
          if (!isMutedRef.current) {
            speakResponse(
              'Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna.',
              !isOnline,
              'calm'
            );
          }
        }
      }
    }, 1000);

    return () => clearInterval(alarmInterval);
  }, [isOnline]);

  const handleDismissRinging = (alarmId?: string) => {
    const targetId = alarmId || activeRingingAlarm?.id;
    if (targetId) {
      dismissAlarm(targetId);
    } else {
      stopAlarmSound();
    }
    setActiveRingingAlarm(null);
    if (!isMutedRef.current) {
      speakResponse('Shubh prabhat boss! Alarm band kar diya gaya hai.', !isOnline, 'warm');
    }
  };

  const handleSnoozeRinging = (mins: number = 5) => {
    if (activeRingingAlarm) {
      snoozeAlarm(activeRingingAlarm.id, mins);
      setActiveRingingAlarm(null);
      if (!isMutedRef.current) {
        speakResponse(`Theek hai boss, ${mins} minute ke liye snooze kar diya hai.`, !isOnline, 'calm');
      }
    } else {
      stopAlarmSound();
    }
  };

  const handleTriggerUnauthorizedAlert = async (
    triggerType: 'touch' | 'motion' | 'manual_test',
    detailsHindi: string
  ) => {
    if (isTriggeringAlertRef.current) return;
    isTriggeringAlertRef.current = true;

    // 1. Truthfully lock in-app shield
    const lockResult = triggerSecurityLockAction();
    setIsLockedState(true);
    isLockedRef.current = true;

    const alertEvent = logSecurityAlert({
      triggerType,
      detailsHindi,
      nativeOsLockConfirmed: lockResult.nativeOsLockConfirmed,
    });
    setLatestAlert(alertEvent);

    // 2. Haptic vibration
    triggerHapticWarning();

    // 3. Siren & Spoken warning logic:
    // If face verification is enabled for motion/pickup, the authorized face workflow runs first.
    // If verification fails or remains inconclusive in SecureLockShield, it triggers the siren & warning.
    // If it's a manual test or face verification is disabled, trigger warning immediately.
    const shouldWarnImmediately =
      triggerType === 'manual_test' ||
      !securitySettingsRef.current.faceVerificationEnabled;

    if (shouldWarnImmediately) {
      if (securitySettingsRef.current.sirenAlarmEnabled) {
        playSecuritySiren(8);
      }
      if (securitySettingsRef.current.spokenWarningEnabled && !isMutedRef.current) {
        await playGaneshWarningSpoken();
      }
    }

    setTimeout(() => {
      isTriggeringAlertRef.current = false;
    }, 1200);
  };

  const handleUnlockSuccess = () => {
    stopSecuritySiren();
    setIsLocked(false);
    setIsLockedState(false);
    isLockedRef.current = false;
    unauthorizedAttemptsRef.current = 0;
    setOwnerAuthenticated(true);
    setLockGraceCountdown(null);

    // Disarm after unlocking so Ganesh can use phone
    const updated = { ...securitySettings, isArmed: false };
    setSecuritySettings(updated);
    saveSecuritySettings(updated);
    isArmedRef.current = false;
    playChime('success');
  };

  const handleToggleQuickArm = () => {
    if (securitySettings.isArmed) {
      const updated = { ...securitySettings, isArmed: false };
      setSecuritySettings(updated);
      saveSecuritySettings(updated);
      isArmedRef.current = false;
      setArmCountdown(null);
      playChime('click');
      if (!isMuted) {
        speakResponse('Touch security guard disarm ho gaya hai.', !isOnline, 'calm');
      }
    } else {
      setArmCountdown(5);
      playChime('start');
      if (!isMuted) {
        speakResponse('Phone rakh dijiye. Paanch second me touch guard arm ho jayega.', !isOnline, 'calm');
      }
    }
  };

  const handleUpdateSecuritySettings = (updated: TouchSecuritySettings) => {
    setSecuritySettings(updated);
    saveSecuritySettings(updated);
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Speech Recognizer
  useEffect(() => {
    const recognizer = createSpeechRecognizer(
      (text, isFinal) => {
        setTranscript(text);
        setMicError(null);
        if (isFinal && text.trim()) {
          setAssistantState('thinking');
          handleProcessVoiceCommand(text.trim());
        }
      },
      (error) => {
        console.warn('Speech recognition error:', error);
        setAssistantState('idle');
        setTranscript('');
        if (error === 'permission-denied') {
          setMicError('Microphone permission blocked hai. Browser URL bar me permission allow karein ya type karein.');
        } else if (error === 'no-speech') {
          setMicError('Koi aawaz nahi suni gayi. Dobara mic dabakar bolein ya type karein.');
        } else {
          setMicError(`Voice input error (${error}). Aap niche type kar sakte hain.`);
        }
        backgroundWakeService.resumeAfterCommand();
      },
      () => {
        if (assistantStateRef.current === 'listening') {
          setAssistantState('idle');
          backgroundWakeService.resumeAfterCommand();
        }
      },
      languageMode
    );

    speechRecognizerRef.current = recognizer;

    // Welcome Greeting in Roman Hindi
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      text: 'Namaste Ganesh ji! Main J. A. R. V. I. S. hoon – aapka smart personal voice assistant. Main Hinglish aur English commands samajhti hoon.\n\nAap mujhse WhatsApp message, Emergency SOS, Smart Devices control, Torch ya QR Scanner ke liye bol sakte hain.',
      timestamp: new Date(),
      emotion: 'warm',
      safetyAdvice: 'Safety Rule: WhatsApp sandesh ya payment karne se pehle main hamesha confirmation maangoongi.',
    };
    setMessages([welcomeMsg]);
    syncNativeCallAuthorizations();

    return () => {
      stopSpeaking();
    };
  }, []);

  const startAutoListeningInHud = () => {
    if (!speechRecognizerRef.current?.isAvailable) {
      setMicError('Is browser me voice speech recognition supported nahi hai. Type Command use karein.');
      setAssistantState('idle');
      return;
    }
    if (!isPermissionAllowed('microphone')) {
      setMicError('Microphone permission allow karein taaki JARVIS aapka command sun sake.');
      setAssistantState('idle');
      return;
    }

    backgroundWakeService.pauseForCommand();
    setMicError(null);
    setTranscript('');
    setAssistantState('listening');
    try {
      speechRecognizerRef.current.start();
    } catch (e) {
      console.warn('Auto-listen start warning:', e);
      setAssistantState('idle');
      backgroundWakeService.resumeAfterCommand();
    }
  };

  // Background Wake-Word ("Hey J. A. R. V. I. S.") Registration
  useEffect(() => {
    backgroundWakeService.registerCallbacks({
      onWakeWordDetected: async (isOwner, confidence, followUpCommand) => {
        if (isOwner) {
          // Do not activate repeatedly while JARVIS HUD or active turn is already running
          if (isFullScreenHudOpenRef.current) {
            if (
              followUpCommand &&
              followUpCommand.length > 2 &&
              assistantStateRef.current === 'idle'
            ) {
              backgroundWakeService.pauseForCommand();
              handleProcessVoiceCommand(followUpCommand);
            }
            return;
          }

          if (assistantStateRef.current !== 'idle') {
            return;
          }

          playChime('acting');
          // Smoothly launch Full-Screen Stark Circular HUD on "Hey JARVIS"
          setIsFullScreenHudOpen(true);

          if (followUpCommand && followUpCommand.length > 2) {
            backgroundWakeService.pauseForCommand();
            handleProcessVoiceCommand(followUpCommand);
          } else {
            backgroundWakeService.pauseForCommand();
            if (!isMutedRef.current) {
              setAssistantState('speaking');
              await speakResponse('Ji Ganesh ji, kahiye...', !isOnline, 'warm');
            }
            startAutoListeningInHud();
          }
        } else {
          // Unrecognized speaker
          playChime('alert');
          const warning =
            'Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein.';
          if (!isMutedRef.current) {
            speakResponse(warning, !isOnline, 'serious');
          }
          const alertEvent = logSecurityAlert({
            triggerType: 'manual_test',
            detailsHindi: `Unauthorized speaker dwara "Hey J. A. R. V. I. S." wake trigger (Confidence: ${confidence}%)`,
            nativeOsLockConfirmed: false,
          });
          setLatestAlert(alertEvent);
        }
      },
      onAudioVolume: (vol, hz) => {
        setBackgroundAudioVol(vol);
        setBackgroundDominantHz(hz);
      },
      onStatusChange: (running) => {
        setIsBackgroundListening(running);
      },
    });

    return () => {
      backgroundWakeService.stop();
    };
  }, [isOnline, isMuted]);

  const handleToggleBackgroundListening = async () => {
    if (isBackgroundListening) {
      backgroundWakeService.stop();
      setIsBackgroundListening(false);
      playChime('click');
      if (!isMuted) {
        speakResponse('Wake word listening off kar diya gaya hai.', !isOnline, 'calm');
      }
    } else {
      playChime('start');
      const res = await backgroundWakeService.start();
      if (res.success) {
        setIsBackgroundListening(true);
        if (!isMuted) {
          speakResponse('Hey JARVIS wake listening active hai. Page khule rehne par aap kabhi bhi bol sakte hain.', !isOnline, 'warm');
        }
      } else {
        setMicError(res.message);
        if (!backgroundWakeService.getCapabilities().supported) {
          // Browser doesn't support SpeechRecognition; don't pretend permissions modal fixes it
          setAssistantState('idle');
        } else {
          setIsPermissionsOpen(true);
        }
      }
    }
  };

  const handleToggleLanguage = () => {
    const nextLang: LanguageMode = languageMode === 'hi-IN' ? 'en-IN' : 'hi-IN';
    setLanguageMode(nextLang);
    speechRecognizerRef.current?.setLanguage(nextLang);
    playChime('click');
  };

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, assistantState]);

  const handleMicToggle = async () => {
    if (assistantState === 'listening') {
      speechRecognizerRef.current?.stop();
      setAssistantState('idle');
      backgroundWakeService.resumeAfterCommand();
      return;
    }

    if (!speechRecognizerRef.current || !speechRecognizerRef.current.isAvailable) {
      setMicError('Is browser me speech recognition available nahi hai. Niche type karein.');
      setAssistantState('idle');
      return;
    }

    // Auto-prompt microphone permission if not yet permitted
    if (!isPermissionAllowed('microphone')) {
      try {
        const granted = await requestBrowserPermission('microphone');
        if (granted) {
          setPermissions(savePermissionPreference('microphone', true));
        } else {
          setMicError('Microphone permission blocked hai. Browser ke top URL bar me Lock (🔒) icon tap karke Microphone Allow karein, ya neeche type karein.');
          setIsPermissionsOpen(true);
          setAssistantState('idle');
          return;
        }
      } catch (err) {
        setMicError('Microphone request fail hui. Settings check karein ya type karein.');
        setAssistantState('idle');
        return;
      }
    }

    stopSpeaking();
    backgroundWakeService.pauseForCommand();
    setTranscript('');
    setMicError(null);
    setAssistantState('listening');

    try {
      speechRecognizerRef.current.start();
    } catch (e: any) {
      console.warn('Mic start failed', e);
      setMicError('Mic start karne me error aaya. Niche type karein.');
      setAssistantState('idle');
      backgroundWakeService.resumeAfterCommand();
    }
  };

  const handleProcessVoiceCommand = async (commandText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: commandText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('thinking');
    setTranscript('');

    try {
      let res: AssistantResponse;

      // 1. FAST-PATH EXECUTION (< 5ms Zero Latency):
      // Check if command is a direct action (camera, torch, apps, settings, alarm, devices, SOS, etc.)
      const isFast = isFastPathCommand(commandText);
      const quickRes = processOfflineCommand(commandText);

      if (isFast || !isOnline || quickRes.actionType !== 'GENERAL_CONVERSATION') {
        // Direct Action: Execute in ~2ms with zero network waiting!
        res = quickRes;
      } else {
        // Open-ended conversation: query Gemini AI
        try {
          const historyPayload = messages.map((m) => ({
            role: m.role,
            content: m.text,
          }));
          res = await sendVoicePrompt(commandText, historyPayload);
        } catch (serverErr) {
          console.warn('Online request failed, using instant local response', serverErr);
          res = quickRes;
        }
      }

      // Check if command attempts to access protected features without owner authentication
      const isProtected =
        res.actionType === 'SEND_WHATSAPP' ||
        commandText.toLowerCase().includes('contacts dikhao') ||
        commandText.toLowerCase().includes('messages padho') ||
        commandText.toLowerCase().includes('private data') ||
        commandText.toLowerCase().includes('location share') ||
        commandText.toLowerCase().includes('security off') ||
        commandText.toLowerCase().includes('guard off') ||
        commandText.toLowerCase().includes('pin change') ||
        commandText.toLowerCase().includes('pin reset');

      if (
        securitySettings.requireOwnerAuthForProtectedCommands &&
        isProtected &&
        !isOwnerAuthenticated()
      ) {
        unauthorizedAttemptsRef.current += 1;

        const warningText =
          'Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein.';

        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: `${warningText} (Protected feature access blocked. Kripya Owner PIN ya Voice Profile verify karein)`,
          timestamp: new Date(),
          actionType: 'SECURITY_LOCK',
          actionDetails: { feature: 'unauthorized_attempt' },
          requiresConfirmation: false,
          safetyAdvice: 'Owner Privacy: Bina verification ke Ganesh ji ka personal data access nahi kiya ja sakta.',
          isOffline: !isOnline,
          emotion: 'serious',
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setAssistantState('speaking');
        if (!isMuted) {
          await speakResponse(warningText, !isOnline, 'serious');
        }
        setAssistantState('idle');

        // Trigger phone lock procedure if attempts exceed threshold
        if (
          !securitySettings.unauthorizedAttemptsWarningOnly &&
          unauthorizedAttemptsRef.current >= (securitySettings.maxUnauthorizedAttemptsBeforeLock || 2) &&
          !isLockedRef.current
        ) {
          setLockGraceCountdown(securitySettings.lockGracePeriodSeconds || 3);
        }
        return;
      }

      setAssistantState('acting');
      playChime('acting');
      executeAssistantAction(res);

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        text: res.textHindi,
        timestamp: new Date(),
        actionType: res.actionType,
        actionDetails: res.actionDetails,
        requiresConfirmation: res.requiresConfirmation,
        confirmationMessage: res.confirmationMessage,
        safetyAdvice: res.safetyAdvice,
        isOffline: !isOnline,
        emotion: res.emotion,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      const isCallHandoff =
        res.actionType === 'CALL_ASSISTANT' &&
        (res.actionDetails?.action === 'switch_human' || res.actionDetails?.action === 'switch_ai');

      if (!isMuted && !isCallHandoff) {
        setAssistantState('speaking');
        await speakResponse(res.textHindi, !isOnline, res.emotion || 'warm');
      }

      if (res.actionType === 'HUD_CONTROL' && res.actionDetails?.action === 'open_hud') {
        startAutoListeningInHud();
      } else {
        setAssistantState('idle');
        backgroundWakeService.resumeAfterCommand();
      }
    } catch (err: any) {
      console.error('Assistant error:', err);
      const fallbackText = 'Maaf kijiye Ganesh ji, command process karne me takneeki dikkat aayi. Kripya dobara bolein ya type karein.';
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: fallbackText,
        timestamp: new Date(),
        emotion: 'empathetic',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setAssistantState('speaking');
      if (!isMuted) {
        await speakResponse(fallbackText, !isOnline, 'empathetic');
      }
      setAssistantState('idle');
      backgroundWakeService.resumeAfterCommand();
    }
  };

  const executeAssistantAction = (res: AssistantResponse) => {
    const { actionType, actionDetails } = res;

    if (actionType === 'EMERGENCY_TRIGGER') {
      setIsEmergencyOpen(true);
    } else if (actionType === 'OPEN_CAMERA') {
      setIsCameraOpen(true);
    } else if (actionType === 'ALL_APPS') {
      setActiveTab('apps');
    } else if (actionType === 'DEVICE_CONTROL') {
      setActiveTab('devices');
    } else if (actionType === 'VOICE_AUTH') {
      setIsVoiceBiometricsOpen(true);
    } else if (actionType === 'FACE_AUTH') {
      setIsFaceAuthOpen(true);
    } else if (actionType === 'SEND_WHATSAPP') {
      setWhatsAppData({
        recipient: actionDetails?.recipient || 'Friend',
        message: actionDetails?.message || 'Namaste!',
        phone: actionDetails?.phone || '',
      });
      setIsWhatsAppOpen(true);
    } else if (actionType === 'SCAN_PAYMENT') {
      setIsQROpen(true);
    } else if (actionType === 'PHONE_SETTING') {
      if (
        actionDetails?.action === 'torch_on' ||
        actionDetails?.action === 'torch_off' ||
        actionDetails?.action === 'toggle_torch' ||
        actionDetails?.settingName?.toLowerCase().includes('torch') ||
        actionDetails?.settingName?.toLowerCase().includes('flash')
      ) {
        toggleFlashlight();
      } else if (
        actionDetails?.settingName?.toLowerCase().includes('display') ||
        actionDetails?.intentUrl === 'DISPLAY_SETTINGS'
      ) {
        const textLower = res.textHindi.toLowerCase();
        if (textLower.includes('kam') || textLower.includes('dim')) {
          handleBrightnessChange(Math.max(30, screenBrightness - 25));
        } else if (textLower.includes('badhao') || textLower.includes('full')) {
          handleBrightnessChange(Math.min(100, screenBrightness + 25));
        }
        window.location.href = `intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end`;
      } else if (actionDetails?.intentUrl) {
        const fullIntent = actionDetails.intentUrl.startsWith('android.settings.')
          ? actionDetails.intentUrl
          : `android.settings.${actionDetails.intentUrl}`;
        window.location.href = `intent:#Intent;action=${fullIntent};end`;
      }
    } else if (actionType === 'OPEN_APP') {
      if (actionDetails?.appName?.toLowerCase() === 'camera') {
        setIsCameraOpen(true);
      } else if (actionDetails?.packageOrUrl) {
        const targetUrl = actionDetails.packageOrUrl;
        setTimeout(() => {
          if (targetUrl.startsWith('http')) {
            window.open(targetUrl, '_blank');
          } else {
            window.location.href = targetUrl;
          }
        }, 60);
      }
    } else if (actionType === 'ALARM_TIMER') {
      if (actionDetails?.action === 'dismiss_alarm') {
        handleDismissRinging();
      } else {
        setIsAlarmModalOpen(true);
      }
    } else if (actionType === 'MAKE_CALL') {
      window.location.href = 'tel:';
    } else if (actionType === 'CALL_ASSISTANT') {
      const callAct = actionDetails?.action as 'switch_human' | 'switch_ai' | 'open_call_assistant' | undefined;
      if (callAct === 'switch_human') {
        executeSwitchToHumanMode();
      }
      setCallExternalCommand(callAct || 'open_call_assistant');
      setIsCallAssistantOpen(true);
    } else if (actionType === 'SECURITY_LOCK') {
      handleTriggerUnauthorizedAlert('manual_test', 'Voice command dwara security shield lock trigger');
    } else if (actionType === 'HUD_CONTROL') {
      if (actionDetails?.action === 'close_hud') {
        speechRecognizerRef.current?.stop();
        setIsFullScreenHudOpen(false);
      } else if (actionDetails?.action === 'open_hud') {
        if (!isFullScreenHudOpenRef.current) {
          setIsFullScreenHudOpen(true);
        }
      }
    } else if (actionType === 'VIVO_GUIDE') {
      setIsGuideOpen(true);
    }
  };

  const handleReplayAudio = async (text: string, base64Audio?: string, emotion?: EmotionTone) => {
    stopSpeaking();
    playChime('click');
    setAssistantState('speaking');
    await speakResponse(text, !isOnline, emotion || 'warm');
    setAssistantState('idle');
  };

  const handleSpeakStatus = async (msg: string) => {
    if (!isMuted) {
      stopSpeaking();
      await speakResponse(msg, !isOnline, 'calm');
    }
  };

  const handleHudMenuSelect = (menuId: HudMenuId, closeFullHud: boolean = false) => {
    playChime('click');
    if (closeFullHud && menuId !== 'voice') {
      setIsFullScreenHudOpen(false);
    }

    switch (menuId) {
      case 'voice':
        handleMicToggle();
        break;
      case 'camera':
        setIsCameraOpen(true);
        break;
      case 'apps':
        setActiveTab('apps');
        break;
      case 'settings':
        setActiveTab('settings');
        break;
      case 'status':
        setIsSystemStatusOpen(true);
        break;
      case 'ai':
        setActiveTab('assistant');
        break;
    }
  };

  const latestAssistantReply = [...messages].reverse().find((m) => m.role === 'assistant')?.text;

  return (
    <div className="min-h-screen stark-hud-grid text-slate-100 flex justify-center selection:bg-cyan-500 selection:text-white">
      {/* 4-Corner Holographic Screen-Edge Energy Frame */}
      <EdgeGlowEffect state={assistantState} />

      <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl bg-[#02050b]/90 flex flex-col min-h-screen shadow-[0_0_50px_rgba(0,212,255,0.08)] relative border-x border-cyan-500/20">
        {/* Stark Holographic Header */}
        <VivoHeader
          isMuted={isMuted}
          isOnline={isOnline}
          onToggleMute={() => setIsMuted(!isMuted)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenPermissions={() => setIsPermissionsOpen(true)}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onToggleOnlineMode={() => setIsOnline(!isOnline)}
          isSecurityArmed={securitySettings.isArmed}
          onToggleSecurityArm={handleToggleQuickArm}
          onOpenAlarms={() => setIsAlarmModalOpen(true)}
          onOpenProjectMemory={() => setIsProjectMemoryOpen(true)}
          onOpenVoiceStudio={() => setIsVoiceSelectorOpen(true)}
          onOpenFullScreenHud={() => setIsFullScreenHudOpen(true)}
        />

        {/* Background Service Status & Mic Privacy Indicator */}
        <BackgroundServiceBar
          isRunning={isBackgroundListening}
          onToggleService={handleToggleBackgroundListening}
          audioVolume={backgroundAudioVol}
          dominantPitchHz={backgroundDominantHz}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenVoiceProfile={() => setIsVoiceBiometricsOpen(true)}
          isOwnerEnrolled={voiceProfile.enrolled}
        />

        {/* Active Ringing Alarm Alert Banner */}
        {activeRingingAlarm && (
          <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white px-3 py-2 text-xs font-bold flex items-center justify-between shadow-xl animate-pulse z-40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Alarm Baj Raha Hai! ({activeRingingAlarm.time} - {activeRingingAlarm.label})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSnoozeRinging(5)}
                className="px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-[10px] text-amber-200 active:scale-95"
              >
                Snooze 5m
              </button>
              <button
                onClick={() => handleDismissRinging()}
                className="px-2.5 py-1 rounded bg-white text-slate-950 text-[10px] font-black active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Arming Countdown Toast */}
        {armCountdown !== null && armCountdown > 0 && (
          <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-md animate-pulse">
            <span>Phone rakh dijiye... 00:0{armCountdown}s me touch guard armed ho jayega</span>
            <button
              onClick={() => {
                setArmCountdown(null);
                playChime('click');
              }}
              className="px-2 py-0.5 rounded bg-slate-950 text-white text-[10px] active:scale-95"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Security Lock Grace Countdown Toast */}
        {lockGraceCountdown !== null && lockGraceCountdown > 0 && (
          <div className="bg-red-600 text-white px-3 py-2 text-xs font-bold flex items-center justify-between shadow-xl animate-pulse z-40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Unauthorized access: 00:0{lockGraceCountdown}s me Security Lock activate hoga!
            </span>
            <button
              onClick={() => {
                setLockGraceCountdown(null);
                setIsVoiceBiometricsOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-white text-red-700 text-[10px] font-black active:scale-95 shadow"
            >
              Owner Verify
            </button>
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div className="px-3 pt-2 pb-1">
          <div className="grid grid-cols-5 p-1 rounded-2xl bg-[#040a16]/95 border border-cyan-500/25 text-[10px] font-semibold">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`py-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'assistant'
                  ? 'bg-cyan-600/90 text-white shadow-[0_0_15px_rgba(0,212,255,0.35)] border border-cyan-400/50'
                  : 'text-slate-400 hover:text-cyan-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="truncate">J. A. R. V. I. S.</span>
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`py-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'devices'
                  ? 'bg-sky-600/90 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-sky-400/50'
                  : 'text-slate-400 hover:text-cyan-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Devices</span>
            </button>

            <button
              onClick={() => setActiveTab('emergency')}
              className={`py-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'emergency'
                  ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                  : 'text-red-400 hover:text-red-300 font-bold'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>SOS</span>
            </button>

            <button
              onClick={() => setActiveTab('apps')}
              className={`py-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'apps'
                  ? 'bg-blue-600/90 text-white shadow-[0_0_15px_rgba(37,99,235,0.35)] border border-blue-400/50'
                  : 'text-slate-400 hover:text-cyan-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Apps</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`py-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'settings'
                  ? 'bg-cyan-700/90 text-white shadow-[0_0_15px_rgba(0,212,255,0.3)] border border-cyan-400/40'
                  : 'text-slate-400 hover:text-cyan-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden pb-20">
          {activeTab === 'assistant' && (
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:items-start lg:px-4 overflow-hidden">
              {/* Interactive Arc Reactor Holographic HUD Section */}
              <div className="lg:col-span-6 lg:sticky lg:top-4">
                <VoiceOrb
                  state={assistantState}
                  transcript={transcript}
                  isOnline={isOnline}
                  languageMode={languageMode}
                  audioVolume={backgroundAudioVol}
                  micError={micError}
                  onLanguageToggle={handleToggleLanguage}
                  onMicClick={handleMicToggle}
                  onTextSubmit={handleProcessVoiceCommand}
                  onQuickChip={handleProcessVoiceCommand}
                  onSelectMenu={(menuId) => handleHudMenuSelect(menuId, false)}
                  onOpenFullScreenHud={() => setIsFullScreenHudOpen(true)}
                  onOpenSOS={() => setIsEmergencyOpen(true)}
                />
              </div>

              {/* Chat & Commands Transcript */}
              <div
                ref={chatScrollRef}
                className="flex-1 lg:col-span-6 lg:max-h-[calc(100vh-195px)] overflow-y-auto px-2 pb-4 space-y-2 custom-scrollbar"
              >
                <ChatHistory
                  messages={messages}
                  onReplayAudio={handleReplayAudio}
                  onOpenWhatsAppModal={(rec, msg, ph) => {
                    setWhatsAppData({ recipient: rec, message: msg, phone: ph });
                    setIsWhatsAppOpen(true);
                  }}
                  onOpenQRModal={() => setIsQROpen(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
              <ConnectedDevicesHub
                onTriggerVoiceCommand={(cmd) => {
                  setActiveTab('assistant');
                  handleProcessVoiceCommand(cmd);
                }}
              />
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="p-4 rounded-3xl bg-red-950/30 border border-red-500/40 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Emergency Assistance (SOS) Hub</h3>
                  <p className="text-xs text-red-200 mt-1">
                    Parents ko 1-tap call, live GPS location SMS aur video proof record karne ke liye open karein.
                  </p>
                </div>
                <button
                  onClick={() => setIsEmergencyOpen(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Open Emergency SOS Hub</span>
                </button>
              </div>

              {/* Safety notice in simple English & Roman Hindi */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-slate-200">Emergency SOS Working Principles:</p>
                <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-slate-300">Selected Contacts only:</strong> Messages aur calls sirf Ganesh ji ke chune hue contacts (Papa, Mummy) ko hi bheje jate hain.
                  </li>
                  <li>
                    <strong className="text-slate-300">Live GPS Coordinates:</strong> Real-time coordinates fetch karke clickable Google Maps link generate karta hai.
                  </li>
                  <li>
                    <strong className="text-slate-300">Camera Proof:</strong> Saboot ke liye emergency video/audio recording live preview deta hai.
                  </li>
                  <li>
                    <strong className="text-slate-300">Explicit Confirmation:</strong> Bina aapki explicit confirmation ke koi recording start nahi hoti.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              <AppsLauncher
                onSpeak={handleSpeakStatus}
                onOpenWhatsAppModal={() => {
                  setWhatsAppData({
                    recipient: 'Rohan',
                    message: 'Namaste! Main 10 minute me aa raha hoon.',
                  });
                  setIsWhatsAppOpen(true);
                }}
                onOpenQRModal={() => setIsQROpen(true)}
                onOpenCameraModal={() => setIsCameraOpen(true)}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              <SettingsController
                onSpeakStatus={handleSpeakStatus}
                securitySettings={securitySettings}
                onUpdateSecuritySettings={handleUpdateSecuritySettings}
                onTriggerTestAlert={() =>
                  handleTriggerUnauthorizedAlert('manual_test', 'Manual test alert (Test Siren & Shield)')
                }
                onOpenVoiceProfile={() => setIsVoiceBiometricsOpen(true)}
                onOpenFaceProfile={() => setIsFaceAuthOpen(true)}
                onOpenApkGuide={() => setIsApkGuideOpen(true)}
                onOpenVoiceSelector={() => setIsVoiceSelectorOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onOpenCallAssistant={() => setIsCallAssistantOpen(true)}
                onOpenAlarms={() => setIsAlarmModalOpen(true)}
                onOpenProjectMemory={() => setIsProjectMemoryOpen(true)}
                screenBrightness={screenBrightness}
                onBrightnessChange={handleBrightnessChange}
                isBackgroundListening={isBackgroundListening}
                onToggleBackgroundListening={handleToggleBackgroundListening}
                backgroundAudioVolume={backgroundAudioVol}
                backgroundDominantHz={backgroundDominantHz}
              />
            </div>
          )}
        </main>

        {/* Floating Bottom Quick Action Bar for Vivo Phone */}
        <div className="fixed bottom-0 inset-x-0 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto bg-[#02050b]/95 backdrop-blur-md border-t border-cyan-500/25 px-3 py-2 flex items-center justify-around z-30">
          <button
            onClick={() => {
              setWhatsAppData({
                recipient: 'Friend',
                message: 'Namaste! Main J. A. R. V. I. S. Voice Assistant ka istemaal kar raha hoon.',
              });
              setIsWhatsAppOpen(true);
            }}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400 transition-colors"
            title="Open AI Girlfriend Vision Camera"
          >
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Camera className="w-4 h-4" />
            </div>
            <span>AI Camera</span>
          </button>

          {/* Central Floating Mic Trigger */}
          <button
            onClick={handleMicToggle}
            className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90 border-2 ${
              assistantState === 'listening'
                ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 border-white text-white animate-pulse shadow-cyan-500/40'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 border-blue-400/50 text-white shadow-blue-500/30'
            }`}
            aria-label="Ab boliye"
          >
            <Mic className="w-6 h-6" />
          </button>

          {/* Floating Call AI Trigger */}
          <button
            onClick={() => setIsCallAssistantOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200 font-semibold transition-colors"
            title="Open AI Call Assistant"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Phone className="w-4 h-4" />
            </div>
            <span>Call AI</span>
          </button>

          {/* Floating SOS Trigger Button */}
          <button
            onClick={() => setIsEmergencyOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>SOS</span>
          </button>
        </div>

        {/* WhatsApp Permission and Sender Modal */}
        <WhatsAppSenderModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          initialRecipient={whatsAppData.recipient}
          initialMessage={whatsAppData.message}
          initialPhone={whatsAppData.phone}
        />

        {/* Safe QR Scanner and Payment Gate Modal */}
        <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />

        {/* Dedicated Camera Section & HD Viewfinder Modal */}
        <CameraSectionModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onOpenQRMode={() => {
            setIsCameraOpen(false);
            setIsQROpen(true);
          }}
          onSpeak={handleSpeakStatus}
        />

        {/* Comprehensive Hindi Setup and Permission Guide */}
        <VivoSetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

        {/* Dedicated Permissions & Privacy Modal */}
        <PermissionsPrivacyModal
          isOpen={isPermissionsOpen}
          onClose={() => setIsPermissionsOpen(false)}
          onPermissionsChange={(updated) => setPermissions(updated)}
        />

        {/* Dedicated Emergency Assistance Hub & SOS Modal */}
        <EmergencyModal
          isOpen={isEmergencyOpen}
          onClose={() => setIsEmergencyOpen(false)}
          onSpeak={handleSpeakStatus}
        />

        {/* Owner Voice Biometrics Modal (Ganesh) */}
        <VoiceBiometricsModal
          isOpen={isVoiceBiometricsOpen}
          onClose={() => setIsVoiceBiometricsOpen(false)}
        />

        {/* Face Recognition Modal (Ganesh) */}
        <FaceAuthModal
          isOpen={isFaceAuthOpen}
          onClose={() => setIsFaceAuthOpen(false)}
        />

        {/* APK Packaging & PWA Guide Modal */}
        <ApkPackagingGuideModal
          isOpen={isApkGuideOpen}
          onClose={() => setIsApkGuideOpen(false)}
        />

        {/* Project Memory & Documentation Modal */}
        <ProjectMemoryModal
          isOpen={isProjectMemoryOpen}
          onClose={() => setIsProjectMemoryOpen(false)}
        />

        {/* Dedicated Voice Studio / Professional Voice Selector Modal */}
        <VoiceSelectorModal
          isOpen={isVoiceSelectorOpen}
          onClose={() => setIsVoiceSelectorOpen(false)}
          onVoiceSelected={(settings) => {
            handleSpeakStatus(`Voice profile updated to ${settings.voiceName || 'active profile'}.`);
          }}
        />

        {/* Dedicated Night Schedule & Voice Alarm Modal */}
        <AlarmScheduleModal
          isOpen={isAlarmModalOpen}
          onClose={() => setIsAlarmModalOpen(false)}
          activeRingingAlarm={activeRingingAlarm}
          onDismissRinging={handleDismissRinging}
          onSnoozeRinging={handleSnoozeRinging}
          onSpeak={handleSpeakStatus}
        />

        {/* Full-Screen Circular Stark HUD Overlay (Auto-opens on "Hey J. A. R. V. I. S.") */}
        <StarkFullScreenHud
          isOpen={isFullScreenHudOpen}
          onClose={() => setIsFullScreenHudOpen(false)}
          state={assistantState}
          audioVolume={backgroundAudioVol}
          transcript={transcript}
          latestAssistantReply={latestAssistantReply}
          isBackgroundWakeActive={isBackgroundListening}
          onCoreClick={handleMicToggle}
          onSelectMenu={(menuId) => handleHudMenuSelect(menuId, true)}
          onOpenVoiceStudio={() => {
            setIsFullScreenHudOpen(false);
            setIsVoiceSelectorOpen(true);
          }}
          onTextSubmit={handleProcessVoiceCommand}
        />

        {/* Live System Status & Diagnostics Modal */}
        <SystemStatusModal
          isOpen={isSystemStatusOpen}
          onClose={() => setIsSystemStatusOpen(false)}
          isOnline={isOnline}
          isBackgroundListening={isBackgroundListening}
          dominantPitchHz={backgroundDominantHz}
          onOpenPermissions={() => setIsPermissionsOpen(true)}
          onOpenVoiceStudio={() => setIsVoiceSelectorOpen(true)}
          onOpenDevices={() => setActiveTab('devices')}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {/* Advanced AI Call Assistant Modal */}
        <CallAssistantModal
          isOpen={isCallAssistantOpen}
          onClose={() => setIsCallAssistantOpen(false)}
          externalCommand={callExternalCommand}
          onClearExternalCommand={() => setCallExternalCommand(null)}
        />

        {/* Full-Screen Secure Lockdown Curtain & Data Shield */}
        {isLocked && (
          <SecureLockShield
            settings={securitySettings}
            latestAlert={latestAlert}
            onUnlockSuccess={handleUnlockSuccess}
          />
        )}

        {/* Screen Brightness Dimmer Overlay */}
        {screenBrightness < 100 && (
          <div
            className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-300"
            style={{ backgroundColor: `rgba(0, 0, 0, ${(100 - screenBrightness) * 0.0075})` }}
          />
        )}
      </div>
    </div>
  );
}
