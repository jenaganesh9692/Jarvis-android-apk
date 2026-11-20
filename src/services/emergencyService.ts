import { EmergencyContact, EmergencySettings } from '../types';

const CONTACTS_KEY = 'vivo_emergency_contacts_v2';
const SETTINGS_KEY = 'vivo_emergency_settings_v2';

export const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: 'papa',
    name: 'Papa (Father)',
    phone: '+919823456789',
    relation: 'Father',
    canCall: true,
    canSms: true,
    canShareLocation: true,
  },
  {
    id: 'mummy',
    name: 'Mummy (Mother)',
    phone: '+919812345678',
    relation: 'Mother',
    canCall: true,
    canSms: true,
    canShareLocation: true,
  },
  {
    id: 'friend',
    name: 'Trusted Friend',
    phone: '+919876543210',
    relation: 'Friend',
    canCall: false,
    canSms: true,
    canShareLocation: true,
  },
];

export const DEFAULT_SETTINGS: EmergencySettings = {
  autoVoiceTrigger: true, // Listens for "help", "emergency", "bachao" in voice
  emergencyMessage: 'EMERGENCY ALERT: Mujhe turant madad ki zaroorat hai. Kripya mujhse turant sampark karein. Meri live location niche hai:',
  trustedContacts: DEFAULT_CONTACTS,
  includeGpsLink: true,
};

export function loadEmergencySettings(): EmergencySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading emergency settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveEmergencySettings(settings: EmergencySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadEmergencyContacts(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading emergency contacts', e);
  }
  return DEFAULT_CONTACTS;
}

export function saveEmergencyContacts(contacts: EmergencyContact[]): void {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

// Location helper
export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  mapsUrl: string;
}

export async function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Is device ya browser me GPS location supported nahi hai.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        resolve({ latitude, longitude, accuracy, mapsUrl });
      },
      (err) => {
        let msg = 'Location prapt nahi ho saki.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'GPS location permission block hai. Kripya browser settings me location allow karein.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal available nahi hai.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location timeout ho gayi. Kripya dobara try karein.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Emergency Recorder Helper
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;

export async function startEmergencyRecording(): Promise<MediaStream> {
  stopEmergencyRecording();
  recordedChunks = [];

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: true,
  });
  recordingStream = stream;

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.start(1000); // 1s slice
  return stream;
}

export function stopEmergencyRecording(): Blob | null {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
  }
  if (recordedChunks.length > 0) {
    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    mediaRecorder = null;
    return videoBlob;
  }
  mediaRecorder = null;
  return null;
}
