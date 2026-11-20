import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mic,
  Camera,
  MapPin,
  Video,
  Sparkles,
  Volume2,
  Bell,
  Sliders,
  Vibrate,
  X,
  Check,
  Ban,
  ExternalLink,
  Info,
  Lock,
} from 'lucide-react';
import { AppPermission } from '../types';
import {
  loadPermissions,
  savePermissionPreference,
  requestBrowserPermission,
} from '../services/permissionService';

interface PermissionsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsChange: (updated: AppPermission[]) => void;
}

export const PermissionsPrivacyModal: React.FC<PermissionsPrivacyModalProps> = ({
  isOpen,
  onClose,
  onPermissionsChange,
}) => {
  const [permissions, setPermissions] = useState<AppPermission[]>(loadPermissions());
  const [testingId, setTestingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPermissions(loadPermissions());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'MapPin':
        return <MapPin className="w-5 h-5 text-emerald-400" />;
      case 'Video':
        return <Video className="w-5 h-5 text-rose-400" />;
      case 'Mic':
        return <Mic className="w-5 h-5 text-cyan-400" />;
      case 'Camera':
        return <Camera className="w-5 h-5 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-blue-400" />;
      case 'Volume2':
        return <Volume2 className="w-5 h-5 text-emerald-400" />;
      case 'Bell':
        return <Bell className="w-5 h-5 text-purple-400" />;
      case 'Sliders':
        return <Sliders className="w-5 h-5 text-rose-400" />;
      case 'Vibrate':
        return <Vibrate className="w-5 h-5 text-indigo-400" />;
      default:
        return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleToggleAllow = async (p: AppPermission, allow: boolean) => {
    setTestingId(p.id);
    if (allow) {
      await requestBrowserPermission(p.id);
      const updated = savePermissionPreference(p.id, true);
      setPermissions(updated);
      onPermissionsChange(updated);
    } else {
      const updated = savePermissionPreference(p.id, false);
      setPermissions(updated);
      onPermissionsChange(updated);
    }
    setTestingId(null);
  };

  const allowedCount = permissions.filter((p) => p.userAllowed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>Permissions & Privacy Dashboard</span>
              </h2>
              <p className="text-xs text-slate-400">
                Aapki privacy par Ganesh ji ka 100% control ({allowedCount}/{permissions.length} allowed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Promise Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>J. A. R. V. I. S. Privacy Guarantee</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Aapki aawaz ka sample aur chehra local device me analyze hota hai. Bina confirmation ke koi bhi WhatsApp message ya payment trigger nahi hoti.
          </p>
        </div>

        {/* Permissions list */}
        <div className="mt-4 space-y-3">
          {permissions.map((p) => (
            <div
              key={p.id}
              className={`p-3.5 rounded-xl border transition-all ${
                p.userAllowed
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-950/30 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                    {getIcon(p.iconName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{p.nameEnglish}</span>
                      <span className="text-[10px] text-slate-400">({p.nameHindi})</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {p.purposeHindi}
                    </p>
                    <p className="text-[10px] text-cyan-400/90 mt-1">
                      Fayda: {p.benefitHindi}
                    </p>
                  </div>
                </div>

                {/* Allow / Disallow toggle */}
                <div className="shrink-0">
                  <button
                    onClick={() => handleToggleAllow(p, !p.userAllowed)}
                    disabled={testingId === p.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95 border ${
                      p.userAllowed
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {p.userAllowed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Allowed</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5 text-slate-400" />
                        <span>Blocked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
