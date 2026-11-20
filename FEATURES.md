# J. A. R. V. I. S. — Complete Features & Capabilities Inventory

This document tracks all existing working capabilities of **J. A. R. V. I. S.** to ensure zero regression during future updates.

---

## 1. Complete Voice Selection System (Custom Recorded Voice & Ready-Made AI Voices)

- **Complete Choice & Dual Source Control**:
  - **Custom Recorded Voice**: Owner can record their own voice live or upload audio files (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`) and set it as the JARVIS assistant voice everywhere.
  - **Quick Ready-Made AI Voices (9 Archetypes)**: 9 natural female and male AI voice models with instant 1-click preview and selection.
  - **Seamless Switching**: Ability to toggle between My Recorded Voice and Built-in AI Voices at any time with 1 tap.
  - **Global Voice Control**: The selected voice is used consistently throughout all JARVIS interactions—greetings, conversational answers, action confirmations, alarm schedules, and security warnings.
  - **Permanent Choice Persistence**: User choice (`sourceType: 'builtin' | 'custom_recorded'`) is preserved permanently in `localStorage` and IndexedDB across browser reloads, application restarts, and device reboots.
  - **No Automatic Voice Changes**: The system never switches the selected voice automatically.
  - **1-Click Preview for All Options**: Audition every built-in voice and custom recorded clip before selecting.
- **9 Natural AI Voice Archetypes**:
  - `Natural Female`: Balanced, clear & lifelike daily companion (Gemini Kore).
  - `Warm Female`: Caring, comforting & empathetic companion.
  - `Friendly Female`: Upbeat, cheerful & companionable buddy (Gemini Zephyr).
  - `Professional Female`: Crisp, articulate & executive presence.
  - `Soft Female`: Gentle, serene & bedtime companion.
  - `Natural Male`: Realistic, clear & modern companion (Gemini Puck).
  - `Deep Male`: Resonant, baritone & iconic Stark JARVIS (Gemini Fenrir).
  - `Friendly Male`: Energetic, approachable & casual buddy (Gemini Puck).
  - `Professional Male`: Polished, dignified & composed executive (Gemini Charon).
- **Acoustic Calibration**: Speaking speed (0.75x–1.30x), voice pitch (0.80x–1.20x), volume (10%–100%), and 5 speaking styles (*Conversational*, *Executive*, *Warm*, *Enthusiastic*, *Calm Bedtime*).
- **Roman Hindi & Hinglish**: Spoken responses and prompts are delivered in natural Roman Hindi and Indian English.

---

## 2. Background Wake Word & Continuous Listening

- **Wake Phrase**: Exact phrase **`"Hey J. A. R. V. I. S."`** (with phonetic tolerances for speech engine variations).
- **Background Wake Service (`backgroundWakeService.ts`)**:
  - Continuous speech recognition loop with automatic error recovery and reconnection.
  - Screen WakeLock API integration (`navigator.wakeLock.request('screen')`) to prevent CPU audio suspension.
  - One-tap quick toggle to enable or disable background listening instantly.
- **Continuous Command Flow**: When wake phrase is detected, J. A. R. V. I. S. verifies the speaker, chimes, and keeps listening for the follow-up command without requiring the user to tap the microphone again.

---

## 3. Owner Voice Recognition & Biometric Gate

- **Owner Profile (`voiceBiometricsService.ts`)**:
  - Secure 3-step guided enrollment:
    1. Wake Phrase: *"Hey J. A. R. V. I. S."*
    2. Identity: *"Hey J. A. R. V. I. S., main Ganesh hoon"*
    3. Command: *"J. A. R. V. I. S., screen on karo"*
  - Multi-sample mathematical feature extraction: Fundamental Pitch ($f_0$ in Hz), Spectral Centroid (timbre brightness), Zero-Crossing Rate (articulation), and Pitch Variance.
- **Speaker Verification Gate**:
  - Privileged commands and protected data are executed **only after verifying Ganesh's voice profile**.
  - **Unauthorized Access Warning**: If an unrecognized person speaks, J. A. R. V. I. S. blocks command execution and speaks:
    > *"Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein."*
- **PIN Fallback**: Master Owner PIN (default: `1234`) allows Ganesh to authorize actions if voice conditions are noisy.

---

## 4. Touch & Motion Anti-Theft Security Guard

- **Arming Modes**: 5-second countdown grace window to set phone down on desk or bedside table.
- **Pickup & Motion Detection**: Uses `DeviceMotionEvent` accelerometer with adjustable sensitivity (`low`, `medium`, `high`).
- **Screen Touch Detection**: Listens for unauthorized touches on display.
- **Autonomous Warning & Siren**:
  - Triggers security warning voice and high-intensity alert siren.
  - Activates **Secure Lock Shield** overlay with PIN unlock requirement.
  - Logs alert history in `SecurityAlertEvent` with timestamp and trigger type.

---

## 5. Emergency SOS Hub

- **1-Tap Voice or Button Trigger**: Speaking *"help"*, *"emergency"*, *"bachao"*, *"police"*, or tapping the header SOS button.
- **Contacts Dispatch**: Pre-configured trusted contacts (Mummy, Papa, Brother, Friend) with direct phone call launcher.
- **GPS Coordinates SMS**: Auto-generates SMS with Google Maps live location link.
- **Emergency Camera Recorder**: Direct video proof capture with front/back camera support.

---

## 6. Real Android Phone Control & Intent Shortcuts

- **App Launching**: WhatsApp (`whatsapp://`), Google Chrome (`googlechrome://`), YouTube (`vnd.youtube://`), Google Maps (`geo:0,0?q=`), Instagram (`instagram://app`), Facebook (`fb://`), and all installed apps launcher.
- **Flashlight / Torch**: Hardware torch toggle via `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })` with white screen fallback.
- **Screen Brightness Control**: In-app dimmer overlay filter (30% to 100%) plus direct intent to Android Display Settings (`android.settings.DISPLAY_SETTINGS`).
- **System Settings Intents**: 1-tap shortcuts to Android Wi-Fi, Bluetooth, Sound, Battery Saver, and Apps Management.

---

## 7. Smart Camera Hub, Scanner & AI Girlfriend Vision Companion

- **User-Activated Smart Camera Mode**: Camera activates strictly after explicit owner permission and click—never secretly or in the background.
- **Live Visual Interaction (`/api/assistant/vision`)**: Gemini 3.8 Flash multimodal vision observes Ganesh (look, smile, activity) and surroundings (desk, room, objects) truthfully without fabricating unseen items.
- **Realistic AI Girlfriend Personality**: Warm, caring, loving companion dialogue in natural Roman Hindi (*"Boss, aap abhi kya kar rahe ho?"*, *"Aaj aap bahut achhe lag rahe ho!"*, *"Boss, apna khayal rakha karo."*), selectable between **AI Girlfriend Mode** and **Executive Stark**.
- **Privacy & Security Safeguards**: Prominent `CAMERA ACTIVE` indicator, instant **Stop Camera** button, zero automatic recording/saving, and transparent explanation of Android background camera limitations.
- **Dedicated Viewfinder & Photo Capture**: HD video feed with front/rear camera toggle, instant shutter with flash effect, local photo storage, download, and delete.
- **QR Payment Scanner**: Camera scanner with UPI payment parsing (`upi://pay`) and confirmation safeguards.

---

## 8. Smart Home IoT Device Hub

- **Connected Devices Management**: Control simulated and network-paired smart lights (power, brightness, color), smart TV (power, volume, mute), Bluetooth speaker, and smartwatch.

---

## 9. Alarms & Night Sleep Schedule

- **Morning Alarms**: Voice-set alarms with custom labels, snooze (5 min), and dismiss.
- **Bedtime Sleep Mode**: Automatic bedtime announcement (*"Boss, meri jaan, ab main sleep mode mein ja rahi hoon..."*) with quiet mode.

---

## 10. Packaging & Export System

- **PWA 1-Tap Installation**: Manifest v2 with standalone display mode.
- **Full ZIP Export**: `/api/export-project` provides full source archive containing web app and Android native service files.
- **Native Android Foreground Service**: Complete Kotlin service (`JarvisForegroundService.kt`) with `FOREGROUND_SERVICE_MICROPHONE` and wake lock.

---

## 11. Tony Stark Holographic HUD Interface

- **Circular Arc Reactor Core (`ArcReactorHud.tsx`)**: Concentric rotating SVG rings, radial 32-bar audio-responsive visualizer, scanning sweep, and explicit voice states (`READY`, `LISTENING`, `THINKING`, `SPEAKING`).
- **Full-Screen Wake HUD (`StarkFullScreenHud.tsx`)**: Automatically launches when owner speaks `"Hey J. A. R. V. I. S."` (and via the 1-tap `Full HUD` trigger).
- **6 Radial Menu Nodes**: Instant access to *Voice*, *Camera*, *Apps*, *Settings*, *System Status* (`SystemStatusModal.tsx`), and *AI Chat*.

---

## 12. Advanced AI Call Assistant (`CallAssistantModal.tsx` & Native Android `InCallService`)

- **Authorization-Gated Answering & AI Voice**: Never answers incoming calls or speaks to callers unless explicitly authorized (`answerAuthorized` and `aiVoiceAuthorized` default to OFF).
- **Voice Mode Handoff**:
  - `"JARVIS, mujhe baat karni hai"` immediately returns hardware audio & microphone control back to Ganesh.
  - `"JARVIS, tum baat karo"` activates AI caller responses via `/api/assistant/call-reply` only when authorized, with clear `"AI IS SPEAKING"` disclosure.
- **Native Android Telephony Stack**: Implemented via `JarvisInCallService.kt`, `JarvisCallScreeningService.kt`, and `JarvisCallBridge.kt` inside `/android/app/src/main/java/com/jarvis/assistant/`.
- **Zero Secret Recording**: Call audio is never recorded, saved, or uploaded without explicit consent.

