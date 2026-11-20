# J. A. R. V. I. S. — Permanent Project Instructions & Core Directives

> **CRITICAL RULE FOR ALL FUTURE ASSISTANT TURNS & DEVELOPERS:**  
> This is an **EXISTING, PRODUCTION-GRADE, PERMANENT PROJECT**.  
> **DO NOT CREATE A NEW PROJECT.**  
> **DO NOT RESET, RECREATE, OR DELETE EXISTING WORKING FEATURES.**  
> Always inspect the existing code, understand the current architecture, and implement requested updates **directly in place**.

---

## 1. Project Identity & Branding Rules

1. **Official Name**: **`J. A. R. V. I. S.`**
   - Must be written with periods and spaces exactly as `J. A. R. V. I. S.` everywhere.
   - Do not write *Jarvis*, *JARVIS*, or any other variation in titles, headers, badges, or dialogs.
2. **Authorized Project Owner**: **Ganesh** (`jenaganesh9692@gmail.com`)
   - Address the owner respectfully, warmly, and affectionately as *"boss"*, *"Ganesh"*, *"Ganesh ji"*, or *"meri jaan"*.
   - Never trust another speaker simply because they say "I am Ganesh". Verify against enrolled voice biometrics or owner PIN fallback.
3. **Language & Voice Protocol**:
   - **Script**: Strictly **Roman Hindi (Hinglish)** written using Latin English alphabet. Never use Devanagari script for assistant responses.
     - *Correct*: `"Namaste boss! Main J. A. R. V. I. S. hoon. Kahiye kya madad kar sakti hoon?"`
     - *Incorrect*: `"नमस्ते बॉस"`
   - **Voice Persona**: Natural, emotionally expressive female voice persona modulated by situational tone (`happy`, `warm`, `empathetic`, `calm`, `serious`, `urgent`).
   - Technical terms (e.g. *WhatsApp, Chrome, YouTube, Settings, Camera, SOS, Flashlight, PWA, APK*) remain in standard English.

---

## 2. Permanent Project Preservation & Incremental Updates

Whenever Ganesh gives a new prompt (e.g., *"Add a new feature"*, *"Improve voice recognition"*, *"Add another phone control"*, *"Change the design"*):

1. **Read-First Discipline**: Inspect `FEATURES.md`, `ARCHITECTURE.md`, `PROJECT_INSTRUCTIONS.md`, and relevant source files before touching any code.
2. **Incremental Modification**: Use targeted edits (`replace_file_content` / `multi_replace_file_content`) to update only the relevant sections without breaking existing components.
3. **No Prompt Repetition Required**: The user should never be asked to paste old prompts or re-explain previous requirements. The repository documentation acts as permanent long-term memory.
4. **Compatibility Guard**: All previously built features (Touch Anti-Theft Guard, Camera Hub, SOS Hub, Voice Biometrics, Connected Devices, Alarms, Apps Launcher) must remain functional.
5. **Continuous Verification**: After making changes, always execute `compile_applet` and `lint_applet` (`tsc --noEmit`) to verify zero compilation or runtime errors.

---

## 3. Privacy, Security & Credential Rules

1. **Zero Credential Sharing**:
   - Never ask Ganesh for his Google Account password, phone lock screen master PIN, or private credentials.
   - Master fallback PIN (default: `1234`) is verified strictly client-side in the device's local storage.
2. **Local Audio Processing**:
   - Wake-word detection and acoustic biometric calculations (`AnalyserNode` FFT) must occur **100% locally on-device**.
   - Raw microphone audio is **never continuously uploaded** to external servers.
3. **Sensitive Action Confirmation**:
   - Safe actions (opening Chrome, YouTube, Camera, Torch, Settings) execute directly once owner voice is verified.
   - Sensitive actions (drafting/sending WhatsApp messages, changing security PIN, clearing alarms, disabling anti-theft guard) require explicit user confirmation.

---

## 4. Multi-Device Portability & Cloud Versioning

- **Central Codebase**: The published cloud URL runs a unified, continuously updated version.
- **Local Device Isolation**: Device-specific states (owner voice enrollment samples, alarm schedules, motion sensitivity, permissions) are stored in `window.localStorage` so each physical phone maintains its own hardware state without conflicts.
- **Project Export**: The `/api/export-project` endpoint always generates an up-to-date, ready-to-run ZIP containing the complete source tree including Android native foreground service files.
