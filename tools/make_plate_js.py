# Assemble the hero map plate into assets/plate.js (injects an inline SVG into #plate)
import json, sys
B, out_js = sys.argv[1], sys.argv[2]
d = json.load(open(f"{B}/plate_paths.json"))
m, P = d["meta"], d["paths"]
W, H = m["W"], m["H"]
L = m["labels"]
names = {  # display name, text-anchor, dx, dy (SVG units = km)
    "Cherbourg-Octeville": ("Cherbourg", "start", 3.2, -1.2),
    "St-Malo–Baie du Mont-Saint-Michel": ("Saint-Malo", "start", 2.6, 5.4),
    "Caen": ("Caen", "end", -3.2, 3.6),
    "Dives-Ouistreham": ("Dives-Ouistreham", "end", -2.4, -3.4),
    "Le Havre": ("Le Havre", "end", -3.2, -1.6),
    "Rouen-Louviers-Austreberthe": ("Rouen", "start", 3.2, 1.2),
    "Évreux": ("Évreux", "start", 3.2, 1.2),
    "Dieppe": ("Dieppe", "start", 3.2, 1.2),
}
lab = []
for k, (name, anchor, dx, dy) in names.items():
    x, y = L[k]
    lab.append(f'<path class="pl-dot" d="M{x} {y}h0"/><text class="pl-place" x="{round(x+dx,1)}" y="{round(y+dy,1)}" text-anchor="{anchor}">{name}</text>')
grat_lab = []
for kind, val, pos in m["grat_labels"]:
    if kind == "m":
        continue  # meridian labels dropped: on a conic projection they drift off the top edge
    if False:
        if val == 0:
            fr = en = "0°"
        else:
            fr = f"{abs(val)}° {'O' if val < 0 else 'E'}"
            en = f"{abs(val)}° {'W' if val < 0 else 'E'}"
        gx, gy = pos
        grat_lab.append(f'<text class="pl-grat" x="{gx}" y="{round(gy - 1.4, 1)}" text-anchor="middle"><tspan lang="fr">{fr}</tspan><tspan lang="en">{en}</tspan></text>')
    else:
        deg = int(val); mins = "30′" if val % 1 else ""
        grat_lab.append(f'<text class="pl-grat" x="{round(W-1.6,1)}" y="{round(pos-1.2,1)}" text-anchor="end">{deg}°{mins} N</text>')
sx, sy = m["sea"]
water = "".join(f'<path class="pl-w pl-w{i+1}" d="{p}"/>' for i, p in enumerate(P["water"]))
grat = "".join(f'<path d="{p}"/>' for p in P["grat"])
svg = (
 f'<svg class="plate-svg" viewBox="{" ".join(str(v) for v in m["desk"])}" data-desk="{" ".join(str(v) for v in m["desk"])}" data-crop="{" ".join(str(v) for v in m["crop"])}" '
 f'preserveAspectRatio="xMaxYMid meet" role="img" aria-labelledby="plate-label">'
 f'<title id="plate-label">Normandie : zones inondables des huit TRI, communes concernées, autoroutes et routes nationales</title>'
 f'<g class="pl-grat-lines">{grat}</g>'
 f'<g class="pl-water">{water}</g>'
 f'<path class="pl-neigh" d="{P["neighbours"]}"/>'
 f'<path class="pl-normandy" d="{P["normandy"]}"/>'
 f'<path class="pl-tri" d="{P["tri"]}"/>'
 f'<path class="pl-dep" d="{P["dep_lines"]}"/>'
 f'<path class="pl-rail" d="{P["rail"]}"/><path class="pl-rail-ticks" d="{P["rail"]}"/>'
 f'<path class="pl-natl" d="{P["nationals"]}"/>'
 f'<path class="pl-moto" d="{P["motorways"]}"/>'
 f'<path class="pl-flood" d="{P["flood"]}"/>'
 f'<text class="pl-sea" x="{sx}" y="{sy}" text-anchor="middle"><tspan lang="fr">La Manche</tspan><tspan lang="en">English Channel</tspan></text>'
 f'{"".join(grat_lab)}{"".join(lab)}'
 f'</svg>'
)
js = ("/* Hero map of Normandy. Generated from the project's open-data layers (IGN ADMIN EXPRESS, IGN BD TOPO, DREAL/Géorisques TRI 2020)\n"
      "   and Natural Earth coastlines, in Lambert-93. Regenerate with build_plate.py; do not edit by hand. */\n"
      "(function(){var el=document.getElementById('plate');if(!el)return;el.innerHTML=" + json.dumps(svg, ensure_ascii=False) + ";"
      "document.dispatchEvent(new Event('plate:ready'));})();\n")
open(out_js, "w", encoding="utf-8").write(js)
print("plate.js", round(len(js.encode())/1024, 1), "KB")
