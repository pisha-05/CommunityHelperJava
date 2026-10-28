import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, X, AlertTriangle, Construction, Droplets,
  Ban, MapPin, RefreshCw, Filter, CheckCircle2, Flag,
  Plus, Camera, Navigation, Flame, Eye, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { CommunityReport, RouteResult, EventZone } from '../../types';
import { calculateDistanceMeters } from '../../utils/geo';
import { formatDistance } from '../../utils/formatters';
import { getRealEventName, getEventEmoji, getTrafficImpactInfo } from '../../utils/eventUtils';

interface LiveHazardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: CommunityReport[];
  userLocation: [number, number] | null;
  onSelectHazardOnMap: (report: CommunityReport) => void;
  onOpenReportModal: () => void;
  onVoteReport: (reportId: string, type: 'upvote' | 'downvote') => void;
  onAvoidHazard?: (report: CommunityReport) => void;
  activeRoute?: RouteResult | null;
  highContrast: boolean;
  onRefreshReports: () => void;
  isLoading?: boolean;
}

type HazardFilter = 'all' | 'accessibility' | 'road' | 'construction' | 'water' | 'community';

export const LiveHazardsModal: React.FC<LiveHazardsModalProps> = ({
  isOpen,
  onClose,
  reports,
  userLocation,
  onSelectHazardOnMap,
  onOpenReportModal,
  onVoteReport,
  onAvoidHazard,
  activeRoute,
  highContrast,
  onRefreshReports,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<HazardFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<'nearby' | 'route'>('nearby');
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute distance from user for each report and sort by proximity
  const enrichedReports = useMemo(() => {
    return reports
      .filter((r) => r.status !== 'RESOLVED' && r.status !== 'EXPIRED')
      .map((rep) => {
        let distanceM = 0;
        if (userLocation) {
          distanceM = Math.round(
            calculateDistanceMeters(userLocation[0], userLocation[1], rep.latitude, rep.longitude)
          );
        }

        // Categorize into filter buckets
        let categoryGroup: HazardFilter = 'community';
        const cat = rep.category.toLowerCase();
        if (cat.includes('ramp') || cat.includes('elevator') || cat.includes('stairs') || cat.includes('slope')) {
          categoryGroup = 'accessibility';
        } else if (cat.includes('construction') || cat.includes('work')) {
          categoryGroup = 'construction';
        } else if (cat.includes('water') || cat.includes('flood')) {
          categoryGroup = 'water';
        } else if (cat.includes('road') || cat.includes('barricade') || cat.includes('pothole')) {
          categoryGroup = 'road';
        }

        return {
          ...rep,
          distanceM,
          categoryGroup,
        };
      })
      .sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
  }, [reports, userLocation]);

  // Filter based on selected category & scope
  const filteredReports = useMemo(() => {
    return enrichedReports.filter((rep) => {
      if (filter !== 'all' && rep.categoryGroup !== filter) {
        return false;
      }
      return true;
    });
  }, [enrichedReports, filter]);

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('ramp')) return '♿';
    if (c.includes('elevator')) return '🛗';
    if (c.includes('stairs')) return '🪜';
    if (c.includes('slope')) return '🦽';
    if (c.includes('construction')) return '🚧';
    if (c.includes('water') || c.includes('flood')) return '💧';
    if (c.includes('road') || c.includes('barricade')) return '🛑';
    if (c.includes('pothole')) return '🕳️';
    if (c.includes('rally') || c.includes('crowd')) return '📢';
    return '⚠️';
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider">Critical</span>;
      case 'severe':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white uppercase tracking-wider">Severe</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">Moderate</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 uppercase tracking-wider">Low</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md pointer-events-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-hazards-heading"
    >
      <div
        className={`w-full max-w-2xl rounded-3xl border flex flex-col max-h-[90vh] shadow-2xl overflow-hidden ${
          highContrast
            ? 'bg-black border-2 border-yellow-400 text-yellow-300'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="live-hazards-heading" className="font-extrabold text-base sm:text-lg tracking-tight">
                  Live Hazards & Barriers
                </h2>
                <span className="text-[11px] font-mono-nums font-bold px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-300">
                  {enrichedReports.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Real-time obstacles reported near your location
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshReports}
              disabled={isLoading}
              className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer touch-target-48 disabled:opacity-50"
              title="Refresh live reports"
              aria-label="Refresh live reports"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer touch-target-48"
              aria-label="Close live hazards panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Filter Tabs */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-slate-900/90">
          {[
            { id: 'all', label: 'All Hazards' },
            { id: 'accessibility', label: '♿ Accessibility' },
            { id: 'road', label: '🛑 Road' },
            { id: 'construction', label: '🚧 Construction' },
            { id: 'water', label: '💧 Flooding' },
            { id: 'community', label: '👥 Community' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as HazardFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                filter === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Hazards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredReports.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  No live hazards reported in this area
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  The active pedestrian corridor is clear. Notice an unmapped obstacle? Help the community by reporting it.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenReportModal();
                }}
                className="mt-2 px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Report an Obstacle</span>
              </button>
            </div>
          ) : (
            filteredReports.map((hazard) => {
              const hasPhoto = Boolean(hazard.photo_url && hazard.photo_url.length > 10);
              const isVerified = hazard.status === 'VERIFIED' || hazard.verification_status === 'VERIFIED';
              const upvotes = hazard.upvotes || 1;
              const downvotes = hazard.downvotes || 0;

              return (
                <div
                  key={hazard.id}
                  className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col gap-3 ${
                    highContrast
                      ? 'bg-black border-yellow-400 text-yellow-300'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  {/* Top Row: Icon, Title, Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {getCategoryIcon(hazard.category)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {getSeverityBadge(hazard.severity)}
                          {isVerified ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              Community Reported
                            </span>
                          )}
                          {hasPhoto && (
                            <button
                              onClick={() => setViewingPhotoUrl(hazard.photo_url || null)}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 hover:bg-cyan-900 transition cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> Photo Attached
                            </button>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                          {hazard.title}
                        </h4>
                        {hazard.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {hazard.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Proximity Distance */}
                    {hazard.distanceM !== undefined && (
                      <div className="text-right shrink-0">
                        <span className="font-mono-nums text-sm font-black text-cyan-400 block">
                          {formatDistance(hazard.distanceM)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">from you</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Preview Thumbnail if present */}
                  {hasPhoto && hazard.photo_url && (
                    <div
                      onClick={() => setViewingPhotoUrl(hazard.photo_url || null)}
                      className="rounded-xl overflow-hidden border border-slate-800 max-h-36 bg-black flex items-center justify-center cursor-pointer hover:opacity-90 transition group relative"
                    >
                      <img
                        src={hazard.photo_url}
                        alt="Hazard evidence"
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-extrabold transition gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Tap to view full photo</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    {/* Community Social Verification */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onVoteReport(hazard.id, 'upvote')}
                        className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 hover:text-emerald-300 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Confirm this hazard still exists"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Confirm ({upvotes})</span>
                      </button>
                      <button
                        onClick={() => onVoteReport(hazard.id, 'downvote')}
                        className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 border border-slate-700 text-xs font-bold text-slate-400 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Report this hazard as cleared or incorrect"
                      >
                        <Flag className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dispute ({downvotes})</span>
                      </button>
                    </div>

                    {/* View on Map & Avoid Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectHazardOnMap(hazard);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View on Map</span>
                      </button>
                      {onAvoidHazard && (
                        <button
                          onClick={() => {
                            onAvoidHazard(hazard);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <Navigation className="w-3.5 h-3.5 fill-current" />
                          <span>Avoid / Reroute</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Bottom Footer with Action to Report */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-400">
            Reports are verified by the AccessRoute community.
          </p>
          <button
            onClick={() => {
              onClose();
              onOpenReportModal();
            }}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Barrier</span>
          </button>
        </div>
      </div>

      {/* Photo Fullscreen Viewer */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-sm text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Community Photo Evidence</span>
              </span>
              <button
                onClick={() => setViewingPhotoUrl(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-80 bg-black flex items-center justify-center">
              <img
                src={viewingPhotoUrl}
                alt="Barrier photographic evidence"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-slate-400">
              Geotagged photographic evidence submitted via AccessRoute Live.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
