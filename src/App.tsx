import React, { useState, useEffect, useRef } from 'react';
import { MapView } from './components/Map/MapView';
import { MapControls } from './components/Map/MapControls';
import { AppHeader } from './components/Navigation/AppHeader';
import { GlobalSidebar, SidebarSection } from './components/Navigation/GlobalSidebar';
import { CommandPalette } from './components/Navigation/CommandPalette';
import { SavedPlacesModal } from './components/Navigation/SavedPlacesModal';
import { SettingsModal } from './components/Navigation/SettingsModal';
import { EmergencyConfirmationModal } from './components/Navigation/EmergencyConfirmationModal';
import { FloatingSearchBar } from './components/Search/FloatingSearchBar';
import { PlaceDetailsCard } from './components/Directions/PlaceDetailsCard';
import { DirectionsPanel } from './components/Directions/DirectionsPanel';
import { MobilityProfileSelector } from './components/Directions/MobilityProfileSelector';
import { RouteResultsSheet } from './components/Directions/RouteResultsSheet';
import { NavigationHUD } from './components/Navigation/NavigationHUD';
import { ObstacleAlertModal } from './components/Navigation/ObstacleAlertModal';
import { ReportModal } from './components/Crowdsourcing/ReportModal';
import { VerificationDrawer } from './components/Crowdsourcing/VerificationDrawer';
import { ScreenReaderTable } from './components/Accessibility/ScreenReaderTable';
import { VoiceWelcomeModal } from './components/Voice/VoiceWelcomeModal';
import { LiveHazardsModal } from './components/Crowdsourcing/LiveHazardsModal';
import { MobileBottomSheet } from './components/Navigation/MobileBottomSheet';
import { VoiceAssistantHUD } from './components/Voice/VoiceAssistantHUD';
import { VoiceOrb } from './components/Voice/VoiceOrb';
import { DeveloperDebugPanel } from './components/Navigation/DeveloperDebugPanel';
import { EventCardModal } from './components/Events/EventCardModal';
import { EventsAffectingRoutePanel } from './components/Events/EventsAffectingRoutePanel';
import { ConstructionDetailsModal } from './components/Navigation/ConstructionDetailsModal';
import { ConstructionWarningBanner } from './components/Navigation/ConstructionWarningBanner';
import { 
  Place, RouteResult, CommunityReport, EventZone, 
  MapLayerConfig, MobilityProfileCode, ReportCategory, SearchResult,
  ConstructionSite, RouteTrafficResponse, TrafficIncident, SavedRoute
} from './types';
import { 
  fetchPlaces, fetchReports, submitReportApi, 
  voteReportApi, fetchEvents, calculateRoutesApi, calculateRerouteApi,
  lookupAccessibilityApi, searchLocationsApi, reverseGeocodeApi,
  fetchRouteConstructionApi, fetchRouteTrafficApi
} from './services/api';
import { calculateDistanceKm, distanceToPolylineMeters } from './utils/geo';
import { voiceAssistant, VoiceState, VoiceIntent } from './services/voiceAssistant';
import { getRealEventName } from './utils/eventUtils';
import { 
  migrateLegacyStorage, getSavedPlaces, savePlaceToStorage, 
  removeSavedPlaceFromStorage, getRecentTrips, addRecentTripToStorage, 
  getSavedProfile, saveProfileToStorage, isVoiceOnboardingComplete, 
  setVoiceOnboardingComplete, isVoiceEnabled, setVoiceEnabled, 
  isSidebarCollapsed, setSidebarCollapsed, getSavedHighContrast, 
  saveHighContrastToStorage, getSavedFontScale, saveFontScaleToStorage,
  getSavedRoutes, saveRouteToStorage, removeSavedRouteFromStorage, isRouteSaved
} from './utils/storage';

import { AlertCircle, X, Sparkles, WifiOff, ChevronLeft, ChevronRight, Bookmark, Navigation as NavIcon, Accessibility as AccessIcon, SlidersHorizontal, MapPin } from 'lucide-react';

export const App: React.FC = () => {
  // Run one-time migration for legacy keys on app startup
  useEffect(() => {
    migrateLegacyStorage();
  }, []);

  // Map & Real Geolocation States
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    'IDLE' | 'REQUESTING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE' | 'ERROR'
  >('IDLE');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchBias, setSearchBias] = useState<[number, number] | undefined>(undefined);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  // Data states (Start empty for new user)
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [events, setEvents] = useState<EventZone[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => getSavedPlaces());
  const [recentTrips, setRecentTrips] = useState<Place[]>(() => getRecentTrips());
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => getSavedRoutes());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isNavigatingOfflineRoute, setIsNavigatingOfflineRoute] = useState<boolean>(false);

  // Network Connectivity Monitoring for Offline Route Support
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setBannerMessage('Back online. Live traffic & hazard sync active.');
      setTimeout(() => setBannerMessage(null), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setBannerMessage('📶 Offline Mode: Saved offline routes and cached maps remain active.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Bridge for Map Popups: "Directions here"
  useEffect(() => {
    (window as any).accessrouteSetDestination = (name: string, lat: number, lng: number) => {
      setSelectedPlace({
        id: 'place-' + Date.now(),
        name,
        latitude: lat,
        longitude: lng,
        category: 'Destination',
        address: name,
        city: 'Current Area',
        accessibility: {
          has_ramp: true,
          has_accessible_entrance: true,
          has_elevator: false,
          has_tactile_paving: false,
          elevator_status: 'operational',
        }
      });
      setRoutes([]);
      setIsDesktopRoutePanelCollapsed(false);
    };
    return () => {
      delete (window as any).accessrouteSetDestination;
    };
  }, []);
  
  // Selection states (Neutral initial state)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [mobilityProfile, setMobilityProfile] = useState<MobilityProfileCode | null>(() => getSavedProfile());
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  
  // Real Traffic States (Geoapify Live Traffic Engine)
  const [trafficData, setTrafficData] = useState<RouteTrafficResponse | null>(null);
  const [trafficLastUpdated, setTrafficLastUpdated] = useState<Date | null>(null);
  const [trafficLastUpdatedText, setTrafficLastUpdatedText] = useState<string>('');
  const [trafficStatusMessage, setTrafficStatusMessage] = useState<string | null>(null);
  const trafficIntervalRef = useRef<any>(null);
  const trafficAnnouncedAlertRef = useRef<string>('');

  // Real OpenStreetMap Route Corridor Construction States
  const [constructionSites, setConstructionSites] = useState<ConstructionSite[]>([]);
  const [selectedConstruction, setSelectedConstruction] = useState<ConstructionSite | null>(null);
  const [constructionStatusMessage, setConstructionStatusMessage] = useState<string | null>(null);
  const [corridorDistanceM, setCorridorDistanceM] = useState<number>(50);
  
  // Navigation & Global Sidebar States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => isSidebarCollapsed());
  const [activeSidebarSection, setActiveSidebarSection] = useState<SidebarSection>('explore');
  const [showSavedPlacesModal, setShowSavedPlacesModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] = useState(false);

  // Toast Banner State
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Voice-First Accessibility States
  const [showVoiceWelcome, setShowVoiceWelcome] = useState<boolean>(() => !isVoiceOnboardingComplete());
  const [isVoiceAssistantActive, setIsVoiceAssistantActive] = useState<boolean>(() => isVoiceEnabled());
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceMessage, setVoiceMessage] = useState<string>('Welcome to AccessRoute Live. Where would you like to go?');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceIsListening, setVoiceIsListening] = useState<boolean>(false);
  const [voiceIsMuted, setVoiceIsMuted] = useState<boolean>(false);
  const pendingVoiceActionRef = useRef<
    | { type: 'DESTINATION_CONFIRM'; place: Place }
    | { type: 'ROUTE_CONFIRM'; route: RouteResult }
    | { type: 'DETOUR_CONFIRM' }
    | { type: 'EMERGENCY_CONFIRM' }
    | null
  >(null);

  // UI Panels & Modals
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [originName, setOriginName] = useState<string>('');
  const [routingErrorMessage, setRoutingErrorMessage] = useState<string | null>(null);
  const [isDesktopRoutePanelCollapsed, setIsDesktopRoutePanelCollapsed] = useState(false);
  const [showProfileSelectorModal, setShowProfileSelectorModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLiveHazardsModal, setShowLiveHazardsModal] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [showScreenReaderTable, setShowScreenReaderTable] = useState(false);
  const [showObstacleAlert, setShowObstacleAlert] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<EventZone | null>(null);
  const [showEventsAffectingPanel, setShowEventsAffectingPanel] = useState(false);

  const handleSelectEvent = (event: EventZone) => {
    setSelectedEventForModal(event);
    if (event.center && event.center.length >= 2) {
      setMapCenter(event.center);
      setMapZoom(16);
    } else if (event.polygon && event.polygon.length > 0) {
      setMapCenter(event.polygon[0]);
      setMapZoom(16);
    }
  };

  const handleAvoidEvent = (event: EventZone) => {
    const realName = getRealEventName(event);
    if (activeRoute && selectedPlace) {
      handleTriggerObstacleAlert();
      const voiceText = `Recalculating alternative step-free route to avoid ${realName}.`;
      setVoiceMessage(voiceText);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(voiceText);
      }
    } else {
      setBannerMessage(`Alternative step-free route set to avoid ${realName}.`);
    }
  };

  // Live Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navPosition, setNavPosition] = useState<[number, number] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const navIntervalRef = useRef<any>(null);
  const isReroutingRef = useRef<boolean>(false);
  const activeRouteRef = useRef<RouteResult | null>(null);
  const selectedPlaceRef = useRef<Place | null>(null);
  const mobilityProfileRef = useRef<MobilityProfileCode>('wheelchair');

  // High Contrast & Typography Scale Accessibility States
  const [highContrast, setHighContrast] = useState<boolean>(() => getSavedHighContrast());
  const [fontScale, setFontScale] = useState<number>(() => getSavedFontScale());

  // Map Layers & Accessibility (clean default view)
  const [layers, setLayers] = useState<MapLayerConfig>({
    showHazards: false,
    showRamps: false,
    showEvents: false,
    showTactile: false,
    showTraffic: false,
    highContrast: getSavedHighContrast(),
    satelliteView: false,
  });

  // Apply and persist High Contrast Mode globally
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    if (document.body) {
      document.body.classList.toggle('high-contrast', highContrast);
    }
    saveHighContrastToStorage(highContrast);
    setLayers((prev) => ({ ...prev, highContrast }));
  }, [highContrast]);

  // Apply and persist Font Scaling globally
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 16}px`;
    saveFontScaleToStorage(fontScale);
  }, [fontScale]);

  // Update relative timestamp string for live traffic (e.g. "Traffic updated 15 sec ago")
  useEffect(() => {
    if (!trafficLastUpdated) {
      setTrafficLastUpdatedText('');
      return;
    }

    const updateLabel = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - trafficLastUpdated.getTime()) / 1000));
      if (diffSec < 10) {
        setTrafficLastUpdatedText('Traffic updated just now');
      } else if (diffSec < 60) {
        setTrafficLastUpdatedText(`Traffic updated ${diffSec} sec ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setTrafficLastUpdatedText(`Traffic updated ${diffMin} min ago`);
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [trafficLastUpdated]);

  // Fetch real live traffic for current active route
  const fetchTrafficForRoute = async (
    originCoords: [number, number],
    destCoords: [number, number],
    routeCoords: [number, number][],
    prof: MobilityProfileCode
  ) => {
    try {
      const resp = await fetchRouteTrafficApi(originCoords, destCoords, routeCoords, prof);
      if (resp && (resp.status === 'success' || resp.status === 'no_traffic')) {
        setTrafficData(resp);
        setTrafficLastUpdated(new Date());
        setTrafficStatusMessage(resp.message || `Live traffic data active (${resp.segments.length} segments)`);

        // Proactive voice announcement on significant congestion changes
        const delayMin = Math.ceil((resp.delay_seconds || 0) / 60);
        const cong = resp.overall_congestion_level;
        const alertKey = `${cong}-${delayMin}`;

        if ((cong === 'severe' || (cong === 'heavy' && delayMin >= 3)) && trafficAnnouncedAlertRef.current !== alertKey) {
          trafficAnnouncedAlertRef.current = alertKey;
          const voiceAlert = cong === 'severe'
            ? `Severe congestion ahead on your route. Approximately ${delayMin} minutes of additional delay.`
            : `Heavy traffic ahead. Approximately ${delayMin} minutes of additional delay.`;
          
          if (isVoiceAssistantActive) {
            voiceAssistant.speak(voiceAlert, { priority: 'hazard' });
          }
        }
      } else {
        setTrafficData(null);
        setTrafficLastUpdated(null);
        setTrafficStatusMessage('Live traffic temporarily unavailable');
      }
    } catch (err) {
      console.debug('Traffic fetch notice in App:', err);
      setTrafficData(null);
      setTrafficLastUpdated(null);
      setTrafficStatusMessage('Live traffic temporarily unavailable');
    }
  };

  const handleToggleHighContrast = () => {
    setHighContrast((prev) => !prev);
  };

  const handleIncreaseFontSize = () => {
    setFontScale((prev) => Math.min(1.45, Number((prev + 0.1).toFixed(2))));
  };

  const handleDecreaseFontSize = () => {
    setFontScale((prev) => Math.max(0.80, Number((prev - 0.1).toFixed(2))));
  };

  const handleZoomIn = () => {
    setMapZoom((prev) => Math.min(prev + 1, 19));
  };

  const handleZoomOut = () => {
    setMapZoom((prev) => Math.max(prev - 1, 3));
  };


  // Keep references synced for real-time geolocation callbacks
  useEffect(() => {
    activeRouteRef.current = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
    selectedPlaceRef.current = selectedPlace;
    mobilityProfileRef.current = mobilityProfile || 'wheelchair';
  }, [routes, selectedRouteId, selectedPlace, mobilityProfile]);

  // Voice Assistant Callback & Intent Parser Setup
  useEffect(() => {
    voiceAssistant.setCallbacks(
      (state) => {
        setVoiceState(state);
        setVoiceIsListening(state === 'LISTENING');
      },
      (transcript, isFinal) => {
        setVoiceTranscript(transcript);
        if (isFinal) {
          setTimeout(() => setVoiceTranscript(''), 3000);
        }
      },
      (intent) => {
        handleVoiceIntent(intent);
      }
    );
  }, [places, routes, selectedRouteId, selectedPlace, mobilityProfile, isNavigating, userLocation]);

  // Reverse geocode coordinates to update header location label
  const resolveLocationName = async (coords: [number, number]) => {
    try {
      const info = await reverseGeocodeApi(coords[0], coords[1]);
      if (info && info.label && info.label !== 'Current location') {
        setLocationLabel(info.label);
      }
    } catch (err) {
      console.debug('Reverse geocode notice:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Recenter to real GPS location
  const handleRecenterLocation = () => {
    setIsLocating(true);
    setLocationStatus('REQUESTING');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationStatus('GRANTED');
          setMapCenter(coords);
          setMapZoom(16);
          setSearchBias(coords);
          resolveLocationName(coords);
          setBannerMessage('Centered on your GPS location');
          setTimeout(() => setBannerMessage(null), 2500);
        },
        (err) => {
          console.debug('Geolocation notice on recenter:', err);
          setIsLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus('DENIED');
            setBannerMessage('Location access is not enabled. You can search destinations manually.');
          } else {
            setLocationStatus('UNAVAILABLE');
            setBannerMessage('Location access is not enabled. You can search destinations manually.');
          }
          setTimeout(() => setBannerMessage(null), 4000);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
      setLocationStatus('UNAVAILABLE');
    }
  };

  // Browser Geolocation on initial load & live watch
  useEffect(() => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      setLocationStatus('REQUESTING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationStatus('GRANTED');
          setMapCenter(coords);
          setMapZoom(15);
          setSearchBias(coords);
          resolveLocationName(coords);
        },
        (err) => {
          console.debug('Initial location notice:', err.message);
          setIsLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus('DENIED');
          } else {
            setLocationStatus('UNAVAILABLE');
          }
        },
        { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationStatus('GRANTED');

          // Off-route detection when navigating
          if (isNavigating && activeRouteRef.current && selectedPlaceRef.current && !isReroutingRef.current) {
            const activeCoords = activeRouteRef.current.coordinates as [number, number][];
            const distOffRoute = distanceToPolylineMeters(coords, activeCoords);

            if (distOffRoute > 50) {
              isReroutingRef.current = true;
              const offRouteMsg = 'You are off the planned route. Finding an accessible alternative.';
              setVoiceMessage(offRouteMsg);
              if (isVoiceAssistantActive) {
                voiceAssistant.speak(offRouteMsg);
              }
              calculateRerouteApi(
                coords,
                [selectedPlaceRef.current.latitude, selectedPlaceRef.current.longitude],
                mobilityProfileRef.current
              )
                .then((newRoute) => {
                  setRoutes([newRoute]);
                  setSelectedRouteId(newRoute.id);
                  setCurrentStepIndex(0);
                  setRemainingDistance(newRoute.distance_meters);
                  setRemainingSeconds(newRoute.duration_seconds);
                  const rerunMsg = `New accessible route found. Takes ${newRoute.duration_minutes} minutes with ${newRoute.accessibility_breakdown?.ramps_count || 0} verified ramps.`;
                  setVoiceMessage(rerunMsg);
                  if (isVoiceAssistantActive) {
                    voiceAssistant.speak(rerunMsg);
                  }
                })
                .catch((e) => console.error('Off-route reroute notice:', e))
                .finally(() => {
                  setTimeout(() => {
                    isReroutingRef.current = false;
                  }, 4000);
                });
            }
          }
        },
        (err) => {
          console.debug('Geolocation watch notice:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isNavigating]);

  // Load real-time reports from backend & poll periodically
  const loadLiveReports = async () => {
    setIsLoadingReports(true);
    try {
      const lat = userLocation ? userLocation[0] : undefined;
      const lng = userLocation ? userLocation[1] : undefined;
      const data = await fetchReports(lat, lng);
      if (data && Array.isArray(data)) {
        setReports(data);
      }
    } catch (err) {
      console.debug('Failed to fetch live reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Load initial system data & start 20s polling interval
  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveReports, 20000);
    return () => clearInterval(interval);
  }, [userLocation]);

  const loadData = async () => {
    const p = await fetchPlaces();
    const r = await fetchReports();
    const e = await fetchEvents();
    setPlaces(p);
    setReports(r);
    setEvents(e);
  };

  const handleToggleCollapseDesktop = () => {
    setIsDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  };

  const handleSelectProfile = (p: MobilityProfileCode) => {
    setMobilityProfile(p);
    saveProfileToStorage(p);
    if (selectedPlace) {
      handleCalculateRoutes('Your Location', selectedPlace, p);
    }
  };

  // Trigger real route computation
  const handleCalculateRoutes = async (
    originStr: string,
    targetPlaceOrCoords: Place | [number, number],
    profile: MobilityProfileCode | null,
    options?: any,
    customOriginCoords?: [number, number] | null,
    destNameOverride?: string
  ) => {
    const effectiveProfile = profile || mobilityProfile || 'wheelchair';
    setIsCalculatingRoutes(true);
    setBannerMessage(null);
    setRoutingErrorMessage(null);

    // If customOriginCoords is provided, use it; else fallback to originCoords or userLocation
    let originPoint = customOriginCoords || originCoords || userLocation;
    if (!originPoint) {
      if ('geolocation' in navigator) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: true });
          });
          originPoint = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(originPoint);
          setLocationStatus('GRANTED');
        } catch {
          setIsCalculatingRoutes(false);
          const err = 'Location access is not enabled. Please choose a starting point or enable GPS.';
          setBannerMessage(err);
          setRoutingErrorMessage(err);
          return;
        }
      } else {
        setIsCalculatingRoutes(false);
        const err = 'Location is not supported in this browser. Please choose a starting point.';
        setBannerMessage(err);
        setRoutingErrorMessage(err);
        return;
      }
    }

    let destCoords: [number, number];
    let destName: string;
    if (Array.isArray(targetPlaceOrCoords)) {
      destCoords = targetPlaceOrCoords;
      destName = destNameOverride || selectedPlace?.name || 'Destination';
    } else {
      destCoords = [targetPlaceOrCoords.latitude, targetPlaceOrCoords.longitude];
      destName = targetPlaceOrCoords.name;
    }

    try {
      const resp = await calculateRoutesApi(
        originPoint,
        destCoords,
        effectiveProfile,
        originStr || 'Your Location',
        destName
      );
      if (!resp?.routes || resp.routes.length === 0) {
        throw new Error('No accessible routes found for the selected destination.');
      }
      setRoutes(resp.routes);
      setSelectedRouteId(resp.routes[0]?.id || null);
      setShowDirectionsPanel(false);

      const topRoute = resp.routes[0];
      const km = (topRoute.distance_meters / 1000).toFixed(1);
      const ramps = topRoute.accessibility_breakdown?.ramps_count || 0;
      const stairs = topRoute.accessibility_breakdown?.stairs_count || 0;
      let accessClaim = 'This route avoids stairs and uses step-free paths where accessibility data is available.';
      if (stairs > 0) {
        accessClaim = `Please note this route contains ${stairs} steps.`;
      } else if (ramps > 0) {
        accessClaim = `This route includes ${ramps} verified accessible ramps and avoids stairs.`;
      }
      const routeSummary = `I found an accessible route. It is approximately ${km} kilometres and should take about ${topRoute.duration_minutes} minutes. ${accessClaim} Would you like to start navigation?`;
      setVoiceMessage(routeSummary);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(routeSummary);
      }
      pendingVoiceActionRef.current = { type: 'ROUTE_CONFIRM', route: topRoute };

      // Fetch real live traffic along the calculated route corridor
      if (trafficIntervalRef.current) clearInterval(trafficIntervalRef.current);
      setTrafficData(null);
      setTrafficLastUpdated(null);
      setTrafficStatusMessage(null);
      trafficAnnouncedAlertRef.current = '';

      fetchTrafficForRoute(
        originPoint,
        destCoords,
        topRoute.coordinates,
        effectiveProfile
      );

      // 30-second periodic live updates while navigation / route is active
      trafficIntervalRef.current = setInterval(() => {
        const currOrigin = userLocation || originPoint;
        fetchTrafficForRoute(
          currOrigin,
          destCoords,
          topRoute.coordinates,
          effectiveProfile
        );
      }, 30000);

      // Search for real OpenStreetMap construction along the route corridor
      setConstructionSites([]);
      setSelectedConstruction(null);
      setConstructionStatusMessage(null);

      fetchRouteConstructionApi(topRoute.coordinates, corridorDistanceM, effectiveProfile)
        .then((constrResp) => {
          if (constrResp.status === 'success' && constrResp.sites.length > 0) {
            setConstructionSites(constrResp.sites);
            setConstructionStatusMessage(null);

            const onRoute = constrResp.sites.find((s) => s.is_on_route);
            const pedBlocked = constrResp.sites.find((s) => s.affects_pedestrian_path);

            if (onRoute) {
              const warn = `⚠️ Construction detected directly on route ahead (${onRoute.name || 'Road construction'}).`;
              setBannerMessage(warn);
              if (isVoiceAssistantActive) {
                voiceAssistant.speak(warn, { priority: 'hazard' });
              }
            } else if (pedBlocked && (effectiveProfile === 'wheelchair' || effectiveProfile === 'pram_elderly')) {
              const accessWarn = `♿ Accessibility advisory: Construction near route may affect accessible sidewalk path.`;
              setBannerMessage(accessWarn);
              if (isVoiceAssistantActive) {
                voiceAssistant.speak(accessWarn, { priority: 'hazard' });
              }
            }
          } else if (constrResp.status === 'empty') {
            setConstructionSites([]);
            setConstructionStatusMessage('✓ No construction detected near this route.');
          } else {
            setConstructionSites([]);
            setConstructionStatusMessage('Construction data is currently unavailable.');
          }
        })
        .catch(() => {
          setConstructionSites([]);
          setConstructionStatusMessage('Construction data is currently unavailable.');
        });
    } catch (err: any) {
      console.error('Routing calculation notice', err);
      const errMsg = err?.message || 'Unable to calculate a route right now. Please check your connection and try again.';
      setBannerMessage(errMsg);
      setRoutingErrorMessage(errMsg);
      setVoiceMessage(errMsg);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(errMsg);
      }
    } finally {
      setIsCalculatingRoutes(false);
    }
  };

  const handleChangeCorridorDistance = async (newDist: number) => {
    setCorridorDistanceM(newDist);
    const currRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (currRoute) {
      try {
        const constrResp = await fetchRouteConstructionApi(
          currRoute.coordinates,
          newDist,
          mobilityProfile || 'wheelchair'
        );
        if (constrResp.status === 'success' && constrResp.sites.length > 0) {
          setConstructionSites(constrResp.sites);
          setConstructionStatusMessage(null);
        } else if (constrResp.status === 'empty') {
          setConstructionSites([]);
          setConstructionStatusMessage('✓ No construction detected near this route.');
        } else {
          setConstructionSites([]);
          setConstructionStatusMessage('Construction data is currently unavailable.');
        }
      } catch {
        setConstructionSites([]);
        setConstructionStatusMessage('Construction data is currently unavailable.');
      }
    }
  };

  const handleSelectConstruction = (site: ConstructionSite) => {
    setSelectedConstruction(site);
    if (site.coordinates && site.coordinates.length >= 2) {
      setMapCenter(site.coordinates);
      setMapZoom(17);
    }
  };

  const handleRecalculateAroundConstruction = (site?: ConstructionSite) => {
    if (selectedPlace) {
      handleTriggerObstacleAlert();
      const constrName = site?.name || 'road construction';
      const voiceText = `Recalculating alternative route to bypass ${constrName}.`;
      setVoiceMessage(voiceText);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(voiceText);
      }
    }
  };

  // Voice Intent Handler Loop
  const handleVoiceIntent = async (intent: VoiceIntent) => {
    switch (intent.type) {
      case 'CONFIRM_YES':
        if (pendingVoiceActionRef.current) {
          const action = pendingVoiceActionRef.current;
          pendingVoiceActionRef.current = null;
          if (action.type === 'DESTINATION_CONFIRM') {
            handleCalculateRoutes('Your Location', action.place, mobilityProfile);
          } else if (action.type === 'ROUTE_CONFIRM') {
            handleStartNavigation();
          } else if (action.type === 'DETOUR_CONFIRM') {
            handleAcceptDetour();
          } else if (action.type === 'EMERGENCY_CONFIRM') {
            triggerEmergencyMode();
          }
        } else if (routes.length > 0 && !isNavigating) {
          handleStartNavigation();
        } else {
          const msg = 'Understood. Where would you like to go?';
          setVoiceMessage(msg);
          voiceAssistant.speak(msg);
        }
        break;

      case 'CONFIRM_NO':
        pendingVoiceActionRef.current = null;
        if (isNavigating) {
          const msg = 'Navigation continuing.';
          setVoiceMessage(msg);
          voiceAssistant.speak(msg);
        } else {
          const msg = 'Cancelled. Where would you like to go?';
          setVoiceMessage(msg);
          voiceAssistant.speak(msg);
        }
        break;

      case 'SEARCH_DESTINATION': {
        const searchMsg = `Searching for ${intent.query}…`;
        setVoiceMessage(searchMsg);
        voiceAssistant.speak(searchMsg);
        try {
          const localMatch = places.find((p) =>
            p.name.toLowerCase().includes(intent.query.toLowerCase())
          );
          if (localMatch) {
            setSelectedPlace(localMatch);
            setMapCenter([localMatch.latitude, localMatch.longitude]);
            const foundMsg = `Found ${localMatch.name}. Calculating accessible route now.`;
            setVoiceMessage(foundMsg);
            voiceAssistant.speak(foundMsg);
            handleCalculateRoutes('Your Location', localMatch, mobilityProfile);
          } else {
            const bias = searchBias || userLocation || undefined;
            const results = await searchLocationsApi(
              intent.query,
              bias ? bias[0] : undefined,
              bias ? bias[1] : undefined
            );
            if (results.length > 0) {
              await handleSelectSearchResult(results[0]);
            } else {
              const notFoundMsg = `I could not find ${intent.query}. Please try saying a street or landmark name.`;
              setVoiceMessage(notFoundMsg);
              voiceAssistant.speak(notFoundMsg);
            }
          }
        } catch (e) {
          const errMsg = `Search failed for ${intent.query}. Please check your connection and try again.`;
          setVoiceMessage(errMsg);
          voiceAssistant.speak(errMsg);
        }
        break;
      }

      case 'CHANGE_PROFILE': {
        handleSelectProfile(intent.profile);
        const profMsg = `Switched to ${intent.profile} mode. Step-free preferences updated.`;
        setVoiceMessage(profMsg);
        voiceAssistant.speak(profMsg);
        break;
      }

      case 'PREFERENCE_AVOID_STAIRS': {
        const stairMsg = 'Avoiding all stairs and steep curbs in route calculations.';
        setVoiceMessage(stairMsg);
        voiceAssistant.speak(stairMsg);
        if (selectedPlace) {
          handleCalculateRoutes('Your Location', selectedPlace, mobilityProfile);
        }
        break;
      }

      case 'PREFERENCE_AVOID_SLOPES': {
        const slopeMsg = 'Prioritizing routes with gentle gradient below 5 percent.';
        setVoiceMessage(slopeMsg);
        voiceAssistant.speak(slopeMsg);
        if (selectedPlace) {
          handleCalculateRoutes('Your Location', selectedPlace, mobilityProfile);
        }
        break;
      }

      case 'PREFERENCE_PREFER_RAMPS': {
        const rampMsg = 'Prioritizing verified accessible ADA ramps along your route.';
        setVoiceMessage(rampMsg);
        voiceAssistant.speak(rampMsg);
        if (selectedPlace) {
          handleCalculateRoutes('Your Location', selectedPlace, mobilityProfile);
        }
        break;
      }

      case 'START_NAVIGATION':
        if (routes.length > 0) {
          handleStartNavigation();
        } else if (places.length > 0) {
          handleSelectPlace(places[0]);
        } else {
          const noRouteMsg = 'Please pick a destination first before starting navigation.';
          setVoiceMessage(noRouteMsg);
          voiceAssistant.speak(noRouteMsg);
        }
        break;

      case 'STOP_NAVIGATION':
        if (isNavigating) {
          handleExitNavigation();
          const stopMsg = 'Navigation stopped. Returned to map overview.';
          setVoiceMessage(stopMsg);
          voiceAssistant.speak(stopMsg);
        } else {
          const notNavMsg = 'Navigation is not currently active.';
          setVoiceMessage(notNavMsg);
          voiceAssistant.speak(notNavMsg);
        }
        break;

      case 'REPEAT_INSTRUCTION':
        voiceAssistant.repeatLast();
        break;

      case 'CURRENT_LOCATION': {
        const locMsg = locationLabel
          ? `You are near ${locationLabel}. GPS tracking is active.`
          : 'You are at your current location. GPS tracking is active.';
        setVoiceMessage(locMsg);
        voiceAssistant.speak(locMsg);
        break;
      }

      case 'NEXT_INSTRUCTION': {
        const activeR = routes.find((r) => r.id === selectedRouteId) || routes[0];
        if (isNavigating && activeR && activeR.steps[currentStepIndex]) {
          const step = activeR.steps[currentStepIndex];
          const stepMsg = `Next instruction: In ${step.distance_meters} meters, ${step.instruction} on ${step.street_name}.`;
          setVoiceMessage(stepMsg);
          voiceAssistant.speak(stepMsg);
        } else {
          const noManeuverMsg = 'No active turn instruction at the moment.';
          setVoiceMessage(noManeuverMsg);
          voiceAssistant.speak(noManeuverMsg);
        }
        break;
      }

      case 'REMAINING_TIME': {
        const mins = Math.ceil(remainingSeconds / 60);
        const timeMsg = `Approximately ${mins} minutes remaining to destination.`;
        setVoiceMessage(timeMsg);
        voiceAssistant.speak(timeMsg);
        break;
      }

      case 'REMAINING_DISTANCE': {
        const distMsg = `Remaining distance is ${remainingDistance} meters.`;
        setVoiceMessage(distMsg);
        voiceAssistant.speak(distMsg);
        break;
      }

      case 'REPORT_HAZARD': {
        if (!userLocation) {
          const locRequiredMsg = 'Please enable GPS location to report a hazard at your current location.';
          setVoiceMessage(locRequiredMsg);
          voiceAssistant.speak(locRequiredMsg);
          break;
        }
        const reportTitle = intent.details || 'Blocked accessibility path';
        const newReport = await submitReportApi({
          category: 'blocked_footpath',
          title: reportTitle,
          description: 'Accessibility obstacle report submitted by user via Voice Assistant.',
          severity: 'moderate',
          lat: userLocation[0],
          lng: userLocation[1],
        });
        setReports((prev) => [newReport, ...prev]);
        const reportedMsg = 'Hazard reported at your current location. Thank you for contributing to safer accessible routes.';
        setVoiceMessage(reportedMsg);
        voiceAssistant.speak(reportedMsg);
        break;
      }

      case 'EMERGENCY': {
        setShowEmergencyConfirmModal(true);
        const confirmMsg = 'Are you sure you want to activate emergency assistance? Say yes to confirm or cancel.';
        setVoiceMessage(confirmMsg);
        voiceAssistant.speak(confirmMsg);
        pendingVoiceActionRef.current = { type: 'EMERGENCY_CONFIRM' };
        break;
      }

      case 'OPEN_SAVED_PLACES':
        setShowSavedPlacesModal(true);
        setVoiceMessage('Opening saved places.');
        voiceAssistant.speak('Opening saved places.');
        break;

      case 'OPEN_SETTINGS':
        setShowSettingsModal(true);
        setVoiceMessage('Opening settings and preferences.');
        voiceAssistant.speak('Opening settings and preferences.');
        break;

      case 'SPEAK_FASTER': {
        const fasterMsg = 'I will speak faster now.';
        setVoiceMessage(fasterMsg);
        voiceAssistant.speak(fasterMsg);
        break;
      }

      case 'ANOTHER_ROUTE': {
        if (routes.length > 1) {
          const currentIndex = routes.findIndex((r) => r.id === selectedRouteId);
          const nextIndex = (currentIndex + 1) % routes.length;
          const nextRoute = routes[nextIndex];
          setSelectedRouteId(nextRoute.id);
          const km = (nextRoute.distance_meters / 1000).toFixed(1);
          const altMsg = `Switched to alternative route. Takes ${nextRoute.duration_minutes} minutes, ${km} kilometres. Would you like to start navigation?`;
          setVoiceMessage(altMsg);
          voiceAssistant.speak(altMsg);
          pendingVoiceActionRef.current = { type: 'ROUTE_CONFIRM', route: nextRoute };
        } else if (selectedPlace) {
          handleCalculateRoutes('Your Location', selectedPlace, mobilityProfile);
          const calcMsg = 'Recalculating alternative accessible routes.';
          setVoiceMessage(calcMsg);
          voiceAssistant.speak(calcMsg);
        } else {
          const noAltMsg = 'No routes currently calculated. Please specify a destination first.';
          setVoiceMessage(noAltMsg);
          voiceAssistant.speak(noAltMsg);
        }
        break;
      }

      case 'UNKNOWN':
      default: {
        const raw = 'raw' in intent ? (intent as any).raw : '';
        const helpMsg = raw
          ? `I heard: ${raw}. You can say: Take me to a destination, where am I, avoid stairs, or stop navigation.`
          : 'I am ready. Tell me where you would like to go.';
        setVoiceMessage(helpMsg);
        voiceAssistant.speak(helpMsg);
        break;
      }
    }
  };

  const triggerEmergencyMode = () => {
    setShowEmergencyConfirmModal(false);
    if (events.length > 0 && events[0].polygon.length > 0) {
      const emergencyZone = events[0];
      setMapCenter([emergencyZone.polygon[0][0], emergencyZone.polygon[0][1]]);
      setMapZoom(16);
    }
    const msg = 'Emergency assistance activated. Priority medical corridors highlighted.';
    setVoiceMessage(msg);
    if (isVoiceAssistantActive) {
      voiceAssistant.speak(msg);
    }
    setBannerMessage('Emergency mode active. Priority accessible corridors highlighted.');
  };

  // Select Place
  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    setSelectedReport(null);
    setShowDirectionsPanel(false);
    setMapCenter([place.latitude, place.longitude]);
    setShowSearchThisArea(false);
    handleCalculateRoutes('Your Location', place, mobilityProfile);
  };

  // Select Location from Geoapify Search Autocomplete
  const handleSelectSearchResult = async (result: SearchResult) => {
    setSelectedReport(null);
    setShowDirectionsPanel(false);
    setShowSearchThisArea(false);

    const destCoords: [number, number] = [result.latitude, result.longitude];
    setMapCenter(destCoords);
    setMapZoom(16);

    const accessData = await lookupAccessibilityApi(
      result.latitude,
      result.longitude,
      result.name
    );

    const newPlace: Place = {
      id: result.id || `search-${result.latitude}-${result.longitude}`,
      name: result.name,
      category: result.category || result.type || 'place',
      address: result.address || `${result.city || ''}, ${result.country || ''}`.trim() || result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city || locationLabel || '',
      accessibility: accessData.has_data && accessData.accessibility
        ? accessData.accessibility
        : {
            has_accessible_entrance: false,
            has_ramp: false,
            has_elevator: false,
            has_tactile_paving: false,
            elevator_status: 'unknown',
            details: 'Accessibility information unavailable - Community verification needed',
          },
    };

    setSelectedPlace(newPlace);
    handleCalculateRoutes('Your Location', newPlace, mobilityProfile);
  };

  const lastPannedCenterRef = useRef<[number, number]>(mapCenter);

  const handleMapMoveEnd = (center: [number, number], _zoom: number) => {
    lastPannedCenterRef.current = center;
    const currentBias = searchBias || userLocation;
    if (currentBias) {
      const distKm = calculateDistanceKm(currentBias[0], currentBias[1], center[0], center[1]);
      if (distKm > 2.5) {
        setShowSearchThisArea(true);
      }
    }
  };

  const handleSearchThisArea = () => {
    const newBias = lastPannedCenterRef.current || mapCenter;
    setSearchBias(newBias);
    setShowSearchThisArea(false);
  };

  // Start Navigation Mode
  const handleStartNavigation = () => {
    const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!activeRoute) return;

    if (selectedPlace) {
      const updatedRecent = addRecentTripToStorage(selectedPlace);
      setRecentTrips(updatedRecent);
    }

    setIsNavigating(true);
    setCurrentStepIndex(0);
    setRemainingDistance(activeRoute.distance_meters);
    setRemainingSeconds(activeRoute.duration_seconds);
    setNavPosition(activeRoute.coordinates[0]);

    const profileLabel = mobilityProfile || 'accessible';
    const startMsg = `Starting ${profileLabel} navigation to ${selectedPlace?.name || 'destination'}. Step-free route with ${activeRoute.accessibility_breakdown?.ramps_count || 0} verified ramps. Continue straight for ${activeRoute.steps[0]?.distance_meters || 100} meters.`;
    setVoiceMessage(startMsg);
    if (isVoiceAssistantActive) {
      voiceAssistant.speak(startMsg);
    }

    let pointIndex = 0;
    const totalPoints = activeRoute.coordinates.length;
    if (navIntervalRef.current) clearInterval(navIntervalRef.current);

    navIntervalRef.current = setInterval(() => {
      pointIndex++;
      if (pointIndex < totalPoints) {
        setNavPosition(activeRoute.coordinates[pointIndex]);
        const progress = pointIndex / totalPoints;
        setRemainingDistance(Math.round(activeRoute.distance_meters * (1 - progress)));
        setRemainingSeconds(Math.round(activeRoute.duration_seconds * (1 - progress)));

        if (pointIndex > totalPoints * 0.4 && currentStepIndex === 0) {
          setCurrentStepIndex(1);
          if (activeRoute.steps[1]) {
            const nextStepMsg = `In ${activeRoute.steps[1].distance_meters} meters, ${activeRoute.steps[1].instruction} on ${activeRoute.steps[1].street_name}.`;
            setVoiceMessage(nextStepMsg);
            if (isVoiceAssistantActive) {
              voiceAssistant.speak(nextStepMsg);
            }
          }
        }
      } else {
        clearInterval(navIntervalRef.current);
        const arrivalMsg = 'You have arrived safely at your destination.';
        setVoiceMessage(arrivalMsg);
        if (isVoiceAssistantActive) {
          voiceAssistant.speak(arrivalMsg);
        }
      }
    }, 2500);
  };

  const handleExitNavigation = () => {
    if (navIntervalRef.current) clearInterval(navIntervalRef.current);
    setIsNavigating(false);
    setNavPosition(null);
    if (isVoiceAssistantActive) {
      voiceAssistant.speak('Navigation ended.');
    }
  };

  // Obstacle Alert & Dynamic Detour
  const handleTriggerObstacleAlert = () => {
    setShowObstacleAlert(true);
    const alertMsg = 'Accessibility Alert: Obstacle reported ahead. Step-free detour recommended. Say yes to reroute.';
    setVoiceMessage(alertMsg);
    if (isVoiceAssistantActive) {
      voiceAssistant.speak(alertMsg);
    }
    pendingVoiceActionRef.current = { type: 'DETOUR_CONFIRM' };
  };

  const handleAcceptDetour = async () => {
    if (!selectedPlace) return;
    setShowObstacleAlert(false);
    const currentLoc = navPosition || userLocation;
    if (!currentLoc) return;
    try {
      const newRoute = await calculateRerouteApi(
        currentLoc,
        [selectedPlace.latitude, selectedPlace.longitude],
        mobilityProfile || 'wheelchair'
      );
      setRoutes([newRoute]);
      setSelectedRouteId(newRoute.id);
      setCurrentStepIndex(0);
      setRemainingDistance(newRoute.distance_meters);
      setRemainingSeconds(newRoute.duration_seconds);
      const detourSuccessMsg = 'Detour accepted. Recalculated safe ramp corridor.';
      setVoiceMessage(detourSuccessMsg);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(detourSuccessMsg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Community Report with Geotagged Photo Evidence
  const handleSubmitReport = async (reportData: {
    category: string;
    title: string;
    description: string;
    severity: 'low' | 'moderate' | 'severe' | 'critical';
    lat: number;
    lng: number;
    photo_url?: string;
  }) => {
    try {
      const created = await submitReportApi(reportData);
      setReports((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setShowReportModal(false);
      setSelectedReport(created);
      
      const barrierName = reportData.title || reportData.category.replace('_', ' ');
      const msg = `Your ${barrierName} report has been submitted with a photo and your location.`;
      setVoiceMessage(msg);
      if (isVoiceAssistantActive) {
        voiceAssistant.speak(msg, { priority: 'hazard' });
      }
      setBannerMessage('✓ Geotagged barrier report submitted to live map');
      setTimeout(() => setBannerMessage(null), 3500);
    } catch (e) {
      console.debug('Submit report fallback:', e);
      const fallbackRep: CommunityReport = {
        id: `report-${Date.now()}`,
        category: reportData.category,
        title: reportData.title,
        description: reportData.description,
        severity: reportData.severity,
        latitude: reportData.lat,
        longitude: reportData.lng,
        status: 'COMMUNITY_REPORTED',
        verification_status: 'COMMUNITY_REPORTED',
        photo_url: reportData.photo_url,
        upvotes: 1,
        downvotes: 0,
        confidence_level: 'MEDIUM',
        source: reportData.photo_url ? 'Community Photo Evidence' : 'Community Report',
        reported_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      };
      setReports((prev) => [fallbackRep, ...prev]);
      setShowReportModal(false);
      setSelectedReport(fallbackRep);
      setBannerMessage('✓ Barrier saved to your live map');
      setTimeout(() => setBannerMessage(null), 3000);
    }
  };

  // Vote / Verify / Dispute Community Report
  const handleVoteReport = async (
    reportId: string, 
    voteType: 'upvote' | 'downvote' | 'resolve' | 'verify' | 'dispute'
  ) => {
    try {
      const updated = await voteReportApi(reportId, voteType);
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
      setSelectedReport(updated);
    } catch {
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            const isPos = voteType === 'upvote' || voteType === 'verify';
            const isNeg = voteType === 'downvote' || voteType === 'dispute';
            return {
              ...r,
              upvotes: isPos ? r.upvotes + 1 : r.upvotes,
              downvotes: isNeg ? r.downvotes + 1 : r.downvotes,
              status: voteType === 'resolve' ? 'RESOLVED' : (isPos ? 'VERIFIED' : (isNeg ? 'DISPUTED' : r.status)),
              verification_status: voteType === 'resolve' ? 'RESOLVED' : (isPos ? 'VERIFIED' : (isNeg ? 'DISPUTED' : r.status)),
            };
          }
          return r;
        })
      );
    }
  };


  // Saved Places & Offline Routes Handlers
  const handleRemoveSavedPlace = (placeId: string) => {
    const updated = removeSavedPlaceFromStorage(placeId);
    setSavedPlaces(updated);
  };

  const handleToggleSaveActiveRoute = () => {
    if (!activeRoute) return;
    if (isRouteSaved(activeRoute.id)) {
      const updated = removeSavedRouteFromStorage(activeRoute.id);
      setSavedRoutes(updated);
      setBannerMessage('Route removed from offline cache.');
      setTimeout(() => setBannerMessage(null), 2500);
    } else {
      const newSavedRoute: SavedRoute = {
        id: activeRoute.id,
        title: activeRoute.title,
        originName: locationLabel || 'Starting Location',
        destinationName: selectedPlace?.name || 'Destination',
        destinationPlace: selectedPlace,
        route: activeRoute,
        profile: mobilityProfile || 'wheelchair',
        savedAt: new Date().toISOString(),
      };
      const updated = saveRouteToStorage(newSavedRoute);
      setSavedRoutes(updated);
      setBannerMessage(`Route to ${newSavedRoute.destinationName} saved for offline navigation! 💾`);
      setTimeout(() => setBannerMessage(null), 3500);
    }
  };

  const handleSelectSavedRoute = (savedRoute: SavedRoute) => {
    if (savedRoute.profile) {
      setMobilityProfile(savedRoute.profile);
    }
    setRoutes([savedRoute.route]);
    setSelectedRouteId(savedRoute.route.id);
    if (savedRoute.destinationPlace) {
      setSelectedPlace(savedRoute.destinationPlace);
    }
    setIsNavigatingOfflineRoute(true);
    if (savedRoute.route.coordinates && savedRoute.route.coordinates.length > 0) {
      setMapCenter(savedRoute.route.coordinates[0]);
      setMapZoom(16);
    }
    setShowDirectionsPanel(false);
    setBannerMessage(`Offline route loaded: ${savedRoute.destinationName} (100% locally cached)`);
    setTimeout(() => setBannerMessage(null), 3000);
  };

  const handleRemoveSavedRoute = (routeId: string) => {
    const updated = removeSavedRouteFromStorage(routeId);
    setSavedRoutes(updated);
  };

  // Handle Sidebar Navigation Clicks
  const handleSidebarNavigate = (section: SidebarSection) => {
    setActiveSidebarSection(section);
    switch (section) {
      case 'explore':
        if (userLocation) {
          setMapCenter(userLocation);
          setMapZoom(16);
        }
        break;
      case 'navigation':
        if (routes.length > 0) {
          handleStartNavigation();
        } else if (places.length > 0) {
          handleCalculateRoutes('Your Location', places[0], mobilityProfile);
        }
        break;
      case 'accessible-routes':
        if (places.length > 0) {
          if (!selectedPlace) setSelectedPlace(places[0]);
          setShowDirectionsPanel(true);
        }
        break;
      case 'profile':
        setShowProfileSelectorModal(true);
        break;
      case 'saved-places':
      case 'recent-trips':
        setShowSavedPlacesModal(true);
        break;
      case 'hazards':
      case 'reports':
        setShowLiveHazardsModal(true);
        setLayers((prev) => ({ ...prev, showHazards: true }));
        break;
      case 'report-issue':
        setShowReportModal(true);
        break;
      case 'map-layers':
        setLayers((prev) => ({ ...prev, showRamps: true, showTactile: true, showHazards: true }));
        break;
      case 'route-details':
        if (routes.length > 0) {
          setShowScreenReaderTable(true);
        }
        break;
      case 'voice':
        setIsVoiceAssistantActive(true);
        setVoiceEnabled(true);
        voiceAssistant.speak('Voice assistant activated. Where would you like to go?');
        voiceAssistant.startListening();
        break;
      case 'diagnostics':
        setShowDiagnostics((prev) => !prev);
        break;
      case 'settings':
      case 'help':
        setShowSettingsModal(true);
        break;
      case 'emergency':
        setShowEmergencyConfirmModal(true);
        break;
    }
  };

  // Voice Welcome Modal Handlers
  const handleAcceptVoiceWelcome = () => {
    setShowVoiceWelcome(false);
    setVoiceOnboardingComplete(true);
    setVoiceEnabled(true);
    setIsVoiceAssistantActive(true);
    voiceAssistant.unlockAudio();
    const welcomeMsg =
      "Voice-assisted navigation is now active. I'll help you find an accessible route. Where would you like to go?";
    setVoiceMessage(welcomeMsg);
    voiceAssistant.speak(welcomeMsg, {
      onComplete: () => {
        voiceAssistant.startListening();
      },
    });
  };

  const handleDeclineVoiceWelcome = () => {
    setShowVoiceWelcome(false);
    setVoiceOnboardingComplete(true);
    setVoiceEnabled(false);
    setIsVoiceAssistantActive(false);
    voiceAssistant.stopAll();
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0] || null;

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${
        layers.highContrast ? 'bg-black text-yellow-300' : 'bg-slate-900 text-slate-900'
      }`}
    >
      {/* 1. Status Banner Toast */}
      {bannerMessage && (
        <div className="fixed top-[84px] left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in pointer-events-auto">
          <div className={`p-3.5 rounded-2xl text-white text-xs font-bold flex items-center justify-between gap-3 shadow-2xl border ${
            bannerMessage.includes('saved') || bannerMessage.includes('online') || bannerMessage.includes('loaded')
              ? 'bg-emerald-950/95 border-emerald-600 text-emerald-100'
              : bannerMessage.includes('Offline')
              ? 'bg-amber-950/95 border-amber-600 text-amber-100'
              : 'bg-red-950/95 border-red-700 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {bannerMessage.includes('Offline') ? (
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{bannerMessage}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Voice-First Welcome Screen (1-Tap anywhere activation on fresh install) */}
      {showVoiceWelcome && (
        <VoiceWelcomeModal
          onAcceptVoice={handleAcceptVoiceWelcome}
          onDeclineVoice={handleDeclineVoiceWelcome}
          highContrast={layers.highContrast}
        />
      )}

      {/* 3. Global Navigation Sidebar */}
      {!isNavigating && !showVoiceWelcome && (
        <GlobalSidebar
          activeSection={activeSidebarSection}
          onNavigate={handleSidebarNavigate}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsedDesktop={isDesktopSidebarCollapsed}
          onToggleCollapseDesktop={handleToggleCollapseDesktop}
          activeProfile={mobilityProfile}
          onOpenProfileSelector={() => setShowProfileSelectorModal(true)}
          onOpenReportModal={() => setShowReportModal(true)}
          onOpenPlanRoute={() => {
            if (!selectedPlace && places.length > 0) {
              setSelectedPlace(places[0]);
            }
            setShowDirectionsPanel(true);
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenSavedPlaces={() => setShowSavedPlacesModal(true)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onToggleDiagnostics={() => setShowDiagnostics((prev) => !prev)}
          reports={reports}
          events={events}
          highContrast={layers.highContrast}
          isNavigating={isNavigating}
        />
      )}

      {/* Main Content Area */}
      <div className="w-full h-full flex flex-col relative overflow-hidden bg-white">
        {/* 4. Top Header */}
        <AppHeader
          onToggleMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          locationLabel={locationLabel}
          isLocating={isLocating}
          locationStatus={locationStatus}
          onRecenterLocation={handleRecenterLocation}
          activeProfile={mobilityProfile}
          onOpenProfileSelector={() => setShowProfileSelectorModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          highContrast={highContrast}
          onToggleHighContrast={handleToggleHighContrast}
          fontScale={fontScale}
          onIncreaseFontSize={handleIncreaseFontSize}
          onDecreaseFontSize={handleDecreaseFontSize}
          isNavigating={isNavigating}
          onOpenPlanRoute={() => setShowDirectionsPanel(true)}
        />

        {/* Master Responsive Two-Region Workspace */}
        <div className="flex-1 w-full min-h-0 flex overflow-hidden relative">
          {/* Region 1: Desktop Left Route Planning & Results Panel */}
          {!isNavigating && !showVoiceWelcome && (
            <aside
              className={`hidden lg:flex flex-col bg-white border-r border-slate-200 z-20 transition-all duration-300 relative shrink-0 h-full ${
                isDesktopRoutePanelCollapsed
                  ? 'w-14 items-center justify-between py-5 overflow-hidden'
                  : 'w-[384px] xl:w-[400px] overflow-y-auto'
              }`}
              aria-label="Accessible Journey Planning and Results Panel"
            >
              {/* Collapse/Expand Toggle Edge Button (34px understated circular button) */}
              <button
                type="button"
                onClick={() => setIsDesktopRoutePanelCollapsed(!isDesktopRoutePanelCollapsed)}
                className="absolute top-6 -right-[17px] z-30 w-[34px] h-[34px] bg-white border border-slate-200 rounded-full shadow-xs hover:shadow-sm hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all cursor-pointer"
                title={isDesktopRoutePanelCollapsed ? 'Expand journey panel' : 'Collapse journey panel'}
                aria-label={isDesktopRoutePanelCollapsed ? 'Expand journey panel' : 'Collapse journey panel'}
              >
                {isDesktopRoutePanelCollapsed ? (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                ) : (
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                )}
              </button>

              {isDesktopRoutePanelCollapsed ? (
                /* Collapsed Icon Strip */
                <div className="flex flex-col items-center gap-3.5 pt-3 w-full">
                  <button
                    type="button"
                    onClick={() => { setIsDesktopRoutePanelCollapsed(false); setRoutes([]); }}
                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition cursor-pointer"
                    title="Plan Accessible Route"
                    aria-label="Plan Accessible Route"
                  >
                    <NavIcon className="w-4 h-4 transform rotate-45" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsDesktopRoutePanelCollapsed(false); setShowProfileSelectorModal(true); }}
                    className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                    title="Change Mobility Profile"
                    aria-label="Change Mobility Profile"
                  >
                    <AccessIcon className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavedPlacesModal(true)}
                    className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                    title="Saved Places"
                    aria-label="Saved Places"
                  >
                    <Bookmark className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>
              ) : (
                /* Expanded Route Planning & Results Panel */
                <div className="w-full h-full flex flex-col">
                  {/* Scenario A: Calculated Route Results Active */}
                  {routes.length > 0 ? (
                    <RouteResultsSheet
                      routes={routes}
                      selectedRouteId={selectedRouteId}
                      onSelectRoute={(id) => setSelectedRouteId(id)}
                      onStartNavigation={handleStartNavigation}
                      onClose={() => {
                        setRoutes([]);
                        setTrafficData(null);
                        setTrafficLastUpdated(null);
                        setTrafficStatusMessage(null);
                        if (trafficIntervalRef.current) clearInterval(trafficIntervalRef.current);
                      }}
                      profile={mobilityProfile || 'wheelchair'}
                      destinationName={selectedPlace?.name || 'Destination'}
                      trafficData={trafficData}
                      trafficLastUpdatedText={trafficLastUpdatedText}
                      highContrast={layers.highContrast}
                      isSavedOffline={activeRoute ? isRouteSaved(activeRoute.id) : false}
                      onToggleSaveOffline={handleToggleSaveActiveRoute}
                      isDesktopPanel={true}
                    />
                  ) : selectedReport ? (
                    /* Scenario B: Community Report Verification Drawer */
                    <div className="w-full p-4">
                      <VerificationDrawer
                        report={selectedReport}
                        onVote={handleVoteReport}
                        onClose={() => setSelectedReport(null)}
                        userLocation={userLocation}
                        highContrast={layers.highContrast}
                      />
                    </div>
                  ) : (
                    /* Scenario C: Primary Journey Planning Form (Default First-Time View) */
                    <DirectionsPanel
                      originName={originName || locationLabel || 'Your Location'}
                      originCoords={originCoords || userLocation}
                      destination={selectedPlace}
                      selectedProfile={mobilityProfile}
                      onSelectProfile={handleSelectProfile}
                      onCalculateRoutes={(origName, origCoords, destName, destCoords, prof, opts) => {
                        setOriginName(origName);
                        setOriginCoords(origCoords);
                        handleCalculateRoutes(origName, destCoords, prof, opts, origCoords, destName);
                      }}
                      isCalculating={isCalculatingRoutes}
                      highContrast={layers.highContrast}
                      userLocation={userLocation}
                      errorMessage={routingErrorMessage}
                      onRetry={() => {
                        if (selectedPlace) {
                          handleCalculateRoutes(originName || 'Your Location', selectedPlace, mobilityProfile);
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </aside>
          )}

          {/* Region 2: Map Canvas & Overlays */}
          <main className="flex-1 h-full min-w-0 relative flex flex-col">
            {/* Interactive Leaflet Map Surface */}
            <MapView
              center={mapCenter}
              zoom={mapZoom}
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(r) => {
                setSelectedReport(r);
                setSelectedPlace(null);
              }}
              events={events}
              onSelectEvent={handleSelectEvent}
              onAvoidEvent={handleAvoidEvent}
              constructionSites={constructionSites}
              selectedConstruction={selectedConstruction}
              onSelectConstruction={handleSelectConstruction}
              onRecalculateAroundConstruction={handleRecalculateAroundConstruction}
              trafficData={trafficData}
              trafficLastUpdatedText={trafficLastUpdatedText}
              trafficStatusMessage={trafficStatusMessage}
              onSelectTrafficIncident={(inc) => {
                if (inc.location && inc.location.length >= 2) {
                  setMapCenter(inc.location);
                  setMapZoom(17);
                }
              }}
              layers={layers}
              userLocation={userLocation}
              navigationActive={isNavigating}
              navPosition={navPosition}
              onMapClick={(lat, lng) => {
                console.log('Map clicked at', lat, lng);
              }}
              onMapMoveEnd={handleMapMoveEnd}
            />

            {/* Construction Alert Banner */}
            {!isNavigating && !showVoiceWelcome && routes.length > 0 && (constructionSites.length > 0 || constructionStatusMessage) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-3 pointer-events-auto">
                <ConstructionWarningBanner
                  sites={constructionSites}
                  statusMessage={constructionStatusMessage}
                  corridorDistanceM={corridorDistanceM}
                  onChangeCorridorDistance={handleChangeCorridorDistance}
                  onSelectSite={handleSelectConstruction}
                  onRecalculate={handleRecalculateAroundConstruction}
                  mobilityProfile={mobilityProfile}
                  highContrast={layers.highContrast}
                />
              </div>
            )}

            {/* Mobile-Only Top Floating Search Bar */}
            {!isNavigating && !showVoiceWelcome && (
              <div className="lg:hidden">
                <FloatingSearchBar
                  places={places}
                  onSelectPlace={handleSelectPlace}
                  onSelectSearchResult={handleSelectSearchResult}
                  onOpenReportModal={() => setShowReportModal(true)}
                  onOpenDirections={() => {
                    if (!selectedPlace && places.length > 0) {
                      setSelectedPlace(places[0]);
                    }
                    setShowDirectionsPanel(true);
                  }}
                  activeProfile={mobilityProfile}
                  onSelectProfile={handleSelectProfile}
                  highContrast={layers.highContrast}
                  onToggleHighContrast={() =>
                    setLayers((prev) => ({ ...prev, highContrast: !prev.highContrast }))
                  }
                  userLocation={userLocation}
                  locationStatus={locationStatus}
                  searchBias={searchBias}
                  showSearchThisArea={showSearchThisArea}
                  onSearchThisArea={handleSearchThisArea}
                />
              </div>
            )}

            {/* Map Controls (Zoom in/out, Recenter, Layers, Screen Reader) */}
            {!isNavigating && !showVoiceWelcome && (
              <MapControls
                layers={layers}
                onToggleLayer={(k) => setLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
                onRecenter={handleRecenterLocation}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onOpenScreenReaderTable={() => {
                  if (routes.length > 0) {
                    setShowScreenReaderTable(true);
                  } else if (places.length > 0) {
                    handleCalculateRoutes('Your Location', places[0], mobilityProfile).then(() => {
                      setShowScreenReaderTable(true);
                    });
                  }
                }}
                highContrast={layers.highContrast}
                isNavigating={isNavigating}
              />
            )}

            {/* Mobile-Only Bottom Sheet */}
            {!isNavigating && !showVoiceWelcome && (
              <MobileBottomSheet
                selectedPlace={selectedPlace}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRouteId={(id) => setSelectedRouteId(id)}
                onCalculateRoute={(place) => handleCalculateRoutes('Your Location', place, mobilityProfile)}
                onStartNavigation={handleStartNavigation}
                onClearSelection={() => {
                  setSelectedPlace(null);
                  setRoutes([]);
                  setTrafficData(null);
                  setTrafficLastUpdated(null);
                  setTrafficStatusMessage(null);
                  if (trafficIntervalRef.current) clearInterval(trafficIntervalRef.current);
                }}
                activeProfile={mobilityProfile}
                onSelectProfile={handleSelectProfile}
                onOpenReportModal={() => setShowReportModal(true)}
                onOpenSavedPlaces={() => setShowSavedPlacesModal(true)}
                isCalculatingRoutes={isCalculatingRoutes}
                trafficData={trafficData}
                trafficLastUpdatedText={trafficLastUpdatedText}
                highContrast={layers.highContrast}
                isNavigating={isNavigating}
              />
            )}

            {/* Floating Voice Assistant Trigger Orb */}
            {!isNavigating && !showVoiceWelcome && !isVoiceAssistantActive && (
              <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-6 z-30 pointer-events-auto flex items-center gap-2">
                <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-bold border border-purple-500/40 shadow-lg card-shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
                  <span>Voice Assistant</span>
                </div>
                <VoiceOrb
                  state={voiceState}
                  onClick={() => {
                    setIsVoiceAssistantActive(true);
                    setVoiceEnabled(true);
                    voiceAssistant.unlockAudio();
                    voiceAssistant.startListening();
                  }}
                  size="md"
                  highContrast={layers.highContrast}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 10. Voice Assistant Live HUD Overlay (Active Mode) */}
      {isVoiceAssistantActive && !showVoiceWelcome && (
        <VoiceAssistantHUD
          voiceState={voiceState}
          currentMessage={voiceMessage}
          transcript={voiceTranscript}
          isListening={voiceIsListening}
          isMuted={voiceIsMuted}
          onToggleListening={() => voiceAssistant.toggleListening()}
          onToggleMute={() => setVoiceIsMuted(voiceAssistant.toggleMute())}
          onRepeat={() => voiceAssistant.repeatLast()}
          onTypeInstead={() => {
            if (!selectedPlace && places.length > 0) {
              setSelectedPlace(places[0]);
            }
            setShowDirectionsPanel(true);
          }}
          onExitVoiceMode={() => {
            voiceAssistant.stopListening();
            setIsVoiceAssistantActive(false);
            setVoiceEnabled(false);
          }}
          highContrast={layers.highContrast}
        />
      )}

      {/* 11. Command Search Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectProfile={handleSelectProfile}
        onSelectPlace={handleSelectPlace}
        onOpenReportModal={() => setShowReportModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenScreenReaderTable={() => {
          if (routes.length > 0) {
            setShowScreenReaderTable(true);
          } else if (places.length > 0) {
            handleCalculateRoutes('Your Location', places[0], mobilityProfile).then(() => {
              setShowScreenReaderTable(true);
            });
          }
        }}
        places={places}
        highContrast={layers.highContrast}
      />

      {/* 12. Saved Places & Offline Routes Modal */}
      {showSavedPlacesModal && (
        <SavedPlacesModal
          onClose={() => setShowSavedPlacesModal(false)}
          onSelectPlace={handleSelectPlace}
          savedPlaces={savedPlaces}
          recentTrips={recentTrips}
          onRemoveSavedPlace={handleRemoveSavedPlace}
          savedRoutes={savedRoutes}
          onSelectSavedRoute={handleSelectSavedRoute}
          onRemoveSavedRoute={handleRemoveSavedRoute}
          highContrast={layers.highContrast}
        />
      )}

      {/* 13. Mobility Profile Selector Modal */}
      {showProfileSelectorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl">
            <MobilityProfileSelector
              selectedProfile={mobilityProfile}
              onSelectProfile={(p) => {
                handleSelectProfile(p);
                setShowProfileSelectorModal(false);
              }}
              onClose={() => setShowProfileSelectorModal(false)}
              highContrast={layers.highContrast}
            />
          </div>
        </div>
      )}

      {/* 14. Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          highContrast={layers.highContrast}
          onToggleHighContrast={() =>
            setLayers((prev) => ({ ...prev, highContrast: !prev.highContrast }))
          }
          activeProfile={mobilityProfile || 'wheelchair'}
          onSelectProfile={handleSelectProfile}
        />
      )}

      {/* 15. Emergency Assistance & SOS Hub Modal */}
      <EmergencyConfirmationModal
        isOpen={showEmergencyConfirmModal}
        onConfirm={triggerEmergencyMode}
        onCancel={() => setShowEmergencyConfirmModal(false)}
        highContrast={layers.highContrast}
        userLocation={userLocation}
        locationLabel={locationLabel}
        activeProfile={mobilityProfile}
        activeRoute={activeRoute}
      />

      {/* 16. Developer Diagnostics Panel (Hidden from standard view, toggleable in sidebar) */}
      <DeveloperDebugPanel
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        activeRoute={activeRoute}
        userLocation={userLocation}
        destination={selectedPlace ? [selectedPlace.latitude, selectedPlace.longitude] : null}
        profile={mobilityProfile}
        voiceState={voiceState}
        isListening={voiceIsListening}
        isVoiceSupported={voiceAssistant.isVoiceRecognitionSupported()}
        voiceName=""
        highContrast={layers.highContrast}
      />

      {/* 17. Full-Screen Turn-by-Turn Navigation HUD */}
      {isNavigating && activeRoute && (
        <NavigationHUD
          route={activeRoute}
          currentStepIndex={currentStepIndex}
          remainingDistance={remainingDistance}
          remainingSeconds={remainingSeconds}
          onExitNavigation={handleExitNavigation}
          onTriggerObstacleAlert={handleTriggerObstacleAlert}
          onOpenReportModal={() => setShowReportModal(true)}
          onOpenEmergencyModal={() => setShowEmergencyConfirmModal(true)}
          isOfflineMode={!isOnline || isNavigatingOfflineRoute}
          onRecalculateDetour={handleTriggerObstacleAlert}
          onOpenEventDetails={handleSelectEvent}
          onOpenConstructionDetails={handleSelectConstruction}
          onSelectTrafficIncident={(inc) => {
            if (inc.location && inc.location.length >= 2) {
              setMapCenter(inc.location);
              setMapZoom(17);
            }
          }}
          reports={reports}
          events={events}
          constructionSites={constructionSites}
          trafficData={trafficData}
          trafficLastUpdatedText={trafficLastUpdatedText}
          highContrast={layers.highContrast}
        />
      )}


      {/* 18. Obstacle Detour Modal */}
      {showObstacleAlert && (
        <ObstacleAlertModal
          obstacleTitle="Obstacle reported on path ahead"
          detourTimeEstimate="+3 min (100% step-free)"
          onAcceptDetour={handleAcceptDetour}
          onDismiss={() => setShowObstacleAlert(false)}
          highContrast={layers.highContrast}
        />
      )}

      {/* 19. Community Hazard Report Modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSubmit={handleSubmitReport}
          defaultLocation={userLocation}
          highContrast={layers.highContrast}
        />
      )}

      {/* 20. Live Hazards & Barriers Modal Panel */}
      {showLiveHazardsModal && (
        <LiveHazardsModal
          isOpen={showLiveHazardsModal}
          onClose={() => setShowLiveHazardsModal(false)}
          reports={reports}
          userLocation={userLocation}
          onSelectHazardOnMap={(rep) => {
            setSelectedReport(rep);
            setMapCenter([rep.latitude, rep.longitude]);
            setMapZoom(17);
            setLayers((prev) => ({ ...prev, showHazards: true }));
          }}
          onOpenReportModal={() => setShowReportModal(true)}
          onVoteReport={handleVoteReport}
          onAvoidHazard={(rep) => {
            if (activeRoute && selectedPlace) {
              handleTriggerObstacleAlert();
            }
          }}
          activeRoute={activeRoute}
          highContrast={layers.highContrast}
          onRefreshReports={loadLiveReports}
          isLoading={isLoadingReports}
        />
      )}

      {/* 21. Real Event Card Modal */}
      <EventCardModal
        isOpen={Boolean(selectedEventForModal)}
        onClose={() => setSelectedEventForModal(null)}
        event={selectedEventForModal}
        onViewOnMap={(ev) => {
          if (ev.center && ev.center.length >= 2) {
            setMapCenter(ev.center);
            setMapZoom(16);
          } else if (ev.polygon && ev.polygon.length > 0) {
            setMapCenter(ev.polygon[0]);
            setMapZoom(16);
          }
        }}
        onAvoidAndRecalculate={handleAvoidEvent}
        highContrast={layers.highContrast}
      />

      {/* 22. Real OpenStreetMap Construction Details Modal */}
      <ConstructionDetailsModal
        isOpen={Boolean(selectedConstruction)}
        site={selectedConstruction}
        onClose={() => setSelectedConstruction(null)}
        onRecalculate={handleRecalculateAroundConstruction}
        onFocusOnMap={(site) => {
          if (site.coordinates && site.coordinates.length >= 2) {
            setMapCenter(site.coordinates);
            setMapZoom(17);
          }
        }}
        highContrast={layers.highContrast}
      />

      {/* 23. Screen Reader Table View */}
      {showScreenReaderTable && activeRoute && (
        <ScreenReaderTable
          route={activeRoute}
          profile={mobilityProfile || 'wheelchair'}
          onClose={() => setShowScreenReaderTable(false)}
          highContrast={layers.highContrast}
        />
      )}
    </div>
  );
};

export default App;
