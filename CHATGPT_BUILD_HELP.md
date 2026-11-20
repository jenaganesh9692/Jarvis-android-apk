# J. A. R. V. I. S. — ChatGPT Sync, Build & Help Setup Guide

Is guide me bataya gaya hai ki aap **ChatGPT** aur apne **J. A. R. V. I. S.** project ko kaise sync karein — chahe aap **Free ChatGPT Mobile App** use karte hon ya **Custom GPT Actions**.

---

## Method 1: ChatGPT Mobile App Instant Sync (Free & 1-Tap)
Agar aap normal ChatGPT app phone par use karte hain:
1. J. A. R. V. I. S. app me **Settings -> APK, GitHub & ChatGPT** kholein aur **ChatGPT Sync & Help** tab par jayein.
2. **"Sync Now"** dabayein (ye server se aapke latest components, services, Android files aur GitHub workflow status ko fetch karta hai).
3. **"Copy ChatGPT Sync Prompt"** button par tap karein.
4. ChatGPT mobile app open karke ek chat me paste karein. ChatGPT ko turant aapke project ke latest files, architecture, GitHub workflow aur sync URL mil jayenge!
5. Jab bhi aap naya feature add karein, bas **"Copy ChatGPT Sync Prompt"** dubara tap karke ChatGPT ko refresh kar sakte hain.

---

## Method 2: Custom GPT Actions (Automatic Live Cloud Sync)
Agar aapke paas Custom GPT editor access hai, to ChatGPT ko directly live server se sync karein:

1. **chatgpt.com/gpts/editor** kholein -> **Create a GPT** -> **Configure** tab.
2. **Name**: `J. A. R. V. I. S. Sync & Build Helper`
3. **Instructions**: `.chatgpt/gpt-instructions.md` file ka text paste karein.
4. **Actions -> Create new action -> Import from URL**:
   ```
   https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/chatgpt/openapi.json
   ```
5. **Authentication**: `None` (ye endpoints sirf safe build metadata, component list aur help return karte hain — koi private user data ya API key expose nahi hoti).
6. Save & Test! Ab ChatGPT live sync endpoints call kar sakta hai:
   - `GET /api/chatgpt/sync` — Live components, services, Android files & GitHub APK workflow check
   - `GET /api/health` — Live server uptime check
   - `GET /api/chatgpt/help` & `POST /api/chatgpt/help` — Build & APK error troubleshooting

---

## Method 3: GitHub + ChatGPT Sync (Dual Repo Sync)
Project export ZIP (`/api/export-project`) me `.github/workflows/build-apk.yml` ke sath `.chatgpt/gpt-instructions.md`, `.chatgpt/openapi.json`, aur `CHATGPT_BUILD_HELP.md` bhi automatically shamil hain. Jab aap ZIP ko GitHub par upload karte hain, to GitHub APK build aur ChatGPT sync config dono ek hi repo me safe rehte hain.
