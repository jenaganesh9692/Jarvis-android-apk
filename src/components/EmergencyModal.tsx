import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  MapPin,
  Video,
  VideoOff,
  X,
  UserPlus,
  Trash2,
  Check,
  ShieldAlert,
  Navigation,
  Download,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  Settings,
} from 'lucide-react';
import { EmergencyContact, EmergencySettings } from '../types';
import {
  loadEmergencyContacts,
  saveEmergencyContacts,
  loadEmergencySettings,
  saveEmergencySettings,
  getCurrentLocation,
  startEmergencyRecording,
  stopEmergencyRecording,
  LocationResult,
} from '../services/emergencyService';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (msg: string) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, onSpeak }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(loadEmergencyContacts());
  const [settings, setSettings] = useState<EmergencySettings>(loadEmergencySettings());
  const [activeTab, setActiveTab] = useState<'sos' | 'contacts' | 'settings'>('sos');

  // Location state
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordConfirmOpen, setRecordConfirmOpen] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const recordTimerRef = useRef<any>(null);

  // New Contact Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('Mummy / Papa');
  const [newCanCall, setNewCanCall] = useState(true);
  const [newCanSms, setNewCanSms] = useState(true);
  const [newCanLocation, setNewCanLocation] = useState(true);

  // Status feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContacts(loadEmergencyContacts());
      setSettings(loadEmergencySettings());
      fetchLocation();
    } else {
      handleStopRecord();
    }
  }, [isOpen]);

  const fetchLocation = async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      const res = await getCurrentLocation();
      setLocation(res);
    } catch (err: any) {
      setLocError(err.message || 'GPS location prapt nahi ho saki.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleCallContact = (contact: EmergencyContact) => {
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
    setActionFeedback(`${contact.name} ke liye phone dialer open kiya ja raha hai...`);
    if (onSpeak) onSpeak(`${contact.name} ko call lagane ke liye dialer open ho raha hai.`);

    window.location.href = `tel:${cleanPhone}`;
  };

  const handleSendWhatsAppSOS = (contact: EmergencyContact) => {
    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    let msg = `EMERGENCY ALERT: Main Ganesh musibat me hoon! Kripya turant mujhe call karein. ${settings.emergencyMessage}`;

    if (settings.includeGpsLink && location) {
      msg += `\nMeri Live Location: ${location.mapsUrl}`;
    }

    const encodedMsg = encodeURIComponent(msg);
    setActionFeedback(`${contact.name} ke liye WhatsApp emergency draft taiyar ho gaya hai...`);
    if (onSpeak) onSpeak(`${contact.name} ke liye WhatsApp SOS message open kiya ja raha hai.`);

    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  const handleSendSmsSOS = (contact: EmergencyContact) => {
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
    let msg = `EMERGENCY SOS: Main Ganesh khatre me hoon! Turant sampark karein. ${settings.emergencyMessage}`;
    if (settings.includeGpsLink && location) {
      msg += ` Location: ${location.mapsUrl}`;
    }

    setActionFeedback(`${contact.name} ke liye SMS draft khola ja raha hai...`);
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
  };

  const handleStartRecord = async () => {
    setRecordConfirmOpen(false);
    setActionFeedback('Camera audio & video record hona shuru ho raha hai...');
    if (onSpeak) onSpeak('Aapatkaleen camera recording shuru ho gayi hai.');

    try {
      const stream = await startEmergencyRecording();
      setIsRecording(true);
      setRecordSeconds(0);
      setRecordedBlobUrl(null);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setActionFeedback(`Camera record error: ${err.message || 'Permission denied'}`);
      setIsRecording(false);
    }
  };

  const handleStopRecord = async () => {
    if (!isRecording) return;
    clearInterval(recordTimerRef.current);
    try {
      const blob = await stopEmergencyRecording();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setActionFeedback('Emergency video surakshit record ho gayi hai. Aap ise download ya save kar sakte hain.');
        if (onSpeak) onSpeak('Emergency video record ho chuki hai.');
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newContact: EmergencyContact = {
      id: `c-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      relation: newRelation,
      canCall: newCanCall,
      canSms: newCanSms,
      canShareLocation: newCanLocation,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveEmergencyContacts(updated);

    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
    setActionFeedback(`${newContact.name} trusted contacts me add ho gaya.`);
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveEmergencyContacts(updated);
    setActionFeedback('Contact hata diya gaya.');
  };

  const handleSaveSettings = (newSettings: EmergencySettings) => {
    setSettings(newSettings);
    saveEmergencySettings(newSettings);
    setActionFeedback('Emergency settings save ho gayi.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl shadow-red-950/50 flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-red-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Emergency Assistance & SOS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Priority
                </span>
              </div>
              <p className="text-xs text-red-200/80">
                Ganesh ji ke liye 1-tap call, WhatsApp SOS aur live GPS sharing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close emergency modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('sos')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sos'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>1-Tap SOS</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'contacts'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Trusted Contacts ({contacts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Action feedback banner */}
        {actionFeedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-red-300 hover:text-white ml-2 text-sm"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Content scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'sos' && (
            <>
              {/* Emergency Call list */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-red-400" />
                    Immediate Emergency Contact Call
                  </h3>
                  <span className="text-[11px] text-slate-400">1-Tap Dialing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-red-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {c.relation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handleCallContact(c)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-sm"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                        <button
                          onClick={() => handleSendWhatsAppSOS(c)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-bold text-xs transition active:scale-95 shadow-sm"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Location Sharing Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Live GPS Location Coordinates
                  </span>
                  <button
                    onClick={fetchLocation}
                    disabled={locLoading}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    {locLoading ? 'Updating...' : 'Refresh GPS'}
                  </button>
                </div>

                {location ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-300">
                      Latitude: <span className="font-mono text-cyan-300">{location.latitude.toFixed(5)}</span> |
                      Longitude: <span className="font-mono text-cyan-300">{location.longitude.toFixed(5)}</span>
                      {location.accuracy && (
                        <span className="text-slate-400 text-[11px]"> (±{Math.round(location.accuracy)}m)</span>
                      )}
                    </p>
                    <a
                      href={location.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-mono text-[11px]"
                    >
                      {location.mapsUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : locError ? (
                  <p className="text-xs text-amber-400">{locError}</p>
                ) : (
                  <p className="text-xs text-slate-400">GPS location khoji ja rahi hai...</p>
                )}
              </div>

              {/* Video Recording Proof section with explicit confirmation */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-400" />
                    Emergency Camera Video Recording
                  </span>
                  {isRecording && (
                    <span className="flex items-center gap-1 text-red-400 text-xs font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      REC {recordSeconds}s
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Suraksha saboot ke liye camera aur microphone se video record karein. Recording shuru karne se pehle confirmation li jayegi.
                </p>

                {isRecording ? (
                  <div className="space-y-2">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-red-500 relative">
                      <video
                        ref={videoPreviewRef}
                        muted
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600/80 text-white font-mono text-[10px] font-bold">
                        REC {recordSeconds}s
                      </div>
                    </div>
                    <button
                      onClick={handleStopRecord}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      Stop Recording & Save
                    </button>
                  </div>
                ) : (
                  <div>
                    {!recordConfirmOpen ? (
                      <button
                        onClick={() => setRecordConfirmOpen(true)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
                      >
                        <Video className="w-4 h-4 text-red-400" />
                        <span>Start Camera Proof Recording</span>
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 space-y-2 animate-in fade-in">
                        <div className="text-xs font-bold text-red-200">
                          Confirmation: Kya aap camera aur audio recording shuru karna chahte hain?
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleStartRecord}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
                          >
                            Haan, Record Karein
                          </button>
                          <button
                            onClick={() => setRecordConfirmOpen(false)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recordedBlobUrl && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-medium">Video Ready</span>
                    <a
                      href={recordedBlobUrl}
                      download={`emergency-proof-${Date.now()}.webm`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Video</span>
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Parents & Trusted Contacts
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chuniye ki kaunse contacts ko call, SMS aur GPS location bhejna allow hai
                  </p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Cancel' : 'Add Contact'}</span>
                </button>
              </div>

              {/* Add Contact Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddContact}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-700 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Papa"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+91..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="text-slate-400 block mb-1">Relationship</label>
                    <select
                      value={newRelation}
                      onChange={(e) => setNewRelation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                    >
                      <option value="Mummy">Mummy</option>
                      <option value="Papa">Papa</option>
                      <option value="Bhai / Brother">Bhai / Brother</option>
                      <option value="Behen / Sister">Behen / Sister</option>
                      <option value="Friend">Friend</option>
                      <option value="Police / Helpline">Police / Helpline</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCanCall}
                        onChange={(e) => setNewCanCall(e.target.checked)}
                        className="rounded accent-red-500"
                      />
                      <span>Can Call</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCanSms}
                        onChange={(e) => setNewCanSms(e.target.checked)}
                        className="rounded accent-red-500"
                      />
                      <span>Can SMS</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCanLocation}
                        onChange={(e) => setNewCanLocation(e.target.checked)}
                        className="rounded accent-red-500"
                      />
                      <span>GPS Share</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    Save Contact
                  </button>
                </form>
              )}

              {/* Contacts List */}
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{c.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {c.relation}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{c.phone}</div>
                      <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                        {c.canCall && <span className="text-emerald-400">Call ✓</span>}
                        {c.canSms && <span className="text-cyan-400">SMS ✓</span>}
                        {c.canShareLocation && <span className="text-indigo-400">GPS ✓</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 uppercase tracking-wider">
                  Automated Emergency Behavior
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Include Live GPS Google Maps Link
                    </div>
                    <div className="text-[11px] text-slate-400">
                      SMS aur WhatsApp draft me live Google Maps link attach karein
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.includeGpsLink}
                    onChange={(e) =>
                      handleSaveSettings({ ...settings, includeGpsLink: e.target.checked })
                    }
                    className="rounded accent-red-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Voice Keyword Auto SOS Detection
                    </div>
                    <div className="text-[11px] text-slate-400">
                      "Help", "Emergency", "Bachao", "Police" bolne par turant SOS modal open karein
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoVoiceTrigger}
                    onChange={(e) =>
                      handleSaveSettings({ ...settings, autoVoiceTrigger: e.target.checked })
                    }
                    className="rounded accent-red-500 w-4 h-4"
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider">
                  Default Emergency Message Template
                </div>
                <textarea
                  value={settings.emergencyMessage}
                  onChange={(e) =>
                    handleSaveSettings({ ...settings, emergencyMessage: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
