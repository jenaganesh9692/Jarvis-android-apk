import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  Moon,
  Sun,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  AlarmItem,
  NightScheduleSettings,
  loadAlarms,
  saveAlarms,
  addOrUpdateAlarm,
  deleteAlarm,
  toggleAlarm,
  loadNightSchedule,
  saveNightSchedule,
  startAlarmSound,
  stopAlarmSound,
  isAlarmRinging,
  snoozeAlarm,
  dismissAlarm,
} from '../services/alarmScheduleService';

interface AlarmScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRingingAlarm?: AlarmItem | null;
  onDismissRinging?: () => void;
  onSnoozeRinging?: (mins?: number) => void;
  onSpeak?: (text: string) => void;
}

export const AlarmScheduleModal: React.FC<AlarmScheduleModalProps> = ({
  isOpen,
  onClose,
  activeRingingAlarm,
  onDismissRinging,
  onSnoozeRinging,
  onSpeak,
}) => {
  const [alarms, setAlarms] = useState<AlarmItem[]>(loadAlarms);
  const [schedule, setSchedule] = useState<NightScheduleSettings>(loadNightSchedule);
  const [newTime, setNewTime] = useState('05:00');
  const [newLabel, setNewLabel] = useState('Subah Uthna');
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAlarms(loadAlarms());
      setSchedule(loadNightSchedule());
    }
  }, [isOpen]);

  const handleToggle = (id: string) => {
    const { updatedAlarms, newState } = toggleAlarm(id);
    setAlarms(updatedAlarms);
    const target = updatedAlarms.find((a) => a.id === id);
    if (onSpeak && target) {
      onSpeak(
        newState
          ? `Ganesh ji, ${target.time} ka alarm on kar diya gaya hai.`
          : `Ganesh ji, ${target.time} ka alarm off kar diya gaya hai.`
      );
    }
  };

  const handleDelete = (id: string) => {
    const updated = deleteAlarm(id);
    setAlarms(updated);
    if (onSpeak) onSpeak('Alarm delete kar diya gaya hai.');
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;
    const newAlarm: AlarmItem = {
      id: `alarm_${Date.now()}`,
      time: newTime,
      label: newLabel.trim() || 'Subah Uthna',
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    };
    const updated = addOrUpdateAlarm(newAlarm);
    setAlarms(updated);
    if (onSpeak) {
      onSpeak(`Boss, ${newTime} ka naya alarm set ho gaya hai. Main aapko utha dungi.`);
    }
  };

  const handleQuickAdd = (time: string, label: string) => {
    const newAlarm: AlarmItem = {
      id: `alarm_${Date.now()}`,
      time,
      label,
      enabled: true,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    };
    const updated = addOrUpdateAlarm(newAlarm);
    setAlarms(updated);
    if (onSpeak) {
      onSpeak(`Boss, subah ${time} ka alarm set ho gaya hai. Shubh ratri!`);
    }
  };

  const handleTestSound = () => {
    if (isTestingSound) {
      stopAlarmSound();
      setIsTestingSound(false);
    } else {
      startAlarmSound();
      setIsTestingSound(true);
      setTimeout(() => {
        stopAlarmSound();
        setIsTestingSound(false);
      }, 5000);
    }
  };

  const handleToggleSleepMode = () => {
    const updated = { ...schedule, isSleepingNow: !schedule.isSleepingNow };
    setSchedule(updated);
    saveNightSchedule(updated);
    if (onSpeak) {
      if (updated.isSleepingNow) {
        onSpeak('Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna.');
      } else {
        onSpeak('Shubh prabhat boss! Main active ho chuki hoon. Batayein aaj ka kya schedule hai?');
      }
    }
  };

  const handleUpdateBedtime = (time: string) => {
    const updated = { ...schedule, bedtime: time };
    setSchedule(updated);
    saveNightSchedule(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Night Schedule & Voice Alarm
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  J. A. R. V. I. S.
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ganesh Ji Ke Alarms &amp; Sleep Mode ({currentTimeStr})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isTestingSound) stopAlarmSound();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Ringing Alarm Alert (if currently firing) */}
        {activeRingingAlarm && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-950/80 to-amber-950/80 border-2 border-red-500/60 shadow-lg shadow-red-500/20 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Bell className="w-4 h-4 animate-bounce" />
                Alarm Baj Raha Hai!
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {activeRingingAlarm.time}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium mb-3">
              "{activeRingingAlarm.label}" - Uthne ka waqt ho gaya hai boss!
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSnoozeRinging && onSnoozeRinging(5)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Clock className="w-4 h-4" />
                Snooze (5 Min)
              </button>
              <button
                onClick={() => onDismissRinging && onDismissRinging()}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <VolumeX className="w-4 h-4" />
                Dismiss (Band Karein)
              </button>
            </div>
          </div>
        )}

        {/* Voice Command Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">Natural Voice Command Se Alarm Lagayein:</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              "Hey J. A. R. V. I. S., mujhe subah 5 baje utha dena" ya "subah 6 baje ka alarm lagao"
            </p>
          </div>
        </div>

        {/* Night Sleep Mode & Cutoff Transition */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Night Sleep Mode &amp; Cutoff</h4>
                <p className="text-[10px] text-slate-400">Night transition at {schedule.bedtime}</p>
              </div>
            </div>
            <button
              onClick={handleToggleSleepMode}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                schedule.isSleepingNow
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              {schedule.isSleepingNow ? 'Sleeping Now' : 'Sleep Mode On'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200">
            <span className="font-semibold block mb-0.5 text-purple-300">J. A. R. V. I. S. Sleep Announcement:</span>
            <p className="italic">
              "Boss, meri jaan, ab main sleep mode mein ja rahi hoon. Tumhare alarms schedule par rahenge. Shubh ratri, apna khayal rakhna."
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-400">Bedtime Cutoff Hour:</span>
            <input
              type="time"
              value={schedule.bedtime}
              onChange={(e) => handleUpdateBedtime(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
            Quick Alarm Presets (1-Tap):
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { time: '05:00', label: '5:00 AM' },
              { time: '05:30', label: '5:30 AM' },
              { time: '06:00', label: '6:00 AM' },
              { time: '07:00', label: '7:00 AM' },
            ].map((preset) => (
              <button
                key={preset.time}
                onClick={() => handleQuickAdd(preset.time, 'Subah Uthna')}
                className="py-2 px-1 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition text-center active:scale-95"
              >
                <span className="text-xs font-bold text-amber-300 block">{preset.label}</span>
                <span className="text-[9px] text-slate-500">Subah</span>
              </button>
            ))}
          </div>
        </div>

        {/* Existing Alarms List */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400">
              Scheduled Alarms ({alarms.length}):
            </label>
            <button
              onClick={handleTestSound}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition ${
                isTestingSound
                  ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isTestingSound ? (
                <>
                  <VolumeX className="w-3 h-3" /> Stop Sound Test
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-amber-400" /> Test Buzzer &amp; Vibrate
                </>
              )}
            </button>
          </div>

          {alarms.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
              Koi alarm schedule nahi hai. Upar se add karein ya voice command bolein.
            </div>
          ) : (
            alarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                  alarm.enabled
                    ? 'bg-slate-950/80 border-slate-700'
                    : 'bg-slate-950/30 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(alarm.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                      alarm.enabled
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="text-base font-black text-white font-mono tracking-wide">
                      {alarm.time}
                    </div>
                    <div className="text-[11px] text-slate-400">{alarm.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(alarm.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                      alarm.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {alarm.enabled ? 'Active' : 'Off'}
                  </button>
                  <button
                    onClick={() => handleDelete(alarm.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete Alarm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Custom Alarm Form */}
        <form onSubmit={handleAddAlarm} className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            Naya Alarm Jodein:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Time (24 Hour):</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Label / Naam:</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Subah Uthna"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Alarm Save Karein
          </button>
        </form>
      </div>
    </div>
  );
};
