import { AppPermission, PermissionStatus } from '../types';

const STORAGE_KEY = 'vivo_smart_sahayak_permissions_v2';

export const INITIAL_PERMISSIONS: AppPermission[] = [
  {
    id: 'microphone',
    nameHindi: 'Microphone (Aawaz Permission)',
    nameEnglish: 'Microphone Permission',
    purposeHindi: 'Aapki aawaz sunne aur voice commands samajhne ke liye.',
    purposeEnglish: 'Required to capture your voice commands and speech.',
    benefitHindi: 'Bina type kiye sirf bolkar turant apps kholne, message taiyar karne aur madad mangne ki suvidha.',
    status: 'prompt',
    userAllowed: false,
    iconName: 'Mic',
  },
  {
    id: 'location',
    nameHindi: 'GPS Location (Location Sharing)',
    nameEnglish: 'GPS Location Access',
    purposeHindi: 'Keval emergency me aapke chune hue contacts ko live Google Maps location link bhejne ke liye.',
    purposeEnglish: 'Used only during emergency to share Google Maps link with selected trusted contacts.',
    benefitHindi: 'Musibat ke samay parents ya dost turant jaan sakenge ki aap kahan hain.',
    status: 'prompt',
    userAllowed: false,
    iconName: 'MapPin',
  },
  {
    id: 'camera',
    nameHindi: 'Camera & Flashlight (Camera aur Torch)',
    nameEnglish: 'Camera & Flashlight Permission',
    purposeHindi: 'QR code scan karne, smart vision companion aur phone ki torch chalu karne ke liye.',
    purposeEnglish: 'Required for real-time QR code scanning, companion camera view, and hardware torch.',
    benefitHindi: 'Fast UPI QR scanning, live vision aur andhere me turant torch jalane ki suvidha.',
    status: 'prompt',
    userAllowed: false,
    iconName: 'Camera',
  },
  {
    id: 'camera_recording',
    nameHindi: 'Emergency Video Recording',
    nameEnglish: 'Emergency Video/Audio Recording',
    purposeHindi: 'Emergency me aapki explicit confirmation ke baad video aur audio record karke save karne ke liye.',
    purposeEnglish: 'Records emergency video proof only after you explicitly confirm. Never records secretly.',
    benefitHindi: 'Asurakshit sthiti me saboot record karne aur phone me surakshit rakhne ki suvidha.',
    status: 'prompt',
    userAllowed: false,
    iconName: 'Video',
  },
  {
    id: 'speech_recognition',
    nameHindi: 'Voice Recognition (Speech Engine)',
    nameEnglish: 'Speech Recognition Engine',
    purposeHindi: 'Aapki Hinglish aur English aawaz ko text me badalne ke liye.',
    purposeEnglish: 'Converts Roman Hindi (Hinglish) and English voice commands into text.',
    benefitHindi: 'Aapke bole gaye shabdon ko sahi tarah samajhne aur turant process karne ke liye.',
    status: 'prompt',
    userAllowed: true,
    iconName: 'Sparkles',
  },
  {
    id: 'text_to_speech',
    nameHindi: 'Text-to-Speech (Voice Output)',
    nameEnglish: 'Hindi & English Speech Synthesis',
    purposeHindi: 'Assistant ke jawab ko saaf aur natural aawaz me bolkar sunane ke liye.',
    purposeEnglish: 'Speaks assistant responses aloud in clear, friendly voice.',
    benefitHindi: 'Screen dekhe bina ya kaam karte hue jawab aasani se sunne ke liye.',
    status: 'prompt',
    userAllowed: true,
    iconName: 'Volume2',
  },
  {
    id: 'notifications',
    nameHindi: 'Notifications (Alerts)',
    nameEnglish: 'Notifications Permission',
    purposeHindi: 'Keval zaroori alarm, timer aur emergency safety alerts dene ke liye.',
    purposeEnglish: 'Sends urgent safety alerts and reminders. No ads or spam.',
    benefitHindi: 'Background me koi alert hone par aapko samay par suchna dene ke liye.',
    status: 'prompt',
    userAllowed: false,
    iconName: 'Bell',
  },
  {
    id: 'accessibility',
    nameHindi: 'Android Accessibility Service (Special Permission)',
    nameEnglish: 'Android Accessibility Service',
    purposeHindi: 'Agar aap chahte hain ki assistant Android screen par automated actions me madad kare.',
    purposeEnglish: 'Allows automated screen interactions on Android (opens official Android Accessibility Settings).',
    benefitHindi: 'Hands-free automation. Suraksha karanon se ye browser me direct nahi chalta; Android Settings se ON hota hai.',
    status: 'prompt',
    userAllowed: false,
    isSpecialAndroidService: true,
    iconName: 'Sliders',
  },
  {
    id: 'vibration',
    nameHindi: 'Vibration / Haptic Feedback',
    nameEnglish: 'Haptic Vibration Feedback',
    purposeHindi: 'Button dabane aur emergency alert par halka vibration dene ke liye.',
    purposeEnglish: 'Provides haptic feedback when buttons are clicked and SOS is triggered.',
    benefitHindi: 'Phone ke saath natural aur instant touch feedback.',
    status: 'granted',
    userAllowed: true,
    iconName: 'Vibrate',
  },
  {
    id: 'device_motion_lock',
    nameHindi: 'Motion Sensor & Touch Guard Security',
    nameEnglish: 'Device Motion & Touch Guard',
    purposeHindi: 'Phone uthane ya bina permission chhoone par turant in-app data lock karne ke liye.',
    purposeEnglish: 'Detects unauthorized physical movement or touch and activates the security shield curtain.',
    benefitHindi: 'Phone kahin chhootne par koi bina anumati aapke private messages nahi dekh sakega.',
    status: 'granted',
    userAllowed: true,
    iconName: 'Shield',
  },
];

export function loadPermissions(): AppPermission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      return INITIAL_PERMISSIONS.map((p) => ({
        ...p,
        userAllowed: saved[p.id] !== undefined ? saved[p.id] : p.userAllowed,
      }));
    }
  } catch (e) {
    console.warn('Error reading permissions from localStorage', e);
  }
  return INITIAL_PERMISSIONS;
}

export function savePermissionPreference(permissionId: string, allowed: boolean): AppPermission[] {
  const current = loadPermissions();
  const updated = current.map((p) => (p.id === permissionId ? { ...p, userAllowed: allowed } : p));
  const toSave: Record<string, boolean> = {};
  updated.forEach((p) => {
    toSave[p.id] = p.userAllowed;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  return updated;
}

export async function requestBrowserPermission(permissionId: string): Promise<boolean> {
  try {
    if (permissionId === 'microphone') {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      savePermissionPreference('microphone', true);
      return true;
    } else if (permissionId === 'camera' || permissionId === 'camera_recording') {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: permissionId === 'camera_recording' });
      stream.getTracks().forEach((t) => t.stop());
      savePermissionPreference(permissionId, true);
      return true;
    } else if (permissionId === 'location') {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          savePermissionPreference('location', false);
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            savePermissionPreference('location', true);
            resolve(true);
          },
          () => {
            savePermissionPreference('location', false);
            resolve(false);
          },
          { timeout: 5000 }
        );
      });
    } else if (permissionId === 'notifications') {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        const allowed = res === 'granted';
        savePermissionPreference('notifications', allowed);
        return allowed;
      }
    } else if (permissionId === 'accessibility') {
      window.location.href = 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end';
      return false;
    }
  } catch (err) {
    console.warn(`Permission request failed for ${permissionId}:`, err);
    savePermissionPreference(permissionId, false);
    return false;
  }
  return false;
}

export function isPermissionAllowed(permissionId: string): boolean {
  const list = loadPermissions();
  const p = list.find((item) => item.id === permissionId);
  return p ? p.userAllowed : false;
}
