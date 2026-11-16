// Convert world-atlas countries-10m TopoJSON to GeoJSON for countries near Normandy
const path = require('path');
const npmDir = process.argv[2], out = process.argv[3];
const topo = require(path.join(npmDir, 'node_modules/world-atlas/countries-10m.json'));
const tc = require(path.join(npmDir, 'node_modules/topojson-client'));
const fc = tc.feature(topo, topo.objects.countries);
const keep = fc.features.filter(f => {
  // bbox test: lon -4..3.5, lat 47.5..51.5
  let hit = false;
  const walk = c => { if (typeof c[0] === 'number') { if (c[0] > -4 && c[0] < 3.5 && c[1] > 47.5 && c[1] < 51.5) hit = true; } else c.forEach(walk); };
  if (f.geometry) walk(f.geometry.coordinates);
  return hit;
});
console.log(keep.map(f => f.properties.name).join(', '));
require('fs').writeFileSync(out, JSON.stringify({type: 'FeatureCollection', features: keep}));
