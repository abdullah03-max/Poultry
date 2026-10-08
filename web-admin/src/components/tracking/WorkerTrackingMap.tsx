// =============================================================================
// SHAN POULTRY PROTEIN - Live Worker GPS Tracking Map
// Realtime visualization of field collectors with Google Maps Landmark / Chowk details
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Profile } from '../../types/database';
import { api } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Navigation,
  Radio,
  Phone,
  RefreshCw,
  Clock,
  Crosshair,
  User,
  Shield,
  MapPin,
  Compass,
  Layers,
  AlertTriangle
} from 'lucide-react';

export const getWorkerPresence = (w: Profile): {
  status: 'online' | 'idle' | 'offline';
  label: string;
  pinBg: string;
  badgeClass: string;
  timeAgoText: string;
  hasGps: boolean;
} => {
  const hasGps = Boolean(
    w.current_latitude &&
    w.current_longitude &&
    Number(w.current_latitude) !== 0 &&
    Number(w.current_longitude) !== 0 &&
    !isNaN(Number(w.current_latitude)) &&
    !isNaN(Number(w.current_longitude))
  );

  if (!hasGps) {
    return {
      status: 'offline',
      label: 'No GPS (سگنل نہیں)',
      pinBg: '#64748B',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      timeAgoText: 'No GPS signal',
      hasGps: false,
    };
  }

  if (!w.last_location_updated_at) {
    return {
      status: 'offline',
      label: 'Offline (No Signal)',
      pinBg: '#64748B',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      timeAgoText: 'Never tracked',
      hasGps: true,
    };
  }

  const diffMs = Date.now() - new Date(w.last_location_updated_at).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 5 && w.is_online !== false) {
    return {
      status: 'online',
      label: 'Online Live',
      pinBg: '#059669',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      timeAgoText: diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`,
      hasGps: true,
    };
  } else if (diffMinutes <= 30) {
    return {
      status: 'idle',
      label: 'Idle / Stale',
      pinBg: '#D97706',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      timeAgoText: `${diffMinutes}m ago`,
      hasGps: true,
    };
  } else {
    const hours = Math.floor(diffMinutes / 60);
    return {
      status: 'offline',
      label: 'Offline',
      pinBg: '#64748B',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      timeAgoText: hours > 24 ? `${Math.floor(hours / 24)}d ago` : `${hours}h ago`,
      hasGps: true,
    };
  }
};

interface WorkerTrackingMapProps {
  onSelectWorker?: (worker: Profile) => void;
  selectedWorkerId?: string | null;
}

export const WorkerTrackingMap: React.FC<WorkerTrackingMapProps> = ({ onSelectWorker, selectedWorkerId: propWorkerId }) => {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(propWorkerId || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [mapType, setMapType] = useState<'google_roadmap' | 'google_satellite' | 'osm'>('google_roadmap');
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // Default coordinate center: Burewala / Gaggoo Mandi region in Punjab, Pakistan
  const DEFAULT_CENTER: [number, number] = [30.2974, 72.8550];

  const fetchWorkersWithLocation = async () => {
    try {
      setLoading(true);
      const list = await api.getWorkers();

      // If online Supabase is available, query fresh profiles with current location
      if (isSupabaseConfigured()) {
        const { data: dbWorkers } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'worker');

        if (dbWorkers && dbWorkers.length > 0) {
          const merged = list.map(w => {
            const live = dbWorkers.find(dw => dw.id === w.id);
            if (live) {
              return {
                ...w,
                current_latitude: live.current_latitude ?? w.current_latitude,
                current_longitude: live.current_longitude ?? w.current_longitude,
                location_accuracy: live.location_accuracy ?? w.location_accuracy,
                last_location_updated_at: live.last_location_updated_at ?? w.last_location_updated_at,
                is_online: live.is_online ?? w.is_online,
              };
            }
            return w;
          });
          setWorkers(merged);
          setLastRefreshed(new Date());
          return;
        }
      }

      setWorkers(list);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Error fetching workers for map:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersWithLocation();

    // Periodic refresh every 15 seconds
    const interval = setInterval(fetchWorkersWithLocation, 15000);

    // Supabase realtime subscription on profiles table for instant location updates
    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('realtime_worker_gps')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            const updated = payload.new as Profile;
            if (updated && updated.role === 'worker') {
              setWorkers(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w));
              setLastRefreshed(new Date());
            }
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Initialize Tile Layer according to selected mapType
  const createTileLayer = (type: 'google_roadmap' | 'google_satellite' | 'osm') => {
    if (type === 'google_roadmap') {
      // Detailed Google Maps Roadmap with shops, chowks, schools, colleges, mosques
      return L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '© Google Maps Detailed',
      });
    } else if (type === 'google_satellite') {
      // Detailed Google Satellite + Roads & POI labels (Hybrid)
      return L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '© Google Satellite Hybrid',
      });
    } else {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        attributionControl: false,
      });

      const initialLayer = createTileLayer('google_roadmap');
      initialLayer.addTo(map);
      tileLayerRef.current = initialLayer;

      mapInstanceRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = createTileLayer(mapType);
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Sync propWorkerId if changed from parent
  useEffect(() => {
    if (propWorkerId) {
      setSelectedWorkerId(propWorkerId);
      const target = workers.find(w => w.id === propWorkerId);
      if (target) {
        handleFocusWorker(target);
      }
    }
  }, [propWorkerId, workers]);

  // Update Markers on Worker Location Change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds: L.LatLngTuple[] = [];
    const activeGpsIds = new Set<string>();

    workers.forEach(w => {
      const presence = getWorkerPresence(w);

      // Only plot marker if the worker has genuine GPS coordinates!
      // NEVER assign fake coordinates when connection is lost.
      if (!presence.hasGps || !w.current_latitude || !w.current_longitude) {
        // If this worker had a marker previously, remove it to prevent stale fake location
        if (markersRef.current[w.id]) {
          markersRef.current[w.id].remove();
          delete markersRef.current[w.id];
        }
        return;
      }

      activeGpsIds.add(w.id);
      const lat = Number(w.current_latitude);
      const lng = Number(w.current_longitude);
      const latlng: L.LatLngTuple = [lat, lng];
      bounds.push(latlng);

      const initials = w.full_name ? w.full_name.substring(0, 2).toUpperCase() : 'WK';

      // Create Custom Animated Pulse Pin Icon with legible name tag on map
      const customIcon = L.divIcon({
        className: 'custom-worker-pin',
        html: `
          <div style="position: relative; width: 60px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
            <div style="background: rgba(15, 23, 42, 0.92); color: white; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.35); margin-bottom: 2px; border: 1px solid rgba(255,255,255,0.4); max-width: 90px; overflow: hidden; text-overflow: ellipsis;">
              ${w.full_name || 'Worker'}
            </div>
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
              ${presence.status === 'online' ? `
                <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              ` : ''}
              <div style="
                width: 28px; 
                height: 28px; 
                border-radius: 50%; 
                background: ${presence.pinBg}; 
                border: 2.5px solid white; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 10px;
                font-family: sans-serif;
              ">
                ${initials}
              </div>
            </div>
          </div>
        `,
        iconSize: [60, 56],
        iconAnchor: [30, 52],
      });

      if (markersRef.current[w.id]) {
        markersRef.current[w.id].setLatLng(latlng);
        markersRef.current[w.id].setIcon(customIcon);
      } else {
        const marker = L.marker(latlng, { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-weight: bold; font-size: 14px; color: #0F172A; margin-bottom: 2px;">
              ${w.full_name}
            </div>
            <div style="font-size: 11px; color: ${presence.pinBg}; font-weight: 700; margin-bottom: 6px;">
              ● ${presence.label} (${presence.timeAgoText})
            </div>
            ${w.phone ? `
              <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
                📞 <a href="tel:${w.phone}" style="color: #2563EB; font-weight: bold; text-decoration: none;">${w.phone}</a>
              </div>
            ` : ''}
            <div style="font-size: 10px; color: #64748B; font-family: monospace;">
              GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}
            </div>
            ${w.location_accuracy ? `
              <div style="font-size: 10px; color: #94A3B8; font-family: monospace;">
                Accuracy: ±${Math.round(w.location_accuracy)}m
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setSelectedWorkerId(w.id);
          if (onSelectWorker) onSelectWorker(w);
        });

        markersRef.current[w.id] = marker;
      }
    });

    // Remove any markers that no longer belong to active workers
    Object.keys(markersRef.current).forEach(id => {
      if (!activeGpsIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-fit map to workers bounds if available
    if (bounds.length > 0 && !selectedWorkerId) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 15 });
      } catch (e) {}
    }
  }, [workers]);

  const handleFocusWorker = (w: Profile) => {
    setSelectedWorkerId(w.id);
    const map = mapInstanceRef.current;
    const presence = getWorkerPresence(w);

    if (!presence.hasGps || !w.current_latitude || !w.current_longitude) {
      setGpsNotice(`ورکر "${w.full_name}" کا GPS سگنل فی الحال موصول نہیں ہو رہا یا موبائل آف لائن ہے۔`);
      setTimeout(() => setGpsNotice(null), 5000);
      return;
    }

    setGpsNotice(null);
    if (!map) return;

    const lat = Number(w.current_latitude);
    const lng = Number(w.current_longitude);

    map.flyTo([lat, lng], 16, { duration: 1.2 });

    const marker = markersRef.current[w.id];
    if (marker) {
      marker.openPopup();
    }
    if (onSelectWorker) onSelectWorker(w);
  };

  const handleResetView = () => {
    setSelectedWorkerId(null);
    setGpsNotice(null);
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(DEFAULT_CENTER, 12, { duration: 1 });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-card">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Navigation className="w-4 h-4 text-emerald-600" />
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
              Live Field Worker GPS Tracking
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live Realtime
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Google Maps لائیو ٹریکنگ - دکانیں، چوک، سڑکیں اور اسکول واضح دکھائی دیتے ہیں۔
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Map Layer Switcher */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-sm text-xs">
            <button
              onClick={() => setMapType('google_roadmap')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                mapType === 'google_roadmap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Google Maps Roadmap (روڈ، چوک، دکانیں، اسکول)"
            >
              🗺️ Google Maps
            </button>
            <button
              onClick={() => setMapType('google_satellite')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                mapType === 'google_satellite'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Google Satellite Hybrid (سیٹلائٹ مع نام)"
            >
              🛰️ سیٹلائٹ
            </button>
            <button
              onClick={() => setMapType('osm')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                mapType === 'osm'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="OpenStreetMap"
            >
              🌐 OSM
            </button>
          </div>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition"
            title="Reset map view to Punjab center"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Center Region</span>
          </button>
          <button
            onClick={fetchWorkersWithLocation}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            title="Refresh GPS locations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync GPS</span>
          </button>
        </div>
      </div>

      {/* GPS Warning Notice Banner */}
      {gpsNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{gpsNotice}</span>
          </div>
          <button
            onClick={() => setGpsNotice(null)}
            className="text-amber-600 hover:text-amber-900 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container: Sidebar + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
        {/* Workers List Column */}
        <div className="lg:col-span-1 border-r border-slate-100 p-3.5 space-y-2.5 max-h-[520px] overflow-y-auto bg-slate-50/30">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Collectors ({workers.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-updating
            </span>
          </div>

          {workers.map(w => {
            const isSelected = selectedWorkerId === w.id;
            const presence = getWorkerPresence(w);

            return (
              <div
                key={w.id}
                onClick={() => handleFocusWorker(w)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        presence.status === 'online'
                          ? 'bg-emerald-500 animate-pulse'
                          : presence.status === 'idle'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-bold text-slate-900 text-xs truncate">{w.full_name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${presence.badgeClass}`}>
                    {presence.label}
                  </span>
                </div>

                <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                  {w.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{w.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {presence.hasGps && w.current_latitude
                        ? `${Number(w.current_latitude).toFixed(5)}, ${Number(w.current_longitude).toFixed(5)}`
                        : '⚠️ No GPS Signal'}
                      {presence.hasGps && w.location_accuracy ? ` (±${Math.round(w.location_accuracy)}m)` : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {presence.timeAgoText}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusWorker(w);
                    }}
                    className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg border transition ${
                      presence.hasGps
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Crosshair className="w-3 h-3" /> Track Worker
                  </button>
                </div>
              </div>
            );
          })}

          {workers.length === 0 && (
            <p className="text-xs text-slate-400 py-8 text-center">No active workers found.</p>
          )}
        </div>

        {/* Interactive Leaflet Map Column */}
        <div className="lg:col-span-3 relative min-h-[480px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-10" />

          {/* Quick Floating Map Overlay */}
          <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-md flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-[11px]">Green: Live Online (&lt; 5m)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-[11px]">Amber: Idle (5–30m)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="font-semibold text-[11px]">Grey: Offline / No Signal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
