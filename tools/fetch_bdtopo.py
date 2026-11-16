# Fetch motorways/national roads and main railway lines around Normandy from the IGN Géoplateforme WFS (BD TOPO, open data), in Lambert-93
import json, ssl, sys, urllib.parse, urllib.request, os
out_dir = sys.argv[1]
ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt") if os.path.exists("/root/.ccr/ca-bundle.crt") else ssl.create_default_context()
BBOX = "BBOX(geometrie,310000,6765000,630000,7025000,'EPSG:2154')"
jobs = {
    "bdtopo_roads_l93": ("BDTOPO_V3:route_numerotee_ou_nommee", "type_de_route IN ('Autoroute','Nationale') AND " + BBOX, ["type_de_route", "numero"]),
    "bdtopo_rail_l93": ("BDTOPO_V3:troncon_de_voie_ferree", "nature IN ('Voie ferrée principale','LGV') AND etat_de_l_objet='En service' AND " + BBOX, ["nature", "nombre_de_voies"]),
}
for name, (typ, cql, keep) in jobs.items():
    feats, start = [], 0
    while True:
        q = {"SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": typ, "OUTPUTFORMAT": "application/json",
             "SRSNAME": "EPSG:2154", "COUNT": "5000", "STARTINDEX": str(start), "CQL_FILTER": cql}
        url = "https://data.geopf.fr/wfs/ows?" + urllib.parse.urlencode(q)
        with urllib.request.urlopen(url, context=ctx, timeout=120) as r:
            d = json.load(r)
        f = d.get("features", [])
        for x in f:
            x["properties"] = {k: x["properties"].get(k) for k in keep}
        feats += f
        if len(f) < 5000:
            break
        start += 5000
    json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(out_dir, name + ".geojson"), "w"))
    from collections import Counter
    print(name, len(feats), Counter(tuple(v for v in x["properties"].values())[:1] for x in feats).most_common(4))
