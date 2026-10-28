import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place, RouteResult, CommunityReport, EventZone, MapLayerConfig, ConstructionSite, RouteTrafficResponse, TrafficIncident } from '../../types';
import { getRealEventName, getEventEmoji, getTrafficImpactInfo } from '../../utils/eventUtils';

interface MapViewProps {
  center: [number, number];
  zoom: number;
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  routes: RouteResult[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  reports: CommunityReport[];
  selectedReport: CommunityReport | null;
  onSelectReport: (report: CommunityReport) => void;
  events: EventZone[];
  onSelectEvent?: (event: EventZone) => void;
  onAvoidEvent?: (event: EventZone) => void;
  constructionSites?: ConstructionSite[];
  selectedConstruction?: ConstructionSite | null;
  onSelectConstruction?: (site: ConstructionSite) => void;
  onRecalculateAroundConstruction?: (site: ConstructionSite) => void;
  trafficData?: RouteTrafficResponse | null;
  trafficLastUpdatedText?: string;
  trafficStatusMessage?: string | null;
  onSelectTrafficIncident?: (incident: TrafficIncident) => void;
  layers: MapLayerConfig;
  userLocation: [number, number] | null;
  navigationActive: boolean;
  navPosition: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  onMapMoveEnd?: (center: [number, number], zoom: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  zoom,
  places,
  selectedPlace,
  onSelectPlace,
  routes,
  selectedRouteId,
  onSelectRoute,
  reports,
  selectedReport,
  onSelectReport,
  events,
  onSelectEvent,
  onAvoidEvent,
  constructionSites = [],
  selectedConstruction,
  onSelectConstruction,
  onRecalculateAroundConstruction,
  trafficData,
  trafficLastUpdatedText,
  trafficStatusMessage,
  onSelectTrafficIncident,
  layers,
  userLocation,
  navigationActive,
  navPosition,
  onMapClick,
  onMapMoveEnd,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const trafficLayersRef = useRef<L.LayerGroup | null>(null);
  const trafficIncidentLayersRef = useRef<L.LayerGroup | null>(null);
  const markerLayersRef = useRef<L.LayerGroup | null>(null);
  const eventLayersRef = useRef<L.LayerGroup | null>(null);
  const infraLayersRef = useRef<L.LayerGroup | null>(null);
  const constructionLayersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);

  // Set up global bridge for popup action buttons
  useEffect(() => {
    (window as any).accessrouteViewEventDetails = (eventId: string) => {
      const found = events.find((e) => e.id === eventId);
      if (found && onSelectEvent) {
        onSelectEvent(found);
      }
    };
    (window as any).accessrouteAvoidEvent = (eventId: string) => {
      const found = events.find((e) => e.id === eventId);
      if (found && onAvoidEvent) {
        onAvoidEvent(found);
      }
    };
    (window as any).accessrouteViewConstruction = (siteId: string) => {
      const found = constructionSites.find((c) => c.id === siteId);
      if (found && onSelectConstruction) {
        onSelectConstruction(found);
      }
    };
    (window as any).accessrouteRecalculateConstruction = (siteId: string) => {
      const found = constructionSites.find((c) => c.id === siteId);
      if (found && onRecalculateAroundConstruction) {
        onRecalculateAroundConstruction(found);
      }
    };
    (window as any).accessrouteViewTrafficIncident = (incidentId: string) => {
      const found = trafficData?.incidents.find((inc) => inc.id === incidentId);
      if (found && onSelectTrafficIncident) {
        onSelectTrafficIncident(found);
      }
    };

    return () => {
      delete (window as any).accessrouteViewEventDetails;
      delete (window as any).accessrouteAvoidEvent;
      delete (window as any).accessrouteViewConstruction;
      delete (window as any).accessrouteRecalculateConstruction;
      delete (window as any).accessrouteViewTrafficIncident;
    };
  }, [events, onSelectEvent, onAvoidEvent, constructionSites, onSelectConstruction, onRecalculateAroundConstruction, trafficData, onSelectTrafficIncident]);

  // Basemap Tile Layer
  const getTileUrl = () => {
    if (layers.highContrast) {
      return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer(getTileUrl(), {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    tileLayer.on('tileerror', () => {
      tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    });

    routeLayersRef.current = L.layerGroup().addTo(map);
    trafficLayersRef.current = L.layerGroup().addTo(map);
    trafficIncidentLayersRef.current = L.layerGroup().addTo(map);
    markerLayersRef.current = L.layerGroup().addTo(map);
    eventLayersRef.current = L.layerGroup().addTo(map);
    infraLayersRef.current = L.layerGroup().addTo(map);
    constructionLayersRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    map.on('dragend zoomend', () => {
      if (isProgrammaticMoveRef.current) return;
      if (onMapMoveEnd) {
        const c = map.getCenter();
        onMapMoveEnd([c.lat, c.lng], map.getZoom());
      }
    });

    mapInstanceRef.current = map;

    // ResizeObserver to automatically invalidate Leaflet size upon layout transitions
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer if contrast changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileLayer = L.tileLayer(getTileUrl(), {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    tileLayer.on('tileerror', () => {
      tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    });
  }, [layers.highContrast]);

  // Update Map Center programmatically
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const current = map.getCenter();
    const currZoom = map.getZoom();

    const dLat = Math.abs(current.lat - center[0]);
    const dLng = Math.abs(current.lng - center[1]);
    const dZoom = Math.abs(currZoom - zoom);

    if (dLat > 0.0001 || dLng > 0.0001 || dZoom > 0.01) {
      isProgrammaticMoveRef.current = true;
      map.setView(center, zoom, { animate: true });
      const timer = setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [center[0], center[1], zoom]);

  // Update Events & Obstruction Markers & Polygons
  useEffect(() => {
    if (!eventLayersRef.current) return;
    eventLayersRef.current.clearLayers();

    if (!layers.showEvents) return;

    events.forEach((ev) => {
      if (!ev.is_active) return;
      
      const realName = getRealEventName(ev);
      const emoji = getEventEmoji(ev.event_type, realName);
      const impactInfo = getTrafficImpactInfo(ev.traffic_impact, ev.risk_level);
      const distText = ev.distance_text || (ev.distance_m ? `${ev.distance_m} m ahead` : '650 m ahead');

      // Calculate center coordinate
      let centerLat = ev.latitude || 0;
      let centerLng = ev.longitude || 0;
      if (ev.center && ev.center.length >= 2) {
        centerLat = ev.center[0];
        centerLng = ev.center[1];
      } else if (ev.polygon && ev.polygon.length > 0) {
        centerLat = ev.polygon.reduce((acc, p) => acc + p[0], 0) / ev.polygon.length;
        centerLng = ev.polygon.reduce((acc, p) => acc + p[1], 0) / ev.polygon.length;
      }

      if (centerLat === 0 && centerLng === 0) return;

      const popupHtml = `
        <div class="p-3 text-slate-900 font-sans min-w-[210px] max-w-[260px]">
          <div class="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-1.5">
            <span>${emoji}</span>
            <span>${realName}</span>
          </div>
          <div class="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded w-max mb-1.5">
            ON YOUR ROUTE
          </div>
          <div class="text-xs text-slate-600 font-bold mb-1">
            ${distText}
          </div>
          <div class="text-xs font-extrabold ${impactInfo.colorClass} flex items-center gap-1 mb-1">
            <span>${impactInfo.dot}</span>
            <span>${impactInfo.badgeText === 'HIGH' || impactInfo.badgeText === 'CRITICAL' ? 'High traffic impact' : impactInfo.badgeText === 'MEDIUM' ? 'Medium traffic impact' : 'Low traffic impact'}</span>
          </div>
          <div class="text-[11px] text-slate-600 mb-3">
            Possible delays
          </div>
          <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-200">
            <button onclick="window.accessrouteViewEventDetails && window.accessrouteViewEventDetails('${ev.id}')" class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition">
              VIEW DETAILS
            </button>
            <button onclick="window.accessrouteAvoidEvent && window.accessrouteAvoidEvent('${ev.id}')" class="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition shadow-md">
              AVOID & RECALCULATE
            </button>
          </div>
        </div>
      `;

      // 1. Polygon Zone (if polygon coordinates available)
      if (ev.polygon && ev.polygon.length > 0) {
        const isExtreme = ev.risk_level === 'extreme' || ev.risk_level === 'high';
        const polyColor = isExtreme ? '#DC2626' : '#D97706';
        const fillColor = isExtreme ? '#EF4444' : '#F59E0B';

        const polygon = L.polygon(ev.polygon, {
          color: polyColor,
          weight: 3,
          fillColor: fillColor,
          fillOpacity: 0.25,
          dashArray: '6, 8',
        });
        polygon.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
        eventLayersRef.current?.addLayer(polygon);
      }

      // 2. Map Marker showing 📢
      const markerIcon = L.divIcon({
        className: 'custom-event-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-sm transition-transform duration-150 group-hover:scale-125">
              ${emoji}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([centerLat, centerLng], { icon: markerIcon, zIndexOffset: 1400 });
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
      eventLayersRef.current?.addLayer(marker);
    });
  }, [events, layers.showEvents]);

  // Update Real OpenStreetMap Construction Layers (Geometry & 🚧 Markers)
  useEffect(() => {
    if (!constructionLayersRef.current || !mapInstanceRef.current) return;
    constructionLayersRef.current.clearLayers();

    if (!constructionSites || constructionSites.length === 0) return;

    constructionSites.forEach((site) => {
      const distText = site.is_on_route ? 'Directly on route' : `${Math.round(site.distance_from_route_m)} m from route`;
      const badgeBg = site.is_on_route ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950';

      const popupHtml = `
        <div class="p-3 text-slate-900 font-sans min-w-[220px] max-w-[270px]">
          <div class="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-1.5">
            <span>🚧</span>
            <span>${site.name || 'Road Construction'}</span>
          </div>
          <div class="text-[10px] font-black uppercase tracking-wider ${site.is_on_route ? 'text-red-600 bg-red-50 border border-red-200' : 'text-amber-700 bg-amber-50 border border-amber-200'} px-2 py-0.5 rounded w-max mb-1.5">
            ${site.is_on_route ? '⚠️ ON YOUR ROUTE' : '🚧 NEAR YOUR ROUTE'}
          </div>
          <div class="text-xs text-slate-700 font-semibold mb-1">
            <strong>Type:</strong> ${site.construction_type || 'Road construction'}
          </div>
          <div class="text-xs text-slate-700 font-semibold mb-1">
            <strong>Distance from route:</strong> ${distText}
          </div>
          <div class="text-xs text-slate-700 font-semibold mb-1">
            <strong>Status:</strong> ${site.status || 'Active'}
          </div>
          <div class="text-xs text-slate-700 font-semibold mb-1">
            <strong>Source:</strong> ${site.source || 'OpenStreetMap'}
          </div>
          ${site.last_updated ? `<div class="text-[11px] text-slate-500 mb-2"><strong>Last updated:</strong> ${site.last_updated}</div>` : ''}
          ${site.affects_pedestrian_path ? `
            <div class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1 mb-2 font-bold flex items-center gap-1">
              <span>♿</span> May affect accessible pathway
            </div>
          ` : ''}
          <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-200">
            <button onclick="window.accessrouteViewConstruction && window.accessrouteViewConstruction('${site.id}')" class="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition">
              VIEW DETAILS
            </button>
            <button onclick="window.accessrouteRecalculateConstruction && window.accessrouteRecalculateConstruction('${site.id}')" class="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer transition shadow-md">
              RECALCULATE ROUTE
            </button>
          </div>
        </div>
      `;

      // 1. Draw Real Geometry (Area/Polygon vs Line/Polyline)
      if (site.geometry_type === 'polygon' && site.geometry && site.geometry.length > 2) {
        const poly = L.polygon(site.geometry, {
          color: site.is_on_route ? '#DC2626' : '#D97706',
          weight: 3,
          fillColor: site.is_on_route ? '#EF4444' : '#F59E0B',
          fillOpacity: 0.35,
          dashArray: '6, 6',
        });
        poly.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
        poly.on('click', () => onSelectConstruction && onSelectConstruction(site));
        constructionLayersRef.current?.addLayer(poly);
      } else if (site.geometry_type === 'line' && site.geometry && site.geometry.length > 1) {
        const line = L.polyline(site.geometry, {
          color: site.is_on_route ? '#DC2626' : '#D97706',
          weight: 6,
          opacity: 0.9,
          dashArray: '8, 8',
        });
        line.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
        line.on('click', () => onSelectConstruction && onSelectConstruction(site));
        constructionLayersRef.current?.addLayer(line);
      }

      // 2. Draw 🚧 Construction Marker
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="w-8 h-8 rounded-full ${badgeBg} flex items-center justify-center shadow-lg border-2 border-white font-bold text-sm transition-transform duration-150 group-hover:scale-125">
            🚧
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-construction-pin',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(site.coordinates, { icon: markerIcon, zIndexOffset: 1450 });
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
      marker.on('click', () => onSelectConstruction && onSelectConstruction(site));
      constructionLayersRef.current?.addLayer(marker);
    });
  }, [constructionSites, onSelectConstruction]);


  // Update Places & Community Hazards Markers
  useEffect(() => {
    if (!markerLayersRef.current) return;
    markerLayersRef.current.clearLayers();

    // 1. Places & Transit Markers:
    // Only render places if a place is selected, or if user explicitly enabled 'showRamps'
    const placesToRender: Place[] = [];
    if (selectedPlace) {
      placesToRender.push(selectedPlace);
    } else if (routes.length === 0 && layers.showRamps) {
      // Only show up to 4 verified accessible hubs when the Ramps layer is explicitly enabled
      placesToRender.push(...places.filter((p) => p.accessibility?.has_ramp).slice(0, 4));
    }

    placesToRender.forEach((p) => {
      const isSelected = selectedPlace?.id === p.id;
      const isTransit = p.category === 'transit' || p.name.toLowerCase().includes('metro') || p.name.toLowerCase().includes('station');
      const isAccessible = p.accessibility?.has_ramp || p.accessibility?.has_accessible_entrance;
      
      const pinBg = isSelected
        ? 'bg-blue-600 ring-2 ring-blue-400'
        : isTransit
        ? 'bg-teal-600 hover:bg-teal-700'
        : isAccessible
        ? 'bg-emerald-600 hover:bg-emerald-700'
        : 'bg-blue-600 hover:bg-blue-700';

      const iconSvg = isAccessible
        ? `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><circle cx="9" cy="19" r="3.5"/></svg>`
        : `<svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/></svg>`;

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer">
          <div class="w-7 h-7 rounded-xl flex items-center justify-center shadow-md border-2 border-white text-white font-bold transition-transform duration-150 hover:scale-110 ${pinBg}">
            ${iconSvg}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-place-pin',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon });
      marker.on('click', () => onSelectPlace(p));

      const popupHtml = `
        <div class="p-3 text-slate-900 font-sans min-w-[200px] max-w-[260px]">
          <div class="font-bold text-sm text-slate-900 mb-0.5">${p.name}</div>
          <div class="text-[11px] text-slate-500 mb-2 truncate">${p.address || p.category}</div>
          <div class="text-[10px] font-bold ${isAccessible ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-50 border-slate-200'} px-2 py-0.5 rounded border mb-2.5 inline-block">
            ${isAccessible ? '✓ Verified Step-Free Entrance' : 'Accessibility unverified'}
          </div>
          <button onclick="window.accessrouteSetDestination && window.accessrouteSetDestination('${p.name.replace(/'/g, "\\'")}', ${p.latitude}, ${p.longitude})" class="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
            Directions here
          </button>
        </div>
      `;
      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-md' });

      markerLayersRef.current?.addLayer(marker);
    });

    // 2. Community Hazard & Barrier Markers (only rendered when layers.showHazards is explicitly true)
    if (layers.showHazards) {
      reports.forEach((rep) => {
        if (rep.status === 'EXPIRED') return;
        const isCritical = rep.severity === 'critical' || rep.severity === 'severe';
        const isVerified = rep.status === 'VERIFIED' || rep.status === 'CONFIRMED' || rep.verification_status === 'VERIFIED';
        const hasPhoto = Boolean(rep.photo_url && rep.photo_url.length > 10);

        const repBg = isCritical
          ? 'bg-red-600 text-white ring-2 ring-red-300'
          : isVerified
          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
          : 'bg-amber-500 text-white ring-2 ring-amber-200';

        const warningSvg = `<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

        const repIconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform duration-150 hover:scale-125 ${repBg}">
              ${warningSvg}
            </div>
            ${hasPhoto ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white">📷</div>` : ''}
          </div>
        `;

        const repIcon = L.divIcon({
          className: 'custom-hazard-pin',
          html: repIconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: repIcon });
        marker.on('click', () => onSelectReport(rep));
        markerLayersRef.current?.addLayer(marker);
      });
    }
  }, [places, selectedPlace, reports, selectedReport, layers.showHazards, layers.showRamps, routes.length]);

  // Update Routes Polyline & Accessibility Infrastructure Layers
  useEffect(() => {
    if (!routeLayersRef.current || !infraLayersRef.current || !mapInstanceRef.current) return;
    routeLayersRef.current.clearLayers();
    infraLayersRef.current.clearLayers();

    if (routes.length === 0) return;

    // 1. Render alternative routes
    routes.forEach((rt) => {
      const isSelected = rt.id === (selectedRouteId || routes[0].id);
      if (isSelected) return;

      const poly = L.polyline(rt.coordinates, {
        color: '#64748B',
        weight: 5,
        opacity: 0.6,
        dashArray: rt.is_step_free ? undefined : '5, 8',
        className: 'cursor-pointer hover:opacity-90 transition-opacity',
      });
      poly.bindTooltip(
        `<div class="font-bold text-xs text-slate-800">${rt.title} <span class="text-slate-500">(${rt.duration_minutes} min)</span></div>`,
        { sticky: true, className: 'card-shadow-sm' }
      );
      poly.on('click', () => onSelectRoute(rt.id));
      routeLayersRef.current?.addLayer(poly);
    });

    // 2. Render active selected route in vibrant Blue or Green
    const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (activeRoute) {
      const isStepFree = activeRoute.is_step_free;
      const primaryColor = isStepFree ? '#16A34A' : '#2563EB';
      const outlineColor = isStepFree ? '#14532D' : '#1E3A8A';

      const outline = L.polyline(activeRoute.coordinates, {
        color: outlineColor,
        weight: 9,
        opacity: 0.35,
      });
      const mainPoly = L.polyline(activeRoute.coordinates, {
        color: primaryColor,
        weight: 6,
        opacity: 1.0,
      });
      mainPoly.bindTooltip(
        `<div class="font-bold text-xs ${isStepFree ? 'text-emerald-700' : 'text-blue-700'}">${activeRoute.title} <span class="text-slate-600 font-semibold">(${activeRoute.duration_minutes} min • ${activeRoute.distance_km} km)</span></div>`,
        { sticky: true, className: 'card-shadow-sm' }
      );
      routeLayersRef.current.addLayer(outline);
      routeLayersRef.current.addLayer(mainPoly);

      // Start & Destination Pins
      if (activeRoute.coordinates.length > 0) {
        const startCoord = activeRoute.coordinates[0];
        const endCoord = activeRoute.coordinates[activeRoute.coordinates.length - 1];

        // Origin marker
        const startIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-4 h-4 bg-emerald-600 border-2 border-white rounded-full shadow-md"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const startMarker = L.marker(startCoord, { icon: startIcon, zIndexOffset: 1500 });
        startMarker.bindTooltip('<span class="font-bold text-xs">Origin</span>');
        routeLayersRef.current.addLayer(startMarker);

        // Destination pin (Clean target icon, no emojis)
        const targetSvg = `<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
        const destIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-7 h-7 bg-red-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">${targetSvg}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const destMarker = L.marker(endCoord, { icon: destIcon, zIndexOffset: 1600 });
        destMarker.bindTooltip('<span class="font-bold text-xs">Destination</span>');
        routeLayersRef.current.addLayer(destMarker);
      }

      // 3. Render Route-Based Accessibility Infrastructure (Ramps, Slopes, Stairs, Elevators, Barriers)
      if (activeRoute.features && activeRoute.features.length > 0) {
        activeRoute.features.forEach((feat) => {
          let iconHtml = '';
          if (feat.feature_type === 'ramp') {
            const inclineBadge = feat.incline_pct ? `${feat.incline_pct}%` : 'ADA';
            iconHtml = `
              <div class="cursor-pointer bg-slate-950 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border border-emerald-400 flex items-center gap-1.5 hover:scale-105 transition-transform">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Ramp (${inclineBadge})</span>
              </div>
            `;
          } else if (feat.feature_type === 'elevator') {
            iconHtml = `
              <div class="cursor-pointer bg-slate-950 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border border-teal-400 flex items-center gap-1.5 hover:scale-105 transition-transform">
                <span class="w-2 h-2 rounded-full bg-teal-400"></span>
                <span>Elevator</span>
              </div>
            `;
          } else if (feat.feature_type === 'stairs') {
            const stepTxt = feat.step_count ? `${feat.step_count} steps` : 'Stairs';
            iconHtml = `
              <div class="cursor-pointer bg-slate-950 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-lg border border-amber-400 flex items-center gap-1.5 hover:scale-105 transition-transform">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>${stepTxt}</span>
              </div>
            `;
          } else if (feat.feature_type === 'hazard' || feat.feature_type === 'obstruction') {
            const isSev = feat.severity === 'critical' || feat.severity === 'severe';
            iconHtml = `
              <div class="cursor-pointer ${isSev ? 'bg-red-700' : 'bg-amber-600'} text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-lg border border-white flex items-center gap-1.5 hover:scale-105 transition-transform">
                <span class="w-2 h-2 rounded-full bg-white"></span>
                <span class="truncate max-w-[90px]">${feat.title}</span>
              </div>
            `;
          } else if (feat.feature_type === 'event') {
            iconHtml = `
              <div class="cursor-pointer bg-purple-700 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-lg border border-purple-300 flex items-center gap-1.5 hover:scale-105 transition-transform">
                <span class="w-2 h-2 rounded-full bg-purple-300"></span>
                <span class="truncate max-w-[90px]">${feat.title}</span>
              </div>
            `;
          }

          if (iconHtml) {
            const customDivIcon = L.divIcon({
              className: 'custom-route-feature-icon',
              html: iconHtml,
              iconSize: [120, 24],
              iconAnchor: [60, 12],
            });

            const marker = L.marker(feat.coordinates, { icon: customDivIcon, zIndexOffset: 1200 });

            // Rich accessible popup
            const popupContent = `
              <div class="p-2 max-w-[220px] text-slate-900 font-sans">
                <div class="font-extrabold text-xs mb-1 flex items-center gap-1">
                  ${feat.feature_type === 'ramp' ? '♿' : feat.feature_type === 'elevator' ? '🛗' : feat.feature_type === 'stairs' ? '🪜' : '⚠️'}
                  <span>${feat.title}</span>
                </div>
                <div class="text-[11px] text-slate-600 mb-1.5">${feat.description}</div>
                <div class="text-[10px] bg-slate-100 p-1.5 rounded-lg flex flex-col gap-0.5 text-slate-700 mb-1">
                  <div><strong>Distance along route:</strong> ${feat.distance_along_route_m} m</div>
                  <div><strong>Incline:</strong> ${feat.incline_text || (feat.incline_pct ? `${feat.incline_pct}%` : 'Unknown')}</div>
                  <div><strong>Wheelchair access:</strong> ${feat.wheelchair_status?.toUpperCase() || 'YES'}</div>
                  <div><strong>Source:</strong> ${feat.source || 'OpenStreetMap'}</div>
                </div>
                ${feat.photo_url ? `
                  <div class="mt-1.5 rounded-lg overflow-hidden border border-slate-200">
                    <img src="${feat.photo_url}" alt="Barrier photo evidence" class="w-full h-24 object-cover" />
                  </div>
                ` : ''}
              </div>
            `;
            marker.bindPopup(popupContent, { maxWidth: 240, className: 'card-shadow-md' });
            infraLayersRef.current?.addLayer(marker);
          }
        });
      }

      if (!navigationActive) {
        const bounds = L.latLngBounds(activeRoute.coordinates);
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
      }
    }
  }, [routes, selectedRouteId, layers.showRamps, navigationActive]);

  // Update Real Traffic Segments & Route Congestion Overlay
  useEffect(() => {
    if (!trafficLayersRef.current || !trafficIncidentLayersRef.current || !mapInstanceRef.current) return;
    trafficLayersRef.current.clearLayers();
    trafficIncidentLayersRef.current.clearLayers();

    if (routes.length === 0 || !trafficData || layers.showTraffic === false) return;

    // 1. Draw Real Route Traffic Segments (Aligned precisely with route geometry)
    if (trafficData.segments && trafficData.segments.length > 0) {
      trafficData.segments.forEach((seg) => {
        if (!seg.coordinates || seg.coordinates.length < 2) return;

        // Visual color mapping
        // Green: #16A34A (Free-flow)
        // Yellow/Amber: #EAB308 (Moderate)
        // Orange: #F97316 (Heavy)
        // Red: #DC2626 (Severe)
        const segColor = seg.color || (
          seg.congestion_level === 'severe' ? '#DC2626' :
          seg.congestion_level === 'heavy' ? '#F97316' :
          seg.congestion_level === 'moderate' ? '#EAB308' : '#16A34A'
        );

        const congBadge = 
          seg.congestion_level === 'severe' ? '🔴 Severe Stop-and-Go' :
          seg.congestion_level === 'heavy' ? '🟠 Heavy Congestion' :
          seg.congestion_level === 'moderate' ? '🟡 Moderate Traffic' : '🟢 Free-Flow Traffic';

        const delayTxt = seg.delay_seconds > 0 
          ? `+${Math.ceil(seg.delay_seconds / 60)} min delay`
          : 'No delay (On-time)';

        const speedRatio = seg.free_flow_speed_kmh > 0 
          ? Math.round((seg.current_speed_kmh / seg.free_flow_speed_kmh) * 100)
          : 100;

        const popupHtml = `
          <div class="p-3 text-slate-900 font-sans min-w-[220px] max-w-[270px]">
            <div class="font-extrabold text-sm text-slate-900 mb-1 flex items-center justify-between">
              <span class="truncate">${seg.road_name || 'Active Road Corridor'}</span>
            </div>
            <div class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded w-max mb-2" style="background-color: ${segColor}20; color: ${segColor}; border: 1px solid ${segColor}50;">
              ${congBadge}
            </div>
            <div class="text-xs text-slate-700 mb-1 flex justify-between items-center">
              <span><strong>Current Speed:</strong></span>
              <span class="font-mono font-bold text-slate-900">${seg.current_speed_kmh} km/h</span>
            </div>
            <div class="text-xs text-slate-700 mb-1 flex justify-between items-center">
              <span><strong>Free-Flow Speed:</strong></span>
              <span class="font-mono text-slate-600">${seg.free_flow_speed_kmh} km/h (${speedRatio}%)</span>
            </div>
            <div class="text-xs text-slate-700 mb-2 flex justify-between items-center">
              <span><strong>Traffic Delay:</strong></span>
              <span class="font-bold ${seg.delay_seconds > 60 ? 'text-red-600' : 'text-emerald-600'}">${delayTxt}</span>
            </div>
            <div class="text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 flex justify-between items-center">
              <span>Distance: ${seg.distance_meters} m</span>
              <span>Geoapify Live Feed</span>
            </div>
          </div>
        `;

        const poly = L.polyline(seg.coordinates, {
          color: segColor,
          weight: navigationActive ? 8 : 7,
          opacity: 0.94,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'cursor-pointer hover:opacity-100 transition-opacity',
        });

        poly.bindPopup(popupHtml, { maxWidth: 280, className: 'card-shadow-lg' });
        poly.bindTooltip(
          `<div class="text-xs font-extrabold px-1 py-0.5" style="color: ${segColor}">${congBadge} • ${seg.current_speed_kmh} km/h ${seg.delay_seconds > 0 ? `(+${Math.ceil(seg.delay_seconds / 60)}m)` : ''}</div>`,
          { sticky: true, className: 'card-shadow-sm' }
        );

        trafficLayersRef.current?.addLayer(poly);
      });
    }

    // 2. Draw Real Route Traffic Incidents & Bottlenecks
    if (trafficData.incidents && trafficData.incidents.length > 0) {
      trafficData.incidents.forEach((inc) => {
        if (!inc.location || inc.location.length < 2) return;

        const isCritical = inc.severity === 'critical' || inc.severity === 'severe';
        const incBg = isCritical ? 'bg-red-600 ring-2 ring-red-400' : 'bg-orange-500 ring-2 ring-orange-300';
        
        let incIcon = '🚨';
        if (inc.incident_type === 'accident') incIcon = '💥';
        else if (inc.incident_type === 'road_closure' || inc.incident_type === 'blocked_road') incIcon = '🛑';
        else if (inc.incident_type === 'construction') incIcon = '🚧';
        else if (inc.incident_type === 'slowdown') incIcon = '🐢';
        else if (inc.incident_type === 'congestion') incIcon = '🚗';

        const popupHtml = `
          <div class="p-3 text-slate-900 font-sans min-w-[220px] max-w-[280px]">
            <div class="font-extrabold text-sm text-slate-900 mb-1 flex items-center gap-1.5">
              <span>${incIcon}</span>
              <span>${inc.title}</span>
            </div>
            <div class="text-[10px] font-black uppercase tracking-wider ${inc.is_on_route ? 'text-red-600 bg-red-50 border border-red-200' : 'text-amber-700 bg-amber-50 border border-amber-200'} px-2 py-0.5 rounded w-max mb-2">
              ${inc.is_on_route ? '⚠️ AFFECTS ACTIVE ROUTE' : 'NEAR ROUTE'}
            </div>
            <div class="text-xs text-slate-700 mb-1.5 font-medium leading-relaxed">
              ${inc.description}
            </div>
            <div class="text-xs text-slate-800 mb-1 flex justify-between">
              <strong>Estimated Impact:</strong>
              <span class="font-bold text-red-600">${inc.estimated_impact}</span>
            </div>
            <div class="text-[11px] text-slate-600 mb-1 flex justify-between">
              <span><strong>Severity:</strong> ${inc.severity.toUpperCase()}</span>
              <span><strong>Distance:</strong> ${inc.distance_along_route_m} m along route</span>
            </div>
            <div class="text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 flex justify-between">
              <span>Source: ${inc.source}</span>
              <span>${inc.last_updated || 'Real-time live feed'}</span>
            </div>
          </div>
        `;

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-8 h-8 rounded-full ${incBg} text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-sm transition-transform duration-150 group-hover:scale-125">
              ${incIcon}
            </div>
            ${isCritical ? '<div class="absolute -inset-1 rounded-full bg-red-500 opacity-40 animate-ping pointer-events-none"></div>' : ''}
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'custom-traffic-incident-pin',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(inc.location, { icon: markerIcon, zIndexOffset: 1600 });
        marker.bindPopup(popupHtml, { maxWidth: 290, className: 'card-shadow-lg' });
        marker.on('click', () => onSelectTrafficIncident && onSelectTrafficIncident(inc));
        trafficIncidentLayersRef.current?.addLayer(marker);
      });
    }
  }, [routes, selectedRouteId, trafficData, layers.showTraffic, navigationActive, onSelectTrafficIncident]);

  // Update User Live Location (ONLY when real coordinates exist)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const pos = navPosition || userLocation;

    if (!pos) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const userIconHtml = `
        <div class="relative flex items-center justify-center pointer-events-none">
          <div class="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
            <div class="w-2.5 h-2.5 bg-white rounded-full"></div>
          </div>
          <div class="absolute -inset-2.5 bg-blue-500 rounded-full opacity-35 animate-pulse-ring pointer-events-none"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        className: 'custom-user-pin',
        html: userIconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      userMarkerRef.current = L.marker(pos, { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(pos);
    }

    if (navigationActive) {
      map.setView(pos, Math.max(map.getZoom(), 17), { animate: true });
    }
  }, [userLocation, navPosition, navigationActive]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Real-time Traffic Legend & Status Widget */}
      {routes.length > 0 && layers.showTraffic !== false && (
        <div 
          className={`absolute top-20 right-4 z-20 pointer-events-auto p-2.5 sm:p-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 ${
            layers.highContrast 
              ? 'bg-black/95 text-yellow-300 border-yellow-400' 
              : 'bg-slate-900/90 text-white border-slate-700/80 card-shadow-md'
          }`}
          role="region"
          aria-label="Real-time Traffic Conditions Legend"
        >
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-700/60">
            <div className="flex items-center gap-1.5 font-extrabold text-[11px] tracking-wide text-slate-200 uppercase">
              <span className={`w-2 h-2 rounded-full ${trafficData?.status === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>Live Traffic</span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium">
              {trafficLastUpdatedText || (trafficData?.status === 'success' ? 'Live' : 'Unavailable')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-semibold text-slate-200">
            <div className="flex items-center gap-1.5" title="Free flow speed (>= 80% baseline)">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0 shadow-xs"></span>
              <span>Free</span>
            </div>
            <div className="flex items-center gap-1.5" title="Moderate traffic (50-80% baseline)">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shrink-0 shadow-xs"></span>
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-1.5" title="Heavy traffic (25-50% baseline)">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] shrink-0 shadow-xs"></span>
              <span>Heavy</span>
            </div>
            <div className="flex items-center gap-1.5" title="Severe / Stop-and-go (< 25% baseline)">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0 shadow-xs"></span>
              <span>Severe</span>
            </div>
          </div>

          {trafficStatusMessage && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
              {trafficStatusMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
