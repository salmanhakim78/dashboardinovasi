import { useState, useEffect, useRef } from 'react';
import { MapPin, TrendingUp, Award, Layers, Play, X, Loader2, AlertTriangle, Users, GitBranch, Route, CheckCircle2, Info } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const injectLeafletCSS = () => {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  if (document.getElementById('leaflet-divicon-fix')) return;
  const style = document.createElement('style');
  style.id = 'leaflet-divicon-fix';
  style.textContent = `.leaflet-div-icon-clean { background: none !important; border: none !important; box-shadow: none !important; }`;
  document.head.appendChild(style);
};

const loadLeaflet = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).L) return resolve((window as any).L);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface InovasiPoint {
  no: number; judul_inovasi: string; deskripsi: string; lat: number; lon: number;
  pemda: string; jenis: string; kematangan: number;
  video?: string;      // 'Ada' | 'Tidak' | null
  link_video?: string; // URL (YouTube, youtu.be, Drive, dll)
}
interface Recommendation {
  inovasi_1_id: number; inovasi_1_judul: string; inovasi_2_id: number;
  inovasi_2_judul: string; similarity_score: number; distance_km: number;
  is_feasible: boolean; collaboration_reason: string;
}
// MapData disederhanakan — tidak ada clusters/total_clusters
interface MapData {
  innovations: InovasiPoint[];
}
interface MapInnovationProps { darkMode: boolean; }

// ============================================================
// TRANSPORT CORRIDOR ANALYSIS TYPES
// ============================================================
interface TransportCorridorResult {
  hasRoad: boolean;
  hasRailway: boolean;
  hasToll: boolean;
  matchedRoadNames: string[];
  matchedRailNames: string[];
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  osrmRoadNames: string[];
  accessibilityLevel: 'sangat_mudah' | 'cukup_mudah' | 'via_kereta' | 'virtual';
  accessibilityLabel: string;
  accessibilityColor: string;
  accessibilityBg: string;
  suggestion: string;
  isLoadingOSRM?: boolean;
}

// ============================================================
// TRANSPORT CORRIDOR ANALYSIS — Pure geometry
// ============================================================
const pointToSegmentDist = (
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number => {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const lineIntersectsBuffer = (
  lineCoords: number[][],
  corridorCoords: [number, number][],
  bufferDeg: number
): boolean => {
  for (let ci = 0; ci < corridorCoords.length - 1; ci++) {
    const [cx1, cy1] = corridorCoords[ci];
    const [cx2, cy2] = corridorCoords[ci + 1];
    for (let li = 0; li < lineCoords.length - 1; li++) {
      const [lx1, ly1] = lineCoords[li];
      const [lx2, ly2] = lineCoords[li + 1];
      const d1 = pointToSegmentDist(cx1, cy1, lx1, ly1, lx2, ly2);
      const d2 = pointToSegmentDist(cx2, cy2, lx1, ly1, lx2, ly2);
      const d3 = pointToSegmentDist(lx1, ly1, cx1, cy1, cx2, cy2);
      const d4 = pointToSegmentDist(lx2, ly2, cx1, cy1, cx2, cy2);
      if (Math.min(d1, d2, d3, d4) < bufferDeg) return true;
    }
  }
  return false;
};

const extractCoords = (geometry: any): number[][][] => {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
};

const normalizeName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').replace(/[–—-]/g, '–');

const buildSuggestion = (
  level: TransportCorridorResult['accessibilityLevel'],
  distanceKm: number,
  matchedRoadNames: string[],
  matchedRailNames: string[],
  hasToll: boolean,
  osrmRoadNames?: string[],
  routeDistanceKm?: number | null,
  routeDurationMin?: number | null,
): string => {
  const roadNamesToUse = (osrmRoadNames && osrmRoadNames.length > 0)
    ? osrmRoadNames
    : matchedRoadNames;

  const uniqueRoads = [...new Set(roadNamesToUse.map(normalizeName))];
  const tolls  = uniqueRoads.filter(n => n.toLowerCase().includes('tol'));
  const trunks = uniqueRoads.filter(n => !n.toLowerCase().includes('tol'));
  const roadLabel = (() => {
    if (tolls.length >= 2)   return `${tolls[0]} dan ${tolls[1]}`;
    if (tolls.length === 1 && trunks.length >= 1) return `${tolls[0]} serta ${trunks[0]}`;
    if (tolls.length === 1)  return tolls[0];
    if (trunks.length >= 2)  return `${trunks[0]} dan ${trunks[1]}`;
    if (trunks.length === 1) return trunks[0];
    return 'jalan nasional';
  })();

  const uniqueRails = [...new Set(matchedRailNames.map(normalizeName))];
  const railLabel = (() => {
    if (uniqueRails.length >= 2) return `${uniqueRails[0]} serta ${uniqueRails[1]}`;
    if (uniqueRails.length === 1) return uniqueRails[0];
    return 'jalur kereta api';
  })();

  const distLabel = routeDistanceKm != null
    ? `±${routeDistanceKm.toFixed(0)} km via jalan`
    : `${distanceKm.toFixed(0)} km (garis lurus)`;

  const durasiLabel = routeDurationMin != null
    ? (() => {
        const h = Math.floor(routeDurationMin / 60);
        const m = Math.round(routeDurationMin % 60);
        return h > 0 ? `~${h} jam ${m > 0 ? m + ' menit' : ''}` : `~${m} menit`;
      })()
    : null;

  const waktuInfo = durasiLabel ? ` (${durasiLabel})` : '';

  if (level === 'sangat_mudah') {
    const via = hasToll
      ? `Dilalui ${roadLabel} — akses tol mempersingkat waktu tempuh secara signifikan.`
      : `Terkoneksi melalui ${roadLabel}.`;
    return `${via} Jarak jalan ${distLabel}${waktuInfo} — pertemuan tatap muka rutin sangat realistis untuk dijadwalkan.`;
  }

  if (level === 'cukup_mudah') {
    const via = hasToll
      ? `Koridor ini dilalui ${roadLabel}.`
      : `Terhubung melalui ${roadLabel}.`;
    return `${via} Jarak ${distLabel}${waktuInfo} masih terjangkau — pertemuan 1–2 kali per bulan bisa direncanakan tanpa biaya besar.`;
  }

  if (level === 'via_kereta') {
    const nearRoad = roadNamesToUse.length > 0
      ? ` Jalur darat (${roadLabel}) juga tersedia meski lebih jauh.`
      : '';
    return `Terkoneksi via ${railLabel}.${nearRoad} Kereta api menjadi pilihan efisien untuk perjalanan${waktuInfo} dengan biaya terjangkau.`;
  }

  const distNote = distanceKm > 150
    ? `Jarak ${distLabel} dan minimnya infrastruktur utama`
    : `Belum terdeteksi jalur transportasi utama di koridor ${distLabel}`;
  return `${distNote} — disarankan memulai kolaborasi via Zoom atau WhatsApp sebelum mengagendakan kunjungan langsung.`;
};

let cachedMapData: MapData | null = null;
let cachedGeoJSON: any = null;
let cachedRoads: any = null;
let cachedRailway: any = null;

// ============================================================
// POINT-IN-POLYGON (Ray Casting)
// ============================================================
const pointInRing = (point: [number, number], ring: number[][]): boolean => {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const pointInPolygonWithHoles = (point: [number, number], rings: number[][][]): boolean => {
  if (!pointInRing(point, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(point, rings[h])) return false;
  }
  return true;
};

const pointInFeature = (lon: number, lat: number, feature: any): boolean => {
  const geom = feature?.geometry;
  if (!geom) return false;
  const point: [number, number] = [lon, lat];
  if (geom.type === 'Polygon') return pointInPolygonWithHoles(point, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((poly: number[][][]) => pointInPolygonWithHoles(point, poly));
  return false;
};

const pipCache: Map<number, string | null> = new Map();

const findKabupatenByCoord = (no: number, lat: number, lon: number, geojson: any): string | null => {
  if (pipCache.has(no)) return pipCache.get(no)!;
  for (const feature of geojson.features) {
    if (pointInFeature(lon, lat, feature)) {
      const name = feature.properties?.NAME_2 ?? null;
      pipCache.set(no, name);
      return name;
    }
  }
  pipCache.set(no, null);
  return null;
};

const normalizeGadmName = (name: string): string => {
  if (!name) return '';
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const getMarkerColor = (k: number) => {
  if (k >= 65) return { bg: 'bg-green-600',  hex: '#16a34a' };
  if (k >= 45) return { bg: 'bg-yellow-500', hex: '#eab308' };
  return         { bg: 'bg-red-500',          hex: '#ef4444' };
};

// ============================================================
// HOVER COLOR: berdasarkan rata-rata kematangan wilayah
// (menggantikan cluster color — tidak ada warna default)
// ============================================================
const getKabHoverColor = (avgKematangan: number): string => {
  if (avgKematangan >= 65) return '#16a34a'; // hijau — Sangat Inovatif
  if (avgKematangan >= 45) return '#eab308'; // kuning — Inovatif
  return '#ef4444';                           // merah — Kurang Inovatif
};

const getMaturityLabel = (k: number) =>
  k >= 65 ? 'Sangat Inovatif' : k >= 45 ? 'Inovatif' : 'Kurang Inovatif';

// Konversi semua jenis URL video ke format embeddable
const getVideoEmbedInfo = (url: string): { embedUrl: string; isEmbed: boolean } => {
  if (!url || url === '-') return { embedUrl: '', isEmbed: false };

  // YouTube watch
  const m1 = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  if (m1) return { embedUrl: `https://www.youtube.com/embed/${m1[1]}?autoplay=1`, isEmbed: true };

  // YouTube short link
  const m2 = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m2) return { embedUrl: `https://www.youtube.com/embed/${m2[1]}?autoplay=1`, isEmbed: true };

  // Google Drive file — konversi ke preview embed
  const m3 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m3) return { embedUrl: `https://drive.google.com/file/d/${m3[1]}/preview`, isEmbed: true };

  // Google Drive folder atau link lain — buka di tab baru
  return { embedUrl: url, isEmbed: false };
};

// Backward-compat alias
const getYouTubeEmbedUrl = (url: string): string => getVideoEmbedInfo(url).embedUrl;

// ============================================================
// VIDEO MODAL
// ============================================================
function VideoModal({ videoUrl, isEmbed, onClose, darkMode }: { videoUrl: string; isEmbed: boolean; onClose: () => void; darkMode: boolean }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.60)', padding: '24px' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        style={{ zIndex: 99999, maxWidth: '860px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — cukup ruang, tidak dempet */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Video Profil Inovasi</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}
          >
            <X size={20} />
          </button>
        </div>

        {isEmbed ? (
          /* Video embed — rasio 16:9 penuh */
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
            <iframe
              src={videoUrl}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video Profil Inovasi"
            />
          </div>
        ) : (
          /* Non-embeddable — Drive folder, tuxedovation, dll */
          <div
            className={`flex flex-col items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
            style={{ padding: '56px 40px', gap: '24px' }}
          >
            <div
              className={`flex items-center justify-center rounded-full ${darkMode ? 'bg-gray-600' : 'bg-white'}`}
              style={{ width: 72, height: 72, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
            >
              <Play size={30} color={darkMode ? '#9ca3af' : '#6b7280'} fill={darkMode ? '#9ca3af' : '#6b7280'} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`} style={{ fontSize: 15, marginBottom: 6 }}>
                Video tersedia di Google Drive
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: 13 }}>
                Video ini perlu dibuka di tab baru untuk diputar
              </p>
            </div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              style={{ padding: '10px 28px', fontSize: 14, textDecoration: 'none' }}
            >
              <Play size={14} fill="currentColor" />
              Putar Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LEGEND COMPONENT
// REVISI: Baris CLUSTER dihapus — tidak ada lagi cluster color
// ============================================================
function MapLegend({
  darkMode,
  showRoads,
  showRailway,
  loadingTransport,
  onToggleRoads,
  onToggleRailway,
}: {
  darkMode: boolean;
  showRoads: boolean;
  showRailway: boolean;
  loadingTransport: boolean;
  onToggleRoads: () => void;
  onToggleRailway: () => void;
}) {
  const [roadsActive, setRoadsActive] = useState(showRoads);
  const [railwayActive, setRailwayActive] = useState(showRailway);

  const handleToggleRoads = () => {
    setRoadsActive(prev => !prev);
    onToggleRoads();
  };

  const handleToggleRailway = () => {
    setRailwayActive(prev => !prev);
    onToggleRailway();
  };

  const pillClass = () =>
    `flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap select-none transition-all duration-150 ${
      darkMode
        ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
    }`;

  const rowLabelClass = `text-xs font-bold uppercase tracking-wide flex-shrink-0 ${
    darkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  return (
    <div className={`mt-4 p-4 rounded-2xl border shadow-md ${
      darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/95 border-gray-200'
    }`}>
      <div className="flex flex-col gap-3">

        {/* ── Row 1: MARKER + GARIS REKOMENDASI ── */}
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex flex-wrap items-center gap-y-2">
            <span className={rowLabelClass} style={{ minWidth: 88 }}>MARKER</span>
            <div className="flex flex-wrap gap-2 ml-4">
              {[
                { label: 'Sangat Inovatif', hex: '#16a34a' },
                { label: 'Inovatif',        hex: '#eab308' },
                { label: 'Kurang Inovatif', hex: '#ef4444' },
              ].map(({ label, hex }) => (
                <span key={label} className={pillClass()}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: hex, flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          {/* Garis Rekomendasi Kolaborasi */}
          <span className={pillClass()}>
            <svg width="26" height="8" viewBox="0 0 26 8" style={{ flexShrink: 0 }}>
              <line x1="0" y1="4" x2="26" y2="4" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
            </svg>
            <span className={darkMode ? 'text-blue-300' : 'text-blue-700'}>Garis Rekomendasi Kolaborasi</span>
          </span>
        </div>

        {/* ── Divider ── */}
        <div className={`h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

        {/* ── Row 2: JALUR TRANSPORTASI ── */}
        <div className="flex flex-wrap items-center gap-y-2">
          <div className="flex flex-col flex-shrink-0" style={{ minWidth: 88 }}>
            <div className="flex items-center gap-1">
              <span className={rowLabelClass}>JALUR</span>
              {loadingTransport && (
                <Loader2 size={11} className={`animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              )}
            </div>
            <span className={rowLabelClass}>TRANSPORTASI</span>
            <span className={`mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontSize: 10 }}>Klik untuk toggle</span>
          </div>
          <div className="flex flex-wrap gap-2 ml-4">
            {/* Toggle Tol/Jalan Nasional */}
            <button
              onClick={handleToggleRoads}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold select-none transition-all duration-150 ${
                roadsActive
                  ? darkMode
                    ? 'bg-orange-900/40 border-orange-500 text-orange-200'
                    : 'bg-orange-50 border-orange-400 text-orange-700'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg width="26" height="8" viewBox="0 0 26 8" style={{ flexShrink: 0, opacity: roadsActive ? 1 : 0.45 }}>
                <line x1="0" y1="4" x2="26" y2="4" stroke="#d35400" strokeWidth="5" strokeLinecap="round" />
                <line x1="0" y1="4" x2="26" y2="4" stroke="#e8793a" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Tol / Jalan Nasional
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                backgroundColor: '#d35400', flexShrink: 0,
                opacity: roadsActive ? 1 : 0.25,
                boxShadow: roadsActive ? '0 0 4px #d35400aa' : 'none',
                transition: 'opacity 0.2s, box-shadow 0.2s'
              }} />
            </button>

            {/* Toggle Jalur Kereta */}
            <button
              onClick={handleToggleRailway}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold select-none transition-all duration-150 ${
                railwayActive
                  ? darkMode
                    ? 'bg-purple-900/40 border-purple-500 text-purple-200'
                    : 'bg-purple-50 border-purple-400 text-purple-700'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg width="26" height="8" viewBox="0 0 26 8" style={{ flexShrink: 0, opacity: railwayActive ? 1 : 0.45 }}>
                <line x1="0" y1="4" x2="26" y2="4" stroke="#7d3c98" strokeWidth="3" strokeLinecap="round" />
                <line x1="0" y1="4" x2="26" y2="4" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
              </svg>
              Jalur Kereta
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                backgroundColor: '#7d3c98', flexShrink: 0,
                opacity: railwayActive ? 1 : 0.25,
                boxShadow: railwayActive ? '0 0 4px #7d3c98aa' : 'none',
                transition: 'opacity 0.2s, box-shadow 0.2s'
              }} />
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className={`h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

        {/* ── Row 3: WILAYAH — hover color pills ── */}
        <div className="flex flex-wrap items-center gap-y-2">
          <span className={rowLabelClass} style={{ minWidth: 88 }}>WILAYAH</span>
          <div className="flex flex-wrap gap-2 ml-4">
            {[
              { label: 'Sangat Inovatif', hex: '#16a34a' },
              { label: 'Inovatif',        hex: '#eab308' },
              { label: 'Kurang Inovatif', hex: '#ef4444' },
            ].map(({ label, hex }) => (
              <span key={label} className={pillClass()}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: hex + '88', border: `1.5px solid ${hex}`, flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function MapInnovation({ darkMode }: MapInnovationProps) {
  const [mapData, setMapData]                 = useState<MapData | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [selectedInovasi, setSelectedInovasi] = useState<InovasiPoint | null>(null);
  const [activeTab, setActiveTab]             = useState<'info' | 'kolaborasi'>('info');
  const [showVideoModal, setShowVideoModal]   = useState(false);
  const [videoUrl, setVideoUrl]               = useState('');
  const [videoIsEmbed, setVideoIsEmbed]       = useState(true);
  const [selectedRecs, setSelectedRecs]       = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs]         = useState(false);
  const [showRoads, setShowRoads]             = useState(false);
  const [showRailway, setShowRailway]         = useState(false);
  const [loadingTransport, setLoadingTransport] = useState(false);
  const showRoadsRef    = useRef(false);
  const showRailwayRef  = useRef(false);

  const mapContainerRef    = useRef<HTMLDivElement>(null);
  const mapInstanceRef     = useRef<any>(null);
  const markersLayerRef    = useRef<any>(null);
  const polylinesLayerRef  = useRef<any>(null);
  const choroplethLayerRef = useRef<any>(null);
  const roadsLayerRef      = useRef<any>(null);
  const railwayLayerRef    = useRef<any>(null);
  const selectedRef        = useRef<InovasiPoint | null>(null);
  const mapDataRef         = useRef<MapData | null>(null);
  const markerRefs         = useRef<{ [key: number]: any }>({});

  useEffect(() => { selectedRef.current = selectedInovasi; }, [selectedInovasi]);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  useEffect(() => { showRoadsRef.current = showRoads; }, [showRoads]);
  useEffect(() => { showRailwayRef.current = showRailway; }, [showRailway]);

  useEffect(() => {
    injectLeafletCSS();
    fetchMapData();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => { if (mapData) updateMapMarkers(); }, [mapData]);

  const fetchMapData = async () => {
    if (cachedMapData) {
      setMapData(cachedMapData);
      if (cachedMapData.innovations.length > 0) {
        const sorted = [...cachedMapData.innovations].sort((a, b) => b.kematangan - a.kematangan);
        setSelectedInovasi(sorted[0]);
      }
      setLoading(false);
      return;
    }
    try {
      setLoading(true); setError(null);
      // REVISI: endpoint baru /points (tidak ada cluster)
      const res = await fetch(`${API_BASE_URL}/api/peta-inovasi/points`);
      if (!res.ok) throw new Error(`Gagal mengambil data (Status: ${res.status})`);
      const json = await res.json();
      // /points mengembalikan { total, innovations }
      const data: MapData = { innovations: json.innovations ?? [] };
      cachedMapData = data;
      setMapData(data);
      if (data.innovations.length > 0) {
        const sorted = [...data.innovations].sort((a, b) => b.kematangan - a.kematangan);
        setSelectedInovasi(sorted[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInovasi = async (inv: InovasiPoint, fromList: boolean = false) => {
    setSelectedInovasi(inv);
    setActiveTab('info');
    setSelectedRecs([]);
    setLoadingRecs(true);

    if (fromList && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([inv.lat, inv.lon], 12, { duration: 1.5 });
      setTimeout(() => {
        if (markerRefs.current[inv.no]) markerRefs.current[inv.no].openPopup();
      }, 1500);
    }

    try {
      // REVISI: max_distance_km=50 (dari 150)
      const res = await fetch(`${API_BASE_URL}/api/peta-inovasi/recommendations/${inv.no}?top_n=5&max_distance_km=50`);
      const data = res.ok ? await res.json() : { recommendations: [] };
      const recs: Recommendation[] = data.recommendations ?? [];
      setSelectedRecs(recs);

      const L = (window as any).L;
      if (L && polylinesLayerRef.current && mapDataRef.current) drawPolylines(L, inv, recs);

      if (recs.length > 0 && mapInstanceRef.current && mapDataRef.current) {
        const allPoints: [number, number][] = [[inv.lat, inv.lon]];
        recs.forEach(rec => {
          const targetId = rec.inovasi_1_id === inv.no ? rec.inovasi_2_id : rec.inovasi_1_id;
          const target = mapDataRef.current!.innovations.find(i => i.no === targetId);
          if (target) allPoints.push([target.lat, target.lon]);
        });
        mapInstanceRef.current.fitBounds(
          (window as any).L.latLngBounds(allPoints),
          { padding: [50, 50], maxZoom: 12 }
        );
      }
    } catch {
      setSelectedRecs([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const selectedRecsRef = useRef<Recommendation[]>([]);
  useEffect(() => { selectedRecsRef.current = selectedRecs; }, [selectedRecs]);

  const drawPolylines = (L: any, inovasi: InovasiPoint, recs: Recommendation[]) => {
    if (!polylinesLayerRef.current || !mapDataRef.current) return;
    polylinesLayerRef.current.clearLayers();
    recs.forEach(rec => {
      const targetId = rec.inovasi_1_id === inovasi.no ? rec.inovasi_2_id : rec.inovasi_1_id;
      const target = mapDataRef.current!.innovations.find(inv => inv.no === targetId);
      if (!target) return;
      L.polyline(
        [[inovasi.lat, inovasi.lon], [target.lat, target.lon]],
        { color: '#2563EB', weight: 4, dashArray: '8, 8', opacity: 0.8 }
      ).addTo(polylinesLayerRef.current);
    });
  };

  // ============================================================
  // CHOROPLETH — REVISI: tidak ada warna default
  // Warna HANYA muncul saat hover, berdasarkan rata-rata kematangan
  // ============================================================
  const drawChoropleth = async (L: any, innovations: InovasiPoint[]) => {
    if (!choroplethLayerRef.current) return;
    choroplethLayerRef.current.clearLayers();

    try {
      if (!cachedGeoJSON) {
        const res = await fetch('/jatim_kab.geojson');
        if (!res.ok) {
          console.warn('⚠️ jatim_kab.geojson tidak ditemukan di /public.');
          return;
        }
        cachedGeoJSON = await res.json();
      }

      // Hitung rata-rata kematangan per kabupaten
      const kabKematangan: Map<string, number[]> = new Map();
      const kabInovasiCount: Map<string, number> = new Map();

      innovations.forEach(inv => {
        const kabName = findKabupatenByCoord(inv.no, inv.lat, inv.lon, cachedGeoJSON);
        if (!kabName) return;
        if (!kabKematangan.has(kabName)) kabKematangan.set(kabName, []);
        kabKematangan.get(kabName)!.push(inv.kematangan);
        kabInovasiCount.set(kabName, (kabInovasiCount.get(kabName) ?? 0) + 1);
      });

      const kabAvgKematangan: Map<string, number> = new Map();
      kabKematangan.forEach((vals, name) => {
        kabAvgKematangan.set(name, vals.reduce((s, v) => s + v, 0) / vals.length);
      });

      L.geoJSON(cachedGeoJSON, {
        style: () => ({
          // Default: transparan — tidak ada warna sama sekali
          fillColor:   '#9CA3AF',
          fillOpacity: 0,
          color:       '#9CA3AF',
          weight:      0.8,
          opacity:     0.5,
        }),
        onEachFeature: (feature: any, layer: any) => {
          const name2       = feature?.properties?.NAME_2 || '';
          const displayName = normalizeGadmName(name2);
          const hasData     = kabAvgKematangan.has(name2);
          const avgKem      = kabAvgKematangan.get(name2) ?? 0;
          const totalInovasi= kabInovasiCount.get(name2) ?? 0;
          const hoverColor  = getKabHoverColor(avgKem);
          const matLabel    = getMaturityLabel(avgKem);

          // Tooltip muncul saat hover
          layer.bindTooltip(
            `<div style="font-family:sans-serif;padding:6px 10px;min-width:170px;">
              <b style="font-size:13px;color:#1f2937">${displayName}</b><br/>
              ${hasData
                ? `<span style="font-size:11px;color:${hoverColor};font-weight:bold;">● ${matLabel}</span><br/>
                   <span style="font-size:11px;color:#6b7280">${totalInovasi} inovasi · rata-rata ${avgKem.toFixed(1)}</span>`
                : `<span style="font-size:11px;color:#9CA3AF">Belum ada data inovasi</span>`
              }
            </div>`,
            { sticky: true, opacity: 0.97 }
          );

          // Hover: baru tampil warna
          layer.on('mouseover', () => {
            layer.setStyle({
              fillColor:   hasData ? hoverColor : '#9CA3AF',
              fillOpacity: hasData ? 0.45 : 0.10,
              color:       hasData ? hoverColor : '#9CA3AF',
              weight:      1.5,
              opacity:     0.8,
            });
          });

          // Mouse out: kembali transparan
          layer.on('mouseout', () => {
            layer.setStyle({
              fillColor:   '#9CA3AF',
              fillOpacity: 0,
              color:       '#9CA3AF',
              weight:      0.8,
              opacity:     0.5,
            });
          });
        },
      }).addTo(choroplethLayerRef.current);

    } catch (err) {
      console.error('❌ Gagal load GeoJSON choropleth:', err);
    }
  };

  // ============================================================
  // TRANSPORT LAYERS
  // ============================================================
  const drawRoads = async (L: any) => {
    if (!roadsLayerRef.current) return;
    try {
      if (!cachedRoads) {
        const res = await fetch('/roads_jatim.geojson');
        if (!res.ok) { console.warn('⚠️ roads_jatim.geojson tidak ditemukan'); return; }
        cachedRoads = await res.json();
      }
      const roadStyles: Record<string, { color: string; weight: number; opacity: number; dashArray?: string }> = {
        motorway: { color: '#d35400', weight: 5,   opacity: 0.90 },
        trunk:    { color: '#c0392b', weight: 3.5, opacity: 0.85 },
        primary:  { color: '#5d6d7e', weight: 2,   opacity: 0.70 },
      };
      const outlineStyles: Record<string, { color: string; weight: number; opacity: number }> = {
        motorway: { color: '#ffffff', weight: 8,   opacity: 0.60 },
        trunk:    { color: '#ffffff', weight: 6,   opacity: 0.55 },
        primary:  { color: '#ffffff', weight: 4,   opacity: 0.40 },
      };
      L.geoJSON(cachedRoads, {
        filter: (f: any) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString',
        style: (f: any) => outlineStyles[f.properties?.type] ?? outlineStyles.primary,
      }).addTo(roadsLayerRef.current);
      L.geoJSON(cachedRoads, {
        filter: (f: any) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString',
        style: (f: any) => roadStyles[f.properties?.type] ?? roadStyles.primary,
        onEachFeature: (f: any, layer: any) => {
          const type = f.properties?.type ?? '';
          const name = f.properties?.name ?? '';
          const label: Record<string, string> = { motorway: 'Jalan Tol', trunk: 'Jalan Nasional', primary: 'Jalan Provinsi' };
          if (name) layer.bindTooltip(
            `<div style="font-family:sans-serif;padding:4px 8px;font-size:12px;">
              <b>${name}</b><br/><span style="color:#6b7280">${label[type] ?? type}</span>
            </div>`,
            { sticky: true, opacity: 0.95 }
          );
        },
      }).addTo(roadsLayerRef.current);
    } catch (err) { console.error('❌ Gagal load roads GeoJSON:', err); }
  };

  const drawRailway = async (L: any) => {
    if (!railwayLayerRef.current) return;
    try {
      if (!cachedRailway) {
        const res = await fetch('/railway_jatim.geojson');
        if (!res.ok) { console.warn('⚠️ railway_jatim.geojson tidak ditemukan'); return; }
        cachedRailway = await res.json();
      }
      L.geoJSON(cachedRailway, {
        filter: (f: any) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString',
        style: () => ({ color: '#ffffff', weight: 5, opacity: 0.55 }),
      }).addTo(railwayLayerRef.current);
      L.geoJSON(cachedRailway, {
        filter: (f: any) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString',
        style: () => ({ color: '#7d3c98', weight: 3, opacity: 0.90, dashArray: '8 4' }),
        onEachFeature: (f: any, layer: any) => {
          const name = f.properties?.name ?? '';
          if (name) layer.bindTooltip(
            `<div style="font-family:sans-serif;padding:4px 8px;font-size:12px;">
              <b>${name}</b><br/><span style="color:#6b7280">Jalur Kereta Api</span>
            </div>`,
            { sticky: true, opacity: 0.95 }
          );
        },
      }).addTo(railwayLayerRef.current);
      L.geoJSON(cachedRailway, {
        filter: (f: any) => f.geometry?.type === 'Point',
        pointToLayer: (_f: any, latlng: any) => L.circleMarker(latlng, {
          radius: 5, fillColor: '#7d3c98', color: '#ffffff',
          weight: 2, opacity: 1, fillOpacity: 1,
        }),
        onEachFeature: (f: any, layer: any) => {
          const name = f.properties?.name ?? 'Stasiun';
          layer.bindTooltip(
            `<div style="font-family:sans-serif;padding:4px 8px;font-size:12px;">
              <b>${name}</b><br/><span style="color:#6b7280">Stasiun Kereta Api</span>
            </div>`,
            { opacity: 0.95 }
          );
        },
      }).addTo(railwayLayerRef.current);
    } catch (err) { console.error('❌ Gagal load railway GeoJSON:', err); }
  };

  const toggleRoads = async () => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const layer = roadsLayerRef.current;
    if (!L || !map || !layer) return;

    setLoadingTransport(true);
    const isOn = map.hasLayer(layer);
    if (!isOn) {
      if (layer.getLayers().length === 0) await drawRoads(L);
      layer.addTo(map);
      layer.bringToBack();
      if (choroplethLayerRef.current) choroplethLayerRef.current.bringToBack();
    } else {
      map.removeLayer(layer);
    }
    showRoadsRef.current = !isOn;
    setShowRoads(!isOn);
    setTimeout(() => setLoadingTransport(false), 0);
  };

  const toggleRailway = async () => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const layer = railwayLayerRef.current;
    if (!L || !map || !layer) return;

    setLoadingTransport(true);
    const isOn = map.hasLayer(layer);
    if (!isOn) {
      if (layer.getLayers().length === 0) await drawRailway(L);
      layer.addTo(map);
      layer.bringToBack();
      if (showRoadsRef.current && roadsLayerRef.current) roadsLayerRef.current.bringToBack();
      if (choroplethLayerRef.current) choroplethLayerRef.current.bringToBack();
    } else {
      map.removeLayer(layer);
    }
    showRailwayRef.current = !isOn;
    setShowRailway(!isOn);
    setTimeout(() => setLoadingTransport(false), 0);
  };

  // ============================================================
  // UPDATE MAP
  // ============================================================
  const updateMapMarkers = async () => {
    if (!mapContainerRef.current || !mapData) return;
    const L = await loadLeaflet();
    const filtered = mapData.innovations;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-7.5, 112.5], zoom: 8, zoomControl: true, boxZoom: false, tap: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);
      mapInstanceRef.current     = map;
      choroplethLayerRef.current = L.layerGroup().addTo(map);
      roadsLayerRef.current      = L.layerGroup();
      railwayLayerRef.current    = L.layerGroup();
      markersLayerRef.current    = L.layerGroup().addTo(map);
      polylinesLayerRef.current  = L.layerGroup().addTo(map);
    }

    // REVISI: drawChoropleth tidak butuh mapData lagi (tidak pakai cluster)
    await drawChoropleth(L, filtered);

    markersLayerRef.current.clearLayers();
    markerRefs.current = {};

    filtered.forEach((inv) => {
      const matColor = getMarkerColor(inv.kematangan);

      const pinIcon = L.divIcon({
        className: 'leaflet-div-icon-clean',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 42" width="20" height="30">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 28 14 28s14-18.667 14-28C28 6.268 21.732 0 14 0z"
            fill="${matColor.hex}" stroke="#ffffff" stroke-width="1.8" opacity="0.95"/>
          <circle cx="14" cy="14" r="6" fill="#ffffff" opacity="0.95"/>
        </svg>`,
        iconSize: [20, 30], iconAnchor: [10, 30], popupAnchor: [0, -32],
      });

      const marker = L.marker([inv.lat, inv.lon], { icon: pinIcon });
      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:200px;padding:4px;">
          <p style="font-weight:bold;font-size:12px;margin:0 0 4px;color:#1f2937;line-height:1.4">${inv.judul_inovasi}</p>
          <p style="font-size:11px;margin:2px 0;color:#6b7280">${inv.pemda}</p>
          <p style="font-size:11px;margin:2px 0;color:${matColor.hex};font-weight:bold;">⭐ Kematangan: ${inv.kematangan} — ${getMaturityLabel(inv.kematangan)}</p>
          ${inv.jenis ? `<p style="font-size:10px;margin:4px 0 0;color:#9ca3af">${inv.jenis}</p>` : ''}
        </div>`,
        { maxWidth: 260 }
      );

      marker.on('click', () => handleSelectInovasi(inv, false));
      marker.addTo(markersLayerRef.current);
      markerRefs.current[inv.no] = marker;
    });

    if (selectedRef.current) drawPolylines(L, selectedRef.current, selectedRecsRef.current);

    if (filtered.length > 1) {
      const bounds = L.latLngBounds(filtered.map((r: InovasiPoint) => [r.lat, r.lon]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // ============================================================
  // OSRM
  // ============================================================
  const fetchOSRMRoute = async (
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): Promise<{ distanceKm: number; durationMin: number; roadNames: string[]; hasToll: boolean; hasRail: boolean } | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?steps=true&overview=false`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) return null;

      const route      = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMin= route.duration / 60;

      const nameSet = new Set<string>();
      for (const step of (route.legs?.[0]?.steps ?? [])) {
        const name = (step.name ?? '').trim();
        const ref  = (step.ref  ?? '').trim();
        if (ref  && ref.length > 3)  nameSet.add(ref);
        if (name && name.length > 4) nameSet.add(name);
      }

      const all      = [...nameSet];
      const tolls    = all.filter(n => n.toLowerCase().includes('tol'));
      const rest     = all.filter(n => !n.toLowerCase().includes('tol')).slice(0, 3);
      const roadNames = [...tolls.slice(0, 2), ...rest].slice(0, 4);
      const hasToll  = tolls.length > 0;

      return { distanceKm, durationMin, roadNames, hasToll, hasRail: false };
    } catch {
      return null;
    }
  };

  const deriveAccessibilityFromOSRM = (
    osrm: { distanceKm: number; hasToll: boolean } | null,
    fallbackDistanceKm: number,
    hasRailway: boolean
  ): Pick<TransportCorridorResult, 'accessibilityLevel' | 'accessibilityLabel' | 'accessibilityColor' | 'accessibilityBg'> => {
    const dist = osrm?.distanceKm ?? fallbackDistanceKm;
    const hasRoad = osrm != null;

    if (hasRoad && dist <= 60) return {
      accessibilityLevel: 'sangat_mudah',
      accessibilityLabel: 'Sangat Mudah Dijangkau',
      accessibilityColor: '#15803d',
      accessibilityBg:    'bg-green-100 text-green-800',
    };
    if (hasRoad && dist <= 120) return {
      accessibilityLevel: 'cukup_mudah',
      accessibilityLabel: 'Cukup Mudah Dijangkau',
      accessibilityColor: '#b45309',
      accessibilityBg:    'bg-amber-100 text-amber-800',
    };
    if (hasRailway) return {
      accessibilityLevel: 'via_kereta',
      accessibilityLabel: 'Dapat Via Kereta Api',
      accessibilityColor: '#6d28d9',
      accessibilityBg:    'bg-purple-100 text-purple-800',
    };
    return {
      accessibilityLevel: 'virtual',
      accessibilityLabel: 'Disarankan Koordinasi Virtual',
      accessibilityColor: '#b91c1c',
      accessibilityBg:    'bg-red-100 text-red-800',
    };
  };

  // ============================================================
  // TRANSPORT CORRIDOR ANALYSIS
  // ============================================================
  const [transportAnalysisMap, setTransportAnalysisMap] = useState<Map<number, TransportCorridorResult>>(new Map());

  useEffect(() => {
    if (!selectedInovasi || selectedRecs.length === 0 || !mapData) {
      setTransportAnalysisMap(new Map());
      return;
    }

    const railwayData = cachedRailway ?? null;
    const partnerPairs: Array<{ partnerId: number; lat: number; lon: number; rec: Recommendation }> = [];
    const initialMap = new Map<number, TransportCorridorResult>();

    selectedRecs.forEach(rec => {
      const partnerId = rec.inovasi_1_id === selectedInovasi.no ? rec.inovasi_2_id : rec.inovasi_1_id;
      const partner   = mapData.innovations.find(i => i.no === partnerId);
      if (!partner) return;

      const BUFFER_DEG = 0.09;
      const STEPS = Math.max(2, Math.ceil(rec.distance_km / 20));
      const corridorPts: [number, number][] = Array.from({ length: STEPS + 1 }, (_, i) => {
        const t = i / STEPS;
        return [selectedInovasi.lon + (partner.lon - selectedInovasi.lon) * t,
                selectedInovasi.lat + (partner.lat - selectedInovasi.lat) * t] as [number, number];
      });
      const railNameSet = new Set<string>();
      if (railwayData?.features) {
        for (const f of railwayData.features) {
          if (f.geometry?.type === 'Point') continue;
          const allCoords = extractCoords(f.geometry);
          if (allCoords.some(seg => lineIntersectsBuffer(seg, corridorPts, BUFFER_DEG))) {
            const name = f.properties?.name ?? '';
            if (name) railNameSet.add(name);
          }
        }
      }
      const matchedRailNames = [...railNameSet];
      const hasRailway = matchedRailNames.length > 0;

      const loadingResult: TransportCorridorResult = {
        hasRoad: false, hasRailway, hasToll: false,
        matchedRoadNames: [], matchedRailNames,
        routeDistanceKm: null, routeDurationMin: null, osrmRoadNames: [],
        accessibilityLevel: 'virtual',
        accessibilityLabel: 'Menganalisis rute...',
        accessibilityColor: '#9ca3af',
        accessibilityBg:    'bg-gray-100 text-gray-500',
        suggestion: 'Sedang mengambil data rute...',
        isLoadingOSRM: true,
      };
      initialMap.set(partnerId, loadingResult);
      partnerPairs.push({ partnerId, lat: partner.lat, lon: partner.lon, rec });
    });

    setTransportAnalysisMap(new Map(initialMap));

    let cancelled = false;
    (async () => {
      for (const { partnerId, lat, lon, rec } of partnerPairs) {
        if (cancelled) break;
        const osrm = await fetchOSRMRoute(selectedInovasi.lat, selectedInovasi.lon, lat, lon);
        if (cancelled) break;

        setTransportAnalysisMap(prev => {
          const next     = new Map(prev);
          const existing = next.get(partnerId);
          if (!existing) return prev;

          const accessibility = deriveAccessibilityFromOSRM(osrm, rec.distance_km, existing.hasRailway);
          const updated: TransportCorridorResult = {
            ...existing,
            hasRoad:         osrm != null,
            hasToll:         osrm?.hasToll ?? false,
            matchedRoadNames: osrm?.roadNames ?? [],
            osrmRoadNames:   osrm?.roadNames ?? [],
            routeDistanceKm: osrm?.distanceKm  ?? null,
            routeDurationMin:osrm?.durationMin ?? null,
            ...accessibility,
            suggestion: buildSuggestion(
              accessibility.accessibilityLevel,
              rec.distance_km,
              osrm?.roadNames ?? [],
              existing.matchedRailNames,
              osrm?.hasToll ?? false,
              osrm?.roadNames ?? [],
              osrm?.distanceKm  ?? null,
              osrm?.durationMin ?? null,
            ),
            isLoadingOSRM: false,
          };
          next.set(partnerId, updated);
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [selectedInovasi, selectedRecs, mapData]);

  const top5Innovations = mapData
    ? [...mapData.innovations].sort((a, b) => b.kematangan - a.kematangan).slice(0, 5)
    : [];
  const avgKematangan = mapData && mapData.innovations.length
    ? (mapData.innovations.reduce((s, i) => s + i.kematangan, 0) / mapData.innovations.length).toFixed(1)
    : '0';

  const handleOpenVideo = (url: string) => {
    const { embedUrl, isEmbed } = getVideoEmbedInfo(url);
    setVideoUrl(embedUrl);
    setVideoIsEmbed(isEmbed);
    setShowVideoModal(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-white' : 'text-blue-600'}`} size={48} />
        <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Memuat Peta Inovasi...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className={`text-center p-6 rounded-lg shadow-lg max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Gagal Memuat Data</h3>
        <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
        <button onClick={fetchMapData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Coba Lagi</button>
      </div>
    </div>
  );

  if (!mapData) return null;

  return (
    <div className="space-y-6 pb-6 overflow-x-hidden" style={{ position: 'relative', zIndex: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Peta Inovasi Daerah</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Peta ── */}
        <div className="lg:col-span-9">
          <div className={`rounded-lg shadow-md p-6 h-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-blue-500" size={20} />
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Peta Jawa Timur — Lokasi Inovasi</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-600'}`}>
                {mapData.innovations.length} Inovasi
              </span>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div ref={mapContainerRef} style={{ height: '500px', width: '100%', borderRadius: '8px' }} />
            </div>

            {/* REVISI: MapLegend tidak menerima clusters & mapInstanceRef — baris cluster dihapus */}
            <MapLegend
              darkMode={darkMode}
              showRoads={showRoads}
              showRailway={showRailway}
              loadingTransport={loadingTransport}
              onToggleRoads={toggleRoads}
              onToggleRailway={toggleRailway}
            />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-3 space-y-6">
          <div className={`rounded-lg shadow-md p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-yellow-500" size={20} />
              <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Top 5 Inovasi Terbaik</h4>
            </div>
            <div className="space-y-3">
              {top5Innovations.map((inv, index) => {
                const colors = getMarkerColor(inv.kematangan);
                return (
                  <div
                    key={inv.no}
                    onClick={() => handleSelectInovasi(inv, true)}
                    className={`p-3 rounded-lg transition-all hover:scale-[1.02] cursor-pointer ${
                      selectedInovasi?.no === inv.no
                        ? darkMode ? 'bg-blue-900/50 border border-blue-500' : 'bg-blue-50 border border-blue-300'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg font-bold flex-shrink-0 ${
                            index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>{index + 1}</span>
                          <span className={`text-xs font-bold leading-tight truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{inv.judul_inovasi}</span>
                        </div>
                        <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{inv.pemda}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${colors.bg.replace('bg-', 'text-')}`}>{inv.kematangan}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REVISI: "Total Cluster" dihapus dari statistik */}
          <div className={`rounded-lg shadow-md p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h4 className={`font-bold text-sm mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Statistik Peta</h4>
            <div className="space-y-2">
              {[
                { label: 'Total Inovasi',       value: mapData.innovations.length },
                { label: 'Rata-rata Kematangan', value: avgKematangan },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
                  <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Inovasi Terpilih ── */}
      {selectedInovasi && (
        <div>
          <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Detail Inovasi Terpilih</h3>

          <div className={`flex gap-2 mb-4 p-1 rounded-lg w-fit ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'info' ? 'bg-blue-600 text-white shadow-sm' : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Layers size={15} /> Informasi Umum
            </button>
            <button
              onClick={() => setActiveTab('kolaborasi')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'kolaborasi' ? 'bg-blue-600 text-white shadow-sm' : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <GitBranch size={15} /> Analisis Kolaborasi
              {selectedRecs.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'kolaborasi' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedRecs.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="text-blue-500" size={20} />
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Informasi Umum</h4>
                </div>
                <div className="space-y-3">
                  <h5 className={`text-base font-bold mb-1 leading-tight ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedInovasi.judul_inovasi}</h5>
                  <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedInovasi.pemda}</p>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-3 ${getMarkerColor(selectedInovasi.kematangan).bg}`}>
                    {getMaturityLabel(selectedInovasi.kematangan)}
                  </div>
                  {selectedInovasi.deskripsi && (
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedInovasi.deskripsi}</p>
                  )}
                </div>
              </div>

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-blue-500" size={20} />
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Data Teknis & Lokasi</h4>
                </div>
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Jenis Inovasi</span>
                      <Layers className="text-purple-500" size={18} />
                    </div>
                    <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedInovasi.jenis || '-'}</p>
                  </div>
                  <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Koordinat GPS</p>
                    <p className={`text-xs font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedInovasi.lat.toFixed(4)}, {selectedInovasi.lon.toFixed(4)}
                    </p>
                  </div>
                  {/* Tombol video — tampil jika video = 'Ada' dan link_video tersedia */}
                  {selectedInovasi.video === 'Ada' && selectedInovasi.link_video && selectedInovasi.link_video !== '-' && (() => {
                    const { embedUrl, isEmbed } = getVideoEmbedInfo(selectedInovasi.link_video!);
                    return embedUrl ? (
                      <button
                        onClick={() => { setVideoUrl(embedUrl); setVideoIsEmbed(isEmbed); setShowVideoModal(true); }}
                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3.5 rounded-xl transition-all shadow-md font-semibold text-sm tracking-wide"
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Lihat Video Profil</span>
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="text-green-500" size={20} />
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Tingkat Kematangan</h4>
                </div>
                <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Skor</span>
                    <Award className="text-green-500" size={20} />
                  </div>
                  <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedInovasi.kematangan.toFixed(1)}</p>
                  <div className="mt-4">
                    <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${Math.min(selectedInovasi.kematangan, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>0</span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>100</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'kolaborasi' && (
            <div>
              {loadingRecs ? (
                <div className={`rounded-lg p-8 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
                  <Loader2 className={`animate-spin mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} size={32} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Memuat rekomendasi...</p>
                </div>
              ) : selectedRecs.length === 0 ? (
                <div className={`rounded-lg p-8 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
                  <Users className={`mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} size={40} />
                  <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tidak ada rekomendasi kolaborasi dalam radius 50 km untuk inovasi ini
                  </p>
                </div>
              ) : (
                <>
                  <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg text-xs ${
                    darkMode ? 'bg-blue-900/30 border border-blue-700/50 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    <Info size={14} className="flex-shrink-0" />
                    <span>Rekomendasi kolaborasi ditampilkan dalam radius <strong>50 km</strong>. Analisis aksesibilitas dihitung otomatis via <strong>OSRM</strong>.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedRecs.map((rec, idx) => {
                      const isSrc = rec.inovasi_1_id === selectedInovasi.no;
                      const partnerId   = isSrc ? rec.inovasi_2_id : rec.inovasi_1_id;
                      const partnerJudul = isSrc ? rec.inovasi_2_judul : rec.inovasi_1_judul;
                      const matchPct    = Math.round(rec.similarity_score * 100);
                      const transport   = transportAnalysisMap.get(partnerId);

                      return (
                        <div key={idx} className={`rounded-xl p-5 shadow-sm border transition-all hover:shadow-md flex flex-col gap-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>

                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${matchPct >= 70 ? 'bg-green-100 text-green-700' : matchPct >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              MATCH {matchPct}%
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{rec.distance_km.toFixed(1)} km</span>
                              {rec.is_feasible && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Feasible</span>}
                            </div>
                          </div>

                          <div>
                            <p className={`text-xs font-bold mb-1 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedInovasi.judul_inovasi}</p>
                            <div className="flex items-center gap-2 my-2">
                              <div className={`flex-1 h-px border-t border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
                              <GitBranch size={12} className="text-blue-400 flex-shrink-0" />
                              <div className={`flex-1 h-px border-t border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
                            </div>
                            <p className={`text-xs font-bold line-clamp-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{partnerJudul}</p>
                          </div>

                          <div className={`pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-dashed border-gray-200'}`}>
                            <p className={`text-xs italic leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>💡 {rec.collaboration_reason}</p>
                          </div>

                          {transport ? (
                            <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-700/60 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Route size={13} className="flex-shrink-0" style={{ color: transport.accessibilityColor }} />
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${transport.accessibilityBg}`}>
                                  {transport.accessibilityLabel}
                                </span>
                                {transport.isLoadingOSRM && (
                                  <Loader2 size={11} className={`animate-spin ml-auto ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                                )}
                              </div>

                              {transport.routeDistanceKm != null && (
                                <div className={`flex items-center gap-3 mb-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="flex items-center gap-1">
                                    <Route size={11} className="flex-shrink-0 text-blue-400" />
                                    <span className="font-semibold">{transport.routeDistanceKm.toFixed(1)} km</span>
                                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>via jalan</span>
                                  </span>
                                  {transport.routeDurationMin != null && (
                                    <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      ·
                                      {(() => {
                                        const h = Math.floor(transport.routeDurationMin! / 60);
                                        const m = Math.round(transport.routeDurationMin! % 60);
                                        return h > 0 ? `${h} jam ${m > 0 ? m + ' mnt' : ''}` : `${m} mnt`;
                                      })()}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-3 mb-2">
                                <div className={`flex items-center gap-1 text-xs ${
                                  transport.hasRoad
                                    ? darkMode ? 'text-orange-300' : 'text-orange-600'
                                    : darkMode ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  {transport.hasRoad ? <CheckCircle2 size={12} /> : <X size={12} />}
                                  <span className="font-medium">Jalan Tol/Nas.</span>
                                </div>
                                <div className={`flex items-center gap-1 text-xs ${
                                  transport.hasRailway
                                    ? darkMode ? 'text-purple-300' : 'text-purple-600'
                                    : darkMode ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  {transport.hasRailway ? <CheckCircle2 size={12} /> : <X size={12} />}
                                  <span className="font-medium">Jalur KA</span>
                                </div>
                              </div>

                              <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                🚦 {transport.suggestion}
                              </p>
                            </div>
                          ) : (
                            <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${darkMode ? 'bg-gray-700/40 text-gray-500 border border-gray-700' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                              <Loader2 size={12} className="flex-shrink-0 animate-spin" />
                              <span>Menganalisis rute transportasi...</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className={`mt-6 rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h4 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Cara Menggunakan Peta</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Klik marker di peta untuk memilih inovasi dan melihat garis kolaborasi (putus-putus biru) ke inovasi terdekat yang direkomendasikan dalam radius 50 km.
              Arahkan kursor ke wilayah kabupaten/kota untuk melihat nama dan ringkasan data inovasinya.
            </p>
          </div>
        </div>
      )}

      {showVideoModal && (
        <VideoModal
          videoUrl={videoUrl}
          isEmbed={videoIsEmbed}
          onClose={() => { setShowVideoModal(false); setVideoUrl(''); setVideoIsEmbed(true); }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}