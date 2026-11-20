export type ActionType =
  | 'OPEN_APP'
  | 'OPEN_CAMERA'
  | 'ALL_APPS'
  | 'SEND_WHATSAPP'
  | 'PHONE_SETTING'
  | 'SCAN_PAYMENT'
  | 'MAKE_CALL'
  | 'SEND_SMS'
  | 'ALARM_TIMER'
  | 'SEARCH_WEB'
  | 'ASK_CLARIFICATION'
  | 'VIVO_GUIDE'
  | 'EMERGENCY_TRIGGER'
  | 'SECURITY_LOCK'
  | 'DEVICE_CONTROL'
  | 'VOICE_AUTH'
  | 'FACE_AUTH'
  | 'CALL_ASSISTANT'
  | 'HUD_CONTROL'
  | 'GENERAL_CONVERSATION';

export type EmotionTone =
  | 'happy'
  | 'warm'
  | 'empathetic'
  | 'calm'
  | 'serious'
  | 'urgent'
  | 'encouraging';

export interface ActionDetails {
  appName?: string;
  packageOrUrl?: string;
  recipient?: string;
  phone?: string;
  message?: string;
  settingName?: string;
  intentUrl?: string;
  query?: string;
  time?: string;
  feature?: string;
  action?: string;
  isOfflineCapable?: boolean;
  deviceId?: string;
  deviceAction?: string;
}

export interface AssistantResponse {
  textHindi: string; // Roman Hindi / Hinglish text
  actionType: ActionType;
  actionDetails?: ActionDetails;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  safetyAdvice?: string;
  needsClarification?: boolean;
  emotion?: EmotionTone;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  actionType?: ActionType;
  actionDetails?: ActionDetails;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  safetyAdvice?: string;
  audioBase64?: string;
  isOffline?: boolean;
  emotion?: EmotionTone;
}

export interface UPIDetails {
  raw: string;
  payeeVpa: string;
  payeeName: string;
  amount: string;
  note: string;
  transactionRef?: string;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface AppPermission {
  id: string;
  nameHindi: string;
  nameEnglish: string;
  purposeHindi: string;
  purposeEnglish?: string;
  benefitHindi: string;
  status: PermissionStatus;
  userAllowed: boolean;
  isSpecialAndroidService?: boolean;
  iconName: string;
}

export type LanguageMode = 'hi-IN' | 'en-IN';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string; // 'Mummy', 'Papa', 'Brother', 'Friend', etc.
  canCall: boolean;
  canSms: boolean;
  canShareLocation: boolean;
}

export interface EmergencySettings {
  autoVoiceTrigger: boolean;
  emergencyMessage: string;
  trustedContacts: EmergencyContact[];
  includeGpsLink: boolean;
}

export interface TouchSecuritySettings {
  enabled: boolean;
  isArmed: boolean;
  antiTheftSecurityEnabled: boolean;
  faceVerificationEnabled: boolean;
  eyeBlinkDetectionEnabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  ownerPin: string;
  spokenWarningEnabled: boolean;
  sirenAlarmEnabled: boolean;
  autoLockOnTouch: boolean;
  autoLockOnMotion: boolean;
  delayBeforeArmingSeconds: number;
  requireOwnerAuthForProtectedCommands: boolean;
  maxUnauthorizedAttemptsBeforeLock: number;
  lockGracePeriodSeconds: number;
  unauthorizedAttemptsWarningOnly: boolean;
}

export interface SecurityAlertEvent {
  id: string;
  timestamp: string;
  triggerType: 'touch' | 'motion' | 'manual_test';
  detailsHindi: string;
  nativeOsLockConfirmed: boolean;
}

export interface FemaleVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isFemale: boolean;
  provider: string;
}

export interface ProfessionalVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  languageLabel: string;
  gender: 'Female' | 'Male';
  provider: string;
  isRecommended: boolean;
}

export type VoiceSourceType = 'builtin' | 'custom_recorded';

export type VoiceArchetypeId =
  | 'natural_female'
  | 'warm_female'
  | 'friendly_female'
  | 'professional_female'
  | 'soft_female'
  | 'natural_male'
  | 'deep_male'
  | 'friendly_male'
  | 'professional_male'
  | 'custom_uploaded';

export type SpeakingStyle =
  | 'conversational'
  | 'executive'
  | 'warm'
  | 'enthusiastic'
  | 'calm';

export type VoiceEngineMode = 'hybrid' | 'gemini_tts' | 'local_device';

export interface VoiceArchetype {
  id: VoiceArchetypeId;
  title: string;
  gender: 'Female' | 'Male';
  tagline: string;
  styleDescription: string;
  geminiVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  defaultPitch: number;
  defaultRate: number;
  accentColor: string;
  sampleHindi: string;
  sampleEnglish: string;
  isPopular?: boolean;
}

export interface CustomUploadedVoice {
  id: string;
  fileName: string;
  fileSize: number;
  durationSec: number;
  audioDataUrl: string;
  detectedGender: 'Female' | 'Male' | 'Neutral';
  detectedPitchHz: number;
  recommendedPitch: number;
  recommendedRate: number;
  uploadedAt: string;
  authorizedByOwner: boolean;
}

export interface CustomVoiceClip {
  id: string;
  name: string;
  category: 'master' | 'greeting' | 'action' | 'warning' | 'custom';
  audioDataUrl: string;
  durationSeconds: number;
  fileSizeBytes: number;
  fileType: string;
  createdAt: string;
  dominantPitchHz?: number;
  waveformPreview?: number[];
}

export interface CustomVoiceSettings {
  useOnlyCustomVoice: boolean;
  activeMasterClipId?: string;
  clips: CustomVoiceClip[];
}

export interface VoiceSampleFeature {
  pitchHz: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  sampleDurationMs: number;
  timestamp: number;
}

export interface VoiceProfile {
  enrolled: boolean;
  enrolledDate?: string;
  ownerName: string;
  averagePitchHz: number;
  pitchRangeHz: [number, number];
  sampleCount: number;
  confidenceScore: number;
  spectralCentroidAvg?: number;
  pitchVariance?: number;
  samples?: VoiceSampleFeature[];
}

export interface BackgroundServiceConfig {
  enabled: boolean;
  wakePhrase: string; // "Hey J. A. R. V. I. S."
  continuousListening: boolean;
  requireOwnerVerificationForCommands: boolean;
  localAcousticCheck: boolean;
  wakeLockRequested: boolean;
  persistentNotification: boolean;
  batteryOptimizationGuided: boolean;
}

export interface FaceProfile {
  enrolled: boolean;
  enrolledDate?: string;
  ownerName: string;
  faceMetrics: {
    brightness: number;
    contrast: number;
    aspectRatio: number;
    landmarkEstimate: number;
    eyeRegionVariance?: number;
  };
}

export interface ConnectedDevice {
  id: string;
  name: string;
  room: string;
  type: 'bulb' | 'tv' | 'speaker' | 'watch' | 'phone';
  isOnline: boolean;
  state: {
    power: boolean;
    brightness?: number;
    color?: string;
    volume?: number;
    isMuted?: boolean;
    batteryLevel?: number;
    heartRate?: number;
    isRinging?: boolean;
  };
}

export type CompanionPersonalityMode = 'girlfriend' | 'stark';

export interface VisionObservation {
  textHindi: string;
  emotion: EmotionTone;
  detectedObjects?: string[];
  sweetAdvice?: string;
  timestamp: string;
}

export type CallControlMode = 'human' | 'ai';

export type CallStatus = 'idle' | 'ringing' | 'active' | 'ended';

export interface CallAssistantSettings {
  answerAuthorized: boolean;
  aiVoiceAuthorized: boolean;
  announceAiIdentity: boolean;
  recordingConsent: boolean;
  busyMessage: string;
}

export interface ActiveCallInfo {
  status: CallStatus;
  mode: CallControlMode;
  callerName: string;
  callerNumber: string;
  callerRelation?: string;
  startedAt?: number;
  isNativeBridge: boolean;
  osAudioNote?: string;
}

export interface CallTranscriptTurn {
  id: string;
  speaker: 'caller' | 'ai' | 'user' | 'system';
  text: string;
  timestamp: string;
}

