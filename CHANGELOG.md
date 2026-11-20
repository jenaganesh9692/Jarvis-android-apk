# J. A. R. V. I. S. — Changelog & Version History

All notable updates and version milestones of **J. A. R. V. I. S.** are documented here.

---

## [Version 3.9.0] — 2026-11-20
### Added
- **Advanced AI Call Assistant (Native Android Telephony + Web Control Deck)**:
  - **Explicit Authorization Gates**: J. A. R. V. I. S. never answers incoming calls (`answerAuthorized`) or speaks to a caller (`aiVoiceAuthorized`) unless explicitly authorized by the user.
  - **Instant Human Takeover & Voice Handoff**:
    - Speaking **`"JARVIS, mujhe baat karni hai"`** (or tapping the Manual Human Takeover button) immediately stops AI speech, unmutes the hardware microphone, and restores direct human call control.
    - Speaking **`"JARVIS, tum baat karo"`** switches to AI caller communication only if authorized, clearly announcing AI presence to both user and caller.
  - **Native Android Telephony Implementation (`/android`)**: Added `JarvisInCallService.kt` (`InCallService`), `JarvisCallScreeningService.kt` (`CallScreeningService`), `JarvisCallBridge.kt` (`@JavascriptInterface`), and updated `AndroidManifest.xml` / `MainActivity.kt` with `READ_PHONE_STATE`, `ANSWER_PHONE_CALLS`, `READ_CALL_LOG`, `MODIFY_AUDIO_SETTINGS`, `MANAGE_OWN_CALLS`, and `ROLE_DIALER` support.
  - **Browser Limitation Transparency & Privacy Guarantee**: Explicitly informs users when running in a web browser (which cannot directly hijack cellular call audio), and guarantees zero call audio recording/storage without explicit consent.

---

## [Version 3.8.0] — 2026-11-20
### Added
- **Tony Stark / Iron Man Holographic HUD Upgrade**:
  - **Circular Arc Reactor Core (`ArcReactorHud.tsx`)**: Deep black `#02050b` canvas, electric blue `#00d4ff`, cyan, and metallic silver accents with multi-layered rotating calibration rings, radial 32-bar audio visualizer, subtle scanning sweep, and glowing core.
  - **Full-Screen "Hey J. A. R. V. I. S." Activation (`StarkFullScreenHud.tsx`)**: Saying `"Hey J. A. R. V. I. S."` smoothly expands the full-screen circular HUD while activating microphone listening via existing permissions.
  - **6 Interactive Radial Menu Options**: Voice, Camera, Apps, Settings, System Status (`SystemStatusModal.tsx`), and AI Chat around the Arc Reactor core, with explicit `READY`, `LISTENING`, `THINKING`, and `SPEAKING` states.

---

## [Version 3.7.0] — 2026-11-09
### Added
- **Realistic AI Girlfriend Companion & Smart Camera Vision Mode**:
  - **Smart User-Activated Camera**: Camera turns on only upon explicit owner authorization and user click.
  - **Live Visual Interaction (`/api/assistant/vision`)**: Gemini 3.8 Flash multimodal vision analyzes what is visibly in front of the camera (Ganesh, smile, clothing, expression, room surroundings, desk, screen, or outdoors) without making up unseen details.
  - **Girlfriend-Like Personality**: J. A. R. V. I. S. speaks sweetly, naturally, emotionally, and affectionately:
    - *"Boss, aap abhi kya kar rahe ho?"*
    - *"Aaj aap bahut achhe lag rahe ho!"*
    - *"Boss, apna khayal rakha karo na."*
    - *"Main yahin hoon, aapse baat karne ke liye."*
  - **Dual Mode Viewfinder**: Switch seamlessly between **💖 Girlfriend Live Interaction** and **📸 HD Photo Capture**.
  - **Spoken Voice Integration**: Spoken observations automatically use the user's active selected voice (Custom Recorded Voice or Built-in AI Voice archetype).
  - **Privacy & Security Guarantee**:
    - Visible live indicator (`● CAMERA ACTIVE`) with zero hidden/background camera operations.
    - Prominent **Stop Camera Immediately** button.
    - Zero automatic recording: Photos are never saved or uploaded without explicit user permission.
  - **Background Camera Limitation Transparency**: Clear explanation of Android OS and modern browser background camera restrictions, providing a safe, user-controlled in-app alternative.

---

## [Version 3.6.0] — 2026-11-09
### Added
- **Complete & Flexible Voice Selection System**:
  - **Custom Recorded Voice**: Owner can record their own voice live or upload any audio recording (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`) and set it as the JARVIS assistant voice.
  - **Quick Voice Selection (9 Ready-Made AI Voices)**: Choose between 9 natural female and male AI voice models with instant 1-click preview and selection.
  - **Dual Mode Switching**: Seamless 1-tap switching between My Recorded Voice and Built-in AI Voices anytime without affecting any other JARVIS features.
  - **Global Spoken Voice Control**: The selected voice (whether recorded or built-in) is used globally throughout the entire application—in greetings, conversational answers, commands, alarms, SOS alerts, and touch security announcements.
  - **Permanent Choice Persistence**: User voice choice (`sourceType: 'builtin' | 'custom_recorded'`) is saved permanently to `localStorage` and IndexedDB, preserved across page reloads, browser restarts, and device reboots.
  - **No Automatic Voice Changes**: The system strictly honors the owner's choice and never reverts or switches voices automatically.
  - **Dedicated Voice Preview Buttons**: Audition every built-in voice and recorded clip with full play/stop audio controls prior to activating.
  - **Active Voice Indicators**: Real-time status badges in both Settings and Voice Studio showing the active voice profile everywhere.

---

## [Version 3.5.1] — 2026-11-09
### Fixed
- **Cloud TTS 429 Quota Exhaustion Resolution**:
  - Implemented an in-memory circuit breaker in `/api/tts` (`server.ts`) to intercept Google Free Tier rate limits (`limit: 10 requests/day`) gracefully without crashing or throwing 500 errors.
  - Automatically activates zero-latency on-device speech synthesis fallback (`speakWithActiveVoice`) when cloud daily limit is reached.
  - Exported missing `CustomVoiceClip` and `CustomVoiceSettings` interfaces in `src/types.ts` and added explicit TypeScript callback typings.
- **Continuous Speech Reliability**: J. A. R. V. I. S. speaks continuously without interruption or failed network requests even when cloud daily quotas are exhausted.

---

## [Version 3.5.0] — 2026-11-09
### Added
- **ChatGPT-Inspired Voice System Experience**: Professional voice selection panel featuring 9 expressive AI voice archetypes:
  - *Natural Female* (Balanced, everyday lifelike companion)
  - *Warm Female* (Caring, soothing, comforting companion)
  - *Friendly Female* (Upbeat, cheerful, lively companion)
  - *Professional Female* (Crisp, articulate executive assistant)
  - *Soft Female* (Gentle, quiet bedtime companion)
  - *Natural Male* (Clear, modern conversational companion)
  - *Deep Male* (Iconic Stark JARVIS baritone with calm executive confidence)
  - *Friendly Male* (Energetic, approachable bro buddy)
  - *Professional Male* (Polished, dignified, composed executive)
- **1-Click Audition for Every Archetype**: Instant sample playback in natural Hindi and English with live animated audio waveforms.
- **Custom Authorized Voice Sample Uploader**:
  - File uploader supporting `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`.
  - Live microphone voice recorder with automated 10-second capture.
  - On-device acoustic analysis: fundamental pitch frequency ($f_0$ in Hz), vocal range categorization, and personalized synthesis tuning.
  - 100% on-device privacy guarantee with transparent technical explanation.
- **Adjustable Acoustic Fine-Tuning**:
  - Speaking speed (0.75x to 1.30x)
  - Voice pitch (0.80x to 1.20x)
  - Speaking styles: Conversational, Executive, Warm & Caring, Enthusiastic, Calm Bedtime
  - Voice volume (10% to 100%)
- **Multi-Engine Speech Pipeline**:
  - *Smart Hybrid* (Cloud neural Gemini TTS when online, instant local device speech when offline)
  - *Studio AI Voice* (`gemini-3.8-flash-lite-tts` API with `Kore`, `Puck`, `Charon`, `Fenrir`, `Zephyr` prebuilt voices)
  - *Instant Local Device* (0ms latency native Web Speech Synthesis)
- **Voice Preference Persistence**: Saved in `localStorage` under `jarvis_professional_voice_settings`.

---

## [Version 3.4.0] — 2026-11-08
### Added
- **Professional Voice Studio Modal (`VoiceSelectorModal.tsx`)**: Dedicated modal for Ganesh to personally audition and select professional voices.
- **Strict Language Filtering**: Only Hindi (`hi-IN`) and English (`en-IN`, `en-GB` Stark UK, `en-US`) voices are displayed. All foreign, non-Hindi/non-English languages are filtered out.
- **Eliminated Squeaky Chipmunk Pitch**: Set standard human baseline pitch to `1.00x` (range strictly restricted to 0.85x – 1.15x), completely removing cartoonish/squeaky audio artifacts.
- **1-Tap Voice Audition**: Immediate test sample playback with realistic Hindi (*"Namaste Ganesh sir, main J. A. R. V. I. S. hoon..."*) and English (*"Greetings Ganesh sir..."*) sentences.
- **Voice Studio Quick Access**: Added direct access buttons in `VivoHeader` and `SettingsController` to allow instant switching between voices anytime.
- **Model Upgrade to `gemini-3.8-flash`**: Resolved deprecated model 404 in assistant chat server.

---

## [Version 3.3.0] — 2026-11-08
### Added
- **Instant Fast-Path Execution Engine**: Zero-latency voice-to-action pipeline (< 30ms response time instead of 4,000ms network delay).
- **Direct Local Action Trigger**: Instant execution for Camera, Torch, YouTube, Chrome, Maps, Settings, Alarms, SOS, Devices without waiting for server round-trips.
- **Instant Speech Synthesis**: Switched to native device female speech synthesis with 0ms server lag, removing the 2-second `/api/tts` waiting delay.
- **Eliminated Artificial Delays**: Reduced app launching delay to 60ms.

---

## [Version 3.2.0] — 2026-11-08
### Added
- **Permanent Project Memory**: Created `PROJECT_INSTRUCTIONS.md`, `FEATURES.md`, `ARCHITECTURE.md`, `ANDROID_PERMISSIONS.md`, `CHANGELOG.md`, and `DEPLOYMENT_GUIDE.md`.
- **Project Documentation Modal**: Embedded in-app viewer for architecture and documentation so Ganesh can review all project files on any device.
- **Cross-Device Update & Sync Architecture**: Standardized PWA manifest, cache headers, and local storage isolation across multiple phones.

---

## [Version 3.1.0] — 2026-11-07
### Added
- **Background Wake Word (`backgroundWakeService.ts`)**: Continuous background listener for exact wake phrase `"Hey J. A. R. V. I. S."`.
- **Multi-Sample Owner Voice Enrollment (`VoiceBiometricsModal.tsx`)**: 3-step guided recording of Ganesh's voice, extracting fundamental pitch ($f_0$), spectral centroid, and zero-crossing rate.
- **Speaker Verification Gate**: Privileged commands executed only after matching Ganesh's acoustic profile.
- **Unauthorized Speaker Warning**: Automatic spoken alert (*"Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein."*) when unverified speaker attempts access.
- **Background Status Bar (`BackgroundServiceBar.tsx`)**: Persistent indicator with pulsating green dot (`MIC ACTIVE (LOCAL)`) and instant "Turn Off" toggle.
- **Android Native Foreground Service (`/android/`)**: Included `AndroidManifest.xml`, `JarvisForegroundService.kt`, and `MainActivity.kt`.

---

## [Version 3.0.0] — 2026-11-03
### Added
- **Branding Standardization**: Strict enforcement of **`J. A. R. V. I. S.`** with spaces and periods everywhere.
- **Screen Brightness Control**: Dimmer filter overlay plus intent trigger to Android Display Settings.
- **Instant Project Export (`/api/export-project`)**: Complete `.zip` download endpoint for the full repository.
- **Health Check Endpoint (`/api/health`)**: Status endpoint verifying app uptime and server health.

---

## [Version 2.5.0] — 2026-10-28
### Added
- **Natural Female Voice Persona**: Speech synthesis engine with pitch and rate modulation across 7 emotional states (`happy`, `warm`, `empathetic`, `calm`, `serious`, `urgent`, `encouraging`).
- **Morning Alarms & Night Sleep Schedule**: Voice-activated alarm scheduling, snooze, dismiss, and bedtime announcement mode.
- **Smart Home IoT Hub**: Control module for smart bulb, TV, Bluetooth speaker, and smartwatch.

---

## [Version 2.0.0] — 2026-10-20
### Added
- **Touch & Motion Anti-Theft Guard**: Accelerometer pickup detection, unauthorized touch detection, and 5-second arming delay.
- **Secure Lock Shield**: Security lock overlay with PIN fallback (1234).
- **Emergency SOS Hub**: 1-tap parent calling, GPS SMS dispatch, and video evidence recorder.
- **Camera Hub**: Dedicated camera viewfinder, front/rear camera toggle, and photo storage.

---

## [Version 1.0.0] — 2026-10-15
### Added
- Initial release of J. A. R. V. I. S. voice assistant with Roman Hindi / Hinglish prompt reasoning, app launchers (WhatsApp, YouTube, Chrome, Maps), and flashlight control.
