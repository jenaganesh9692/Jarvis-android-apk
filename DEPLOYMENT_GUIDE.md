# J. A. R. V. I. S. — Deployment & Multi-Device Installation Guide

This guide explains how to access, install, and continuously run **J. A. R. V. I. S.** across different Android devices while maintaining a single, consistent central application.

---

## 1. Central Live URLs

The application is deployed on Google Cloud Run and remains permanently live:

- **Published Shared URL (For any compatible mobile device)**:  
  **`https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app`**
- **Development & Live Test URL**:  
  **`https://ais-dev-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app`**
- **Instant Complete Project Export (.ZIP)**:  
  **`https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/api/export-project`**

---

## 2. Multi-Device Architecture (Same Assistant on Every Phone)

When you open the published link on a new Android phone (e.g. Vivo, Samsung, OnePlus, Xiaomi):

1. **Central Version**: The phone immediately loads the current unified version of J. A. R. V. I. S.
2. **Device Isolation**: User-specific settings (local audio volume, device permissions, specific hardware alarms, and local voice profile) are isolated in that specific device's `localStorage`.
3. **No Re-Creation Required**: You do **not** need to recreate prompts or rebuild the assistant. The same assistant personality, commands, voice, and design run automatically.
4. **Auto-Update**: Whenever J. A. R. V. I. S. is updated in Google AI Studio, reopening or refreshing the page on any phone automatically loads the newest version.

---

## 3. Installation Methods

### Method 1: Mobile-Only GitHub Cloud APK Build (No PC Needed)
This project already includes `.github/workflows/build-apk.yml` and the complete native `android/` Gradle project (`com.jarvis.assistant`):

1. Download the full project ZIP from `/api/export-project` on your phone and extract it.
2. Open **github.com** in your mobile browser and create a new repository (e.g., `jarvis-android-apk`).
3. Upload/commit all extracted project files (including `.github/workflows/build-apk.yml` and `android/`).
4. Open the repository's **Actions** tab, select **Build JARVIS Android APK**, and tap **Run workflow** (or it auto-runs on push to `main`/`master`).
5. Once the workflow finishes (~2–3 mins), download the **JARVIS-Android-APK** artifact ZIP, extract `app-debug.apk`, and install it on your Android phone.

---

### Method 2: Instant PWA Home Screen Installation (1-Tap)
This installs J. A. R. V. I. S. as a fullscreen, standalone app without any browser URL bar:

1. Open **`https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app`** in Google Chrome on your Android phone.
2. Tap the Chrome **3 Dots Menu (⋮)** in the top-right corner.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Tap **Install**. The **J. A. R. V. I. S.** icon will appear on your home screen and app launcher.
5. Tap the icon to launch in full standalone mode.

---

### Method 3: Local Gradle / Android Studio APK Build
If you want to compile the `.apk` locally on a computer:

1. Download and extract the full project ZIP:
   `curl -L -o jarvis.zip https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/api/export-project`
2. Build web assets and copy them into the Android assets folder:
   ```bash
   npm install
   npm run build
   mkdir -p android/app/src/main/assets/dist
   cp -r dist/* android/app/src/main/assets/dist/
   ```
3. Compile the debug APK with Gradle (or open `android/` in Android Studio):
   ```bash
   cd android
   gradle assembleDebug
   ```
4. Install `android/app/build/outputs/apk/debug/app-debug.apk` on your Android phone.

---

### Method 3: Google Bubblewrap CLI (Play Store / TWA APK)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/manifest.json
bubblewrap build
```

---

## 4. How to Update in the Future

Whenever you want to modify J. A. R. V. I. S.:
1. Open your existing project in **Google AI Studio Build**.
2. Give your simple instruction (e.g. *"J. A. R. V. I. S. me ye naya control add karo"*).
3. The AI reads `PROJECT_INSTRUCTIONS.md` and `FEATURES.md`, modifies the existing code in-place, verifies the build, and updates the live deployment.
4. Refresh the app on your phone to immediately enjoy the update!
