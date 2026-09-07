const testCoords = [
  { name: 'Jaipur Central', lat: 26.9124, lng: 75.7873 },
  { name: 'Delhi Connaught Place', lat: 28.6304, lng: 77.2177 },
  { name: 'Bengaluru Indiranagar', lat: 12.9784, lng: 77.6408 }
];

async function testOverpass(lat, lng) {
  const query = `[out:json][timeout:10];(node["amenity"~"hospital|clinic"](around:5000,${lat},${lng});way["amenity"~"hospital|clinic"](around:5000,${lat},${lng}););out center 10;`;
  const url = 'https://overpass-api.de/api/interpreter';
  const res = await fetch(url, {
    method: 'POST',
    body: query,
    headers: { 'User-Agent': 'CarePrep-Healthcare-Audit/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.elements || [];
}

async function run() {
  for (const loc of testCoords) {
    console.log(`Testing Overpass for ${loc.name} (${loc.lat}, ${loc.lng})...`);
    try {
      const items = await testOverpass(loc.lat, loc.lng);
      console.log(` -> Found ${items.length} real facilities.`);
      if (items.length > 0) {
        const first = items[0];
        const tags = first.tags || {};
        const coords = {
          lat: first.lat || first.center?.lat,
          lon: first.lon || first.center?.lon
        };
        console.log(`    Sample: ${tags.name || 'Unnamed'} (${tags.amenity}) at`, coords);
      }
    } catch (e) {
      console.error(` -> Failed:`, e.message);
    }
  }
}

run();
