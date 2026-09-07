import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  Search, 
  Filter, 
  Navigation, 
  ShieldCheck, 
  IndianRupee,
  Star,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Compass,
  AlertCircle,
  Crosshair,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { hospitalService, NearbyHospitalResult } from '../../shared/api/apiClient';
import { HealthcareCostComparisonModal } from './HealthcareCostComparisonModal';

type SearchState = 'IDLE' | 'LOCATING' | 'SEARCHING' | 'SUCCESS' | 'NO_RESULTS' | 'ERROR';

interface PatientLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  label?: string;
  isManual?: boolean;
  timestamp: number;
}

export const HealthcareDiscoveryView: React.FC = () => {
  // State Machine
  const [searchState, setSearchState] = useState<SearchState>('IDLE');
  const [hospitals, setHospitals] = useState<NearbyHospitalResult[]>([]);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(5);
  const [isRadiusExpanded, setIsRadiusExpanded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Location State
  const [patientLocation, setPatientLocation] = useState<PatientLocation | null>(null);
  const [locationTimestampText, setLocationTimestampText] = useState<string>('');
  const [isRefreshingLocation, setIsRefreshingLocation] = useState<boolean>(false);

  // Manual search fallback input
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualCityQuery, setManualCityQuery] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [manualGeocodeError, setManualGeocodeError] = useState<string>('');

  // Interactive filters & selected hospital modal
  const [textFilter, setTextFilter] = useState<string>('');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'GOVERNMENT' | 'PRIVATE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activeHospitalForModal, setActiveHospitalForModal] = useState<NearbyHospitalResult | null>(null);
  const [highlightedHospitalId, setHighlightedHospitalId] = useState<string | null>(null);

  // Update real elapsed time label (e.g., "Location updated just now")
  useEffect(() => {
    if (!patientLocation) return;

    const updateLabel = () => {
      const elapsedSeconds = Math.floor((Date.now() - patientLocation.timestamp) / 1000);
      if (elapsedSeconds < 10) {
        setLocationTimestampText('Location updated just now');
      } else if (elapsedSeconds < 60) {
        setLocationTimestampText(`Location updated ${elapsedSeconds} seconds ago`);
      } else {
        const mins = Math.floor(elapsedSeconds / 60);
        setLocationTimestampText(`Location updated ${mins} min${mins > 1 ? 's' : ''} ago`);
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 10000);
    return () => clearInterval(interval);
  }, [patientLocation]);

  /**
   * 1. Get browser GPS location on explicit user action
   */
  const requestPatientLocation = (radiusToUse: number = 5) => {
    if (!navigator.geolocation) {
      setSearchState('ERROR');
      setErrorMessage('Your browser does not support location detection. Please search by city.');
      return;
    }

    setSearchState('LOCATING');
    setErrorMessage('');
    setIsRefreshingLocation(true);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[HospitalFinder] Starting geolocation...');
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // 8. Validate coordinates before calling API
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          setIsRefreshingLocation(false);
          setSearchState('ERROR');
          setErrorMessage('Unable to determine a valid location. Please try again.');
          return;
        }

        // 4. Detailed development logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('[HospitalFinder] Location permission granted');
          console.log(`[HospitalFinder] Latitude: ${latitude}`);
          console.log(`[HospitalFinder] Longitude: ${longitude}`);
          console.log(`[HospitalFinder] Accuracy: ±${Math.round(accuracy)}m`);
        }

        const loc: PatientLocation = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          label: 'Current GPS Location',
          isManual: false,
          timestamp: now
        };

        setPatientLocation(loc);
        setIsRefreshingLocation(false);

        // Immediately search hospitals using patient's real coordinates
        await executeHospitalSearch(latitude, longitude, radiusToUse);
      },
      (error) => {
        setIsRefreshingLocation(false);
        setSearchState('ERROR');

        if (process.env.NODE_ENV !== 'production') {
          console.warn('[HospitalFinder] Geolocation error code:', error.code, error.message);
        }

        // 5. Handle ALL geolocation errors properly
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. Please allow location access in your browser settings or search by city.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('Your location could not be determined. Please check your GPS/location settings and try again.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('Location detection timed out. Please try again.');
        } else {
          setErrorMessage('Your location could not be determined. Please check your GPS/location settings and try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  /**
   * 2. Search for hospitals using exact coordinates & radius with progressive expansion
   */
  const executeHospitalSearch = async (
    lat: number,
    lng: number,
    radiusKm: number = 5
  ) => {
    setSearchState('SEARCHING');
    setSearchRadiusKm(radiusKm);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[HospitalFinder] Searching hospitals...`);
      console.log(`[HospitalFinder] Searching hospitals at (${lat}, ${lng}) with radius ${radiusKm}km`);
    }

    try {
      let currentRadius = radiusKm;
      let response = await hospitalService.findNearbyHospitals(lat, lng, currentRadius);

      if (process.env.NODE_ENV !== 'production') {
        console.log('[HospitalFinder] API response:', response);
      }

      // 14. If API returns zero results, progressively expand: 5km -> 10km -> 20km
      if (response.success && response.hospitals.length === 0 && currentRadius < 10) {
        currentRadius = 10;
        setSearchRadiusKm(10);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[HospitalFinder] Zero results at 5km. Progressively trying 10km radius...');
        }
        response = await hospitalService.findNearbyHospitals(lat, lng, 10);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[HospitalFinder] API response (10km):', response);
        }
      }

      if (response.success && response.hospitals.length === 0 && currentRadius < 20) {
        currentRadius = 20;
        setSearchRadiusKm(20);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[HospitalFinder] Zero results at 10km. Progressively trying 20km radius...');
        }
        response = await hospitalService.findNearbyHospitals(lat, lng, 20);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[HospitalFinder] API response (20km):', response);
        }
      }

      if (!response.success && response.error) {
        setSearchState('ERROR');
        setErrorMessage('Unable to find nearby hospitals right now.');
        return;
      }

      setHospitals(response.hospitals);
      setIsRadiusExpanded(response.expandedRadius || currentRadius > radiusKm);
      setSearchRadiusKm(response.searchRadiusKm || currentRadius);

      if (response.hospitals.length === 0) {
        setSearchState('NO_RESULTS');
      } else {
        setSearchState('SUCCESS');
        if (response.hospitals[0]) {
          setHighlightedHospitalId(response.hospitals[0].facilityId);
        }
      }
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[HospitalFinder] Network or API error:', err);
      }
      setSearchState('ERROR');
      setErrorMessage('Unable to find nearby hospitals right now.');
    }
  };

  /**
   * 3. Handle Manual City Geocoding Fallback
   */
  const handleManualGeocodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCityQuery.trim()) return;

    setIsGeocoding(true);
    setManualGeocodeError('');

    try {
      const res = await hospitalService.geocodeLocation(manualCityQuery.trim());
      setIsGeocoding(false);

      if (res.success && res.coordinates) {
        const { latitude, longitude, city, state } = res.coordinates;
        const loc: PatientLocation = {
          latitude,
          longitude,
          accuracy: 500, // Approximate
          label: `${city}, ${state}`,
          isManual: true,
          timestamp: Date.now()
        };

        setPatientLocation(loc);
        setIsManualModalOpen(false);
        setManualCityQuery('');

        await executeHospitalSearch(latitude, longitude, 10);
      } else {
        setManualGeocodeError('Could not find location coordinates for this city. Please try another city.');
      }
    } catch {
      setIsGeocoding(false);
      setManualGeocodeError('Failed to geocode location. Please retry.');
    }
  };

  /**
   * Filtered hospitals based on search bar & type filters
   */
  const filteredHospitals = hospitals.filter((h) => {
    const matchesText =
      !textFilter ||
      h.name.toLowerCase().includes(textFilter.toLowerCase()) ||
      h.specialties?.some(s => s.toLowerCase().includes(textFilter.toLowerCase())) ||
      h.address.city.toLowerCase().includes(textFilter.toLowerCase());

    const matchesOwnership =
      ownershipFilter === 'ALL' || h.ownership === ownershipFilter;

    const matchesType =
      typeFilter === 'ALL' || h.type === typeFilter;

    return matchesText && matchesOwnership && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner & Location Detection Trigger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              GPS Patient-Centric Hospital Finder
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Find Hospitals Near You
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Detects your real GPS coordinates to locate nearest government and private emergency care, community clinics, and specialists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => requestPatientLocation(5)}
              disabled={searchState === 'LOCATING' || searchState === 'SEARCHING'}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {searchState === 'LOCATING' || searchState === 'SEARCHING' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              <span>
                {searchState === 'LOCATING'
                  ? 'Finding your location...'
                  : searchState === 'SEARCHING'
                  ? 'Searching hospitals...'
                  : patientLocation
                  ? 'Refresh My Location'
                  : 'Find Nearby Hospitals'}
              </span>
            </button>

            {/* Manual City Search Trigger */}
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search by City</span>
            </button>
          </div>
        </div>

        {/* 2. Active Location & Accuracy Status Pill */}
        {patientLocation ? (
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                patientLocation.isManual ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">
                    📍 {patientLocation.label || 'Current Location'}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    patientLocation.isManual 
                      ? 'bg-amber-100 text-amber-800 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {patientLocation.isManual ? 'Using searched location' : 'GPS Verified'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Location detected</span>
                  <span>•</span>
                  <span>Accuracy: ±{patientLocation.accuracy} m</span>
                  {hospitals.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{hospitals.length} hospitals found nearby</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{locationTimestampText}</span>
                  {isRadiusExpanded && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 font-bold">
                        Expanded to {searchRadiusKm} km to find sufficient facilities
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Refresh Icon Button */}
            <button
              type="button"
              onClick={() => requestPatientLocation(5)}
              disabled={isRefreshingLocation}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
              <span>Refresh My Location</span>
            </button>
          </div>
        ) : searchState === 'IDLE' ? (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
            <Compass className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">No location selected yet.</span> Click <strong>"Find Nearby Hospitals"</strong> to detect your live location or enter your city manually.
            </div>
          </div>
        ) : null}

        {/* Accuracy Warning if accuracy is very poor (> 1000m) */}
        {patientLocation && !patientLocation.isManual && patientLocation.accuracy > 1000 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Your location may be approximate (±{Math.round(patientLocation.accuracy / 1000)} km). Move outdoors or enable precise location in browser settings for better accuracy.
            </span>
          </div>
        )}
      </div>

      {/* 3. States View */}

      {/* State: LOCATING */}
      {searchState === 'LOCATING' && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
            <Compass className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-base font-black text-slate-900">Finding your location...</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please allow browser location access when prompted so we can find hospitals nearest to you.
          </p>
        </div>
      )}

      {/* State: SEARCHING */}
      {searchState === 'SEARCHING' && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">Finding hospitals near you...</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Calculating geodesic distances and checking active 24/7 emergency & OPD services within {searchRadiusKm} km.
          </p>
        </div>
      )}

      {/* State: ERROR */}
      {searchState === 'ERROR' && (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">Unable to find nearby hospitals</h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMessage}</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => requestPatientLocation(5)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Search by City
            </button>
          </div>
        </div>
      )}

      {/* State: NO_RESULTS */}
      {searchState === 'NO_RESULTS' && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              No hospitals found within {searchRadiusKm} km of your location.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no healthcare facilities detected within {searchRadiusKm} km. You can try searching by city or expanding your search.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            {searchRadiusKm < 20 && patientLocation && (
              <button
                type="button"
                onClick={() => executeHospitalSearch(patientLocation.latitude, patientLocation.longitude, searchRadiusKm + 10)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                Search within {searchRadiusKm + 10} km
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Search by City
            </button>
          </div>
        </div>
      )}

      {/* State: SUCCESS (Map + Nearby Hospitals) */}
      {searchState === 'SUCCESS' && (
        <div className="space-y-6">
          {/* Controls & Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-extrabold text-slate-900">
                Nearby Hospitals ({filteredHospitals.length})
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Within {searchRadiusKm} km • Sorted by nearest
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Text filter */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  placeholder="Filter name or specialty..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Ownership filter */}
              <select
                value={ownershipFilter}
                onChange={(e) => setOwnershipFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="ALL">All Ownership</option>
                <option value="GOVERNMENT">Government Only</option>
                <option value="PRIVATE">Private Only</option>
              </select>

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="HOSPITAL">Hospitals</option>
                <option value="CLINIC">Clinics</option>
                <option value="COMMUNITY_HEALTH_CENTER">Community CHC</option>
              </select>
            </div>
          </div>

          {/* Map + List Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Hospital List Cards (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-4">
              {filteredHospitals.map((hospital, idx) => {
                const isSelected = highlightedHospitalId === hospital.facilityId;
                const directionsUrl = patientLocation
                  ? `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.latitude},${patientLocation.longitude}&destination=${hospital.location.latitude},${hospital.location.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.address.city)}`;

                return (
                  <div
                    key={hospital.facilityId || idx}
                    onMouseEnter={() => setHighlightedHospitalId(hospital.facilityId)}
                    className={`bg-white rounded-3xl border transition-all p-5 shadow-xs flex flex-col justify-between space-y-3.5 ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Rank + Distance line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border mb-1 ${
                              hospital.ownership === 'GOVERNMENT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {hospital.ownership} • {hospital.type?.replace('_', ' ')}
                            </span>
                            <h3 className="text-base font-black text-slate-900 leading-snug">
                              {hospital.name}
                            </h3>
                          </div>
                        </div>

                        {/* Distance Badge */}
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-block">
                            {hospital.distanceDisplay}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-9">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{hospital.address.street}, {hospital.address.city}, {hospital.address.state}</span>
                      </div>

                      {/* Phone & 24x7 Status */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pl-9 pt-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className={!hospital.contact?.phone ? 'text-slate-400 italic' : ''}>
                            {hospital.contact?.phone || 'Information unavailable'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {hospital.isOpen24x7 === true ? (
                            <span className="text-emerald-700 font-bold">Open 24/7 Emergency</span>
                          ) : hospital.isOpen24x7 === false ? (
                            <span className="text-slate-600">Day OPD</span>
                          ) : (
                            <span className="text-slate-400 italic">Hours: Information unavailable</span>
                          )}
                        </div>
                        {hospital.dataSource && (
                          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            Source: {hospital.dataSource}
                          </span>
                        )}
                        {hospital.pricing?.isGovernmentSubsidized && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                            Govt Subsidized
                          </span>
                        )}
                      </div>

                      {/* Specialties preview */}
                      {hospital.specialties && hospital.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-9 pt-1">
                          {hospital.specialties.slice(0, 4).map((spec, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                              {spec}
                            </span>
                          ))}
                          {hospital.specialties.length > 4 && (
                            <span className="text-[10px] font-semibold text-slate-400 px-1 py-0.5">
                              +{hospital.specialties.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">General OPD</span>
                        <span className="font-bold text-slate-900">
                          {hospital.pricing?.generalOpdFee === 0 
                            ? 'Free / ₹0' 
                            : typeof hospital.pricing?.generalOpdFee === 'number' 
                              ? `₹${hospital.pricing.generalOpdFee}` 
                              : <span className="text-slate-400 font-normal italic">Information unavailable</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Scheme & Cost Modal */}
                        <button
                          type="button"
                          onClick={() => setActiveHospitalForModal(hospital)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Check Schemes</span>
                        </button>

                        {/* Directions Button */}
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Get Directions</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Clean Radar/Interactive Map Representation (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs sticky top-24 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Visual Proximity Radar
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Visual proximity view (relative radar orientation, not a topographic map)
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Proximity View
                  </span>
                </div>

                {/* SVG Compass / Radar Map Canvas */}
                <div className="relative w-full h-80 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                  {/* Radar Circles */}
                  <div className="absolute w-64 h-64 rounded-full border border-slate-700/60" />
                  <div className="absolute w-44 h-44 rounded-full border border-slate-700/50" />
                  <div className="absolute w-24 h-24 rounded-full border border-slate-700/40" />
                  <div className="absolute w-full h-[1px] bg-slate-800/80" />
                  <div className="absolute h-full w-[1px] bg-slate-800/80" />

                  {/* Range Labels */}
                  <span className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-400">
                    Radius: {searchRadiusKm} km
                  </span>

                  {/* Center: "You Are Here" Marker */}
                  <div className="relative z-20 flex flex-col items-center">
                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
                      <div className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                    </div>
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[9px] font-extrabold text-emerald-300 backdrop-blur-xs whitespace-nowrap shadow-md">
                      You are here
                    </span>
                  </div>

                  {/* Hospital Pins Positioned Relative to Patient (Polar Coordinates calculation) */}
                  {filteredHospitals.slice(0, 8).map((h, i) => {
                    if (!patientLocation) return null;

                    // Compute relative delta
                    const dLat = h.location.latitude - patientLocation.latitude;
                    const dLng = h.location.longitude - patientLocation.longitude;
                    const distRatio = Math.min(1, h.distanceKm / (searchRadiusKm || 5));

                    // Angle in radians
                    const angle = Math.atan2(dLat, dLng);
                    const radiusPixels = distRatio * 115; // Within 120px max radius

                    const x = Math.cos(angle) * radiusPixels;
                    const y = -Math.sin(angle) * radiusPixels; // Inverted SVG Y axis

                    const isHovered = highlightedHospitalId === h.facilityId;

                    return (
                      <div
                        key={h.facilityId}
                        style={{
                          transform: `translate(${x}px, ${y}px)`
                        }}
                        onClick={() => {
                          setHighlightedHospitalId(h.facilityId);
                          setActiveHospitalForModal(h);
                        }}
                        onMouseEnter={() => setHighlightedHospitalId(h.facilityId)}
                        className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 group ${
                          isHovered ? 'scale-125 z-40' : ''
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border-2 shadow-lg ${
                          isHovered 
                            ? 'bg-emerald-500 border-white text-white ring-4 ring-emerald-500/30' 
                            : 'bg-white border-slate-900 text-slate-900 hover:bg-emerald-50'
                        }`}>
                          {i + 1}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap mt-0.5 transition-opacity ${
                          isHovered
                            ? 'bg-slate-950 text-white opacity-100'
                            : 'bg-slate-950/80 text-slate-300 opacity-0 group-hover:opacity-100'
                        }`}>
                          {h.name.split(' ')[0]} ({h.distanceDisplay})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Hospital Quick Summary in Map Box */}
                {highlightedHospitalId && (
                  (() => {
                    const active = filteredHospitals.find(h => h.facilityId === highlightedHospitalId);
                    if (!active) return null;
                    return (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {active.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {active.distanceDisplay}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {active.address.street}, {active.address.city}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-slate-700">
                          <span>Phone: {active.contact?.phone || 'Information unavailable'}</span>
                          <button
                            onClick={() => setActiveHospitalForModal(active)}
                            className="text-emerald-700 hover:underline font-bold"
                          >
                            View Benefits →
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. Modal: Manual City / Area Geocode Fallback */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Search Hospitals by City</h3>
                  <p className="text-[11px] text-slate-500">Enter city, town, area, or PIN code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualGeocodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City / Location Name
                </label>
                <input
                  type="text"
                  value={manualCityQuery}
                  onChange={(e) => setManualCityQuery(e.target.value)}
                  placeholder="e.g. Jaipur, New Delhi, Bengaluru, Mumbai..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {manualGeocodeError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{manualGeocodeError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeocoding || !manualCityQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {isGeocoding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Search Hospitals</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Scheme & Cost Comparison */}
      {activeHospitalForModal && (
        <HealthcareCostComparisonModal
          facilityName={activeHospitalForModal.name}
          opdFee={activeHospitalForModal.pricing?.generalOpdFee}
          specialistFee={activeHospitalForModal.pricing?.specialistConsultationFee}
          bedFee={activeHospitalForModal.pricing?.bedChargesPerDay}
          schemeEligibility={activeHospitalForModal.schemeEligibility}
          onClose={() => setActiveHospitalForModal(null)}
        />
      )}
    </div>
  );
};
