import React, { useState } from 'react';
import { 
  ThumbsUp, ThumbsDown, CheckCircle2, Clock, ShieldAlert, 
  X, AlertTriangle, Image as ImageIcon, MapPin, Eye, Check, AlertOctagon 
} from 'lucide-react';
import { CommunityReport } from '../../types';

interface VerificationDrawerProps {
  report: CommunityReport;
  onVote: (reportId: string, voteType: 'upvote' | 'downvote' | 'resolve' | 'verify' | 'dispute') => void;
  onClose: () => void;
  userLocation?: [number, number] | null;
  highContrast: boolean;
}

export const VerificationDrawer: React.FC<VerificationDrawerProps> = ({
  report,
  onVote,
  onClose,
  userLocation,
  highContrast,
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const status = report.verification_status || report.status;
  const isVerified = status === 'VERIFIED' || status === 'CONFIRMED' || report.confidence_level === 'HIGH';
  const isDisputed = status === 'DISPUTED';
  const isResolved = status === 'RESOLVED';
  const isCritical = report.severity === 'critical' || report.severity === 'severe';

  const getFreshnessLabel = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  // Distance computation from current user location if available
  let distanceDisplay: string | null = null;
  if (userLocation && report.latitude && report.longitude) {
    const dLat = (report.latitude - userLocation[0]) * (Math.PI / 180);
    const dLng = (report.longitude - userLocation[1]) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLocation[0] * (Math.PI / 180)) * Math.cos(report.latitude * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distM = Math.round(6371000 * c);
    distanceDisplay = distM < 1000 ? `${distM} m from your position` : `${(distM / 1000).toFixed(1)} km from your position`;
  }

  return (
    <>
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 card-shadow-floating pointer-events-auto ${
          highContrast
            ? 'bg-black border-2 border-yellow-400 text-yellow-300'
            : 'bg-slate-900 border-slate-800 text-white shadow-2xl'
        }`}
        role="region"
        aria-label="Community Obstacle Verification"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${
                isCritical
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : isVerified
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : isDisputed
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              }`}
            >
              {isCritical ? <ShieldAlert className="w-5 h-5" /> : isVerified ? <CheckCircle2 className="w-5 h-5" /> : isDisputed ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isVerified ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> VERIFIED HAZARD
                  </span>
                ) : isDisputed ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-orange-950/80 text-orange-300 border border-orange-700">
                    ⚠️ DISPUTED REPORT
                  </span>
                ) : isResolved ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                    ✓ RESOLVED
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700">
                    🟡 COMMUNITY REPORTED
                  </span>
                )}

                {report.photo_url && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Photo Attached
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm sm:text-base text-white mt-1 leading-snug">
                {report.title}
              </h3>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Reported {getFreshnessLabel(report.reported_at)}
                </span>
                {distanceDisplay && (
                  <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                    <MapPin className="w-3 h-3" /> {distanceDisplay}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer touch-target-48"
            aria-label="Close report details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo Evidence Thumbnail if Present */}
        {report.photo_url && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative">
            <img
              src={report.photo_url}
              alt={report.title}
              className="w-full h-36 object-cover cursor-pointer hover:opacity-95 transition"
              onClick={() => setShowPhotoModal(true)}
            />
            <button
              onClick={() => setShowPhotoModal(true)}
              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-black text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full Photo</span>
            </button>
          </div>
        )}

        {/* Description / Step-Free Alternate Guidance */}
        {report.description && (
          <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-2xl border border-slate-800 leading-relaxed font-medium">
            {report.description}
          </p>
        )}

        {/* Community Verification & Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            <span className="font-extrabold text-white font-mono-nums">{report.upvotes}</span> confirms • <span className="font-mono-nums text-slate-400">{report.downvotes}</span> disputes
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onVote(report.id, 'verify')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Verify this obstacle is active"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>

            <button
              onClick={() => onVote(report.id, 'dispute')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Dispute report"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dispute</span>
            </button>

            <button
              onClick={() => onVote(report.id, 'resolve')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Mark obstacle as cleared"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cleared</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Modal Preview */}
      {showPhotoModal && report.photo_url && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{report.title}</h4>
                <p className="text-xs text-slate-400">Photo Evidence • Geotagged Community Report</p>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={report.photo_url}
              alt={report.title}
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
};
