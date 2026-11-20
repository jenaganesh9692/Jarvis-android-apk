export interface AlarmItem {
  id: string;
  time: string; // "HH:MM" 24h format, e.g. "05:00"
  label: string; // e.g. "Subah Uthna"
  enabled: boolean;
  days: string[]; // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  snoozedUntil?: number | null; // timestamp in ms
}

export interface NightScheduleSettings {
  sleepModeEnabled: boolean;
  bedtime: string; // e.g. "22:30" (10:30 PM)
  wakeTime: string; // e.g. "05:00" (5:00 AM)
  dayActiveStart: string; // e.g. "06:30"
  dayActiveEnd: string; // e.g. "22:30"
  autoSleepAnnouncement: boolean;
  isSleepingNow: boolean;
  lastSleepAnnouncedDate?: string; // "YYYY-MM-DD"
}

const ALARMS_STORAGE_KEY = 'jarvis_alarms_list_v2';
const SCHEDULE_STORAGE_KEY = 'jarvis_night_schedule_v2';

const DEFAULT_ALARMS: AlarmItem[] = [
  {
    id: 'alarm_5am_morning',
    time: '05:00',
    label: 'Subah Uthna (Ganesh Morning)',
    enabled: true,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'alarm_6am_exercise',
    time: '06:00',
    label: 'Morning Walk & Freshness',
    enabled: false,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
];

const DEFAULT_SCHEDULE: NightScheduleSettings = {
  sleepModeEnabled: true,
  bedtime: '22:30', // 10:30 PM
  wakeTime: '05:00', // 5:00 AM
  dayActiveStart: '06:00',
  dayActiveEnd: '22:30',
  autoSleepAnnouncement: true,
  isSleepingNow: false,
};

// Storage Helpers
export function loadAlarms(): AlarmItem[] {
  if (typeof window === 'undefined') return DEFAULT_ALARMS;
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    if (!raw) return DEFAULT_ALARMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ALARMS;
  } catch {
    return DEFAULT_ALARMS;
  }
}

export function saveAlarms(alarms: AlarmItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch (err) {
    console.warn('Failed to save alarms:', err);
  }
}

export function addOrUpdateAlarm(alarm: AlarmItem): AlarmItem[] {
  const current = loadAlarms();
  const index = current.findIndex((a) => a.id === alarm.id);
  let updated: AlarmItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = alarm;
  } else {
    updated = [alarm, ...current];
  }
  saveAlarms(updated);
  return updated;
}

export function deleteAlarm(id: string): AlarmItem[] {
  const current = loadAlarms();
  const updated = current.filter((a) => a.id !== id);
  saveAlarms(updated);
  return updated;
}

export function toggleAlarm(id: string): { updatedAlarms: AlarmItem[]; newState: boolean } {
  const current = loadAlarms();
  let newState = false;
  const updated = current.map((a) => {
    if (a.id === id) {
      newState = !a.enabled;
      return { ...a, enabled: newState, snoozedUntil: null };
    }
    return a;
  });
  saveAlarms(updated);
  return { updatedAlarms: updated, newState };
}

export function loadNightSchedule(): NightScheduleSettings {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    return { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function saveNightSchedule(settings: NightScheduleSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save night schedule:', err);
  }
}

// Time Parser for Voice Commands
// Examples:
// - "mujhe subah 5 baje utha dena" -> "05:00"
// - "subah 6 baje ka alarm lagao" -> "06:00"
// - "shaam 7 baje ka alarm" -> "19:00"
// - "raat 10 baje" -> "22:00"
// - "5:30 baje" -> "05:30"
// - "10:15 pm" -> "22:15"
export function parseTimeFromCommand(cmd: string): { time: string; label: string; hour: number; minute: number } | null {
  const lower = cmd.toLowerCase();

  // Match pattern "5:30", "05:30", "17:45"
  const colonMatch = lower.match(/(\d{1,2}):(\d{2})/);
  let hour = -1;
  let minute = 0;

  const isNight = lower.includes('raat') || lower.includes('shaam') || lower.includes('pm') || lower.includes('dophar');
  const isMorning = lower.includes('subah') || lower.includes('prabhat') || lower.includes('am');

  if (colonMatch) {
    hour = parseInt(colonMatch[1], 10);
    minute = parseInt(colonMatch[2], 10);
    if (isNight && hour < 12) hour += 12;
    if (isMorning && hour === 12) hour = 0;
  } else {
    // Match word numbers: e.g. "5 baje", "paanch baje", "chhe baje", "saat baje"
    const digitMatch = lower.match(/(\d{1,2})\s*(?:baje|am|pm|o'clock)/i);
    if (digitMatch) {
      hour = parseInt(digitMatch[1], 10);
      minute = 0;
    } else {
      // Hindi word numbers
      const hindiNumbers: Record<string, number> = {
        ek: 1,
        do: 2,
        teen: 3,
        char: 4,
        chaar: 4,
        paanch: 5,
        panch: 5,
        chhe: 6,
        che: 6,
        saat: 7,
        aath: 8,
        nau: 9,
        das: 10,
        gyarah: 11,
        barah: 12,
      };

      for (const [word, num] of Object.entries(hindiNumbers)) {
        if (new RegExp(`\\b${word}\\s+baje`, 'i').test(lower)) {
          hour = num;
          minute = 0;
          break;
        }
      }
    }

    if (hour !== -1) {
      // Check if subah vs raat/shaam
      if (isNight && hour < 12) {
        hour += 12;
      } else if (!isMorning && !isNight && hour <= 6) {
        // Default 5 or 6 baje usually means morning
        hour = hour;
      }
    }
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const formattedHour = hour.toString().padStart(2, '0');
  const formattedMin = minute.toString().padStart(2, '0');
  const time = `${formattedHour}:${formattedMin}`;

  let label = 'J. A. R. V. I. S. Voice Alarm';
  if (lower.includes('utha') || lower.includes('wake')) {
    label = 'Subah Uthna (Ganesh)';
  } else if (lower.includes('exercise') || lower.includes('walk')) {
    label = 'Morning Walk & Workout';
  } else if (lower.includes('meeting') || lower.includes('kaam')) {
    label = 'Important Reminder';
  }

  return { time, label, hour, minute };
}

// Web Audio API Alarm Buzzer (Loud, clear 2-tone alarm)
let audioCtx: AudioContext | null = null;
let alarmOscillator1: OscillatorNode | null = null;
let alarmOscillator2: OscillatorNode | null = null;
let alarmGainNode: GainNode | null = null;
let alarmIntervalTimer: any = null;
let isSoundPlaying = false;

export function isAlarmRinging(): boolean {
  return isSoundPlaying;
}

export function startAlarmSound(): void {
  if (isSoundPlaying) return;
  isSoundPlaying = true;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    alarmGainNode = audioCtx.createGain();
    alarmGainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
    alarmGainNode.connect(audioCtx.destination);

    // Beeping pulse generator
    const playBurst = () => {
      if (!audioCtx || !alarmGainNode || !isSoundPlaying) return;

      const now = audioCtx.currentTime;
      // High-low alternating beep sequence (880Hz -> 1320Hz)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1320, now + 0.15);
      osc1.frequency.setValueAtTime(880, now + 0.3);

      osc2.frequency.setValueAtTime(440, now);

      const burstGain = audioCtx.createGain();
      burstGain.gain.setValueAtTime(0.8, now);
      burstGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc1.connect(burstGain);
      osc2.connect(burstGain);
      burstGain.connect(alarmGainNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    };

    // Initial burst
    playBurst();
    // Repeat every 600ms
    alarmIntervalTimer = setInterval(playBurst, 600);

    // Haptic vibration pattern (400ms on, 200ms off, 400ms on, 200ms off, 800ms on)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 800]);
        // Repeat vibration
        const vibrateInterval = setInterval(() => {
          if (!isSoundPlaying) {
            clearInterval(vibrateInterval);
          } else {
            navigator.vibrate([400, 200, 400, 200, 800]);
          }
        }, 2200);
      } catch (e) {
        // Ignore vibration errors
      }
    }
  } catch (err) {
    console.error('Error starting alarm buzzer:', err);
  }
}

export function stopAlarmSound(): void {
  isSoundPlaying = false;
  if (alarmIntervalTimer) {
    clearInterval(alarmIntervalTimer);
    alarmIntervalTimer = null;
  }

  if (alarmGainNode && audioCtx) {
    try {
      alarmGainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    } catch {}
  }

  if (audioCtx) {
    try {
      audioCtx.close();
    } catch {}
    audioCtx = null;
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}

// 5-minute Snooze
export function snoozeAlarm(alarmId: string, minutes: number = 5): AlarmItem[] {
  stopAlarmSound();
  const alarms = loadAlarms();
  const snoozedUntil = Date.now() + minutes * 60 * 1000;
  const updated = alarms.map((a) => {
    if (a.id === alarmId) {
      return { ...a, snoozedUntil };
    }
    return a;
  });
  saveAlarms(updated);
  return updated;
}

// Dismiss active alarm
export function dismissAlarm(alarmId: string): AlarmItem[] {
  stopAlarmSound();
  const alarms = loadAlarms();
  const updated = alarms.map((a) => {
    if (a.id === alarmId) {
      return { ...a, snoozedUntil: null };
    }
    return a;
  });
  saveAlarms(updated);
  return updated;
}
