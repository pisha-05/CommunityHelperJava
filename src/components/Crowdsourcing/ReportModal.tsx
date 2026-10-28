import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, X, Accessibility, Construction, Ban, 
  Droplets, AlertTriangle, Camera, Image, Check, 
  MapPin, RefreshCw, Trash2, ArrowLeft, ArrowRight, Eye, Sparkles,
  Layers, TrendingUp, ArrowUpDown, OctagonAlert, MoveHorizontal, Users
} from 'lucide-react';
import { ReportCategory } from '../../types';
import { uploadPhotoApi, reverseGeocodeApi } from '../../services/api';

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (report: {
    category: string;
    title: string;
    description: string;
    severity: 'low' | 'moderate' | 'severe' | 'critical';
    lat: number;
    lng: number;
    photo_url?: string;
  }) => void;
  defaultLocation?: [number, number] | null;
  highContrast: boolean;
}

const BARRIER_CATEGORIES: { code: string; label: string; icon: React.ReactNode; defaultTitle: string }[] = [
  { code: 'broken_ramp', label: 'Broken / Blocked Ramp', icon: <Accessibility className="w-4 h-4 text-emerald-500" />, defaultTitle: 'Broken accessible ramp' },
  { code: 'stairs', label: 'Stairs / Steps', icon: <Layers className="w-4 h-4 text-amber-500" />, defaultTitle: 'Unmapped stairs blocking step-free path' },
  { code: 'steep_slope', label: 'Steep Slope', icon: <TrendingUp className="w-4 h-4 text-amber-500" />, defaultTitle: 'Steep slope exceeding 8% grade' },
  { code: 'broken_elevator', label: 'Broken Elevator', icon: <ArrowUpDown className="w-4 h-4 text-red-500" />, defaultTitle: 'Elevator out of service' },
  { code: 'construction', label: 'Construction Zone', icon: <Construction className="w-4 h-4 text-amber-500" />, defaultTitle: 'Construction work blocking walkway' },
  { code: 'road_blockage', label: 'Road Blockage', icon: <Ban className="w-4 h-4 text-red-500" />, defaultTitle: 'Road / pathway blocked' },
  { code: 'barricade', label: 'Barricade Reported', icon: <OctagonAlert className="w-4 h-4 text-red-500" />, defaultTitle: 'Barricade blocking pedestrian route' },
  { code: 'uneven_surface', label: 'Uneven Pavement', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, defaultTitle: 'Uneven or broken pavement' },
  { code: 'pothole', label: 'Pothole / Pit', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, defaultTitle: 'Hazardous pothole in path' },
  { code: 'waterlogging', label: 'Flooding / Waterlogging', icon: <Droplets className="w-4 h-4 text-blue-500" />, defaultTitle: 'Waterlogging on pedestrian route' },
  { code: 'obstacle', label: 'Pathway Obstacle', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, defaultTitle: 'Temporary obstruction on pathway' },
  { code: 'narrow_path', label: 'Narrow Pathway', icon: <MoveHorizontal className="w-4 h-4 text-amber-500" />, defaultTitle: 'Pathway width under 90cm' },
  { code: 'crowd', label: 'Crowded Area', icon: <Users className="w-4 h-4 text-purple-500" />, defaultTitle: 'Crowded pedestrian area' },
  { code: 'other', label: 'Other Hazard', icon: <ShieldAlert className="w-4 h-4 text-slate-400" />, defaultTitle: 'Accessibility hazard' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  onClose,
  onSubmit,
  defaultLocation,
  highContrast,
}) => {
  // Wizard steps: 'FORM' -> 'PREVIEW'
  const [step, setStep] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Form State
  const [category, setCategory] = useState<string>('broken_ramp');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'severe' | 'critical'>('severe');

  // Photo Attachment State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Geotagging State
  const [detectedCoords, setDetectedCoords] = useState<[number, number] | null>(defaultLocation || null);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting GPS location...');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill title when category changes if user hasn't typed custom title
  useEffect(() => {
    const selected = BARRIER_CATEGORIES.find((c) => c.code === category);
    if (selected && (!title || BARRIER_CATEGORIES.some((c) => c.defaultTitle === title))) {
      setTitle(selected.defaultTitle);
    }
  }, [category]);

  // Real Geolocation Detection on Mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationLabel(defaultLocation ? `${defaultLocation[0].toFixed(5)}, ${defaultLocation[1].toFixed(5)}` : 'Manual location required');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setDetectedCoords([lat, lng]);
        setIsLocating(false);

        // Reverse geocode to get natural address
        try {
          const geo = await reverseGeocodeApi(lat, lng);
          setLocationLabel(geo.label || `${lat}, ${lng}`);
        } catch {
          setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (err) => {
        setIsLocating(false);
        if (defaultLocation) {
          setDetectedCoords(defaultLocation);
          setLocationLabel(`${defaultLocation[0].toFixed(5)}, ${defaultLocation[1].toFixed(5)}`);
        } else {
          setLocationError('Unable to determine exact GPS location. Please check browser permissions.');
          setLocationLabel('Location unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Handle Photo Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    // Validate size (< 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Photo size exceeds 8MB limit.');
      return;
    }

    setPhotoError(null);
    setIsProcessingPhoto(true);
    setPhotoName(file.name);

    try {
      // Compress / convert to base64 Data URL
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoDataUrl(reader.result as string);
        setIsProcessingPhoto(false);
      };
      reader.onerror = () => {
        setPhotoError('Failed to read photo file.');
        setIsProcessingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPhotoError('Failed to process image.');
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setStep('PREVIEW');
  };

  const handleFinalSubmit = () => {
    const lat = detectedCoords ? detectedCoords[0] : (defaultLocation ? defaultLocation[0] : 0.0);
    const lng = detectedCoords ? detectedCoords[1] : (defaultLocation ? defaultLocation[1] : 0.0);

    onSubmit({
      category,
      title: title.trim(),
      description: description.trim(),
      severity,
      lat,
      lng,
      photo_url: photoDataUrl || undefined,
    });
  };

  const selectedCategoryObj = BARRIER_CATEGORIES.find((c) => c.code === category) || BARRIER_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto animate-fade-in overflow-y-auto">
      {/* Hidden File and Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl transition-all duration-200 overflow-hidden ${
          highContrast
            ? 'bg-black border-2 border-yellow-400 text-yellow-300'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 id="report-modal-title" className="font-extrabold text-sm sm:text-base tracking-tight">
                {step === 'FORM' ? 'Report Accessibility Barrier' : 'Report Confirmation & Preview'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {step === 'FORM' ? 'Attach real photo evidence & GPS geotag' : 'Verify report details before submission'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer touch-target-48"
            aria-label="Close report dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {step === 'FORM' ? (
            <form onSubmit={handleProceedToPreview} className="space-y-4">
              {/* 1. Category Selector */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                  1. Choose Barrier Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-800 rounded-2xl bg-slate-950/50">
                  {BARRIER_CATEGORIES.map((c) => {
                    const isSelected = category === c.code;
                    return (
                      <button
                        type="button"
                        key={c.code}
                        onClick={() => setCategory(c.code)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition active:scale-98 cursor-pointer ${
                          isSelected
                            ? highContrast
                              ? 'bg-yellow-400 text-black border-yellow-300 ring-2 ring-yellow-400'
                              : 'bg-blue-600/30 text-blue-200 border-blue-500 ring-1 ring-blue-400 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span className="text-base shrink-0">{c.icon}</span>
                        <span className="text-[11px] leading-tight truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Photo Attachment Section */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                  2. Add Photo Evidence
                </label>

                {photoDataUrl ? (
                  <div className="relative rounded-2xl border border-slate-700 bg-slate-950/80 p-3 flex items-center gap-3">
                    <img
                      src={photoDataUrl}
                      alt="Barrier preview"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Photo Attached</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{photoName || 'barrier_evidence.jpg'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Retake</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer touch-target-48"
                    >
                      <Camera className="w-5 h-5 text-cyan-400" />
                      <span className="text-xs font-bold">📷 Take Photo</span>
                      <span className="text-[10px] text-slate-400">Use mobile camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer touch-target-48"
                    >
                      <Image className="w-5 h-5 text-blue-400" />
                      <span className="text-xs font-bold">🖼️ From Gallery</span>
                      <span className="text-[10px] text-slate-400">Upload image file</span>
                    </button>
                  </div>
                )}

                {photoError && (
                  <p className="text-xs text-red-400 font-semibold mt-1.5">{photoError}</p>
                )}
              </div>

              {/* 3. Automatic Geotag Location Section */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Geotagged Coordinates
                    </div>
                    <p className="text-xs font-bold text-white truncate">
                      {isLocating ? 'Acquiring GPS fix...' : locationLabel}
                    </p>
                    {detectedCoords && (
                      <p className="text-[10px] font-mono text-cyan-400">
                        [{detectedCoords[0].toFixed(5)}, {detectedCoords[1].toFixed(5)}]
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={isLocating}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 cursor-pointer shrink-0"
                  title="Refresh GPS Coordinates"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* 4. Title & Description */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Barrier Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Broken ramp at main station entrance"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Description & Detour Advice (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details or recommended step-free workaround..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* 5. Severity Level */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'moderate', 'severe', 'critical'] as const).map((sev) => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition active:scale-95 cursor-pointer border ${
                        severity === sev
                          ? sev === 'critical'
                            ? 'bg-red-600 text-white border-red-500 ring-1 ring-red-400'
                            : sev === 'severe'
                            ? 'bg-orange-500 text-white border-orange-400 ring-1 ring-orange-300'
                            : sev === 'moderate'
                            ? 'bg-amber-500 text-white border-amber-400 ring-1 ring-amber-300'
                            : 'bg-emerald-600 text-white border-emerald-500 ring-1 ring-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action: Next to Preview */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Review & Preview Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: CONFIRMATION / PREVIEW */
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                {/* Photo Preview if attached */}
                {photoDataUrl && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      📷 Photo Evidence
                    </div>
                    <img
                      src={photoDataUrl}
                      alt="Barrier preview"
                      className="w-full max-h-48 object-cover rounded-xl border border-slate-800 shadow-md"
                    />
                  </div>
                )}

                {/* Barrier Information */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Barrier Type
                  </div>
                  <div className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                    <span>{selectedCategoryObj.icon}</span>
                    <span>{selectedCategoryObj.label}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Title & Details
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{title}</div>
                  {description && (
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      {description}
                    </div>
                  )}
                </div>

                {/* Geotag Confirmation */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Geotagged Location
                  </div>
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{locationLabel}</span>
                  </div>
                  {detectedCoords && (
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      [{detectedCoords[0].toFixed(5)}, {detectedCoords[1].toFixed(5)}]
                    </div>
                  )}
                </div>

                {/* Severity & Time */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-bold">
                  <span className="text-slate-400">Severity:</span>
                  <span className="uppercase text-amber-400 font-mono">{severity}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Reported:</span>
                  <span className="text-slate-200">Just now (Community Verified)</span>
                </div>
              </div>

              {/* Submit / Edit Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="w-2/3 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Barrier Report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
