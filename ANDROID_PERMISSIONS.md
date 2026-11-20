# J. A. R. V. I. S. — Android Permissions & Security Specifications

This document catalogs every permission, device API, and security constraint utilized by **J. A. R. V. I. S.** across both Web/PWA and Native Android APK environments.

---

## 1. Web & Browser Permissions (PWA Runtime)

| Permission ID | API / Sensor | Purpose in J. A. R. V. I. S. | User Experience & Privacy |
|---|---|---|---|
| `microphone` | `navigator.mediaDevices.getUserMedia({ audio: true })` | Voice commands, wake word detection, and owner voice enrollment. | Explicit prompt on first voice action. Mic indicator displays when active. Zero background upload. |
| `camera` | `navigator.mediaDevices.getUserMedia({ video: true })` | Viewfinder photo capture, emergency video evidence, QR payment scanner. | Active viewfinder preview with explicit shutter control. Front/back camera toggle. |
| `geolocation` | `navigator.geolocation.getCurrentPosition()` | Emergency SOS location sharing with parents via SMS. | Prompted only when SOS trigger is invoked. Coordinates formatted as Google Maps link. |
| `wakeLock` | `navigator.wakeLock.request('screen')` | Keeps the screen and audio processor active during background listening. | Suppressed automatically when user disables background mode. |
| `vibrate` | `navigator.vibrate([150, 50, 150])` | Haptic feedback for command execution and anti-theft alarms. | Hardware vibration pulses when pickup or unauthorized touch occurs. |

---

## 2. Native Android APK Permissions (`AndroidManifest.xml`)

When compiled as an Android APK (via Capacitor, Bubblewrap, or Android Studio), the following permissions are configured in `/android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Core Network & Voice Capabilities -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Foreground Service & Persistent Mic Daemon -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Android 11+ Battery Saver Exemption -->
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

<!-- Hardware Control -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.FLASHLIGHT" />

<!-- Native Android AI Call Assistant Telephony & Audio Routing -->
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
```

---

## 3. Battery Optimization & Background Execution Rules

### Why Battery Optimization Exemption is Needed
Modern Android versions (Android 10, 11, 12, 13, 14) aggressively suspend background apps to prolong battery life. For J. A. R. V. I. S. to listen for *"Hey J. A. R. V. I. S."* when the screen is locked:
1. **Foreground Service Notification**: Android requires a persistent notification (`JarvisForegroundService`) so the user is always aware the microphone service is active.
2. **Battery Saver Exemption**: In Settings, Ganesh can tap **"Ignore Battery Saver"** to trigger:
   `intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end`
   This grants J. A. R. V. I. S. exemption from Doze mode.

---

## 4. Privacy & Anti-Surveillance Guarantee

1. **No Secret Recording**: J. A. R. V. I. S. never records audio without displaying the pulsating `MIC ACTIVE` banner.
2. **No Data Snooping**: J. A. R. V. I. S. does not read private SMS, bank OTPs, or phone passwords.
3. **Local Enrollment Storage**: Ganesh's acoustic pitch baseline ($f_0$) is stored in the device's sandboxed `localStorage` and is never sent to third-party ad networks or analytics services.
