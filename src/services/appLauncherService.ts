// Service for Managing and Launching Installed Android Apps on Vivo Y20G
// Implements real Android Intent URLs, custom URI schemes, App Info Settings, and Search

export interface AndroidAppItem {
  id: string;
  name: string;
  packageName: string;
  scheme: string;
  fallbackUrl?: string;
  category: 'System' | 'Social' | 'Media' | 'Tools' | 'Navigation' | 'Google' | 'Finance';
  descriptionHindi: string;
  iconType: string;
  bgGradient: string;
  isSystem: boolean;
  isCustom?: boolean;
  verifiedLaunchable: boolean;
}

const STORAGE_CUSTOM_APPS_KEY = 'jarvis_custom_installed_apps';

export const STANDARD_ANDROID_APPS: AndroidAppItem[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    scheme: 'whatsapp://',
    fallbackUrl: 'https://web.whatsapp.com',
    category: 'Social',
    descriptionHindi: 'Chat, voice aur video messaging',
    iconType: 'whatsapp',
    bgGradient: 'from-emerald-600 to-teal-500',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    packageName: 'com.android.chrome',
    scheme: 'googlechrome://',
    fallbackUrl: 'https://www.google.com',
    category: 'Google',
    descriptionHindi: 'Tez internet search aur browsing',
    iconType: 'chrome',
    bgGradient: 'from-blue-600 to-cyan-500',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    scheme: 'vnd.youtube://',
    fallbackUrl: 'https://youtube.com',
    category: 'Media',
    descriptionHindi: 'Videos, gaane aur live stream',
    iconType: 'youtube',
    bgGradient: 'from-red-600 to-rose-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'camera',
    name: 'Camera',
    packageName: 'com.android.camera',
    scheme: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
    category: 'System',
    descriptionHindi: 'HD photo aur video record karein',
    iconType: 'camera',
    bgGradient: 'from-amber-600 to-orange-500',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'settings',
    name: 'Phone Settings',
    packageName: 'com.android.settings',
    scheme: 'intent:#Intent;action=android.settings.SETTINGS;end',
    category: 'System',
    descriptionHindi: 'Vivo Y20G system aur hardware settings',
    iconType: 'settings',
    bgGradient: 'from-slate-700 to-slate-800',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'maps',
    name: 'Google Maps',
    packageName: 'com.google.android.apps.maps',
    scheme: 'geo:0,0?q=',
    fallbackUrl: 'https://maps.google.com',
    category: 'Navigation',
    descriptionHindi: 'Live GPS navigation aur rasta',
    iconType: 'maps',
    bgGradient: 'from-teal-600 to-emerald-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    scheme: 'instagram://app',
    fallbackUrl: 'https://instagram.com',
    category: 'Social',
    descriptionHindi: 'Photos, reels aur friends ki story',
    iconType: 'instagram',
    bgGradient: 'from-pink-600 via-rose-500 to-purple-600',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    packageName: 'com.facebook.katana',
    scheme: 'fb://',
    fallbackUrl: 'https://facebook.com',
    category: 'Social',
    descriptionHindi: 'Friends aur family connect',
    iconType: 'facebook',
    bgGradient: 'from-blue-700 to-indigo-600',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'dialer',
    name: 'Phone Dialer',
    packageName: 'com.google.android.dialer',
    scheme: 'tel:',
    category: 'System',
    descriptionHindi: 'Call lagayein aur contacts dekhein',
    iconType: 'phone',
    bgGradient: 'from-green-600 to-emerald-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'messages',
    name: 'SMS Messages',
    packageName: 'com.google.android.apps.messaging',
    scheme: 'sms:',
    category: 'System',
    descriptionHindi: 'SMS sandesh bhejein aur padhein',
    iconType: 'messages',
    bgGradient: 'from-blue-500 to-cyan-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    scheme: 'googlegmail://',
    fallbackUrl: 'https://mail.google.com',
    category: 'Google',
    descriptionHindi: 'Official emails aur inbox',
    iconType: 'mail',
    bgGradient: 'from-red-500 to-rose-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'photos',
    name: 'Photos & Gallery',
    packageName: 'com.google.android.apps.photos',
    scheme: 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
    fallbackUrl: 'https://photos.google.com',
    category: 'Media',
    descriptionHindi: 'Captured photos aur phone albums',
    iconType: 'image',
    bgGradient: 'from-violet-600 to-fuchsia-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'clock',
    name: 'Clock & Alarms',
    packageName: 'com.google.android.deskclock',
    scheme: 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end',
    category: 'Tools',
    descriptionHindi: 'Alarm, timer aur stopwatch',
    iconType: 'clock',
    bgGradient: 'from-indigo-600 to-blue-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    packageName: 'com.google.android.calculator',
    scheme: 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
    category: 'Tools',
    descriptionHindi: 'Ginti aur hisab-kitab',
    iconType: 'calculator',
    bgGradient: 'from-slate-600 to-slate-700',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'files',
    name: 'Files Manager',
    packageName: 'com.google.android.apps.nbu.files',
    scheme: 'intent:#Intent;action=android.intent.action.VIEW_DOWNLOADS;end',
    category: 'Tools',
    descriptionHindi: 'Storage, downloads aur documents',
    iconType: 'folder',
    bgGradient: 'from-cyan-600 to-blue-700',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'playstore',
    name: 'Google Play Store',
    packageName: 'com.android.vending',
    scheme: 'market://',
    fallbackUrl: 'https://play.google.com',
    category: 'Google',
    descriptionHindi: 'Naye apps aur updates install karein',
    iconType: 'playstore',
    bgGradient: 'from-emerald-500 to-teal-600',
    isSystem: true,
    verifiedLaunchable: true,
  },
  {
    id: 'gpay',
    name: 'Google Pay (GPay)',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    scheme: 'upi://pay',
    category: 'Finance',
    descriptionHindi: 'UPI payment aur bank transfer',
    iconType: 'creditcard',
    bgGradient: 'from-blue-600 to-indigo-600',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'paytm',
    name: 'Paytm UPI',
    packageName: 'net.one97.paytm',
    scheme: 'paytmmp://',
    fallbackUrl: 'https://paytm.com',
    category: 'Finance',
    descriptionHindi: 'Wallet, bills aur recharge',
    iconType: 'creditcard',
    bgGradient: 'from-sky-600 to-blue-700',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    packageName: 'com.phonepe.app',
    scheme: 'phonepe://',
    fallbackUrl: 'https://www.phonepe.com',
    category: 'Finance',
    descriptionHindi: 'UPI payments aur fast transfers',
    iconType: 'creditcard',
    bgGradient: 'from-purple-700 to-indigo-800',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'spotify',
    name: 'Spotify Music',
    packageName: 'com.spotify.music',
    scheme: 'spotify://',
    fallbackUrl: 'https://open.spotify.com',
    category: 'Media',
    descriptionHindi: 'Podcasts aur songs streaming',
    iconType: 'music',
    bgGradient: 'from-green-600 to-emerald-700',
    isSystem: false,
    verifiedLaunchable: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    packageName: 'org.telegram.messenger',
    scheme: 'tg://',
    fallbackUrl: 'https://web.telegram.org',
    category: 'Social',
    descriptionHindi: 'Encrypted chat aur channels',
    iconType: 'send',
    bgGradient: 'from-sky-500 to-blue-600',
    isSystem: false,
    verifiedLaunchable: true,
  },
];

export function loadAllInstalledApps(): AndroidAppItem[] {
  let list = [...STANDARD_ANDROID_APPS];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_APPS_KEY);
      if (stored) {
        const custom: AndroidAppItem[] = JSON.parse(stored);
        list = [...list, ...custom];
      }
    } catch (e) {
      console.warn('Failed to load custom apps:', e);
    }
  }

  // Sort alphabetically by default
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function saveCustomApp(app: Omit<AndroidAppItem, 'id' | 'isCustom' | 'verifiedLaunchable'>): AndroidAppItem {
  const newApp: AndroidAppItem = {
    ...app,
    id: `custom-${Date.now()}`,
    isCustom: true,
    verifiedLaunchable: true,
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_APPS_KEY);
      const list: AndroidAppItem[] = stored ? JSON.parse(stored) : [];
      list.push(newApp);
      localStorage.setItem(STORAGE_CUSTOM_APPS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save custom app:', e);
    }
  }

  return newApp;
}

export function removeCustomApp(id: string): void {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_APPS_KEY);
      if (stored) {
        const list: AndroidAppItem[] = JSON.parse(stored);
        const filtered = list.filter((a) => a.id !== id);
        localStorage.setItem(STORAGE_CUSTOM_APPS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Failed to remove custom app:', e);
    }
  }
}

// Launch an app using Android Intent URI with fallback handling
export function launchAndroidApp(
  app: AndroidAppItem,
  onStatusUpdate?: (status: { success: boolean; message: string }) => void
): void {
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const startTime = Date.now();

  try {
    // If the scheme is an explicit intent or custom URI scheme:
    if (app.scheme.startsWith('intent:')) {
      window.location.href = app.scheme;
    } else if (app.scheme.startsWith('http')) {
      window.open(app.scheme, '_blank');
    } else {
      // Custom scheme like whatsapp://, googlechrome://, vnd.youtube://
      // In Android Chrome, we also construct Android intent fallback if custom scheme fails:
      const intentUrl = `intent://#Intent;package=${app.packageName};scheme=${app.scheme.replace('://', '')};end`;

      // Trigger launch
      window.location.href = app.scheme;

      // Provide web fallback or store link after 800ms if user hasn't left the page
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 2000 && typeof document !== 'undefined' && !document.hidden) {
          if (app.fallbackUrl) {
            if (onStatusUpdate) {
              onStatusUpdate({
                success: true,
                message: `${app.name} app install nahi mila, web version open kiya ja raha hai.`,
              });
            }
            window.open(app.fallbackUrl, '_blank');
          } else {
            // Offer to open Play Store for missing app
            const playStoreUrl = `market://details?id=${app.packageName}`;
            if (onStatusUpdate) {
              onStatusUpdate({
                success: false,
                message: `${app.name} phone me nahi mila. Google Play Store link khola ja sakta hai.`,
              });
            }
          }
        }
      }, 900);
    }

    if (onStatusUpdate) {
      onStatusUpdate({
        success: true,
        message: `${app.name} khola ja raha hai...`,
      });
    }
  } catch (err: any) {
    if (onStatusUpdate) {
      onStatusUpdate({
        success: false,
        message: `App launch error: ${err?.message || 'Unsupported protocol'}`,
      });
    }
  }
}

// Open App's native Android Settings / App Info page (android.settings.APPLICATION_DETAILS_SETTINGS)
export function openAppAndroidSettings(
  packageName: string,
  onStatusUpdate?: (status: { success: boolean; message: string }) => void
): void {
  const intentUri = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${packageName};end`;
  try {
    window.location.href = intentUri;
    if (onStatusUpdate) {
      onStatusUpdate({
        success: true,
        message: `App Info page open kiya ja raha hai (${packageName}).`,
      });
    }
  } catch (e: any) {
    if (onStatusUpdate) {
      onStatusUpdate({
        success: false,
        message: `Settings intent open karne me dikkat aayi: ${e?.message}`,
      });
    }
  }
}
