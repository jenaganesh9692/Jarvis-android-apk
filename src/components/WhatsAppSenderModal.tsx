import React, { useState } from 'react';
import { MessageSquare, Send, X, ShieldAlert, CheckCircle, User, Phone, Edit3 } from 'lucide-react';

interface WhatsAppSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string;
  initialMessage?: string;
  initialPhone?: string;
}

export const WhatsAppSenderModal: React.FC<WhatsAppSenderModalProps> = ({
  isOpen,
  onClose,
  initialRecipient = 'Rohan',
  initialMessage = 'Namaste! Main 10 minute me aa raha hoon.',
  initialPhone = '',
}) => {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [isSent, setIsSent] = useState(false);

  React.useEffect(() => {
    if (initialRecipient) setRecipient(initialRecipient);
    if (initialMessage) setMessage(initialMessage);
    if (initialPhone) setPhone(initialPhone);
    setIsSent(false);
  }, [initialRecipient, initialMessage, initialPhone, isOpen]);

  if (!isOpen) return null;

  const quickContacts = [
    { name: 'Rohan (Friend)', phone: '+919876543210' },
    { name: 'Mummy', phone: '+919812345678' },
    { name: 'Papa', phone: '+919823456789' },
    { name: 'Office Team', phone: '+919934567890' },
  ];

  const handleSelectContact = (c: { name: string; phone: string }) => {
    setRecipient(c.name);
    setPhone(c.phone);
  };

  const handleSendWithPermission = () => {
    setIsSent(true);

    // Clean phone number (keep digits)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message);

    // Deep link to WhatsApp
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    const nativeScheme = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;

    setTimeout(() => {
      window.location.href = nativeScheme;
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>WhatsApp Message Confirmation</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  Permission Required
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Aapki explicit permission ke bina sandesh nahi bheja jayega
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

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Quick Contacts */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Quick Contacts:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickContacts.map((c, idx) => (
                <button
                  key={`${c.name}-${c.phone || idx}`}
                  onClick={() => handleSelectContact(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    recipient === c.name
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Recipient Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 pl-8"
                  placeholder="Name..."
                />
                <User className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 pl-8"
                  placeholder="+91..."
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Message Text</label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Message..."
                />
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              J. A. R. V. I. S. kabhi background me bina dikhaye message nahi bhejta. "Send" dabane par seedha WhatsApp me pre-filled message open hoga jahan aap send press karenge.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSendWithPermission}
              disabled={isSent}
              className="flex-[2] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95"
            >
              {isSent ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Haan, WhatsApp Me Bhejein</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
