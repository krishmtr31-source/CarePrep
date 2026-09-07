export interface RawExternalHospital {
  sourceId: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    fullAddress?: string;
  };
  phone?: string;
  isOpen24x7?: boolean;
  openingHoursRaw?: string;
  website?: string;
}

export interface NearbySearchProviderResult {
  provider: 'OPENSTREETMAP_OVERPASS' | 'OPENSTREETMAP_NOMINATIM' | 'MONGODB_VERIFIED_REGISTRY';
  hospitals: RawExternalHospital[];
}

/**
 * Strategy 1: OpenStreetMap Overpass API (Fast, structured, specific POI tags)
 */
async function fetchOverpassHospitals(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<RawExternalHospital[]> {
  const query = `[out:json][timeout:8];(
    node["amenity"~"hospital|clinic"](around:${radiusMeters},${lat},${lng});
    way["amenity"~"hospital|clinic"](around:${radiusMeters},${lat},${lng});
  );out center 25;`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'User-Agent': 'CarePrep-Healthcare-Platform/1.0' },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Overpass returned HTTP ${res.status}`);
  }

  const data: any = await res.json();
  const elements = data.elements || [];

  const results: RawExternalHospital[] = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags['official_name'];
    if (!name) continue; // Exclude nameless map points

    const latitude = el.lat || el.center?.lat;
    const longitude = el.lon || el.center?.lon;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const openingHours = tags.opening_hours;
    const isOpen24x7 = openingHours === '24/7' ? true : undefined;

    const street = tags['addr:street'] || tags['addr:suburb'] || tags['addr:place'];
    const city = tags['addr:city'] || tags['addr:district'];
    const state = tags['addr:state'];
    const pincode = tags['addr:postcode'];

    results.push({
      sourceId: `osm-${el.type}-${el.id}`,
      name,
      type: tags.amenity === 'clinic' ? 'CLINIC' : 'HOSPITAL',
      latitude,
      longitude,
      address: {
        street,
        city,
        state,
        pincode,
        fullAddress: [street, city, state, pincode].filter(Boolean).join(', ') || undefined
      },
      phone: tags.phone || tags['contact:phone'] || tags.emergency || undefined,
      isOpen24x7,
      openingHoursRaw: openingHours || undefined,
      website: tags.website || tags['contact:website'] || undefined
    });
  }

  return results;
}

/**
 * Strategy 2: OpenStreetMap Nominatim Bounded Search (High-availability fallback)
 */
async function fetchNominatimHospitals(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RawExternalHospital[]> {
  // Compute approximate bounding box (1 deg lat ~ 111km, 1 deg lon ~ 111km * cos(lat))
  const deltaLat = (radiusKm / 111) * 1.1;
  const deltaLng = (radiusKm / (111 * Math.cos(lat * (Math.PI / 180)))) * 1.1;

  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;
  const minLng = lng - deltaLng;
  const maxLng = lng + deltaLng;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=25&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1&addressdetails=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'CarePrep-Healthcare-Platform/1.0' },
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Nominatim returned HTTP ${res.status}`);
  }

  const data: any = await res.json();
  if (!Array.isArray(data)) return [];

  const results: RawExternalHospital[] = [];

  for (const item of data) {
    const rawName = item.name || item.display_name?.split(',')[0];
    if (!rawName) continue;

    const itemLat = parseFloat(item.lat);
    const itemLng = parseFloat(item.lon);
    if (isNaN(itemLat) || isNaN(itemLng)) continue;

    const addr = item.address || {};

    results.push({
      sourceId: `nominatim-${item.osm_type || 'node'}-${item.osm_id || Math.random().toString(36).slice(2, 8)}`,
      name: rawName,
      type: item.type === 'clinic' ? 'CLINIC' : 'HOSPITAL',
      latitude: itemLat,
      longitude: itemLng,
      address: {
        street: addr.road || addr.suburb || addr.neighbourhood,
        city: addr.city || addr.town || addr.county || addr.district,
        state: addr.state,
        pincode: addr.postcode,
        fullAddress: item.display_name
      }
    });
  }

  return results;
}

function computeHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function processAndSortHospitals(
  items: RawExternalHospital[],
  centerLat: number,
  centerLng: number
): RawExternalHospital[] {
  // Deduplicate by normalized name and location within ~100m
  const seen = new Set<string>();
  const unique: RawExternalHospital[] = [];

  for (const item of items) {
    const key = `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${item.latitude.toFixed(3)}_${item.longitude.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  // Sort nearest-first
  unique.sort((a, b) => {
    const distA = computeHaversine(centerLat, centerLng, a.latitude, a.longitude);
    const distB = computeHaversine(centerLat, centerLng, b.latitude, b.longitude);
    return distA - distB;
  });

  return unique;
}

/**
 * Unified Live Nearby Healthcare Search
 * Tries Overpass -> Nominatim -> Registry fallback with exact GPS coordinates.
 */
export async function searchRealNearbyHospitals(
  patientLat: number,
  patientLng: number,
  radiusKm: number
): Promise<NearbySearchProviderResult> {
  const radiusMeters = Math.round(radiusKm * 1000);

  // 1. Primary Live Source: Overpass API
  try {
    const overpassResults = await fetchOverpassHospitals(patientLat, patientLng, radiusMeters);
    if (overpassResults.length > 0) {
      const sorted = processAndSortHospitals(overpassResults, patientLat, patientLng);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[HospitalFinder] Provider: OPENSTREETMAP_OVERPASS | Returned ${sorted.length} live hospitals.`);
      }
      return {
        provider: 'OPENSTREETMAP_OVERPASS',
        hospitals: sorted
      };
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[HospitalFinder] Overpass provider notice: ${err.message}. Cascading to Nominatim.`);
    }
  }

  // 2. Secondary Live Source: OpenStreetMap Nominatim
  try {
    const nominatimResults = await fetchNominatimHospitals(patientLat, patientLng, radiusKm);
    if (nominatimResults.length > 0) {
      const sorted = processAndSortHospitals(nominatimResults, patientLat, patientLng);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[HospitalFinder] Provider: OPENSTREETMAP_NOMINATIM | Returned ${sorted.length} live hospitals.`);
      }
      return {
        provider: 'OPENSTREETMAP_NOMINATIM',
        hospitals: sorted
      };
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[HospitalFinder] Nominatim provider notice: ${err.message}. Cascading to verified registry.`);
    }
  }

  // 3. Fallback: Return empty so caller can query verified MongoDB registry
  return {
    provider: 'MONGODB_VERIFIED_REGISTRY',
    hospitals: []
  };
}
