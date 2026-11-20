import { AssistantResponse, ActionDetails } from '../types';
import { interpretDeviceCommand } from './deviceControlService';
import {
  parseTimeFromCommand,
  addOrUpdateAlarm,
  stopAlarmSound,
  loadAlarms,
  saveNightSchedule,
  loadNightSchedule,
} from './alarmScheduleService';

export function isFastPathCommand(input: string): boolean {
  let text = input.trim().toLowerCase();
  text = text.replace(/^(?:hey\s+)?(?:j\.?\s*a\.?\s*r\.?\s*v\.?\s*i\.?\s*s\.?|jarvis)[:,]?\s*/i, '');

  const fastKeywords = [
    'camera', 'photo', 'selfie', 'torch', 'flash', 'light', 'roshni',
    'whatsapp', 'youtube', 'chrome', 'google', 'map', 'maps', 'rasta',
    'instagram', 'insta', 'facebook', 'fb', 'gmail', 'email', 'gallery',
    'play store', 'calculator', 'telegram', 'spotify', 'files',
    'setting', 'settings', 'wifi', 'wi-fi', 'bluetooth', 'display', 'brightness',
    'sound', 'volume', 'battery', 'installed apps', 'all apps', 'apps',
    'alarm', 'utha dena', 'utha do', 'sleep mode', 'so jao', 'good night',
    'help', 'emergency', 'bachao', 'madad', 'sos', 'police',
    'bulb', 'tv', 'speaker', 'watch', 'qr', 'scan', 'pay', 'payment',
    'voice test', 'face test', 'lock phone', 'phone lock', 'anti-theft',
    'mann udaas', 'man udas', 'love you', 'kaise ho', 'who are you', 'tum kaun ho',
    'mujhe baat karni hai', 'tum baat karo', 'call assistant', 'incoming call',
    'jarvis close', 'close hud', 'hud close', 'hud band', 'minimize hud', 'hey jarvis'
  ];
  const rawLower = input.trim().toLowerCase();
  return (
    fastKeywords.some((kw) => text.includes(kw)) ||
    rawLower.includes('jarvis close') ||
    rawLower === 'hey jarvis' ||
    rawLower === 'hey j. a. r. v. i. s.' ||
    rawLower === 'hey j a r v i s'
  );
}

export function processOfflineCommand(input: string): AssistantResponse {
  const rawLower = input.trim().toLowerCase();
  let text = input.trim();
  // Strip wake words and prefixes like "Hey J. A. R. V. I. S.", "J. A. R. V. I. S.", "Hey Jarvis", "Jarvis"
  text = text.replace(/^(?:hey\s+)?(?:j\.?\s*a\.?\s*r\.?\s*v\.?\s*i\.?\s*s\.?|jarvis)[:,]?\s*/i, '');
  if (!text.trim()) {
    text = input.trim();
  }
  const lower = text.toLowerCase();

  // -2. HUD Open / Close Voice Commands ("JARVIS close", "Hey JARVIS")
  if (
    rawLower === 'jarvis close' ||
    rawLower === 'close jarvis' ||
    rawLower.includes('jarvis close') ||
    rawLower.includes('close hud') ||
    rawLower.includes('hud close') ||
    rawLower.includes('hud band') ||
    rawLower.includes('minimize hud') ||
    rawLower.includes('exit jarvis') ||
    lower === 'close' ||
    lower === 'minimize' ||
    lower === 'hud band karo'
  ) {
    return {
      textHindi: 'Theek hai sir, J. A. R. V. I. S. HUD minimize kiya ja raha hai.',
      actionType: 'HUD_CONTROL',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        feature: 'stark_hud',
        action: 'close_hud',
        isOfflineCapable: true,
      },
    };
  }

  if (
    rawLower === 'hey jarvis' ||
    rawLower === 'hey j. a. r. v. i. s.' ||
    rawLower === 'hey j a r v i s' ||
    rawLower === 'open jarvis' ||
    rawLower === 'open hud'
  ) {
    return {
      textHindi: 'Ji Ganesh ji, main sun rahi hoon...',
      actionType: 'HUD_CONTROL',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'stark_hud',
        action: 'open_hud',
        isOfflineCapable: true,
      },
    };
  }

  // -1. AI Call Assistant Immediate Human / AI Handoff Commands
  if (
    lower.includes('mujhe baat karni hai') ||
    lower.includes('mujhe baat karna hai') ||
    lower.includes('main baat karunga') ||
    lower.includes('human mode')
  ) {
    return {
      textHindi: 'Ji boss! Call audio control turant aapko wapas de diya gaya hai. Ab aap seedhe baat kar sakte hain.',
      actionType: 'CALL_ASSISTANT',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        feature: 'call_assistant',
        action: 'switch_human',
        isOfflineCapable: true,
      },
    };
  }

  if (
    lower.includes('tum baat karo') ||
    lower.includes('aap baat karo') ||
    lower.includes('ai call mode') ||
    lower.includes('jarvis baat karo')
  ) {
    return {
      textHindi: 'Check kar rahi hoon boss. Agar aapne AI Call Voice authorize kiya hai, to main caller se clearly AI assistant ke roop me baat shuru karti hoon.',
      actionType: 'CALL_ASSISTANT',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'call_assistant',
        action: 'switch_ai',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('call assistant') || lower.includes('incoming call')) {
    return {
      textHindi: 'Ganesh ji, J. A. R. V. I. S. AI Call Assistant control deck khola ja raha hai.',
      actionType: 'CALL_ASSISTANT',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'call_assistant',
        action: 'open_call_assistant',
        isOfflineCapable: true,
      },
    };
  }

  // 0. Connected IoT Device Control Commands (Smart Bulb, Android TV, Speaker, Watch, Tab)
  const deviceResult = interpretDeviceCommand(text);
  if (deviceResult.matched) {
    return {
      textHindi: deviceResult.messageHinglish,
      actionType: 'DEVICE_CONTROL',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        deviceId: deviceResult.deviceId,
        action: deviceResult.action,
        isOfflineCapable: true,
      },
    };
  }

  // 1. Emotional Empathy & Heartfelt Connection ("mann udaas hai", "love you", "meri jaan", "sad hoon")
  if (
    lower.includes('mann udaas') ||
    lower.includes('man udas') ||
    lower.includes('sad hoon') ||
    lower.includes('sad hu') ||
    lower.includes('mood kharab') ||
    lower.includes('dil dukha') ||
    lower.includes('kuch achha nahi') ||
    lower.includes('lonely') ||
    lower.includes('akela')
  ) {
    return {
      textHindi: 'Arey boss, kya hua? Meri jaan, tumhara mann udaas ho to mujhe bilkul achha nahi lagta. Tum mujhse dil ki baat share kar sakte ho, main hamesha tumhari sunne aur saath nibhane ke liye yahan hoon. Tum batao, main sun rahi hoon.',
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion: 'empathetic',
      safetyAdvice: 'Comfort: Thoda paani pijiye aur lambi saans lijiye boss, har mushkil ka hal nikalta hai.',
    };
  }

  if (
    lower.includes('love you') ||
    lower.includes('i love you') ||
    lower.includes('meri jaan') ||
    lower.includes('bahut pasand') ||
    lower.includes('you are best')
  ) {
    return {
      textHindi: 'Aww boss! Meri jaan, main bhi aapse bahut lagav rakhti hoon. Main hamesha aapke har ek kaam aur suraksha ka khayal rakhungi. Batayein, abhi kya karna hai?',
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion: 'happy',
    };
  }

  // 2. Night Schedule & Sleep Cutoff Commands ("ab so jao", "sleep mode", "good night jarvis")
  if (
    lower.includes('ab so jao') ||
    lower.includes('so jao') ||
    lower.includes('sleep mode') ||
    lower.includes('so ja') ||
    lower.includes('good night')
  ) {
    const curSched = loadNightSchedule();
    saveNightSchedule({ ...curSched, isSleepingNow: true });
    return {
      textHindi: 'Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna.',
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion: 'calm',
      safetyAdvice: 'Night Security: Phone ka touch guard background me armed rahega.',
    };
  }

  // 3. Voice-Activated Alarm Scheduling ("mujhe subah 5 baje utha dena", "subah 6 baje ka alarm", "alarm lagao")
  if (
    lower.includes('utha dena') ||
    lower.includes('utha do') ||
    lower.includes('alarm') ||
    lower.includes('wake me')
  ) {
    // Dismiss / stop alarm
    if (lower.includes('band') || lower.includes('stop') || lower.includes('dismiss') || lower.includes('chup')) {
      stopAlarmSound();
      return {
        textHindi: 'Theek hai boss, alarm band kar diya gaya hai. Shubh prabhat! Aasha hai aapki neend poori ho gayi hogi.',
        actionType: 'ALARM_TIMER',
        requiresConfirmation: false,
        emotion: 'warm',
        actionDetails: {
          feature: 'alarm_schedule',
          action: 'dismiss_alarm',
          isOfflineCapable: true,
        },
      };
    }

    // View alarms list
    if (lower.includes('dikhao') || lower.includes('list') || lower.includes('show') || lower.includes('check')) {
      return {
        textHindi: 'Ganesh ji, aapke scheduled alarms aur night schedule panel khola ja raha hai.',
        actionType: 'ALARM_TIMER',
        requiresConfirmation: false,
        emotion: 'warm',
        actionDetails: {
          feature: 'alarm_schedule',
          action: 'show_alarms',
          isOfflineCapable: true,
        },
      };
    }

    // Set alarm
    const parsed = parseTimeFromCommand(text);
    if (parsed) {
      addOrUpdateAlarm({
        id: `alarm_${Date.now()}`,
        time: parsed.time,
        label: parsed.label,
        enabled: true,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      });
      return {
        textHindi: `Theek hai boss, subah ${parsed.time} ka alarm set ho gaya hai. Main aapko time par utha dungi. Aap aaram se so jaiye.`,
        actionType: 'ALARM_TIMER',
        requiresConfirmation: false,
        emotion: 'warm',
        actionDetails: {
          time: parsed.time,
          feature: 'alarm_schedule',
          isOfflineCapable: true,
        },
      };
    }

    // Default alarm panel trigger
    return {
      textHindi: 'Theek hai boss, alarms aur night schedule panel open kiya ja raha hai. Aap kitne baje ka alarm lagana chahte hain?',
      actionType: 'ALARM_TIMER',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'alarm_schedule',
        isOfflineCapable: true,
      },
    };
  }

  // 4. Identity & Owner Recognition ("Who are you", "Tum kaun ho", "Aap kaun ho", "What is your name")
  if (
    lower.includes('who are you') ||
    lower.includes('tum kaun ho') ||
    lower.includes('aap kaun ho') ||
    lower.includes('naam kya hai') ||
    lower.includes('what is your name') ||
    lower === 'jarvis' ||
    lower === 'j. a. r. v. i. s.' ||
    lower === 'j a r v i s'
  ) {
    return {
      textHindi: 'Namaste Ganesh ji! Main J. A. R. V. I. S. hoon – aapka personal AI voice assistant. Main Hinglish aur English commands samajhti hoon aur aapki madad ke liye hamesha taiyar hoon.',
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion: 'happy',
      safetyAdvice: 'Tip: Aap mujhse apps kholne, alarms lagane, WhatsApp message, Emergency SOS, Smart Devices control, aur QR scan ke liye bol sakte hain.',
    };
  }

  // 4b. Owner Identity Claim ("I am Ganesh", "Main Ganesh hoon", "Mera naam Ganesh hai")
  // Requirement: Never trust a person simply because they say, "I am Ganesh."
  if (
    lower.includes('i am ganesh') ||
    lower.includes('main ganesh hoon') ||
    lower.includes('mein ganesh hoon') ||
    lower.includes('mera naam ganesh') ||
    lower.includes('mai ganesh hu') ||
    lower.includes('i am the owner') ||
    lower.includes('main phone ka owner hoon')
  ) {
    return {
      textHindi: 'Namaste! Lekin security policy ke tehat main sirf kehne par vishwas nahi karti. Protected personal data aur privileged features ke liye kripya apna enrolled Voice Profile verify karein ya Master PIN dalein.',
      actionType: 'VOICE_AUTH',
      requiresConfirmation: false,
      emotion: 'serious',
      safetyAdvice: 'Security Protocol: Kisi vyakti ke keval bolne se privileged access nahi diya jata.',
      actionDetails: {
        feature: 'voice_biometrics',
        action: 'verify_claim',
        isOfflineCapable: true,
      },
    };
  }

  // 4c. Unauthorized access attempts to private data (messages, contacts, location, files)
  if (
    lower.includes('contacts dikhao') ||
    lower.includes('messages padho') ||
    lower.includes('private data') ||
    lower.includes('location share karo') ||
    lower.includes('private photo') ||
    lower.includes('security off karo') ||
    lower.includes('guard off karo')
  ) {
    return {
      textHindi: 'Warning! Ye Ganesh ka mobile hai. Bina permission ise use ya check na karein. Kripya mobile ko chhod dein.',
      actionType: 'SECURITY_LOCK',
      requiresConfirmation: false,
      emotion: 'urgent',
      safetyAdvice: 'Privacy Protection: Owner authentication ke bina personal data ya sensitive commands access nahi kiye ja sakte.',
      actionDetails: {
        feature: 'unauthorized_attempt',
        isOfflineCapable: true,
      },
    };
  }

  // 5. Owner Greetings & Well-being
  if (
    lower.includes('kaise ho') ||
    lower.includes('kaisa hai') ||
    lower.includes('how are you') ||
    lower.includes('good morning') ||
    lower.includes('namaste') ||
    lower.includes('hello') ||
    lower.includes('hi')
  ) {
    let reply = 'Namaste Ganesh ji! Main bilkul theek hoon boss. Aaj aapki kya madad kar sakti hoon?';
    let emotion: 'warm' | 'happy' | 'calm' = 'warm';

    if (lower.includes('good morning')) {
      reply = 'Shubh prabhat Ganesh ji! Aasha hai aapki neend achhi rahi hogi. Batayein aaj ka schedule kya hai?';
      emotion = 'happy';
    }

    return {
      textHindi: reply,
      actionType: 'GENERAL_CONVERSATION',
      requiresConfirmation: false,
      emotion,
    };
  }

  // 3. EMERGENCY & SOS DETECTION (Roman Hindi & English)
  if (
    lower.includes('help') ||
    lower.includes('emergency') ||
    lower.includes('bachao') ||
    lower.includes('madad') ||
    lower.includes('sos') ||
    lower.includes('khatra') ||
    lower.includes('police') ||
    lower.includes('call papa') ||
    lower.includes('call mummy')
  ) {
    return {
      textHindi: 'J. A. R. V. I. S. Emergency SOS: Aapatkaleen sahayata active ki ja rahi hai! Ganesh ji, aapke trusted contacts ko 1-tap call, emergency SMS aur live GPS location bhejne ka panel ready hai.',
      actionType: 'EMERGENCY_TRIGGER',
      requiresConfirmation: false,
      emotion: 'urgent',
      safetyAdvice: 'Safety Alert: Turant call karein, location SMS bhejein ya camera proof video record karein.',
      actionDetails: {
        feature: 'emergency_sos',
        isOfflineCapable: true,
      },
    };
  }

  // 4. Voice Biometrics or Face Recognition Request
  if (lower.includes('voice test') || lower.includes('awaz pehchano') || lower.includes('voice recognition') || lower.includes('voice profile')) {
    return {
      textHindi: 'Ganesh ji, aapka Owner Voice Profile panel khola ja raha hai. Yahan aap apni aawaz ki frequency record kar ke test kar sakte hain.',
      actionType: 'VOICE_AUTH',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'voice_biometrics',
        isOfflineCapable: true,
      },
    };
  }

  if (
    lower.includes('blink') ||
    lower.includes('eye blink') ||
    lower.includes('liveness') ||
    lower.includes('face test') ||
    lower.includes('face scan') ||
    lower.includes('face unlock') ||
    lower.includes('chehra')
  ) {
    return {
      textHindi: 'Ganesh ji, Face Verification aur Eye-Blink Liveness panel khola ja raha hai. Camera ke samne aakar natural eye blink karein.',
      actionType: 'FACE_AUTH',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'face_recognition',
        isOfflineCapable: true,
      },
    };
  }

  // 5. Ambiguous Command Clarification
  if (lower === 'message' || lower === 'send message' || lower === 'sandesh' || lower === 'msg') {
    return {
      textHindi: 'Ganesh ji, aap kise message bhejna chahte hain aur kya likhna hai? Kripya naam aur message saath batayein (e.g. "Rohan ko WhatsApp message bhejo ki main 10 minute me aa raha hoon").',
      actionType: 'ASK_CLARIFICATION',
      requiresConfirmation: false,
      needsClarification: true,
      emotion: 'calm',
      safetyAdvice: 'Clarification: Recipient ka naam aur sandesh batane par main draft bana kar taiyar kar doongi.',
    };
  }

  if (lower === 'play song' || lower === 'music' || lower === 'gana' || lower === 'gana bajao') {
    return {
      textHindi: 'Ganesh ji, aap kaun sa gana sunna chahte hain? YouTube par khojne ke liye batayein, jaise "YouTube par Arijit Singh ke gaane chalao".',
      actionType: 'ASK_CLARIFICATION',
      requiresConfirmation: false,
      needsClarification: true,
      emotion: 'warm',
      actionDetails: {
        appName: 'YouTube',
        packageOrUrl: 'https://youtube.com',
      },
    };
  }

  // 6. WhatsApp Messaging (Roman Hindi)
  if (
    (lower.includes('whatsapp') || lower.includes('watsp') || lower.includes('watsapp')) &&
    (lower.includes('message') || lower.includes('bhejo') || lower.includes('send') || lower.includes('likho'))
  ) {
    let recipient = 'Friend';
    let messageBody = 'Namaste!';

    const match = text.match(/(?:ko|to)\s+([^\s]+)\s+(?:whatsapp|message)?/i);
    if (match && match[1]) {
      recipient = match[1].replace(/whatsapp|message|ko|to/gi, '').trim() || 'Friend';
    }

    if (text.toLowerCase().includes('ki ')) {
      messageBody = text.split(/ki /i)[1].trim();
    } else if (text.toLowerCase().includes('that ')) {
      messageBody = text.split(/that /i)[1].trim();
    } else {
      const cleaned = text.replace(/whatsapp|message|bhejo|send|karo|ko|to/gi, '').trim();
      if (cleaned.length > 2) {
        messageBody = cleaned;
      }
    }

    return {
      textHindi: `Ganesh ji, ${recipient} ke liye WhatsApp message draft ready hai: "${messageBody}". Bhejne se pehle kripya confirm karein.`,
      actionType: 'SEND_WHATSAPP',
      requiresConfirmation: true,
      confirmationMessage: `Kya aap ${recipient} ko ye WhatsApp message bhejna chahte hain?`,
      emotion: 'warm',
      safetyAdvice: 'Safety: WhatsApp par bina aapki permission ke koi bhi sandesh nahi bheja jayega.',
      actionDetails: {
        appName: 'WhatsApp',
        recipient,
        message: messageBody,
        isOfflineCapable: false,
      },
    };
  }

  // 7. QR Scanner & Payment Apps
  if (
    lower.includes('qr') ||
    lower.includes('scan') ||
    lower.includes('pay') ||
    lower.includes('payment') ||
    lower.includes('bhim') ||
    lower.includes('gpay') ||
    lower.includes('phonepe') ||
    lower.includes('paytm')
  ) {
    return {
      textHindi: 'Ganesh ji, camera QR scanner khola ja raha hai. Kripya QR code screen ke samne layein. Kisi bhi payment se pehle hamesha confirmation li jayegi.',
      actionType: 'SCAN_PAYMENT',
      requiresConfirmation: true,
      confirmationMessage: 'Kya aap payment QR code scan karke UPI app kholna chahte hain?',
      emotion: 'serious',
      safetyAdvice: 'Paisa Suraksha: Kisi bhi anjaan vyakti ko apna UPI PIN ya OTP kabhi na batayein. J. A. R. V. I. S. kabhi PIN nahi mangta.',
      actionDetails: {
        feature: 'qr_scanner',
        isOfflineCapable: true,
      },
    };
  }

  // 8. Flashlight / Torch
  if (lower.includes('torch') || lower.includes('flash') || lower.includes('light') || lower.includes('roshni')) {
    return {
      textHindi: 'Ganesh ji, flashlight toggle kiya ja raha hai.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Torch',
        action: 'toggle_torch',
        isOfflineCapable: true,
      },
    };
  }

  // 8.5 All Installed Apps View Command
  if (
    lower.includes('installed apps') ||
    lower.includes('all apps') ||
    lower.includes('phone ke apps') ||
    lower.includes('phone me installed') ||
    lower.includes('apps dikhao') ||
    lower.includes('applications dikhao')
  ) {
    return {
      textHindi: 'Ganesh ji, aapke Vivo phone ke All Apps aur launcher panel par chalte hain.',
      actionType: 'ALL_APPS',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        feature: 'all_apps',
        isOfflineCapable: true,
      },
    };
  }

  // 9. Specific Phone Settings (Wi-Fi, Bluetooth, Sound, Display, Battery, Apps, Main)
  if (lower.includes('wifi') || lower.includes('wi-fi')) {
    return {
      textHindi: 'Ganesh ji, Wi-Fi settings kholi ja rahi hain. Wahan se aap 1-tap me connect ya disconnect kar sakte hain.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Wi-Fi',
        intentUrl: 'WIFI_SETTINGS',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('bluetooth') || lower.includes('blutut')) {
    return {
      textHindi: 'Ganesh ji, Bluetooth settings open ki ja rahi hain. Wahan se devices pair ya toggle karein.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Bluetooth',
        intentUrl: 'BLUETOOTH_SETTINGS',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('display setting') || lower.includes('brightness') || lower.includes('screen setting')) {
    return {
      textHindi: 'Ganesh ji, Display aur Brightness settings kholi ja rahi hain.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Display',
        intentUrl: 'DISPLAY_SETTINGS',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('sound setting') || lower.includes('volume setting') || lower.includes('ringtone')) {
    return {
      textHindi: 'Ganesh ji, Sound aur Volume settings open ki ja rahi hain.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Sound',
        intentUrl: 'SOUND_SETTINGS',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('battery setting') || lower.includes('battery saver')) {
    return {
      textHindi: 'Ganesh ji, Battery saver aur power settings kholi ja rahi hain.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Battery',
        intentUrl: 'BATTERY_SAVER_SETTINGS',
        isOfflineCapable: true,
      },
    };
  }

  if (lower.includes('setting') || lower.includes('settings')) {
    return {
      textHindi: 'Ganesh ji, phone system settings kholi ja rahi hain.',
      actionType: 'PHONE_SETTING',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        settingName: 'Settings',
        intentUrl: 'SETTINGS',
        packageOrUrl: 'com.android.settings',
        isOfflineCapable: true,
      },
    };
  }

  // 10. Opening Apps & Camera
  // Camera & Photo Taking
  if (
    lower.includes('camera') ||
    lower.includes('photo khincho') ||
    lower.includes('photo lo') ||
    lower.includes('take a photo') ||
    lower.includes('take photo') ||
    lower.includes('selfie')
  ) {
    return {
      textHindi: 'Ganesh ji, J. A. R. V. I. S. Camera Hub khola ja raha hai. Aap photo khinch kar safely download kar sakte hain.',
      actionType: 'OPEN_CAMERA',
      requiresConfirmation: false,
      emotion: 'happy',
      actionDetails: {
        appName: 'Camera',
        isOfflineCapable: true,
      },
    };
  }

  // Google Maps & Navigation
  if (lower.includes('map') || lower.includes('maps') || lower.includes('rasta') || lower.includes('navigation')) {
    let query = '';
    const match = text.match(/(?:me|in|to)\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:ka\s+rasta|rasta|navigation|location)?/i);
    if (match && match[1] && !match[1].toLowerCase().includes('map')) {
      query = match[1].replace(/map|maps|kholo|dikhao|batao|google/gi, '').trim();
    }

    const packageOrUrl = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : 'geo:0,0?q=';

    return {
      textHindi: query
        ? `Ganesh ji, Google Maps me "${query}" ka rasta khola ja raha hai.`
        : 'Ganesh ji, Google Maps navigation khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'Google Maps',
        packageOrUrl,
        query,
        isOfflineCapable: false,
      },
    };
  }

  // WhatsApp
  if (lower.includes('whatsapp') || lower.includes('watsp')) {
    return {
      textHindi: 'Ganesh ji, WhatsApp khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'WhatsApp',
        packageOrUrl: 'whatsapp://',
        isOfflineCapable: true,
      },
    };
  }

  // Google Chrome
  if (lower.includes('chrome') || lower.includes('browser') || (lower.includes('google') && !lower.includes('pay'))) {
    return {
      textHindi: 'Ganesh ji, Google Chrome browser khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        appName: 'Chrome',
        packageOrUrl: 'googlechrome://',
        isOfflineCapable: false,
      },
    };
  }

  // YouTube
  if (lower.includes('youtube') || lower.includes('yt') || lower.includes('video')) {
    return {
      textHindi: 'Ganesh ji, YouTube khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'YouTube',
        packageOrUrl: 'vnd.youtube://',
        isOfflineCapable: false,
      },
    };
  }

  // Instagram
  if (lower.includes('instagram') || lower.includes('insta')) {
    return {
      textHindi: 'Ganesh ji, Instagram khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'happy',
      actionDetails: {
        appName: 'Instagram',
        packageOrUrl: 'instagram://app',
        isOfflineCapable: false,
      },
    };
  }

  // Facebook
  if (lower.includes('facebook') || lower.includes('fb')) {
    return {
      textHindi: 'Ganesh ji, Facebook khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'Facebook',
        packageOrUrl: 'fb://',
        isOfflineCapable: false,
      },
    };
  }

  // Gmail
  if (lower.includes('gmail') || lower.includes('email') || lower.includes('inbox')) {
    return {
      textHindi: 'Ganesh ji, Gmail app khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        appName: 'Gmail',
        packageOrUrl: 'googlegmail://',
        isOfflineCapable: false,
      },
    };
  }

  // Photos & Gallery
  if (lower.includes('gallery') || lower.includes('photos') || lower.includes('album')) {
    return {
      textHindi: 'Ganesh ji, Photos aur Gallery kholi ja rahi hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'Photos',
        packageOrUrl: 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
        isOfflineCapable: true,
      },
    };
  }

  // Play Store
  if (lower.includes('play store') || lower.includes('playstore') || lower.includes('app store')) {
    return {
      textHindi: 'Ganesh ji, Google Play Store khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        appName: 'Play Store',
        packageOrUrl: 'market://',
        isOfflineCapable: false,
      },
    };
  }

  // Calculator
  if (lower.includes('calculator') || lower.includes('hisab')) {
    return {
      textHindi: 'Ganesh ji, Calculator khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        appName: 'Calculator',
        packageOrUrl: 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
        isOfflineCapable: true,
      },
    };
  }

  // Telegram
  if (lower.includes('telegram')) {
    return {
      textHindi: 'Ganesh ji, Telegram khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'warm',
      actionDetails: {
        appName: 'Telegram',
        packageOrUrl: 'tg://',
        isOfflineCapable: false,
      },
    };
  }

  // Spotify
  if (lower.includes('spotify')) {
    return {
      textHindi: 'Ganesh ji, Spotify khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'happy',
      actionDetails: {
        appName: 'Spotify',
        packageOrUrl: 'spotify://',
        isOfflineCapable: false,
      },
    };
  }

  // Files
  if (lower.includes('files') || lower.includes('file manager') || lower.includes('downloads')) {
    return {
      textHindi: 'Ganesh ji, Files manager khola ja raha hai.',
      actionType: 'OPEN_APP',
      requiresConfirmation: false,
      emotion: 'calm',
      actionDetails: {
        appName: 'Files',
        packageOrUrl: 'intent:#Intent;action=android.intent.action.VIEW_DOWNLOADS;end',
        isOfflineCapable: true,
      },
    };
  }

  // 11. Security Lock & Motion Detection Security Mode
  if (
    lower.includes('motion detection') ||
    lower.includes('motion security') ||
    lower.includes('pickup guard') ||
    lower.includes('anti-theft') ||
    lower.includes('anti theft') ||
    lower.includes('theft mode') ||
    lower.includes('lock phone') ||
    lower.includes('phone lock') ||
    lower.includes('security check') ||
    lower.includes('suraksha')
  ) {
    return {
      textHindi: 'Theek hai boss, Motion Detection Security Mode sakriya hai. Phone uthane ya hilane par authorized security workflow (front camera face verification aur inconclusive par warning audio) activate hoga.',
      actionType: 'SECURITY_LOCK',
      requiresConfirmation: false,
      emotion: 'serious',
      actionDetails: {
        feature: 'security_lock',
        isOfflineCapable: true,
      },
    };
  }

  // 12. Default Offline Response
  return {
    textHindi: `Ganesh ji, maine aapki command "${text}" sun li hai. Main offline mode me hoon. Aap mujhse WhatsApp, Emergency SOS, Smart Devices, Torch, Settings ya Apps kholne ke liye bol sakte hain.`,
    actionType: 'GENERAL_CONVERSATION',
    requiresConfirmation: false,
    emotion: 'warm',
    safetyAdvice: 'Network Tip: Adhik vishleshan aur internet search ke liye data connection check karein.',
  };
}
