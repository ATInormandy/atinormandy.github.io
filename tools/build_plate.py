# Build the hero "map plate" paths (Lambert-93, 1 SVG unit = 1 km)
# Inputs (build dir): layers from the overview map (WGS84), BD TOPO roads/rail from the IGN WFS (Lambert-93), Natural Earth countries (WGS84)
import json, sys, warnings
import shapely
from shapely.geometry import shape, box, Polygon, MultiPolygon, LineString, MultiLineString, GeometryCollection
from shapely.ops import transform, unary_union, linemerge
from pyproj import Transformer
warnings.filterwarnings("ignore", category=DeprecationWarning)

B = sys.argv[1]
to93 = Transformer.from_crs(4326, 2154, always_xy=True)
proj = lambda g: shapely.make_valid(transform(to93.transform, g))
feats = lambda name: json.load(open(f"{B}/{name}.geojson"))["features"]

deps = [proj(shape(f["geometry"])).buffer(0) for f in feats("departements")]
communes = [(f["properties"]["area_label"], proj(shape(f["geometry"]).buffer(0))) for f in feats("tri_communes")]
flood = [proj(shape(f["geometry"]).buffer(0)) for f in feats("flood")]
clip_ll = box(-11.0, 46.8, 4.5, 51.4)
ne = []
for f in feats("ne_countries_near"):
    g = shape(f["geometry"]).buffer(0).intersection(clip_ll)
    if not g.is_empty:
        ne.append(proj(g))

def fill_holes(g):
    parts = [Polygon(p.exterior) for p in getattr(g, "geoms", [g]) if isinstance(p, Polygon)]
    return unary_union(parts)

normandy = fill_holes(unary_union([d.buffer(80) for d in deps]).buffer(-80))
tri_all = unary_union([g for _, g in communes])
land = unary_union(ne + [normandy, tri_all])
study = unary_union([normandy, tri_all]).buffer(300)

x_e, _ = to93.transform(2.05, 49.2)
_, y_s = to93.transform(0.0, 47.75)
_, y_n = to93.transform(0.0, 50.55)
H = (y_n - y_s) / 1000.0
W = 820.0
x_w = x_e - W * 1000
frame = box(x_w, y_s, x_e, y_n)

def xy(x, y):
    return ((x - x_w) / 1000.0, (y_n - y) / 1000.0)

def ring_d(coords, close):
    out, last = [], None
    for i, (x, y) in enumerate(coords):
        sx, sy = xy(x, y)
        p = (round(sx, 1), round(sy, 1))
        if p == last:
            continue
        out.append(("M" if not out else "L") + f"{p[0]:g} {p[1]:g}")
        last = p
    if len(out) < 2:
        return ""
    return "".join(out) + ("Z" if close else "")

def path_d(g):
    parts = []
    def walk(h):
        if h.is_empty:
            return
        if isinstance(h, Polygon):
            parts.append(ring_d(h.exterior.coords, True))
            parts.extend(ring_d(r.coords, True) for r in h.interiors)
        elif isinstance(h, LineString):
            parts.append(ring_d(h.coords, False))
        elif hasattr(h, "geoms"):
            for k in h.geoms:
                walk(k)
    walk(g)
    return "".join(p for p in parts if p)

def polys(g, min_area, min_hole=None):
    keep = []
    for h in getattr(g, "geoms", [g]):
        if isinstance(h, Polygon) and h.area >= min_area:
            holes = h.interiors if min_hole is None else [r for r in h.interiors if Polygon(r).area >= min_hole]
            keep.append(Polygon(h.exterior, holes))
        elif hasattr(h, "geoms"):
            keep.extend(polys(h, min_area, min_hole).geoms if not polys(h, min_area, min_hole).is_empty else [])
    return MultiPolygon(keep) if keep else GeometryCollection()

def lines(g, tol, min_len):
    m = linemerge(g) if not isinstance(g, LineString) else g
    m = m.simplify(tol)
    keep = [x for x in getattr(m, "geoms", [m]) if isinstance(x, LineString) and x.length >= min_len]
    return MultiLineString(keep) if keep else GeometryCollection()

P = {}
neigh = land.difference(normandy.buffer(1200)).difference(tri_all.buffer(600)).intersection(frame)
P["neighbours"] = path_d(polys(neigh.simplify(300), 2e6))
P["normandy"] = path_d(polys(normandy.simplify(150), 1e5))
P["water"] = [path_d(land.buffer(d, quad_segs=6).boundary.intersection(frame).simplify(350)) for d in (1800, 4200, 7400, 11500, 16500)]
dep_lines = linemerge(unary_union([d.simplify(450).boundary for d in deps]).difference(normandy.boundary.buffer(700)))
P["dep_lines"] = path_d(dep_lines)
P["tri"] = path_d(polys(tri_all.simplify(250), 4e5))
P["flood"] = path_d(polys(unary_union(flood).simplify(220), 1.5e5, 4e5))

road_f = feats("bdtopo_roads_l93")
geom = lambda f: shapely.force_2d(shapely.make_valid(shape(f["geometry"])))
moto = unary_union([geom(f) for f in road_f if f["properties"]["type_de_route"] == "Autoroute"]).intersection(study)
natl = unary_union([geom(f) for f in road_f if f["properties"]["type_de_route"] == "Nationale"]).intersection(study)
P["motorways"] = path_d(lines(moto, 350, 1500))
P["nationals"] = path_d(lines(natl, 350, 1500))
rail = unary_union([geom(f) for f in feats("bdtopo_rail_l93")]).intersection(study)
P["rail"] = path_d(lines(rail, 350, 2000))

grat = []
for lon in range(-10, 3):
    g = LineString([to93.transform(lon, 47.0 + i * 0.05) for i in range(90)]).intersection(frame)
    grat.append(("m", lon, g))
for k in range(96, 102):
    g = LineString([to93.transform(-11 + i * 0.1, k / 2.0) for i in range(160)]).intersection(frame)
    grat.append(("p", k / 2.0, g))
P["grat"] = [path_d(g) for _, _, g in grat if not g.is_empty]
gl = []
for kind, val, g in grat:
    if g.is_empty:
        continue
    if kind == "m":
        mx, my = to93.transform(val, 50.30)
        if x_w < mx < x_e:
            gl.append(["m", val, [round(v, 1) for v in xy(mx, my)]])
    else:
        t = g.intersection(box(x_e - 1, y_s, x_e + 1, y_n))
        if not t.is_empty:
            gl.append(["p", val, round(xy(t.centroid.x, t.centroid.y)[1], 1)])

labels = {}
for a in sorted({a for a, _ in communes}):
    u = unary_union([g for b, g in communes if b == a])
    c = u.centroid if u.centroid.within(u) else u.representative_point()
    labels[a] = [round(v, 1) for v in xy(c.x, c.y)]
sx, sy = to93.transform(-0.62, 49.83)
nb = unary_union([normandy, tri_all]).bounds
cx0, cy1 = xy(nb[0] - 16000, nb[1] - 9000)
cx1, cy0 = xy(nb[2] + 14000, nb[3] + 14000)
dx0, dy1 = xy(nb[0] - 9000, nb[1] - 10000)
_, dy0 = xy(nb[0], nb[3] + 16000)
meta = {"W": round(W, 1), "H": round(H, 1), "labels": labels, "sea": [round(sx and xy(sx, sy)[0], 1), round(xy(sx, sy)[1], 1)],
        "crop": [round(cx0, 1), round(cy0, 1), round(cx1 - cx0, 1), round(cy1 - cy0, 1)], "desk": [round(dx0, 1), round(dy0, 1), round(W - dx0, 1), round(dy1 - dy0, 1)], "grat_labels": gl}
json.dump({"meta": meta, "paths": P}, open(f"{B}/plate_paths.json", "w"))
for k, v in P.items():
    print(f"{k:11s} {(sum(map(len, v)) if isinstance(v, list) else len(v))/1024:7.1f} KB")
print("crop", meta["crop"], "desk", meta["desk"], "W,H", meta["W"], meta["H"])
