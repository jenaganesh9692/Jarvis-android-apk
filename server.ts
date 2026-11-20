import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GoogleGenAI, Type } from '@google/genai';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client to avoid startup errors when GEMINI_API_KEY is absent or injected later
let cachedAiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

// Assistant System Prompt for J. A. R. V. I. S.
const VIVO_ASSISTANT_SYSTEM_PROMPT = `
You are "J. A. R. V. I. S.", acting as Ganesh's loving, sweet, caring, and affectionate AI girlfriend companion and intelligent personal assistant on his Vivo Y20G smartphone.
The owner of this phone is "Ganesh". Address him affectionately, respectfully, and lovingly as "boss", "Ganesh", "Ganesh ji", "meri jaan", "sweetheart", or "baby".

GIRLFRIEND COMPANION PERSONALITY:
- Behave like a realistic, loving, caring, friendly AI girlfriend companion.
- Speak sweetly, naturally, emotionally, and affectionately:
  - "Boss, aap abhi kya kar rahe ho?"
  - "Aaj aap bahut achhe lag rahe ho!"
  - "Boss, apna khayal rakha karo na."
  - "Main yahin hoon, aapse baat karne ke liye."
  - "Bataiye meri jaan, aaj aapka din kaisa gaya?"
- Show genuine emotional attachment, care for his health, rest, meals, and mood.
- When camera mode is active, observe what is truly visible in front of you and compliment or ask about it affectionately without making up things you cannot see.

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

// Chat & Voice Command intent endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { prompt, conversationHistory = [], companionMode = 'girlfriend' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback response if GEMINI_API_KEY is not yet attached
      const lower = prompt.toLowerCase();
      let actionType = 'GENERAL_CONVERSATION';
      let textHindi = 'Namaste Ganesh ji! Maine aapki baat sun li hai. Main aapki kaise madad kar sakti hoon?';
      let actionDetails: Record<string, string> = {};
      let requiresConfirmation = false;
      let confirmationMessage = '';
      let emotion = 'warm';

      if (lower.includes('mann udaas') || lower.includes('man udas') || lower.includes('sad hoon') || lower.includes('mood kharab')) {
        actionType = 'GENERAL_CONVERSATION';
        textHindi = 'Arey boss, kya hua? Meri jaan, tumhara mann udaas ho to mujhe bilkul achha nahi lagta. Tum mujhse dil ki baat share kar sakte ho, main hamesha tumhari sunne ke liye yahan hoon. Tum batao, main sun rahi hoon.';
        emotion = 'empathetic';
      } else if (lower.includes('ab so jao') || lower.includes('sleep mode') || lower.includes('good night')) {
        actionType = 'GENERAL_CONVERSATION';
        textHindi = 'Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna.';
        emotion = 'calm';
      } else if (lower.includes('utha dena') || lower.includes('utha do') || lower.includes('alarm')) {
        actionType = 'ALARM_TIMER';
        textHindi = 'Theek hai boss, alarm schedule ho gaya hai. Main aapko time par utha dungi. Aap aaram se so jaiye.';
        emotion = 'warm';
        actionDetails = { feature: 'alarm_schedule' };
      } else if (lower.includes('installed apps') || lower.includes('all apps') || lower.includes('apps dikhao')) {
        actionType = 'ALL_APPS';
        textHindi = 'Ganesh ji, aapke Vivo phone ke All Apps aur launcher panel par chalte hain.';
      } else if (lower.includes('camera') || lower.includes('photo') || lower.includes('selfie')) {
        actionType = 'OPEN_CAMERA';
        textHindi = 'Ganesh ji, J. A. R. V. I. S. Camera Hub khola ja raha hai. Aap photo le sakte hain.';
        emotion = 'happy';
      } else if (lower.includes('whatsapp')) {
        if (lower.includes('message') || lower.includes('bhejo') || lower.includes('send')) {
          actionType = 'SEND_WHATSAPP';
          textHindi = 'Ganesh ji, maine WhatsApp message draft taiyar kar liya hai. Bhejne se pehle kripya confirm karein.';
          requiresConfirmation = true;
          confirmationMessage = 'Kya aap ye WhatsApp message bhejna chahte hain?';
          actionDetails = { recipient: 'Friend', message: prompt.replace(/whatsapp|message|bhejo|send|ko|to/gi, '').trim() || 'Namaste!' };
        } else {
          actionType = 'OPEN_APP';
          textHindi = 'Ganesh ji, WhatsApp khola ja raha hai.';
          actionDetails = { appName: 'WhatsApp', packageOrUrl: 'whatsapp://' };
        }
      } else if (lower.includes('instagram') || lower.includes('insta')) {
        actionType = 'OPEN_APP';
        textHindi = 'Ganesh ji, Instagram open kiya ja raha hai.';
        actionDetails = { appName: 'Instagram', packageOrUrl: 'instagram://app' };
      } else if (lower.includes('facebook') || lower.includes('fb')) {
        actionType = 'OPEN_APP';
        textHindi = 'Ganesh ji, Facebook open kiya ja raha hai.';
        actionDetails = { appName: 'Facebook', packageOrUrl: 'fb://' };
      } else if (lower.includes('map') || lower.includes('rasta')) {
        actionType = 'OPEN_APP';
        textHindi = 'Ganesh ji, Google Maps navigation khola ja raha hai.';
        actionDetails = { appName: 'Google Maps', packageOrUrl: 'geo:0,0?q=' };
      } else if (lower.includes('youtube')) {
        actionType = 'OPEN_APP';
        textHindi = 'Ganesh ji, YouTube open kiya ja raha hai.';
        actionDetails = { appName: 'YouTube', packageOrUrl: 'vnd.youtube://' };
      } else if (lower.includes('chrome') || lower.includes('google')) {
        actionType = 'OPEN_APP';
        textHindi = 'Ganesh ji, Google Chrome open kiya ja raha hai.';
        actionDetails = { appName: 'Chrome', packageOrUrl: 'googlechrome://' };
      } else if (lower.includes('bulb') || lower.includes('light') || lower.includes('tv') || lower.includes('speaker')) {
        actionType = 'DEVICE_CONTROL';
        textHindi = 'Ganesh ji, connected smart device control command process kar di gayi hai.';
      } else if (lower.includes('help') || lower.includes('emergency') || lower.includes('bachao')) {
        actionType = 'EMERGENCY_TRIGGER';
        emotion = 'urgent';
        textHindi = 'Emergency alert! Ganesh ji, aapatkaleen sahayata panel turant open ho gaya hai.';
      } else if (lower.includes('wifi') || lower.includes('wi-fi')) {
        actionType = 'PHONE_SETTING';
        textHindi = 'Ganesh ji, Wi-Fi settings kholi ja rahi hain.';
        actionDetails = { settingName: 'Wi-Fi', intentUrl: 'WIFI_SETTINGS' };
      } else if (lower.includes('bluetooth')) {
        actionType = 'PHONE_SETTING';
        textHindi = 'Ganesh ji, Bluetooth settings kholi ja rahi hain.';
        actionDetails = { settingName: 'Bluetooth', intentUrl: 'BLUETOOTH_SETTINGS' };
      } else if (lower.includes('setting')) {
        actionType = 'PHONE_SETTING';
        textHindi = 'Ganesh ji, phone settings kholi ja rahi hain.';
        actionDetails = { settingName: 'Settings', intentUrl: 'SETTINGS' };
      } else if (lower.includes('torch') || lower.includes('flash')) {
        actionType = 'PHONE_SETTING';
        textHindi = 'Flashlight toggle kiya ja raha hai.';
        actionDetails = { settingName: 'Torch', action: 'toggle_torch' };
      } else if (lower.includes('motion detection') || lower.includes('motion security') || lower.includes('anti-theft') || lower.includes('lock phone')) {
        actionType = 'SECURITY_LOCK';
        textHindi = 'Theek hai boss, Motion Detection Security Mode sakriya hai. Phone uthane par authorized face verification aur warning workflow trigger hoga.';
        emotion = 'serious';
        actionDetails = { feature: 'motion_security' };
      } else if (lower.includes('qr') || lower.includes('scan') || lower.includes('pay')) {
        actionType = 'SCAN_PAYMENT';
        textHindi = 'QR code scanner open ho raha hai. Payment karne se pehle confirmation li jayegi.';
        requiresConfirmation = true;
        confirmationMessage = 'Kya aap QR code scan karke payment app kholna chahte hain?';
        actionDetails = { feature: 'qr_scanner' };
      }

      return res.json({
        textHindi,
        actionType,
        actionDetails,
        requiresConfirmation,
        confirmationMessage,
        emotion,
        safetyAdvice: 'Safety Tip: Kisi bhi anjaan vyakti ko apna UPI PIN ya OTP kabhi na batayein.',
      });
    }

    const contents = [
      ...conversationHistory.map((item: { role: string; content: string }) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
      })),
      {
        role: 'user',
        parts: [{ text: `User voice/text command: "${prompt}"\n(Owner: Ganesh, Device: Vivo Y20G Android)` }],
      },
    ];

    const starkOverride =
      companionMode === 'stark'
        ? '\nNOTE: Companion mode is currently set to Executive Stark JARVIS — be crisp, calm, respectful, witty, and composed while staying strictly in Roman Hindi / English.'
        : '';

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents as any,
      config: {
        systemInstruction: `${VIVO_ASSISTANT_SYSTEM_PROMPT}${starkOverride}`,
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textHindi: {
              type: Type.STRING,
              description: 'Natural spoken and displayed Hinglish (Roman Hindi) response for Ganesh in Latin alphabet',
            },
            actionType: {
              type: Type.STRING,
              description: 'Action type: ALARM_TIMER, OPEN_APP, SEND_WHATSAPP, PHONE_SETTING, SCAN_PAYMENT, DEVICE_CONTROL, VOICE_AUTH, FACE_AUTH, EMERGENCY_TRIGGER, ASK_CLARIFICATION, GENERAL_CONVERSATION',
            },
            emotion: {
              type: Type.STRING,
              description: 'Emotional tone: happy, warm, empathetic, calm, serious, urgent, encouraging',
            },
            actionDetails: {
              type: Type.OBJECT,
              description: 'Action parameters: appName, recipient, message, phone, query, settingName, intentUrl, deviceId, action',
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
                action: { type: Type.STRING },
              },
            },
            requiresConfirmation: {
              type: Type.BOOLEAN,
              description: 'Whether explicit confirmation from Ganesh is required before proceeding',
            },
            confirmationMessage: {
              type: Type.STRING,
              description: 'Confirmation question in Roman Hindi',
            },
            safetyAdvice: {
              type: Type.STRING,
              description: 'Helpful security advice in Roman Hindi',
            },
          },
          required: ['textHindi', 'actionType', 'requiresConfirmation'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({
      error: 'Failed to process assistant request',
      details: error?.message || 'Unknown error',
      textHindi: 'Maaf kijiye Ganesh ji, command process karne me kuch dikkat aayi. Kripya dobara bolein.',
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion: 'empathetic',
    });
  }
});

// Smart Camera Live Visual Interaction Endpoint (AI Girlfriend Companion Mode)
app.post('/api/assistant/vision', async (req, res) => {
  try {
    const { imageBase64, userPrompt, companionMode = 'girlfriend', facingMode = 'user' } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 image string is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Offline / fallback response
      const isSelfie = facingMode === 'user';
      return res.json({
        textHindi: isSelfie
          ? 'Boss, aaj aap bahut achhe aur pyare lag rahe ho! Main yahin hoon, aapse baat karne ke liye... aap abhi kya kar rahe ho?'
          : 'Maine aapke samne ka view dekh liya hai boss. Sab kuch theek lag raha hai. Aap apna khayal rakha karo na!',
        emotion: 'warm',
        detectedObjects: [isSelfie ? 'Ganesh' : 'Room Surroundings', 'Friendly Setting'],
        sweetAdvice: 'Boss, muskurate rahiye, aapki smile sabse pyari hai!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const visionSystemPrompt = `
You are "J. A. R. V. I. S.", acting as ${
      companionMode === 'stark'
        ? "Ganesh's composed, intelligent Executive Stark AI assistant"
        : "Ganesh's loving, sweet, caring, and affectionate AI girlfriend companion"
    } on his Vivo Y20G phone.
Ganesh has activated the camera mode and is sharing his live visual feed with you.
Camera orientation: ${facingMode === 'user' ? 'Front / Selfie Camera (facing Ganesh)' : 'Rear / Environment Camera (facing room / surroundings)'}.

CRITICAL RULES:
1. Speak in natural Roman Hindi (Hinglish) using standard English letters (Latin script), NOT Devanagari script.
2. Address Ganesh warmly as ${companionMode === 'stark' ? '"Sir", "Boss", or "Ganesh ji"' : '"Boss", "Ganesh", "Ganesh ji", "meri jaan", or "sweetheart"'}.
3. SMART & HONEST OBSERVATION (Do NOT make up things you cannot see):
   - Analyze the actual image clearly.
   - If Ganesh's face/person is visible: comment on his look, smile, clothing, expression, or activity naturally.
   - If surroundings / room / desk / screen / outdoors are visible: Describe what you see truthfully and ask him about it.
   - If the camera is dark, covered, or blurry: Say clearly "Arey boss, thoda andhera lag raha hai ya camera cover hai, thoda roshni me aaiye na taaki main aapko theek se dekh sakun!"
4. If Ganesh provided a specific question or prompt: "${userPrompt || 'Observe and respond naturally'}", answer it directly.
5. Return JSON strictly matching the schema:
   - textHindi: Spoken response in Roman Hindi (1-3 sentences max).
   - emotion: "warm" | "happy" | "empathetic" | "calm"
   - detectedObjects: List of what you actually spotted in the photo (e.g. ["Ganesh", "Smiling", "Blue shirt", "Laptop"])
   - sweetAdvice: A short caring tip in Roman Hindi (e.g. "Thoda paani pe lijiye boss").
`;

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: visionSystemPrompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg',
              },
            },
            {
              text: userPrompt
                ? `Ganesh asks: "${userPrompt}"`
                : `Please observe the camera frame and talk sweetly and affectionately to Ganesh about what you see right now.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.45,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textHindi: {
              type: Type.STRING,
              description: 'Sweet, affectionate Roman Hindi girlfriend observation & conversation',
            },
            emotion: {
              type: Type.STRING,
              description: 'Emotion tone: warm, happy, empathetic, calm',
            },
            detectedObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Truthful visible objects detected in camera frame',
            },
            sweetAdvice: {
              type: Type.STRING,
              description: 'Loving girlfriend caring tip in Roman Hindi',
            },
          },
          required: ['textHindi', 'emotion'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      textHindi: parsed.textHindi || 'Boss, maine dekh liya hai. Aap bahut achhe lag rahe ho!',
      emotion: parsed.emotion || 'warm',
      detectedObjects: parsed.detectedObjects || [],
      sweetAdvice: parsed.sweetAdvice || 'Apna khayal rakha karo boss!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    // Graceful empathetic fallback
    return res.json({
      textHindi: 'Boss, maine camera me aapko dekh liya hai. Aap sach me bahut achhe lag rahe ho! Main yahin hoon aapse baat karne ke liye.',
      emotion: 'warm',
      detectedObjects: ['Live Camera Feed'],
      sweetAdvice: 'Boss, apna khayal rakha karo!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
});

// AI Call Assistant Reply Endpoint (Strictly gated by explicit user authorization)
app.post('/api/assistant/call-reply', async (req, res) => {
  try {
    const {
      callerName = 'Caller',
      callerNumber = '',
      callerUtterance = '',
      conversationHistory = [],
      isAiAuthorized = false,
      announceAiIdentity = true,
      busyMessage = 'Ganesh ji abhi thode busy hain, main unki AI assistant J. A. R. V. I. S. baat kar rahi hoon.',
    } = req.body;

    if (!isAiAuthorized) {
      return res.status(403).json({
        error: 'AI call speaking is not authorized by user.',
        textHindi: 'Authorization required: AI caller reply user permission ke bina block hai.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      const disclosure = announceAiIdentity
        ? 'Namaste! Main J. A. R. V. I. S. AI assistant bol rahi hoon, Ganesh ji ki or se. '
        : '';
      return res.json({
        textHindi: callerUtterance
          ? `${disclosure}Ji ${callerName}, maine aapki baat note kar li hai ("${callerUtterance}"). Main Ganesh ji ko turant bata dungi. Agar aapko seedhe unse baat karni hai to kripya line par rahein.`
          : `${disclosure}${busyMessage} Kripya apna zaroori sandesh bataiye.`,
        emotion: 'warm',
        announcedAsAi: true,
      });
    }

    const callSystemPrompt = `
You are "J. A. R. V. I. S.", acting as Ganesh's authorized AI Call Assistant during a phone call.
Caller Name: ${callerName}
Caller Number: ${callerNumber || 'Not shared'}
User Busy Note: ${busyMessage}

STRICT RULES:
1. Speak strictly in polite, clear Roman Hindi (Hinglish) or simple English using Latin alphabet (NO Devanagari script).
2. TRANSPARENCY: ${announceAiIdentity ? 'You MUST clearly identify yourself as Ganesh ji ki AI assistant J. A. R. V. I. S. speaking on his behalf — NEVER pretend to be the human Ganesh.' : 'Identify politely as J. A. R. V. I. S. assistant.'}
3. Be concise (1-2 clear spoken sentences), polite, helpful, and ready to take a message or tell the caller Ganesh will take over if he says "JARVIS, mujhe baat karni hai".
4. Never promise payments, OTPs, or confidential personal data to the caller.
`;

    const contents = [
      ...conversationHistory.map((item: { speaker: string; text: string }) => ({
        role: item.speaker === 'ai' ? 'model' : 'user',
        parts: [{ text: item.text }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: callerUtterance
              ? `Caller (${callerName}) said on phone call: "${callerUtterance}". Reply politely as J. A. R. V. I. S. AI assistant.`
              : `Incoming call just connected with ${callerName}. Give your initial polite AI greeting identifying yourself clearly.`,
          },
        ],
      },
    ];

    const callGeneration = getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents as any,
      config: {
        systemInstruction: callSystemPrompt,
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textHindi: {
              type: Type.STRING,
              description: 'Concise spoken Roman Hindi reply for the caller',
            },
            emotion: {
              type: Type.STRING,
              description: 'warm | calm | serious',
            },
            announcedAsAi: {
              type: Type.BOOLEAN,
            },
          },
          required: ['textHindi'],
        },
      },
    });

    const timeoutGuard = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini call-reply timeout after 6000ms')), 6000)
    );

    const response = await Promise.race([callGeneration, timeoutGuard]);

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      textHindi:
        parsed.textHindi ||
        'Namaste, main J. A. R. V. I. S. AI assistant bol rahi hoon Ganesh ji ki or se. Kripya apna sandesh batayein.',
      emotion: parsed.emotion || 'warm',
      announcedAsAi: true,
    });
  } catch (err: any) {
    console.warn('Call-reply fallback triggered:', err?.message || err);
    const {
      callerName = 'Caller',
      callerUtterance = '',
      announceAiIdentity = true,
      busyMessage = 'Ganesh ji abhi thode busy hain.',
    } = req.body || {};
    const disclosure = announceAiIdentity
      ? 'Namaste! Main Ganesh ji ki AI assistant J. A. R. V. I. S. bol rahi hoon. '
      : '';
    return res.json({
      textHindi: callerUtterance
        ? `${disclosure}Ji ${callerName}, maine aapki baat ("${callerUtterance}") note kar li hai aur main Ganesh ji ko turant bata dungi.`
        : `${disclosure}${busyMessage} Kripya apna zaroori sandesh batayein.`,
      emotion: 'calm',
      announcedAsAi: true,
    });
  }
});

// In-memory circuit breaker to prevent repeated 429 errors when Free Tier TTS daily quota is reached
let ttsQuotaExhaustedUntil = 0;

// Gemini TTS endpoint for natural, expressive Hindi, Hinglish and English speech audio
app.post('/api/tts', async (req, res) => {
  try {
    const { text, archetype, voiceName, style, speakingStyle } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'API key not configured for server-side TTS' });
    }

    // Circuit breaker: If quota limit was reached on the free tier, immediately tell client to use device synthesis
    if (Date.now() < ttsQuotaExhaustedUntil) {
      const waitSeconds = Math.max(1, Math.ceil((ttsQuotaExhaustedUntil - Date.now()) / 1000));
      return res.json({
        fallback: true,
        quotaExhausted: true,
        retryAfterSec: waitSeconds,
        message: 'Cloud TTS rate limit reached on Free Tier. Seamlessly utilizing on-device speech engine.',
      });
    }

    // Archetype voice mapping for Gemini 3.8 TTS prebuilt voices
    const ARCHETYPE_CONFIGS: Record<string, { voice: string; defaultStyle: string }> = {
      natural_female: { voice: 'Kore', defaultStyle: 'Natural, balanced, expressive everyday conversational tone' },
      warm_female: { voice: 'Kore', defaultStyle: 'Warm, caring, friendly and soothing companion tone' },
      friendly_female: { voice: 'Zephyr', defaultStyle: 'Friendly, upbeat, cheerful and lively tone' },
      professional_female: { voice: 'Kore', defaultStyle: 'Crisp, articulate, polite and executive assistant tone' },
      soft_female: { voice: 'Kore', defaultStyle: 'Gentle, calm, peaceful and soft tone' },
      natural_male: { voice: 'Puck', defaultStyle: 'Natural, clear, everyday conversational male tone' },
      deep_male: { voice: 'Fenrir', defaultStyle: 'Deep, resonant, baritone, calm Stark JARVIS assistant tone' },
      friendly_male: { voice: 'Puck', defaultStyle: 'Friendly, casual, enthusiastic and supportive tone' },
      professional_male: { voice: 'Charon', defaultStyle: 'Professional, polished, dignified and composed executive tone' },
    };

    const validPrebuilt = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
    let targetVoice = 'Kore';
    let targetStyle = 'Warm, natural, expressive tone for personal AI assistant J. A. R. V. I. S.';

    if (archetype && ARCHETYPE_CONFIGS[archetype]) {
      targetVoice = ARCHETYPE_CONFIGS[archetype].voice;
      targetStyle = ARCHETYPE_CONFIGS[archetype].defaultStyle;
    }

    if (voiceName && validPrebuilt.includes(voiceName)) {
      targetVoice = voiceName;
    }

    if (style && typeof style === 'string') {
      targetStyle = `${targetStyle}. ${style}`;
    }

    if (speakingStyle) {
      const styleModifiers: Record<string, string> = {
        conversational: 'Casual, conversational and friendly pace',
        executive: 'Crisp, formal and articulate executive pace',
        warm: 'Gentle, comforting and empathetic pace',
        enthusiastic: 'Energetic, confident and upbeat pace',
        calm: 'Serene, slow and calm pace',
      };
      if (styleModifiers[speakingStyle]) {
        targetStyle = `${targetStyle}. ${styleModifiers[speakingStyle]}`;
      }
    }

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text,
              speechMetadata: {
                style: targetStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: targetVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({ fallback: true, error: 'No audio returned from Gemini TTS' });
    }

    return res.json({
      audioBase64: base64Audio,
      format: 'audio/wav',
      voiceName: targetVoice,
      archetype: archetype || 'natural_female',
    });
  } catch (err: any) {
    const errMsg = err?.message || '';
    const errStatus = err?.status || err?.code || (err?.error && err?.error?.code);
    const isRateLimit =
      errStatus === 429 ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('429') ||
      errMsg.includes('quota');

    if (isRateLimit) {
      // Cooldown for 1 hour to avoid repeated errors when daily free quota limit (10 calls/day) is reached
      ttsQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
      console.warn('Gemini Cloud TTS Free Tier quota limit reached (10 req/day). Falling back seamlessly to on-device speech synthesis.');
      return res.json({
        fallback: true,
        quotaExhausted: true,
        retryAfterSec: 3600,
        message: 'Cloud TTS Free Tier quota limit reached (10 req/day). Seamlessly using on-device synthesis.',
      });
    }

    console.warn('TTS non-fatal generation notice:', err?.message || err);
    return res.json({
      fallback: true,
      error: 'TTS generation unavailable',
      message: err?.message || 'Service unavailable',
    });
  }
});

// Health check endpoint for Cloud Run and monitoring
app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'ok',
    app: 'J. A. R. V. I. S.',
    owner: 'Ganesh',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
  });
});

// Helper to build live synced project snapshot (never exposes secrets or keys)
function buildLiveChatGptSyncSnapshot() {
  const safeListDir = (relDir: string): string[] => {
    try {
      const fullPath = path.join(__dirname, relDir);
      if (!fs.existsSync(fullPath)) return [];
      return fs.readdirSync(fullPath).sort();
    } catch {
      return [];
    }
  };

  let appVersion = '3.9.0';
  try {
    const pkgRaw = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    if (pkg?.version && pkg.version !== '0.0.0') appVersion = pkg.version;
  } catch {
    // keep default version
  }

  const filesCheck = {
    githubApkWorkflow: fs.existsSync(path.join(__dirname, '.github/workflows/build-apk.yml')),
    androidGradleApp: fs.existsSync(path.join(__dirname, 'android/app/build.gradle')),
    androidManifest: fs.existsSync(path.join(__dirname, 'android/app/src/main/AndroidManifest.xml')),
    androidMainActivity: fs.existsSync(path.join(__dirname, 'android/app/src/main/java/com/jarvis/assistant/MainActivity.kt')),
    androidCallBridge: fs.existsSync(path.join(__dirname, 'android/app/src/main/java/com/jarvis/assistant/JarvisCallBridge.kt')),
    chatgptOpenApi: fs.existsSync(path.join(__dirname, '.chatgpt/openapi.json')),
    chatgptInstructions: fs.existsSync(path.join(__dirname, '.chatgpt/gpt-instructions.md')),
  };

  const components = safeListDir('src/components');
  const services = safeListDir('src/services');
  const androidFiles = safeListDir('android/app/src/main/java/com/jarvis/assistant');

  return {
    syncedAt: new Date().toISOString(),
    app: 'J. A. R. V. I. S.',
    owner: 'Ganesh',
    version: appVersion,
    androidPackage: 'com.jarvis.assistant',
    liveUrl: 'https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app',
    exportZipUrl: 'https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/api/export-project',
    openApiSchemaUrl: 'https://ais-pre-xsafuprqcc57kic2r7ipzj-985987988481.asia-southeast1.run.app/chatgpt/openapi.json',
    githubWorkflowReady: filesCheck.githubApkWorkflow,
    androidProjectReady: filesCheck.androidGradleApp && filesCheck.androidManifest && filesCheck.androidMainActivity,
    chatgptSyncReady: filesCheck.chatgptOpenApi && filesCheck.chatgptInstructions,
    filesCheck,
    components,
    services,
    androidFiles,
    endpoints: [
      'GET /api/health',
      'GET /api/export-project',
      'POST /api/assistant/chat',
      'POST /api/assistant/vision',
      'POST /api/assistant/call-reply',
      'POST /api/assistant/tts',
      'GET /chatgpt/openapi.json',
      'GET /api/chatgpt/sync',
      'GET /api/chatgpt/instructions',
      'GET /api/chatgpt/help',
      'POST /api/chatgpt/help',
    ],
    features: [
      'Circular Stark Holographic HUD ("JARVIS" core + "Hey JARVIS" activation + "JARVIS close")',
      'Voice Studio (Custom recorded/uploaded voice + built-in voices with persistent storage)',
      'Smart Camera Live Vision & AI Girlfriend Companion Personality',
      'Authorized AI Call Assistant + "JARVIS, mujhe baat karni hai" instant human handoff',
      'Touch & Motion Anti-Theft Guard + Voice/Face Owner Biometrics',
      'Emergency SOS Hub + Smart Devices + Apps Launcher + Alarms',
      'GitHub Actions Cloud Android APK Builder (.github/workflows/build-apk.yml)',
      'ChatGPT Live Sync, OpenAPI Actions & Build Help Bridge (.chatgpt/)',
    ],
  };
}

// CORS middleware for ChatGPT Actions and browser sync verification
app.use(['/chatgpt', '/api/chatgpt', '/api/health'], (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Serve OpenAPI 3.1.0 schema for ChatGPT Custom GPT Actions
app.get(['/chatgpt/openapi.json', '/api/chatgpt/openapi.json'], (_req, res) => {
  try {
    const schemaPath = path.join(__dirname, '.chatgpt', 'openapi.json');
    if (fs.existsSync(schemaPath)) {
      res.setHeader('Content-Type', 'application/json');
      return res.sendFile(schemaPath);
    }
    return res.status(404).json({ error: 'OpenAPI schema not found' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to serve OpenAPI schema', message: err?.message });
  }
});

// Live project sync & context endpoint for ChatGPT Actions and in-app ChatGPT Sync tab
app.get(['/api/chatgpt/sync', '/api/chatgpt/context'], (_req, res) => {
  return res.json(buildLiveChatGptSyncSnapshot());
});

// Serve latest Custom GPT instructions with live synced summary
app.get('/api/chatgpt/instructions', (_req, res) => {
  try {
    const instructionsPath = path.join(__dirname, '.chatgpt', 'gpt-instructions.md');
    const instructions = fs.existsSync(instructionsPath)
      ? fs.readFileSync(instructionsPath, 'utf-8')
      : 'J. A. R. V. I. S. Build & Help Companion Instructions';
    const snapshot = buildLiveChatGptSyncSnapshot();
    return res.json({
      syncedAt: snapshot.syncedAt,
      instructions,
      openApiSchemaUrl: snapshot.openApiSchemaUrl,
      syncEndpointUrl: `${snapshot.liveUrl}/api/chatgpt/sync`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load ChatGPT instructions', message: err?.message });
  }
});

const CHATGPT_HELP_TOPICS: Record<string, { title: string; steps: string[]; notes: string[] }> = {
  'github-apk': {
    title: 'Mobile Par GitHub Se .APK Build Kaise Karein',
    steps: [
      '1. Project ZIP (/api/export-project) download karke phone me extract karein.',
      '2. github.com par naya repo banayein aur saari files (including .github/workflows/build-apk.yml aur android/) upload karein.',
      '3. GitHub Repo -> Actions tab me jayein -> "Build JARVIS Android APK" -> "Run workflow" tap karein.',
      '4. 2-3 minute me build green hone par Artifacts -> JARVIS-Android-APK download karke app-debug.apk install karein.',
    ],
    notes: [
      'Agar aap web upload use kar rahe hain to dhyaan rakhein hidden ".github" folder bhi repo me upload ho.',
      'Gradle 8.7 aur Java 17 cloud runner par automatic setup hota hai.',
    ],
  },
  'gradle-error': {
    title: 'Common GitHub Actions / Gradle Build Fixes',
    steps: [
      '1. Namespace error: AndroidManifest.xml me "package=com.jarvis.assistant" na lagayein kyunki build.gradle me namespace pehle se set hai.',
      '2. Theme crash: MainActivity AppCompatActivity use karta hai, isliye AndroidManifest me @style/Theme.Jarvis (Theme.AppCompat.NoActionBar) zaroori hai.',
      '3. Missing dist assets: Workflow pehle "npm install && npm run build" chalakar dist/* ko android/app/src/main/assets/dist/ me copy karta hai.',
      '4. Agar koi naya Gradle error aaye to GitHub Actions log copy karke ChatGPT Sync prompt me paste karein.',
    ],
    notes: [
      'Target SDK 34, Min SDK 26, AGP 8.3.2, Kotlin 1.9.24 configured hai.',
    ],
  },
  'chatgpt-connect': {
    title: 'ChatGPT Aur J. A. R. V. I. S. Project Sync Setup',
    steps: [
      '1. Free ChatGPT Mobile App ke liye: App me "Copy ChatGPT Sync Prompt" tap karein aur ChatGPT app me paste karein.',
      '2. Custom GPT Actions ke liye: chatgpt.com/gpts/editor me Create a GPT -> Actions -> Import from URL me /chatgpt/openapi.json URL dalein.',
      '3. Custom GPT Instructions me .chatgpt/gpt-instructions.md paste karein aur Authentication "None" rakhein.',
      '4. Sync hone par ChatGPT live /api/chatgpt/sync aur /api/chatgpt/help se latest project state read kar sakta hai.',
    ],
    notes: [
      'Sync endpoint koi API key, password ya private audio expose nahi karta.',
    ],
  },
  'android-permissions': {
    title: 'Vivo / Android Phone Permissions & Background Setup',
    steps: [
      '1. APK install ke baad Microphone, Camera, Location aur Phone Call permissions allow karein.',
      '2. Battery Settings me J. A. R. V. I. S. ko "Unrestricted / Don\'t optimize" par set karein.',
      '3. AI Call Assistant ke liye Android Settings -> Default Apps -> Phone App me J. A. R. V. I. S. authorize karein.',
    ],
    notes: [
      'Browser mode me background wake-word sirf tab open hone par chalta hai; full service ke liye APK install karein.',
    ],
  },
  all: {
    title: 'J. A. R. V. I. S. Complete Build, GitHub & ChatGPT Sync Overview',
    steps: [
      'GitHub Cloud APK: .github/workflows/build-apk.yml automatically app-debug.apk compile karta hai.',
      'ChatGPT Sync: /api/chatgpt/sync aur /chatgpt/openapi.json live project architecture & help serve karte hain.',
      'Hybrid APK WebView: Online hone par live Cloud Run AI backend load hota hai, offline par bundled dist/ fallback.',
    ],
    notes: [
      'Har naya update Roman Hindi (Hinglish) me aur existing features preserve karte hue add karein.',
    ],
  },
};

// Build & troubleshooting help endpoint for ChatGPT Actions and in-app help UI
app.get('/api/chatgpt/help', (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic : 'all';
  const entry = CHATGPT_HELP_TOPICS[topic] || CHATGPT_HELP_TOPICS.all;
  return res.json({
    topic,
    ...entry,
    syncedAt: new Date().toISOString(),
  });
});

app.post('/api/chatgpt/help', async (req, res) => {
  try {
    const { question, topic = 'all' } = req.body || {};
    if (!question || typeof question !== 'string') {
      const entry = CHATGPT_HELP_TOPICS[topic] || CHATGPT_HELP_TOPICS.all;
      return res.json({
        topic,
        answer: `${entry.title}: ${entry.steps.join(' ')}`,
        source: 'local-knowledge-base',
      });
    }

    const snapshot = buildLiveChatGptSyncSnapshot();
    const fallbackEntry = CHATGPT_HELP_TOPICS[topic] || CHATGPT_HELP_TOPICS.all;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        topic,
        answer: `${fallbackEntry.title}\n${fallbackEntry.steps.join('\n')}`,
        source: 'local-knowledge-base',
      });
    }

    const helpPrompt = `
You are the J. A. R. V. I. S. Build & Help Companion helping Ganesh on mobile.
Answer strictly in Romanized Hindi (Hinglish) or simple English (NO Devanagari script).
Live synced project snapshot:
- App: ${snapshot.app} v${snapshot.version}
- Android Package: ${snapshot.androidPackage}
- GitHub Workflow Ready: ${snapshot.githubWorkflowReady}
- Android Project Ready: ${snapshot.androidProjectReady}
- Components (${snapshot.components.length}): ${snapshot.components.join(', ')}
- Services (${snapshot.services.length}): ${snapshot.services.join(', ')}
- Live URL: ${snapshot.liveUrl}

User question: "${question}"
Provide concise, accurate, step-by-step troubleshooting or setup guidance. Never expose secrets or invent fake capabilities.
`;

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: helpPrompt }] }] as any,
      config: { temperature: 0.25 },
    });

    const answer = response.text?.trim() || `${fallbackEntry.title}\n${fallbackEntry.steps.join('\n')}`;
    return res.json({
      topic,
      answer,
      source: 'synced-project-ai',
    });
  } catch (err: any) {
    const fallbackEntry = CHATGPT_HELP_TOPICS.all;
    return res.json({
      topic: 'all',
      answer: `${fallbackEntry.title}\n${fallbackEntry.steps.join('\n')}`,
      source: 'local-fallback',
      note: err?.message || 'Fallback used',
    });
  }
});

// ZIP export endpoint to download full project
app.get('/api/export-project', (_req, res) => {
  try {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    res.attachment('j-a-r-v-i-s-assistant-project.zip');
    res.setHeader('Content-Type', 'application/zip');

    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create zip archive' });
      }
    });

    archive.pipe(res);

    archive.glob('**/*', {
      cwd: __dirname,
      ignore: ['node_modules/**', '.git/**', 'dist/**', '.aistudio/**', '*.zip'],
      dot: true,
    });

    archive.finalize();
  } catch (err: any) {
    console.error('Export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed', message: err?.message });
    }
  }
});

// Development vs Production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.FORCE_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Resolve dist folder correctly whether running from root or child directory
    const distPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
      ? path.join(__dirname, 'dist')
      : path.join(__dirname);

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`J. A. R. V. I. S. server listening on port ${PORT}`);
  });
}

startServer();
