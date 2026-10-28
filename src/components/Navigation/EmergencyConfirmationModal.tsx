import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, X, PhoneCall, ShieldAlert, HeartHandshake, 
  MapPin, Share2, Copy, Check, MessageSquare, Phone, UserPlus,
  Save, AlertTriangle, ExternalLink
} from 'lucide-react';
import { MobilityProfileCode, RouteResult, IceContact } from '../../types';
import { getIceContact, saveIceContact } from '../../utils/storage';

interface EmergencyConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  highContrast: boolean;
  userLocation?: [number, number] | null;
  locationLabel?: string;
  activeProfile?: MobilityProfileCode | null;
  activeRoute?: RouteResult | null;
}

const PROFILE_DISPLAY_NAMES: Record<MobilityProfileCode, string> = {
  wheelchair: 'Wheelchair (Requires step-free ramps & elevators)',
  vision: 'Visual Impairment (Requires tactile guidance)',
  pram_elderly: 'Stroller / Senior (Requires elevator & gentle slopes)',
  walking: 'Pedestrian',
  car: 'Motor Vehicle',
  scooter: 'Scooter / Micro-mobility',
};

export const EmergencyConfirmationModal: React.FC<EmergencyConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  highContrast,
  userLocation,
  locationLabel,
  activeProfile,
  activeRoute,
}) => {
  const [copied, setCopied] = useState(false);
  const [iceContact, setIceContact] = useState<IceContact | null>(null);
  const [isEditingIce, setIsEditingIce] = useState(false);
  const [iceNameInput, setIceNameInput] = useState('');
  const [icePhoneInput, setIcePhoneInput] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedIce = getIceContact();
      setIceContact(savedIce);
      if (savedIce) {
        setIceNameInput(savedIce.name);
        setIcePhoneInput(savedIce.phone);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lat = userLocation ? userLocation[0].toFixed(6) : null;
  const lng = userLocation ? userLocation[1].toFixed(6) : null;
  const coordsText = lat && lng ? `${lat}, ${lng}` : 'GPS coordinates detecting...';
  const profileLabel = activeProfile ? PROFILE_DISPLAY_NAMES[activeProfile] : 'Accessible Mobility User';
  const mapLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '';

  const emergencyMessage = `🚨 EMERGENCY - ACCESSIBLE ASSISTANCE NEEDED 🚨
Current Location: ${locationLabel || 'Unknown Street'}
GPS Coordinates: ${coordsText}
Live Map Link: ${mapLink}
Mobility Requirements: ${profileLabel}
${activeRoute ? `Route Corridor: Step-Free Route to ${activeRoute.title}` : ''}
Please dispatch emergency or step-free assistance immediately.`;

  const handleCopyLocation = async () => {
    try {
      await navigator.clipboard.writeText(emergencyMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = emergencyMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EMERGENCY - Accessible Assistance Needed',
          text: emergencyMessage,
          url: mapLink || undefined,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLocation();
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(emergencyMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleSmsShare = () => {
    const encoded = encodeURIComponent(emergencyMessage);
    window.location.href = `sms:?body=${encoded}`;
  };

  const handleSaveIceContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iceNameInput.trim() || !icePhoneInput.trim()) return;
    const contact: IceContact = {
      name: iceNameInput.trim(),
      phone: icePhoneInput.trim(),
    };
    saveIceContact(contact);
    setIceContact(contact);
    setIsEditingIce(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in pointer-events-auto overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      aria-describedby="emergency-dialog-desc"
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-5 sm:p-6 border shadow-2xl flex flex-col gap-4 my-auto max-h-[92vh] overflow-y-auto ${
          highContrast
            ? 'bg-black text-yellow-300 border-2 border-yellow-400 shadow-yellow-500/20'
            : 'bg-slate-900 text-white border-red-500/40 shadow-red-600/20'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-red-900/40 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/50 text-red-500 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="emergency-dialog-title" className="text-lg font-black text-white tracking-tight">
                  Emergency SOS Hub
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                  URGENT
                </span>
              </div>
              <p className="text-xs text-red-300 font-medium mt-0.5">
                1-tap emergency dispatch & step-free assistance
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close emergency modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Location & Accessible Mobility Card */}
        <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">
                  YOUR CURRENT ACCESSIBLE LOCATION
                </span>
                <p className="text-xs font-bold text-white truncate mt-0.5">
                  {locationLabel || 'Current GPS Location'}
                </p>
                <p className="text-[11px] font-mono text-slate-300 mt-0.5 flex items-center gap-2">
                  <span>GPS: {coordsText}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyLocation}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition flex items-center gap-1.5 shrink-0 border border-slate-700 cursor-pointer"
              title="Copy GPS Coordinates and SOS briefing"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Copy GPS</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-red-900/50 flex items-center gap-2 text-[11px] text-red-200">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate"><strong>Mobility:</strong> {profileLabel}</span>
          </div>
        </div>

        {/* 1-Tap Emergency Sharing (WhatsApp, SMS, Native Share) */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            SHARE LIVE ACCESSIBLE LOCATION (1-TAP)
          </span>
          <div className="grid grid-cols-3 gap-2">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs transition active:scale-95 flex flex-col items-center justify-center gap-1 shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            {/* SMS Dispatch */}
            <button
              type="button"
              onClick={handleSmsShare}
              className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs transition active:scale-95 flex flex-col items-center justify-center gap-1 shadow-md shadow-blue-900/30 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>SMS Alert</span>
            </button>

            {/* Native Share / Copy */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-extrabold text-xs transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>{shareSuccess ? 'Shared!' : 'Share SOS'}</span>
            </button>
          </div>
        </div>

        {/* Emergency Quick Dial & Personal ICE Contact */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-red-400" />
              <span>Direct Emergency Contacts</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Local Emergency Helpline (112 / 911) */}
            <a
              href="tel:112"
              className="py-3 px-3.5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs flex items-center justify-between gap-2 shadow-lg shadow-red-900/40 transition active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4" />
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-bold text-red-100 uppercase">Emergency Services</div>
                  <div className="text-sm font-black">Call 112 / 911</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-red-200 shrink-0" />
            </a>

            {/* Personal In-Case-Of-Emergency (ICE) Contact */}
            {iceContact && !isEditingIce ? (
              <div className="py-2.5 px-3 rounded-2xl bg-slate-700/80 border border-slate-600 text-white flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">ICE (Family / Caregiver)</div>
                  <div className="text-xs font-black truncate">{iceContact.name}</div>
                  <div className="text-[11px] font-mono text-cyan-400">{iceContact.phone}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`tel:${iceContact.phone}`}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
                    title={`Call ${iceContact.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsEditingIce(true)}
                    className="p-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-slate-200 transition text-[10px] font-bold"
                    title="Edit ICE Contact"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveIceContact} className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-slate-700">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Set ICE Caregiver Contact</span>
                  {iceContact && (
                    <button type="button" onClick={() => setIsEditingIce(false)} className="text-slate-400 hover:text-white">
                      Cancel
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Caregiver Name"
                    value={iceNameInput}
                    onChange={(e) => setIceNameInput(e.target.value)}
                    className="w-1/2 p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={icePhoneInput}
                    onChange={(e) => setIcePhoneInput(e.target.value)}
                    className="w-1/2 p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="py-1.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <Save className="w-3 h-3" />
                  <span>Save ICE Contact</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Priority Emergency Corridors Action */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            DISMISS
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs tracking-wider uppercase shadow-sm shadow-red-600/30 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>ACTIVATE HOSPITAL CORRIDORS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
