/**
 * Connected-Device Control Service for J. A. R. V. I. S.
 * Manages IoT smart devices (Smart Bulb, Android TV, Bluetooth Speaker, Smart Watch, Secondary Phone).
 * Real state toggles, persistence, and voice command interpreter.
 */

import { ConnectedDevice } from '../types';

const DEVICES_STORAGE_KEY = 'jarvis_connected_devices';

export const INITIAL_DEVICES: ConnectedDevice[] = [
  {
    id: 'dev-bulb-1',
    name: 'Smart Bulb (Living Room)',
    room: 'Living Room',
    type: 'bulb',
    isOnline: true,
    state: {
      power: true,
      brightness: 80,
      color: '#ffd166',
    },
  },
  {
    id: 'dev-bulb-2',
    name: 'Bedroom Smart Lamp',
    room: 'Ganesh Bedroom',
    type: 'bulb',
    isOnline: true,
    state: {
      power: false,
      brightness: 50,
      color: '#06d6a0',
    },
  },
  {
    id: 'dev-tv-1',
    name: 'Android Smart TV',
    room: 'Hall',
    type: 'tv',
    isOnline: true,
    state: {
      power: true,
      volume: 32,
      isMuted: false,
    },
  },
  {
    id: 'dev-speaker-1',
    name: 'Vivo Bluetooth Speaker',
    room: 'Ganesh Study',
    type: 'speaker',
    isOnline: true,
    state: {
      power: true,
      volume: 65,
    },
  },
  {
    id: 'dev-watch-1',
    name: 'Vivo Smart Watch',
    room: 'Wearable',
    type: 'watch',
    isOnline: true,
    state: {
      power: true,
      batteryLevel: 78,
      heartRate: 74,
      isRinging: false,
    },
  },
  {
    id: 'dev-phone-2',
    name: 'Ganesh Secondary Tab',
    room: 'Personal',
    type: 'phone',
    isOnline: true,
    state: {
      power: true,
      batteryLevel: 89,
      isRinging: false,
    },
  },
];

export function loadConnectedDevices(): ConnectedDevice[] {
  if (typeof window === 'undefined') return INITIAL_DEVICES;
  try {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) {
      saveConnectedDevices(INITIAL_DEVICES);
      return INITIAL_DEVICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEVICES;
  }
}

export function saveConnectedDevices(devices: ConnectedDevice[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
  } catch (e) {
    console.warn('Failed to save devices:', e);
  }
}

export function updateDeviceState(
  deviceId: string,
  updates: Partial<ConnectedDevice['state']>
): ConnectedDevice[] {
  const current = loadConnectedDevices();
  const updated = current.map((dev) => {
    if (dev.id === deviceId) {
      return {
        ...dev,
        state: { ...dev.state, ...updates },
      };
    }
    return dev;
  });
  saveConnectedDevices(updated);
  return updated;
}

/**
 * Interpret voice commands related to connected devices
 */
export function interpretDeviceCommand(command: string): {
  matched: boolean;
  messageHinglish: string;
  deviceId?: string;
  action?: string;
} {
  const lower = command.toLowerCase();
  const devices = loadConnectedDevices();

  // 1. SMART BULB / LIGHT
  if (lower.includes('bulb') || lower.includes('light') || lower.includes('batti') || lower.includes('lamp')) {
    const isOff = lower.includes('off') || lower.includes('band') || lower.includes('turn off');
    const isOn = lower.includes('on') || lower.includes('chalu') || lower.includes('jalao') || lower.includes('turn on');
    const targetBulb = lower.includes('bedroom')
      ? devices.find((d) => d.id === 'dev-bulb-2')
      : devices.find((d) => d.id === 'dev-bulb-1');

    if (targetBulb && (isOn || isOff)) {
      const newPower = isOn ? true : false;
      updateDeviceState(targetBulb.id, { power: newPower });
      return {
        matched: true,
        messageHinglish: `Ganesh ji, ${targetBulb.name} ko ${newPower ? 'ON (chalu)' : 'OFF (band)'} kar diya gaya hai.`,
        deviceId: targetBulb.id,
        action: newPower ? 'power_on' : 'power_off',
      };
    }
  }

  // 2. ANDROID SMART TV
  if (lower.includes('tv') || lower.includes('television')) {
    const tv = devices.find((d) => d.type === 'tv');
    if (!tv) return { matched: false, messageHinglish: '' };

    if (lower.includes('mute') || lower.includes('chup')) {
      const willMute = !tv.state.isMuted;
      updateDeviceState(tv.id, { isMuted: willMute });
      return {
        matched: true,
        messageHinglish: `Ganesh ji, Android TV ko ${willMute ? 'Mute' : 'Unmute'} kar diya gaya hai.`,
        deviceId: tv.id,
        action: willMute ? 'mute' : 'unmute',
      };
    }

    if (lower.includes('off') || lower.includes('band')) {
      updateDeviceState(tv.id, { power: false });
      return {
        matched: true,
        messageHinglish: 'Ganesh ji, Android TV ko switch off kar diya gaya hai.',
        deviceId: tv.id,
        action: 'power_off',
      };
    }

    if (lower.includes('on') || lower.includes('chalu')) {
      updateDeviceState(tv.id, { power: true });
      return {
        matched: true,
        messageHinglish: 'Ganesh ji, Android TV power on ho gaya hai.',
        deviceId: tv.id,
        action: 'power_on',
      };
    }

    if (lower.includes('volume')) {
      updateDeviceState(tv.id, { volume: 50, isMuted: false });
      return {
        matched: true,
        messageHinglish: 'Ganesh ji, TV ka volume 50% par adjust kar diya gaya hai.',
        deviceId: tv.id,
        action: 'set_volume',
      };
    }
  }

  // 3. BLUETOOTH SPEAKER
  if (lower.includes('speaker') || lower.includes('bluetooth')) {
    const speaker = devices.find((d) => d.type === 'speaker');
    if (speaker) {
      const isOff = lower.includes('off') || lower.includes('disconnect') || lower.includes('band');
      const newPower = !isOff;
      updateDeviceState(speaker.id, { power: newPower });
      return {
        matched: true,
        messageHinglish: `Ganesh ji, Vivo Bluetooth Speaker ko ${newPower ? 'Connect (ON)' : 'Disconnect'} kar diya gaya hai.`,
        deviceId: speaker.id,
        action: newPower ? 'connect' : 'disconnect',
      };
    }
  }

  // 4. FIND SMART WATCH
  if (lower.includes('watch') || lower.includes('ghadi') || lower.includes('band')) {
    const watch = devices.find((d) => d.type === 'watch');
    if (watch) {
      updateDeviceState(watch.id, { isRinging: true });
      setTimeout(() => updateDeviceState(watch.id, { isRinging: false }), 4000);
      return {
        matched: true,
        messageHinglish: `Ganesh ji, aapke Smart Watch par ping sound bajaya ja raha hai. Current heart rate 74 BPM hai aur battery ${watch.state.batteryLevel}% hai.`,
        deviceId: watch.id,
        action: 'ping_watch',
      };
    }
  }

  // 5. FIND SECONDARY PHONE / TAB
  if (lower.includes('tab') || lower.includes('dusra phone') || lower.includes('find phone') || lower.includes('ring phone')) {
    const phone = devices.find((d) => d.type === 'phone');
    if (phone) {
      updateDeviceState(phone.id, { isRinging: true });
      setTimeout(() => updateDeviceState(phone.id, { isRinging: false }), 5000);
      return {
        matched: true,
        messageHinglish: 'Ganesh ji, aapke secondary device par full volume ring command bhej di gayi hai.',
        deviceId: phone.id,
        action: 'ring_device',
      };
    }
  }

  return { matched: false, messageHinglish: '' };
}
