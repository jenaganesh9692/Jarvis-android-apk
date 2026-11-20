# J. A. R. V. I. S. — System Architecture & Technical Specifications

This document outlines the software architecture, data flow, component hierarchy, and integration patterns of **J. A. R. V. I. S.**

---

## 1. System Overview

J. A. R. V. I. S. operates as a hybrid progressive web application (PWA) with full-stack Node.js/Express backend capabilities and native Android APK bridge files.

```
+---------------------------------------------------------------------------------+
|                                 CLIENT (FRONTEND)                               |
|                                                                                 |
|  +---------------------+  +----------------------+  +------------------------+  |
|  |     VivoHeader      |  | BackgroundServiceBar |  |     EdgeGlowEffect     |  |
|  +---------------------+  +----------------------+  +------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                    ArcReactorHud & StarkFullScreenHud                   |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  +---------------------+  +----------------------+  +------------------------+  |
|  |     ChatHistory     |  |  SettingsController  |  |  CallAssistantModal    |  |
|  +---------------------+  +----------------------+  +------------------------+  |
|                                                                                 |
|  +---------------------+  +----------------------+  +------------------------+  |
|  | SecureLockShield    |  | VoiceSelectorModal   |  |  CameraSectionModal    |  |
|  +---------------------+  +----------------------+  +------------------------+  |
|                                                                                 |
|                              SERVICES LAYER (LOCAL)                             |
|  - speechService.ts (Custom/Built-in TTS) - voiceBiometricsService.ts (FFT)     |
|  - backgroundWakeService.ts (WakeLock)    - securityService.ts (Motion/Siren)   |
|  - callAssistantService.ts (Auth/Handoff) - visionCompanionService.ts (Camera)  |
|  - torchService.ts (Hardware Flash)       - offlineEngine.ts (Fast-Path logic)  |
+---------------------------------------------------------------------------------+
                                      | HTTP POST /api/assistant/chat, /vision, /call-reply
                                      | HTTP POST /api/tts
                                      v
+---------------------------------------------------------------------------------+
|                                 SERVER (BACKEND)                                |
|                                                                                 |
|  - server.ts: Express API proxy, Gemini SDK integration, Archiver ZIP exporter  |
|  - Gemini 3.8 Flash: Roman Hindi chat, camera vision, & authorized call replies |
|  - Gemini TTS: Multi-voice natural speech synthesis (with Browser TTS fallback) |
+---------------------------------------------------------------------------------+
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                         NATIVE ANDROID INTEGRATION (/android/)                  |
|                                                                                 |
|  - AndroidManifest.xml: FOREGROUND_SERVICE_MICROPHONE, ANSWER_PHONE_CALLS, etc. |
|  - JarvisForegroundService.kt: Android background mic daemon + notification bar  |
|  - JarvisInCallService.kt & JarvisCallScreeningService.kt: Telephony + Routing  |
|  - JarvisCallBridge.kt & MainActivity.kt: WebView JS bridge + runtime perms     |
+---------------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
/
├── android/
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/com/jarvis/assistant/
│               ├── JarvisCallBridge.kt
│               ├── JarvisCallScreeningService.kt
│               ├── JarvisForegroundService.kt
│               ├── JarvisInCallService.kt
│               └── MainActivity.kt
├── public/
│   ├── icon-192.svg
│   ├── icon-512.svg
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── AlarmScheduleModal.tsx
│   │   ├── ApkPackagingGuideModal.tsx
│   │   ├── AppsLauncher.tsx
│   │   ├── ArcReactorHud.tsx
│   │   ├── BackgroundServiceBar.tsx
│   │   ├── CallAssistantModal.tsx
│   │   ├── CameraSectionModal.tsx
│   │   ├── ChatHistory.tsx
│   │   ├── ConnectedDevicesHub.tsx
│   │   ├── EdgeGlowEffect.tsx
│   │   ├── EmergencyModal.tsx
│   │   ├── FaceAuthModal.tsx
│   │   ├── PermissionsPrivacyModal.tsx
│   │   ├── ProjectMemoryModal.tsx
│   │   ├── QRScannerModal.tsx
│   │   ├── SecureLockShield.tsx
│   │   ├── SettingsController.tsx
│   │   ├── StarkFullScreenHud.tsx
│   │   ├── SystemStatusModal.tsx
│   │   ├── VivoHeader.tsx
│   │   ├── VivoSetupGuideModal.tsx
│   │   ├── VoiceBiometricsModal.tsx
│   │   ├── VoiceOrb.tsx
│   │   ├── VoiceSelectorModal.tsx
│   │   └── WhatsAppSenderModal.tsx
│   ├── services/
│   │   ├── alarmScheduleService.ts
│   │   ├── appLauncherService.ts
│   │   ├── backgroundWakeService.ts
│   │   ├── callAssistantService.ts
│   │   ├── companionPersonalityService.ts
│   │   ├── deviceControlService.ts
│   │   ├── emergencyService.ts
│   │   ├── faceAuthService.ts
│   │   ├── geminiService.ts
│   │   ├── offlineEngine.ts
│   │   ├── permissionService.ts
│   │   ├── securityService.ts
│   │   ├── speechService.ts
│   │   ├── torchService.ts
│   │   ├── visionCompanionService.ts
│   │   └── voiceBiometricsService.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── server.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Key Design Decisions

1. **Acoustic Mathematical Feature Extraction**:
   - Rather than sending raw voice clips to cloud servers, `voiceBiometricsService.ts` utilizes the Web Audio API's `AnalyserNode` to compute fundamental pitch ($f_0$) and spectral centroid in real time.
   - This ensures **zero latency** and **100% privacy compliance**.
2. **Graceful Fallbacks**:
   - If the device loses internet connection, `offlineEngine.ts` automatically executes safe local commands (torch, camera, alarm, settings, security lock).
   - If Web Speech Recognition drops, `backgroundWakeService.ts` schedules an automatic debounce restart.
3. **Intent-Based Android Bridge**:
   - For web and PWA contexts, actions execute via standardized Android Intent URIs (`intent:#Intent;action=...;end`) and URI schemes (`whatsapp://`, `geo:`, `tel:`), maintaining full compatibility across Android versions without requiring rooting.
