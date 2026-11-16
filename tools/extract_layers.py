# Pull the GeoJSON layers out of the folium overview map and save them as plain GeoJSON files
import json, re, sys, os
src, outdir = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
dec = json.JSONDecoder()
groups = {"departements": [], "region_outline": [], "tri_communes": [], "flood": [], "roads": []}
for m in re.finditer(r'(geo_json_[0-9a-f]+)_add\(', s):
    try:
        obj, _ = dec.raw_decode(s, m.end())
    except Exception:
        continue
    feats = obj.get("features", [])
    if not feats:
        continue
    keys = set(feats[0].get("properties", {}).keys())
    if {"code_insee", "in_normandy"} <= keys:
        groups["departements"] += feats
    elif keys == {"name"}:
        groups["region_outline"] += feats
    elif "population" in keys:
        groups["tri_communes"] += feats
    elif "flood_type" in keys:
        groups["flood"] += feats
    elif "importance" in keys:
        groups["roads"] += feats
for k, v in groups.items():
    json.dump({"type": "FeatureCollection", "features": v}, open(os.path.join(outdir, k + ".geojson"), "w"))
    print(k, len(v))
print("depts:", [(f["properties"]["nom_officiel"], f["properties"]["in_normandy"]) for f in groups["departements"]])
print("areas:", sorted({f["properties"]["area_label"] for f in groups["tri_communes"]}))
print("flood types:", sorted({(f["properties"]["flood_type"], f["properties"]["flood_type_label"]) for f in groups["flood"]}))
print("roads props:", groups["roads"][0]["properties"], groups["roads"][0]["geometry"]["type"])
print("outline props:", groups["region_outline"][0]["properties"])
