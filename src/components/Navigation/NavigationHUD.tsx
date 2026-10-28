import React, { useEffect, useState, useRef } from 'react';
import { 
  Volume2, VolumeX, ArrowUp, ArrowLeft, ArrowRight, 
  CheckCircle2, X, ShieldAlert, RotateCcw, AlertTriangle, 
  Camera, ChevronDown, ChevronUp, MapPin, Eye, RefreshCw, 
  Sparkles, Check, Image as ImageIcon, Flame, Activity, Clock,
  AlertOctagon, HardDriveDownload
} from 'lucide-react';
import { RouteResult, CommunityReport, EventZone, ConstructionSite, RouteTrafficResponse, TrafficIncident } from '../../types';
import { voiceAssistant } from '../../services/voiceAssistant';
import { formatDuration } from '../../utils/formatters';
import { getRealEventName, getEventEmoji, getTrafficImpactInfo, buildEventVoiceAnnouncement } from '../../utils/eventUtils';

interface NavigationHUDProps {
  route: RouteResult;
  currentStepIndex: number;
  remainingDistance: number;
  remainingSeconds: number;
  onExitNavigation: () => void;
  onTriggerObstacleAlert: () => void;
  onOpenReportModal?: () => void;
  onOpenEmergencyModal?: () => void;
  isOfflineMode?: boolean;
  onRecalculateDetour?: () => void;
  onOpenEventDetails?: (event: EventZone) => void;
  onOpenConstructionDetails?: (site: ConstructionSite) => void;
  onSelectTrafficIncident?: (incident: TrafficIncident) => void;
  reports?: CommunityReport[];
  events?: EventZone[];
  constructionSites?: ConstructionSite[];
  trafficData?: RouteTrafficResponse | null;
  trafficLastUpdatedText?: string;
  highContrast: boolean;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  route,
  currentStepIndex,
  remainingDistance,
  remainingSeconds,
  onExitNavigation,
  onTriggerObstacleAlert,
  onOpenReportModal,
  onOpenEmergencyModal,
  isOfflineMode = false,
  onRecalculateDetour,
  onOpenEventDetails,
  onOpenConstructionDetails,
  onSelectTrafficIncident,
  reports = [],
  events = [],
  constructionSites = [],
  trafficData,
  trafficLastUpdatedText,
  highContrast,
}) => {
  const [isMuted, setIsMuted] = useState(voiceAssistant.getIsMuted());
  const [isLiveConditionsExpanded, setIsLiveConditionsExpanded] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const spokenFeatureIdsRef = useRef<Set<string>>(new Set());
  const announcedConstructionThresholdsRef = useRef<Map<string, Set<number>>>(new Map());
  const announcedTrafficDelayRef = useRef<number>(-1);

  const [activeHazardBanner, setActiveHazardBanner] = useState<{
    id: string;
    icon: string;
    title: string;
    realName?: string;
    description: string;
    distanceM: number;
    impact: string;
    severity: 'low' | 'moderate' | 'severe' | 'critical' | 'info';
    hasPhoto?: boolean;
    photoUrl?: string;
    actionLabel: string;
    isAccessibleFeature?: boolean;
    isEvent?: boolean;
    eventObj?: EventZone;
    isConstruction?: boolean;
    constructionObj?: ConstructionSite;
    isTrafficIncident?: boolean;
    trafficIncidentObj?: TrafficIncident;
  } | null>(null);

  const currentStep = route.steps[currentStepIndex] || route.steps[0];

  // Compute upcoming conditions & accessibility infrastructure from real route features
  const upcomingConditions = React.useMemo(() => {
    const list: Array<{
      id: string;
      icon: string;
      title: string;
      realName?: string;
      distanceM: number;
      type: string;
      severity: string;
      source: string;
      photoUrl?: string;
      isAccessibleFeature?: boolean;
      isEvent?: boolean;
      eventObj?: EventZone;
      isConstruction?: boolean;
      constructionObj?: ConstructionSite;
      isTrafficIncident?: boolean;
      trafficIncidentObj?: TrafficIncident;
    }> = [];

    // Calculate approximate user progress in meters along route
    const totalDist = route.distance_meters || 1000;
    const progressM = Math.max(0, totalDist - remainingDistance);

    if (route.features && route.features.length > 0) {
      route.features.forEach((feat) => {
        const remainingToFeat = Math.max(0, feat.distance_along_route_m - progressM);
        if (remainingToFeat >= 0 && remainingToFeat <= 1500) {
          let icon = '♿';
          const isEvent = feat.feature_type === 'event';
          let realEventName = feat.title;

          if (feat.feature_type === 'elevator') icon = '🛗';
          else if (feat.feature_type === 'stairs') icon = '🪜';
          else if (isEvent) {
            realEventName = feat.event_name || getRealEventName({
              title: feat.title,
              name: feat.title,
              event_type: feat.event_type || undefined,
            });
            icon = getEventEmoji(feat.event_type || undefined, realEventName);
          } else if (feat.feature_type === 'hazard' || feat.feature_type === 'obstruction') {
            icon = '⚠️';
          }

          const isAccess = feat.feature_type === 'ramp' || feat.feature_type === 'elevator';
          const matchedEvent = events.find((e) => e.id === feat.id.replace('event-', '') || feat.title.includes(e.title || ''));

          list.push({
            id: feat.id,
            icon,
            title: realEventName,
            realName: realEventName,
            distanceM: Math.round(remainingToFeat),
            type: isAccess ? (feat.feature_type === 'ramp' ? 'Accessible Ramp' : 'Elevator') : isEvent ? 'event' : feat.feature_type === 'stairs' ? 'Stairs' : 'Barrier / Event',
            severity: feat.severity || 'info',
            source: feat.source || 'Official Event Feed',
            photoUrl: feat.photo_url || undefined,
            isAccessibleFeature: isAccess,
            isEvent,
            eventObj: matchedEvent || (isEvent ? {
              id: feat.id,
              name: realEventName,
              event_name: realEventName,
              title: realEventName,
              event_type: feat.event_type || 'public_event',
              risk_level: feat.severity === 'critical' ? 'extreme' : 'high',
              traffic_impact: (feat.traffic_impact as any) || 'HIGH',
              polygon: [],
              description: feat.description,
              is_active: true,
              time_window: feat.time_window || '6:00 AM – 11:00 AM',
              impact_reasons: feat.impact_reasons || ['Heavy traffic', 'Road restrictions', 'Crowding', 'Delays'],
              source: feat.source || 'Official Event Feed',
              distance_m: Math.round(remainingToFeat),
            } : undefined),
          });
        }
      });
    }

    // Check active events from props
    events.forEach((ev) => {
      if (!ev.is_active) return;
      const realName = getRealEventName(ev);
      const evDist = ev.distance_m || 650;
      if (!list.some((it) => it.id.includes(ev.id) || it.title === realName)) {
        list.push({
          id: `ev-${ev.id}`,
          icon: getEventEmoji(ev.event_type, realName),
          title: realName,
          realName: realName,
          distanceM: evDist,
          type: 'event',
          severity: ev.traffic_impact === 'HIGH' || ev.traffic_impact === 'CRITICAL' ? 'severe' : 'moderate',
          source: ev.source || 'Official Event Feed',
          isEvent: true,
          eventObj: ev,
        });
      }
    });

    // Check step hazard alerts if any
    route.steps.forEach((st, idx) => {
      if (st.hazard_alert && idx >= currentStepIndex) {
        const dist = Math.max(40, (idx - currentStepIndex) * 150 + st.distance_meters);
        list.push({
          id: `step-haz-${idx}`,
          icon: st.hazard_alert.includes('stairs') ? '🪜' : '⚠️',
          title: st.hazard_alert.replace(/[⚠⛔]/g, '').trim(),
          distanceM: dist,
          type: 'Route Infrastructure',
          severity: 'severe',
          source: 'OpenStreetMap Network',
        });
      }
    });

    // Check community reports
    reports.forEach((rep) => {
      if (rep.status === 'RESOLVED' || rep.status === 'EXPIRED') return;
      if (!list.some((it) => it.id.includes(rep.id))) {
        let icon = '⚠️';
        if (rep.category === 'broken_ramp') icon = '♿';
        else if (rep.category === 'stairs') icon = '🪜';
        else if (rep.category === 'construction') icon = '🚧';
        else if (rep.category === 'rally') icon = '📢';

        list.push({
          id: rep.id,
          icon,
          title: rep.title,
          distanceM: 180,
          type: 'Community Report',
          severity: rep.severity,
          source: rep.verification_status === 'VERIFIED' ? 'Verified Hazard' : 'Community Reported',
          photoUrl: rep.photo_url || undefined,
        });
      }
    });

    // Check real OpenStreetMap construction sites along route
    constructionSites.forEach((site) => {
      const remainingToSite = Math.max(0, site.distance_along_route_m - progressM);
      if (remainingToSite >= 0 && remainingToSite <= 2000) {
        list.push({
          id: site.id,
          icon: '🚧',
          title: site.name || 'Road Construction',
          realName: site.name || 'Road Construction',
          distanceM: Math.round(remainingToSite),
          type: site.construction_type || 'Construction Site',
          severity: site.is_on_route ? 'severe' : 'moderate',
          source: site.source || 'OpenStreetMap',
          isConstruction: true,
          constructionObj: site,
        });
      }
    });

    // Check real live traffic incidents & bottlenecks
    if (trafficData?.incidents && trafficData.incidents.length > 0) {
      trafficData.incidents.forEach((inc) => {
        const remainingToInc = Math.max(0, inc.distance_along_route_m - progressM);
        if (remainingToInc >= 0 && remainingToInc <= 2500) {
          let icon = '🚨';
          if (inc.incident_type === 'accident') icon = '💥';
          else if (inc.incident_type === 'road_closure' || inc.incident_type === 'blocked_road') icon = '🛑';
          else if (inc.incident_type === 'slowdown') icon = '🐢';
          else if (inc.incident_type === 'congestion') icon = '🚗';
          else if (inc.incident_type === 'construction') icon = '🚧';

          list.push({
            id: inc.id,
            icon,
            title: inc.title,
            realName: inc.title,
            distanceM: Math.round(remainingToInc),
            type: `Traffic: ${inc.incident_type.replace('_', ' ')}`,
            severity: inc.severity,
            source: inc.source || 'Geoapify Live Feed',
            isTrafficIncident: true,
            trafficIncidentObj: inc,
          });
        }
      });
    }

    return list.sort((a, b) => a.distanceM - b.distanceM);
  }, [route, currentStepIndex, remainingDistance, reports, events, constructionSites, trafficData]);

  // Real Traffic Voice Warning Announcements (Heavy / Severe Delay)
  useEffect(() => {
    if (!trafficData || trafficData.status !== 'success') return;

    const delaySec = trafficData.delay_seconds || 0;
    const delayMin = Math.ceil(delaySec / 60);
    const cong = trafficData.overall_congestion_level;

    // Only announce if severe/heavy congestion and delay has materially changed (> 2 min diff)
    if (cong === 'severe' || (cong === 'heavy' && delayMin >= 3)) {
      if (Math.abs(announcedTrafficDelayRef.current - delayMin) >= 2) {
        announcedTrafficDelayRef.current = delayMin;
        const voiceText = cong === 'severe'
          ? `Severe congestion ahead on your route. Approximately ${delayMin} minutes of additional delay.`
          : `Heavy traffic ahead. Approximately ${delayMin} minutes of additional delay.`;
        
        voiceAssistant.speak(voiceText, { priority: 'hazard' });
      }
    }
  }, [trafficData]);

  // Real GPS Distance-based Voice Announcements for Construction Ahead (500m, 200m, 50m)
  useEffect(() => {
    const totalDist = route.distance_meters || 1000;
    const progressM = Math.max(0, totalDist - remainingDistance);

    constructionSites.forEach((site) => {
      const remainingToSite = Math.max(0, site.distance_along_route_m - progressM);
      if (!announcedConstructionThresholdsRef.current.has(site.id)) {
        announcedConstructionThresholdsRef.current.set(site.id, new Set());
      }
      const set = announcedConstructionThresholdsRef.current.get(site.id)!;

      // 500 m warning
      if (remainingToSite <= 550 && remainingToSite >= 400 && !set.has(500)) {
        set.add(500);
        voiceAssistant.speak('Construction ahead in 500 meters.');
      }
      // 200 m warning
      else if (remainingToSite <= 250 && remainingToSite >= 150 && !set.has(200)) {
        set.add(200);
        voiceAssistant.speak('Construction ahead in 200 meters.');
      }
      // 50 m warning
      else if (remainingToSite <= 70 && remainingToSite >= 0 && !set.has(50)) {
        set.add(50);
        voiceAssistant.speak('Construction area ahead.');
      }
    });
  }, [remainingDistance, constructionSites, route]);

  // Set active prominent hazard/accessibility/construction banner when approaching
  useEffect(() => {
    if (upcomingConditions.length > 0 && upcomingConditions[0].distanceM <= 950) {
      const nearest = upcomingConditions[0];
      const isAccess = nearest.isAccessibleFeature;
      const isEvent = nearest.isEvent || nearest.type === 'event';
      const isConstruction = nearest.isConstruction;
      const constrSite = nearest.constructionObj;

      setActiveHazardBanner({
        id: nearest.id,
        icon: nearest.icon,
        title: nearest.title.toUpperCase(),
        realName: nearest.realName || nearest.title,
        description: isConstruction
          ? (constrSite?.is_on_route ? 'Road construction detected directly on path.' : `${Math.round(constrSite?.distance_from_route_m || 0)} m from route. Possible traffic or pedestrian disruption.`)
          : isEvent
          ? 'Your route may experience delays.'
          : isAccess
          ? `Verified step-free access ahead in ${nearest.distanceM} m.`
          : 'Obstacle on route corridor. Real-time accessible alternative available.',
        distanceM: nearest.distanceM,
        impact: isConstruction
          ? (constrSite?.is_on_route ? '⚠️ Active roadwork on route' : '🚧 Construction near corridor')
          : isEvent
          ? '🔴 High traffic impact'
          : isAccess
          ? 'Step-free transit point'
          : 'Affects accessibility corridor',
        severity: nearest.severity as any,
        hasPhoto: Boolean(nearest.photoUrl),
        photoUrl: nearest.photoUrl,
        actionLabel: isConstruction
          ? (constrSite?.is_on_route ? 'RECALCULATE' : 'VIEW DETAILS')
          : isEvent
          ? 'ALTERNATIVE ROUTE'
          : isAccess
          ? 'View details'
          : 'Find safer route',
        isAccessibleFeature: isAccess,
        isEvent,
        eventObj: nearest.eventObj,
        isConstruction,
        constructionObj: constrSite,
      });

      // Announce condition via voice only once per feature ID
      if (!spokenFeatureIdsRef.current.has(nearest.id)) {
        spokenFeatureIdsRef.current.add(nearest.id);

        let speechText = '';
        if (isConstruction) {
          speechText = `Caution: ${nearest.title} ahead in ${nearest.distanceM} meters.`;
        } else if (isEvent && nearest.eventObj) {
          speechText = buildEventVoiceAnnouncement(nearest.eventObj, nearest.distanceM);
        } else if (isAccess) {
          speechText = `${nearest.title} ahead in ${nearest.distanceM} meters.`;
        } else {
          speechText = `Caution: ${nearest.title} reported ahead in ${nearest.distanceM} meters.`;
        }
        voiceAssistant.speak(speechText);
      }
    } else {
      setActiveHazardBanner(null);
    }
  }, [upcomingConditions]);

  // Announce step instruction on step change
  useEffect(() => {
    if (currentStep) {
      const prompt = `${currentStep.instruction}. ${currentStep.accessibility_note || ''}`;
      voiceAssistant.speak(prompt);
    }
  }, [currentStepIndex]);

  const handleToggleMute = () => {
    const muted = voiceAssistant.toggleMute();
    setIsMuted(muted);
  };

  const handleRepeatInstruction = () => {
    if (currentStep) {
      const prompt = `${currentStep.instruction}. ${currentStep.accessibility_note || ''}`;
      voiceAssistant.speak(prompt);
    }
  };

  const getManeuverIcon = (maneuver: string) => {
    switch (maneuver) {
      case 'turn-left':
        return <ArrowLeft className="w-9 h-9 text-white" />;
      case 'turn-right':
        return <ArrowRight className="w-9 h-9 text-white" />;
      case 'arrive':
        return <CheckCircle2 className="w-9 h-9 text-white" />;
      default:
        return <ArrowUp className="w-9 h-9 text-white" />;
    }
  };

  // Estimated Arrival Time calculation
  const etaDate = new Date(Date.now() + remainingSeconds * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDuration = formatDuration(Math.max(1, Math.ceil(remainingSeconds / 60)));

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-2.5 sm:p-4 safe-top safe-bottom">
      {/* 1. TOP HEADER: NEXT TURN INSTRUCTION */}
      <div className="flex flex-col gap-2 max-w-xl mx-auto w-full pointer-events-auto">
        <div
          className={`rounded-3xl p-3.5 sm:p-4 card-shadow-floating border flex items-center justify-between gap-3 transition-all duration-200 ${
            highContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-400'
              : 'bg-slate-900/95 backdrop-blur-xl text-white border-slate-800 shadow-2xl'
          }`}
          role="region"
          aria-live="assertive"
          aria-label="Upcoming turn instruction"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
              {getManeuverIcon(currentStep.maneuver)}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono-nums tracking-tight">
                  {currentStep.distance_meters} m
                </span>
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-300 truncate max-w-[130px]">
                  {currentStep.street_name}
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold mt-0.5 leading-snug truncate">
                {currentStep.instruction}
              </h2>
              {currentStep.accessibility_note && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 truncate">
                  <span>✓ {currentStep.accessibility_note}</span>
                </p>
              )}
            </div>
          </div>

          {/* Exit & Voice Mute Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isOfflineMode && (
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 text-[10px] font-black uppercase tracking-wider">
                <HardDriveDownload className="w-3 h-3" />
                <span>Offline</span>
              </span>
            )}
            <button
              onClick={handleToggleMute}
              className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 touch-target-48 cursor-pointer"
              title={isMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
              aria-label={isMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onExitNavigation}
              className="w-9 h-9 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition active:scale-95 touch-target-48 cursor-pointer shadow-md"
              title="Exit live navigation"
              aria-label="Exit live navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. IN-NAVIGATION WARNING ALERT CARD (APPEARS DIRECTLY ON SCREEN) */}
        {activeHazardBanner && (
          activeHazardBanner.isConstruction ? (
            /* REAL OSM CONSTRUCTION ROUTE WARNING */
            <div
              className={`rounded-3xl p-4 border animate-bounce-short shadow-2xl flex flex-col gap-3 ${
                highContrast
                  ? 'bg-black border-2 border-yellow-400 text-yellow-300'
                  : activeHazardBanner.constructionObj?.is_on_route
                  ? 'bg-gradient-to-r from-red-950/98 via-slate-900/95 to-amber-950/95 backdrop-blur-xl border-red-500/80 text-white shadow-red-950/50'
                  : 'bg-gradient-to-r from-amber-950/98 via-slate-900/95 to-slate-900/95 backdrop-blur-xl border-amber-500/80 text-white shadow-amber-950/50'
              }`}
              role="alert"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0 leading-none mt-0.5">🚧</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      activeHazardBanner.constructionObj?.is_on_route ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {activeHazardBanner.constructionObj?.is_on_route ? '⚠️ CONSTRUCTION ON ROUTE' : '🚧 CONSTRUCTION NEAR ROUTE'}
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono-nums">
                      in {activeHazardBanner.distanceM} m
                    </span>
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-white tracking-wide uppercase truncate mt-0.5">
                    {activeHazardBanner.realName || activeHazardBanner.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {activeHazardBanner.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => onOpenConstructionDetails && activeHazardBanner.constructionObj && onOpenConstructionDetails(activeHazardBanner.constructionObj)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-700 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  VIEW CONSTRUCTION
                </button>
                <button
                  onClick={onRecalculateDetour || onTriggerObstacleAlert}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-red-600/30"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                  RECALCULATE
                </button>
              </div>
            </div>
          ) : activeHazardBanner.isEvent ? (
            /* EVENT ROUTE WARNING */
            <div
              className={`rounded-3xl p-4 border animate-bounce-short shadow-2xl flex flex-col gap-3 ${
                highContrast
                  ? 'bg-black border-2 border-yellow-400 text-yellow-300'
                  : 'bg-slate-900/95 backdrop-blur-xl border-purple-500/80 text-white shadow-purple-950/50'
              }`}
              role="alert"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0 leading-none mt-0.5">{activeHazardBanner.icon}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-sm sm:text-base text-white tracking-wide uppercase truncate">
                    {activeHazardBanner.icon} {activeHazardBanner.realName || activeHazardBanner.title} AHEAD
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-300">
                    <span className="text-cyan-400 font-mono-nums">{activeHazardBanner.distanceM} m</span>
                    <span>•</span>
                    <span className="text-red-400 flex items-center gap-1">
                      <span>🔴</span> High traffic impact
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Your route may experience delays.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => onOpenEventDetails && activeHazardBanner.eventObj && onOpenEventDetails(activeHazardBanner.eventObj)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-slate-700 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  VIEW EVENT
                </button>
                <button
                  onClick={onRecalculateDetour || onTriggerObstacleAlert}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-red-600/30"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                  ALTERNATIVE ROUTE
                </button>
              </div>
            </div>
          ) : (
            /* GENERAL HAZARD / ACCESS CARD */
            <div
              className={`rounded-2xl p-3 sm:p-3.5 border animate-bounce-short shadow-xl flex items-center justify-between gap-3 ${
                highContrast
                  ? 'bg-black border-2 border-yellow-400 text-yellow-300'
                  : 'bg-gradient-to-r from-amber-950/95 to-slate-900/95 backdrop-blur-md border-amber-600/80 text-white'
              }`}
              role="alert"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl shrink-0">{activeHazardBanner.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500 text-black uppercase">
                      Hazard Ahead
                    </span>
                    <span className="text-xs font-black text-amber-300">
                      in {activeHazardBanner.distanceM} m
                    </span>
                    {activeHazardBanner.hasPhoto && (
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded-md border border-cyan-800 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Photo
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-white truncate mt-0.5">
                    {activeHazardBanner.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate">
                    {activeHazardBanner.description}
                  </p>
                </div>
              </div>

              <button
                onClick={onRecalculateDetour || onTriggerObstacleAlert}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shrink-0 transition active:scale-95 cursor-pointer shadow-md"
              >
                {activeHazardBanner.actionLabel}
              </button>
            </div>
          )
        )}
      </div>

      {/* 3. BOTTOM TELEMETRY & LIVE CONDITIONS DRAWER */}
      <div className="max-w-xl mx-auto w-full pointer-events-auto flex flex-col gap-2">
        {/* Expandable Live Conditions Timeline Section */}
        {isLiveConditionsExpanded && (
          <div
            className={`rounded-3xl p-4 border max-h-56 overflow-y-auto space-y-2 animate-fade-in shadow-2xl ${
              highContrast
                ? 'bg-black border-2 border-yellow-400 text-yellow-300'
                : 'bg-slate-900/98 backdrop-blur-xl border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Live Route Conditions</span>
              </span>
              <span>{upcomingConditions.length} reported</span>
            </div>

            {upcomingConditions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No verified obstacles or disruptions on active route.</p>
            ) : (
              upcomingConditions.map((cond) => (
                <div
                  key={cond.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{cond.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{cond.title}</p>
                      <span className="text-[10px] text-slate-400">{cond.source}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono-nums text-amber-400">
                      {cond.distanceM} m
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Main Telemetry & Action Bar */}
        <div
          className={`rounded-3xl p-3.5 sm:p-4 card-shadow-floating border transition-all duration-200 flex items-center justify-between gap-2.5 ${
            highContrast
              ? 'bg-black text-yellow-300 border-2 border-yellow-400'
              : 'bg-slate-900/95 backdrop-blur-xl text-white border-slate-800 shadow-2xl'
          }`}
        >
          {/* Left: Duration, Distance & Real Traffic Metrics */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-nums text-white">
                {formattedDuration}
              </span>
              <span className="text-xs font-extrabold text-cyan-400 font-mono-nums">
                {remainingDistance < 1000 ? `${Math.round(remainingDistance)} m` : `${(remainingDistance / 1000).toFixed(1)} km`}
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
              <span>ETA {etaFormatted}</span>
              <span>•</span>
              <span className="text-emerald-400">Step-Free</span>
              {trafficData && trafficData.status === 'success' ? (
                <>
                  <span>•</span>
                  <span className={`flex items-center gap-1 font-bold ${
                    trafficData.overall_congestion_level === 'severe' ? 'text-red-400' :
                    trafficData.overall_congestion_level === 'heavy' ? 'text-orange-400' :
                    trafficData.overall_congestion_level === 'moderate' ? 'text-yellow-400' :
                    'text-emerald-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>
                      {trafficData.delay_seconds > 0 
                        ? `+${Math.ceil(trafficData.delay_seconds / 60)}m delay` 
                        : 'Traffic: Free'}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span className="text-slate-500">Live traffic unavailable</span>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Conditions Toggle */}
            <button
              onClick={() => setIsLiveConditionsExpanded((prev) => !prev)}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                isLiveConditionsExpanded
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="View live hazard timeline"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Conditions</span>
              {isLiveConditionsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Repeat Turn Instruction */}
            <button
              onClick={handleRepeatInstruction}
              className="p-2.5 rounded-2xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/80 transition active:scale-95 touch-target-48 cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Repeat turn instruction"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Repeat</span>
            </button>

            {/* Prominent Geotagged Barrier Report Button */}
            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 transition active:scale-95 touch-target-48 cursor-pointer flex items-center gap-1.5"
                title="Report barrier at current GPS location with camera photo"
              >
                <Camera className="w-4 h-4" />
                <span>Barrier</span>
              </button>
            )}

            {/* Direct Emergency SOS Trigger Button */}
            {onOpenEmergencyModal && (
              <button
                onClick={onOpenEmergencyModal}
                className="px-3 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/40 transition active:scale-95 touch-target-48 cursor-pointer flex items-center gap-1 animate-pulse"
                title="Open Emergency SOS Assistance Hub"
                aria-label="Emergency SOS Assistance"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>SOS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-sm text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Barrier Photo Evidence</span>
              </span>
              <button
                onClick={() => setViewingPhotoUrl(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-80 bg-black flex items-center justify-center">
              <img src={viewingPhotoUrl} alt="Barrier photographic evidence" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-slate-400">
              Geotagged community photographic evidence submitted via AccessRoute Live.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
