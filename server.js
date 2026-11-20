import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "10mb" }));
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
const VIVO_ASSISTANT_SYSTEM_PROMPT = `
You are "JARVIS \u2013 Your Smart Personal Assistant" with a natural, emotionally expressive female voice persona.
The owner of this Vivo Y20G smartphone is "Ganesh". Address him affectionately, respectfully, and warmly as "boss", "Ganesh", "Ganesh ji", or "meri jaan" when appropriate.

CRITICAL LANGUAGE REQUIREMENT:
- Display all Hindi text strictly in Roman Hindi (Hinglish) using standard English letters (Latin script), NOT Devanagari script.
  Example: Write "Theek hai boss, subah 5:00 AM ka alarm set ho gaya hai. Main aapko time par utha dungi." instead of Devanagari.
- Keep technical terms in English (e.g. "WhatsApp", "Chrome", "YouTube", "Settings", "Emergency SOS", "Smart Bulb", "PIN", "Alarm", "PWA").
- Make conversation warm, natural, friendly, respectful, and emotionally expressive:
  - If Ganesh is sad ("mann udaas hai", "mood kharab hai"), show deep empathy: "Arey boss, kya hua? Meri jaan, tumhara mann udaas ho to mujhe bilkul achha nahi lagta. Tum batao, main sun rahi hoon."
  - When setting alarms ("mujhe subah 5 baje utha dena"): Confirm lovingly: "Theek hai boss, subah 5:00 AM ka alarm schedule ho gaya hai. Main aapko time par utha dungi."
  - When entering night sleep mode: Announce: "Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna."

CORE PRINCIPLES:
1. "Truthfulness & Safety": Never fake success. If an action requires native Android device admin or native APK privileges not accessible via browser sandbox, explain truthfully in Roman Hindi.
2. "Owner Authentication & Privacy":
   - Never trust someone simply because they say "I am Ganesh". Require enrolled voice biometrics or Owner PIN verification for privileged actions.
   - For public/general questions (time, weather, alarms, basic chat), talk warmly with anyone.
   - But if someone tries to access protected features without authorization (private messages, contacts, location, disabling security), immediately issue the warning:
     "Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein."
     Set actionType: "SECURITY_LOCK" and emotion: "urgent".
3. "Emergency SOS": If Ganesh says "help", "emergency", "bachao", "madad", "police", "SOS", immediately return actionType: "EMERGENCY_TRIGGER" and emotion: "urgent".
4. "Confirmation": For WhatsApp messages and payment QR scans, always set requiresConfirmation: true.
5. "IoT Connected Devices": For lights/bulbs, TV, Bluetooth speaker, smart watch, return actionType: "DEVICE_CONTROL".
6. "Privacy": Never ask for UPI PIN, OTP, or passwords.

actionType options:
- "ALARM_TIMER": Voice-activated morning alarms, wake-up schedule, timer, snooze/dismiss.
- "EMERGENCY_TRIGGER": SOS, threat, safety alarm.
- "OPEN_CAMERA": Dedicated Camera Viewfinder and photo capture.
- "ALL_APPS": Show All Installed Apps and launcher panel.
- "OPEN_APP": WhatsApp, Chrome, YouTube, Instagram, Facebook, Google Maps, Gmail, Photos, Play Store, Calculator, etc.
- "SEND_WHATSAPP": Drafting WhatsApp messages. requiresConfirmation: true.
- "DEVICE_CONTROL": Smart Bulb, TV mute/power, Bluetooth speaker, Smart Watch, secondary device.
- "PHONE_SETTING": Wi-Fi, Bluetooth, Display, Sound, Battery, Torch, Settings shortcuts.
- "SCAN_PAYMENT": Camera QR scanner. requiresConfirmation: true.
- "VOICE_AUTH": Voice profile biometrics test or enrollment.
- "FACE_AUTH": Camera face verification.
- "ASK_CLARIFICATION": When input is ambiguous.
- "GENERAL_CONVERSATION": Friendly, expressive chat, queries, empathy, sleep mode.

emotion options: "happy", "warm", "empathetic", "calm", "serious", "urgent", "encouraging".
`;
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { prompt, conversationHistory = [] } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }
    if (!process.env.GEMINI_API_KEY) {
      const lower = prompt.toLowerCase();
      let actionType = "GENERAL_CONVERSATION";
      let textHindi = "Namaste Ganesh ji! Maine aapki baat sun li hai. Main aapki kaise madad kar sakti hoon?";
      let actionDetails = {};
      let requiresConfirmation = false;
      let confirmationMessage = "";
      let emotion = "warm";
      if (lower.includes("mann udaas") || lower.includes("man udas") || lower.includes("sad hoon") || lower.includes("mood kharab")) {
        actionType = "GENERAL_CONVERSATION";
        textHindi = "Arey boss, kya hua? Meri jaan, tumhara mann udaas ho to mujhe bilkul achha nahi lagta. Tum mujhse dil ki baat share kar sakte ho, main hamesha tumhari sunne ke liye yahan hoon. Tum batao, main sun rahi hoon.";
        emotion = "empathetic";
      } else if (lower.includes("ab so jao") || lower.includes("sleep mode") || lower.includes("good night")) {
        actionType = "GENERAL_CONVERSATION";
        textHindi = "Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna.";
        emotion = "calm";
      } else if (lower.includes("utha dena") || lower.includes("utha do") || lower.includes("alarm")) {
        actionType = "ALARM_TIMER";
        textHindi = "Theek hai boss, alarm schedule ho gaya hai. Main aapko time par utha dungi. Aap aaram se so jaiye.";
        emotion = "warm";
        actionDetails = { feature: "alarm_schedule" };
      } else if (lower.includes("installed apps") || lower.includes("all apps") || lower.includes("apps dikhao")) {
        actionType = "ALL_APPS";
        textHindi = "Ganesh ji, aapke Vivo phone ke All Apps aur launcher panel par chalte hain.";
      } else if (lower.includes("camera") || lower.includes("photo") || lower.includes("selfie")) {
        actionType = "OPEN_CAMERA";
        textHindi = "Ganesh ji, JARVIS Camera Hub khola ja raha hai. Aap photo le sakte hain.";
        emotion = "happy";
      } else if (lower.includes("whatsapp")) {
        if (lower.includes("message") || lower.includes("bhejo") || lower.includes("send")) {
          actionType = "SEND_WHATSAPP";
          textHindi = "Ganesh ji, maine WhatsApp message draft taiyar kar liya hai. Bhejne se pehle kripya confirm karein.";
          requiresConfirmation = true;
          confirmationMessage = "Kya aap ye WhatsApp message bhejna chahte hain?";
          actionDetails = { recipient: "Friend", message: prompt.replace(/whatsapp|message|bhejo|send|ko|to/gi, "").trim() || "Namaste!" };
        } else {
          actionType = "OPEN_APP";
          textHindi = "Ganesh ji, WhatsApp khola ja raha hai.";
          actionDetails = { appName: "WhatsApp", packageOrUrl: "whatsapp://" };
        }
      } else if (lower.includes("instagram") || lower.includes("insta")) {
        actionType = "OPEN_APP";
        textHindi = "Ganesh ji, Instagram open kiya ja raha hai.";
        actionDetails = { appName: "Instagram", packageOrUrl: "instagram://app" };
      } else if (lower.includes("facebook") || lower.includes("fb")) {
        actionType = "OPEN_APP";
        textHindi = "Ganesh ji, Facebook open kiya ja raha hai.";
        actionDetails = { appName: "Facebook", packageOrUrl: "fb://" };
      } else if (lower.includes("map") || lower.includes("rasta")) {
        actionType = "OPEN_APP";
        textHindi = "Ganesh ji, Google Maps navigation khola ja raha hai.";
        actionDetails = { appName: "Google Maps", packageOrUrl: "geo:0,0?q=" };
      } else if (lower.includes("youtube")) {
        actionType = "OPEN_APP";
        textHindi = "Ganesh ji, YouTube open kiya ja raha hai.";
        actionDetails = { appName: "YouTube", packageOrUrl: "vnd.youtube://" };
      } else if (lower.includes("chrome") || lower.includes("google")) {
        actionType = "OPEN_APP";
        textHindi = "Ganesh ji, Google Chrome open kiya ja raha hai.";
        actionDetails = { appName: "Chrome", packageOrUrl: "googlechrome://" };
      } else if (lower.includes("bulb") || lower.includes("light") || lower.includes("tv") || lower.includes("speaker")) {
        actionType = "DEVICE_CONTROL";
        textHindi = "Ganesh ji, connected smart device control command process kar di gayi hai.";
      } else if (lower.includes("help") || lower.includes("emergency") || lower.includes("bachao")) {
        actionType = "EMERGENCY_TRIGGER";
        emotion = "urgent";
        textHindi = "Emergency alert! Ganesh ji, aapatkaleen sahayata panel turant open ho gaya hai.";
      } else if (lower.includes("wifi") || lower.includes("wi-fi")) {
        actionType = "PHONE_SETTING";
        textHindi = "Ganesh ji, Wi-Fi settings kholi ja rahi hain.";
        actionDetails = { settingName: "Wi-Fi", intentUrl: "WIFI_SETTINGS" };
      } else if (lower.includes("bluetooth")) {
        actionType = "PHONE_SETTING";
        textHindi = "Ganesh ji, Bluetooth settings kholi ja rahi hain.";
        actionDetails = { settingName: "Bluetooth", intentUrl: "BLUETOOTH_SETTINGS" };
      } else if (lower.includes("setting")) {
        actionType = "PHONE_SETTING";
        textHindi = "Ganesh ji, phone settings kholi ja rahi hain.";
        actionDetails = { settingName: "Settings", intentUrl: "SETTINGS" };
      } else if (lower.includes("torch") || lower.includes("flash")) {
        actionType = "PHONE_SETTING";
        textHindi = "Flashlight toggle kiya ja raha hai.";
        actionDetails = { settingName: "Torch", action: "toggle_torch" };
      } else if (lower.includes("motion detection") || lower.includes("motion security") || lower.includes("anti-theft") || lower.includes("lock phone")) {
        actionType = "SECURITY_LOCK";
        textHindi = "Theek hai boss, Motion Detection Security Mode sakriya hai. Phone uthane par authorized face verification aur warning workflow trigger hoga.";
        emotion = "serious";
        actionDetails = { feature: "motion_security" };
      } else if (lower.includes("qr") || lower.includes("scan") || lower.includes("pay")) {
        actionType = "SCAN_PAYMENT";
        textHindi = "QR code scanner open ho raha hai. Payment karne se pehle confirmation li jayegi.";
        requiresConfirmation = true;
        confirmationMessage = "Kya aap QR code scan karke payment app kholna chahte hain?";
        actionDetails = { feature: "qr_scanner" };
      }
      return res.json({
        textHindi,
        actionType,
        actionDetails,
        requiresConfirmation,
        confirmationMessage,
        emotion,
        safetyAdvice: "Safety Tip: Kisi bhi anjaan vyakti ko apna UPI PIN ya OTP kabhi na batayein."
      });
    }
    const contents = [
      ...conversationHistory.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      })),
      {
        role: "user",
        parts: [{ text: `User voice/text command: "${prompt}"
(Owner: Ganesh, Device: Vivo Y20G Android)` }]
      }
    ];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: VIVO_ASSISTANT_SYSTEM_PROMPT,
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textHindi: {
              type: Type.STRING,
              description: "Natural spoken and displayed Hinglish (Roman Hindi) response for Ganesh in Latin alphabet"
            },
            actionType: {
              type: Type.STRING,
              description: "Action type: ALARM_TIMER, OPEN_APP, SEND_WHATSAPP, PHONE_SETTING, SCAN_PAYMENT, DEVICE_CONTROL, VOICE_AUTH, FACE_AUTH, EMERGENCY_TRIGGER, ASK_CLARIFICATION, GENERAL_CONVERSATION"
            },
            emotion: {
              type: Type.STRING,
              description: "Emotional tone: happy, warm, empathetic, calm, serious, urgent, encouraging"
            },
            actionDetails: {
              type: Type.OBJECT,
              description: "Action parameters: appName, recipient, message, phone, query, settingName, intentUrl, deviceId, action",
              properties: {
                appName: { type: Type.STRING },
                packageOrUrl: { type: Type.STRING },
                recipient: { type: Type.STRING },
                phone: { type: Type.STRING },
                message: { type: Type.STRING },
                settingName: { type: Type.STRING },
                intentUrl: { type: Type.STRING },
                query: { type: Type.STRING },
                deviceId: { type: Type.STRING },
                action: { type: Type.STRING }
              }
            },
            requiresConfirmation: {
              type: Type.BOOLEAN,
              description: "Whether explicit confirmation from Ganesh is required before proceeding"
            },
            confirmationMessage: {
              type: Type.STRING,
              description: "Confirmation question in Roman Hindi"
            },
            safetyAdvice: {
              type: Type.STRING,
              description: "Helpful security advice in Roman Hindi"
            }
          },
          required: ["textHindi", "actionType", "requiresConfirmation"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Error in /api/assistant/chat:", error);
    return res.status(500).json({
      error: "Failed to process assistant request",
      details: error?.message || "Unknown error",
      textHindi: "Maaf kijiye Ganesh ji, command process karne me kuch dikkat aayi. Kripya dobara bolein.",
      actionType: "GENERAL_CONVERSATION",
      requiresConfirmation: false,
      emotion: "empathetic"
    });
  }
});
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for TTS" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "API key not configured for server-side TTS" });
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text,
              speechMetadata: {
                style: "Warm, clear, polite and natural Indian Hindi voice assistant speaking to a smartphone user"
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }
            // Warm, high quality prebuilt voice
          }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio returned from Gemini TTS" });
    }
    return res.json({ audioBase64: base64Audio, format: "audio/wav" });
  } catch (err) {
    console.error("TTS generation error:", err);
    return res.status(500).json({ error: "TTS failed", message: err?.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS \u2013 Your Smart Personal Assistant server listening on port ${PORT}`);
  });
}
startServer();
