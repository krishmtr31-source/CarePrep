const testCoords = [
  { name: 'Jaipur Central', lat: 26.9124, lng: 75.7873 },
  { name: 'Delhi Connaught Place', lat: 28.6304, lng: 77.2177 },
  { name: 'Bengaluru Indiranagar', lat: 12.9784, lng: 77.6408 }
];

async function testNominatimHospital(lat, lng) {
  // Free, robust OpenStreetMap Nominatim reverse POI search for hospitals
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=10&viewbox=${lng - 0.05},${lat + 0.05},${lng + 0.05},${lat - 0.05}&bounded=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CarePrep-Healthcare-Platform/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json;
}

async function run() {
  for (const loc of testCoords) {
    console.log(`Testing Nominatim hospital search for ${loc.name}...`);
    try {
      const items = await testNominatimHospital(loc.lat, loc.lng);
      console.log(` -> Found ${items.length} real facilities.`);
      if (items.length > 0) {
        console.log(`    Sample: ${items[0].display_name} at (${items[0].lat}, ${items[0].lon})`);
      }
      await new Promise(r => setTimeout(r, 1000)); // Rate-limit courtesy
    } catch (e) {
      console.error(` -> Failed:`, e.message);
    }
  }
}

run();
