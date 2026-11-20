import React, { useState } from 'react';
import {
  Lightbulb,
  Tv,
  Volume2,
  VolumeX,
  Watch,
  Smartphone,
  Power,
  Wifi,
  Sliders,
  BellRing,
  Heart,
  Battery,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { ConnectedDevice } from '../types';
import {
  loadConnectedDevices,
  updateDeviceState,
} from '../services/deviceControlService';
import { playChime, speakWithFemaleVoice } from '../services/speechService';

interface ConnectedDevicesHubProps {
  onTriggerVoiceCommand?: (command: string) => void;
}

export const ConnectedDevicesHub: React.FC<ConnectedDevicesHubProps> = ({
  onTriggerVoiceCommand,
}) => {
  const [devices, setDevices] = useState<ConnectedDevice[]>(loadConnectedDevices);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const refreshDevices = () => {
    setDevices(loadConnectedDevices());
  };

  const handleTogglePower = (device: ConnectedDevice) => {
    const newPower = !device.state.power;
    const updated = updateDeviceState(device.id, { power: newPower });
    setDevices(updated);
    playChime('click');
    const msg = `Ganesh ji, ${device.name} ko ${newPower ? 'ON' : 'OFF'} kar diya gaya hai.`;
    setFeedbackMessage(msg);
    speakWithFemaleVoice(msg, 'calm');
  };

  const handleToggleMute = (device: ConnectedDevice) => {
    const newMute = !device.state.isMuted;
    const updated = updateDeviceState(device.id, { isMuted: newMute });
    setDevices(updated);
    playChime('click');
    const msg = `Ganesh ji, ${device.name} ko ${newMute ? 'Mute' : 'Unmute'} kar diya hai.`;
    setFeedbackMessage(msg);
    speakWithFemaleVoice(msg, 'calm');
  };

  const handleBrightnessChange = (deviceId: string, brightness: number) => {
    const updated = updateDeviceState(deviceId, { brightness });
    setDevices(updated);
  };

  const handleVolumeChange = (deviceId: string, volume: number) => {
    const updated = updateDeviceState(deviceId, { volume, isMuted: false });
    setDevices(updated);
  };

  const handlePingWatch = (deviceId: string) => {
    playChime('alert');
    const updated = updateDeviceState(deviceId, { isRinging: true });
    setDevices(updated);
    const msg = 'Ganesh ji, Smart Watch par beep signal bhej diya gaya hai.';
    setFeedbackMessage(msg);
    speakWithFemaleVoice(msg, 'warm');

    setTimeout(() => {
      const reset = updateDeviceState(deviceId, { isRinging: false });
      setDevices(reset);
    }, 4000);
  };

  const handleRingPhone = (deviceId: string) => {
    playChime('alert');
    const updated = updateDeviceState(deviceId, { isRinging: true });
    setDevices(updated);
    const msg = 'Ganesh ji, secondary device par full volume ring signal bhej diya gaya hai.';
    setFeedbackMessage(msg);
    speakWithFemaleVoice(msg, 'warm');

    setTimeout(() => {
      const reset = updateDeviceState(deviceId, { isRinging: false });
      setDevices(reset);
    }, 4500);
  };

  const getDeviceIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
      case 'bulb':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
      case 'tv':
        return <Tv className="w-5 h-5 text-cyan-400" />;
      case 'speaker':
        return <Volume2 className="w-5 h-5 text-indigo-400" />;
      case 'watch':
        return <Watch className="w-5 h-5 text-emerald-400" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Connected Devices & Smart IoT Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Voice ya tap se Ganesh ji ke sabhi smart devices control karein
          </p>
        </div>
        <button
          onClick={refreshDevices}
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition"
          title="Refresh devices"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Spoken Action Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 animate-in fade-in flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage('')}
            className="text-slate-400 hover:text-white ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Voice Suggestions Bar */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Example Voice Commands (Boliye ya Tap Karein)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Turn on Smart Bulb',
            'Smart bulb off karo',
            'TV mute karo',
            'TV volume badhao',
            'Connect Bluetooth Speaker',
            'Find my watch',
            'Secondary phone ring karo',
          ].map((cmd, idx) => (
            <button
              key={`${cmd}-${idx}`}
              onClick={() => onTriggerVoiceCommand && onTriggerVoiceCommand(cmd)}
              className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-700 transition"
            >
              "{cmd}"
            </button>
          ))}
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {devices.map((device) => {
          const isPowered = device.state.power;

          return (
            <div
              key={device.id}
              className={`p-4 rounded-2xl border transition-all ${
                isPowered
                  ? 'bg-slate-900/90 border-slate-700 shadow-lg shadow-black/40'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-75'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isPowered
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white tracking-wide">
                      {device.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>{device.room}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Power Button */}
                <button
                  onClick={() => handleTogglePower(device)}
                  className={`p-2.5 rounded-xl border transition ${
                    isPowered
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                  title={isPowered ? 'Turn Off' : 'Turn On'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Specific Device Controls */}
              {device.type === 'bulb' && isPowered && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono text-cyan-300">{device.state.brightness || 80}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={device.state.brightness || 80}
                    onChange={(e) => handleBrightnessChange(device.id, Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}

              {device.type === 'tv' && isPowered && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>TV Volume: <span className="text-cyan-300 font-mono">{device.state.volume || 30}%</span></span>
                    <button
                      onClick={() => handleToggleMute(device)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        device.state.isMuted
                          ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {device.state.isMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={device.state.isMuted ? 0 : (device.state.volume || 30)}
                    onChange={(e) => handleVolumeChange(device.id, Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}

              {device.type === 'speaker' && isPowered && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Audio Output Volume</span>
                    <span className="font-mono text-indigo-300">{device.state.volume || 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={device.state.volume || 50}
                    onChange={(e) => handleVolumeChange(device.id, Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>
              )}

              {device.type === 'watch' && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      {device.state.batteryLevel}%
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <Heart className="w-3.5 h-3.5" />
                      {device.state.heartRate} BPM
                    </span>
                  </div>
                  <button
                    onClick={() => handlePingWatch(device.id)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                      device.state.isRinging
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {device.state.isRinging ? 'Ringing...' : 'Find Watch'}
                  </button>
                </div>
              )}

              {device.type === 'phone' && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                    Battery: {device.state.batteryLevel}%
                  </span>
                  <button
                    onClick={() => handleRingPhone(device.id)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                      device.state.isRinging
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                        : 'bg-slate-800 hover:bg-slate-700 text-pink-300 border-slate-700'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {device.state.isRinging ? 'Ringing Device...' : 'Ring Device'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
