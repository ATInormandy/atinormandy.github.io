/* ATI-Normandy — page tabs (#le-projet, #cartographie, #equipe, #publications, #partenaires),
   language switch, mobile menu, map selector, team map and sizing of the Normandy map. */
(function () {
  "use strict";
  var root = document.documentElement;
  var PAGES = ["le-projet", "cartographie", "equipe", "publications", "partenaires"];
  /* other names that lead to a page (old addresses, French spellings) */
  var ALIASES = { "": "le-projet", accueil: "le-projet", projet: "le-projet", programme: "le-projet",
                  "lequipe": "equipe", "l%C3%A9quipe": "equipe", "léquipe": "equipe", team: "equipe",
                  contact: "partenaires", partners: "partenaires", maps: "cartographie", carte: "cartographie" };
  var TITLES = { fr: "ANR ATI-Normandy", en: "ANR ATI-Normandy" };
  var current = null;

  function each(sel, fn, scope) { Array.prototype.forEach.call((scope || document).querySelectorAll(sel), fn); }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } }

  /* ---- Language ---- */
  function setLang(lang, fromUser) {
    if (lang !== "fr" && lang !== "en") lang = "fr";
    root.setAttribute("data-lang", lang);
    root.lang = lang;
    document.title = TITLES[lang];
    each("[data-" + lang + "-label]", function (el) { el.setAttribute("aria-label", el.getAttribute("data-" + lang + "-label")); });
    each("[data-" + lang + "-title]", function (el) { el.setAttribute("title", el.getAttribute("data-" + lang + "-title")); });
    each(".lang button", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang)); });
    var plate = document.getElementById("plate");
    var t = plate && plate.querySelector("title");
    if (t) t.textContent = plate.getAttribute("data-" + lang + "-desc") || t.textContent;
    if (fromUser) {
      save("ati-lang", lang);
      try { var u = new URL(location.href); u.searchParams.set("lang", lang); history.replaceState(null, "", u); } catch (e) { }
    }
    fitPlate();
  }
  each(".lang button", function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-set-lang"), true); }); });

  /* ---- Mobile menu ---- */
  var menuBtn = document.querySelector(".menu-btn");
  var tabs = document.getElementById("tabs");
  function closeMenu() { if (tabs) tabs.classList.remove("open"); if (menuBtn) menuBtn.setAttribute("aria-expanded", "false"); }
  if (menuBtn && tabs) {
    menuBtn.addEventListener("click", function () { var open = tabs.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", String(open)); });
    tabs.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---- Tabset inside the project card ---- */
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tabset-nav [role="tab"]'));
  function selectTab(btn, focus) {
    tabButtons.forEach(function (b) {
      var on = b === btn;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(b.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) btn.focus();
  }
  tabButtons.forEach(function (b, i) {
    b.addEventListener("click", function () { selectTab(b, false); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var next = tabButtons[(i + (e.key === "ArrowRight" ? 1 : tabButtons.length - 1)) % tabButtons.length];
        selectTab(next, true);
        e.preventDefault();
      }
    });
  });
  if (tabButtons.length) selectTab(tabButtons[0], false);

  /* ---- Interactive map (loaded the first time the page is opened) ---- */
  var carto = document.getElementById("cartographie");
  var frame = document.getElementById("map-frame");
  var full = document.getElementById("map-full");
  var mapButtons = carto ? carto.querySelectorAll("[data-map]") : [];
  var base = carto ? (carto.getAttribute("data-map-base") || "") : "";
  var chosenMap = null;
  function showMap(slug, fromUser) {
    if (!frame || !mapButtons.length) return;
    var chosen = carto.querySelector('[data-map="' + slug + '"]') || mapButtons[0];
    chosenMap = chosen.getAttribute("data-map");
    Array.prototype.forEach.call(mapButtons, function (b) { b.setAttribute("aria-pressed", String(b === chosen)); });
    var url = base + (chosen.getAttribute("data-file") || "");
    if (full) full.href = url;
    if (current === "cartographie" && frame.getAttribute("src") !== url) frame.setAttribute("src", url);
    else frame.setAttribute("data-src", url);
    if (fromUser) {
      try {
        var u = new URL(location.href);
        if (chosen === mapButtons[0]) u.searchParams.delete("carte"); else u.searchParams.set("carte", chosenMap);
        history.replaceState(null, "", u);
      } catch (e) { }
    }
  }
  Array.prototype.forEach.call(mapButtons, function (b) { b.addEventListener("click", function () { showMap(b.getAttribute("data-map"), true); }); });

  /* ---- Team map (Leaflet, IGN Plan v2 tiles) ---- */
  var labsMap = null;
  function initLabsMap() {
    var el = document.getElementById("labs-map");
    if (!el || typeof L === "undefined") return;
    if (labsMap) { labsMap.invalidateSize(); return; }
    labsMap = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      { maxZoom: 18, attribution: '&copy; <a href="https://www.ign.fr/">IGN</a> — Plan IGN v2' }).addTo(labsMap);
    var labs = [
      { ll: [49.1887, -0.3653], name: "CREM — Université de Caen Normandie", town: "Caen", side: "right" },
      { ll: [51.0336, 2.3716], name: "LEM — Université du Littoral Côte d'Opale", town: "Dunkerque", side: "left" }
    ];
    var pts = [];
    labs.forEach(function (l) {
      L.circleMarker(l.ll, { radius: 8, color: "#fff", weight: 2, fillColor: "#C7372A", fillOpacity: 1 })
        .addTo(labsMap)
        .bindTooltip("<strong>" + l.town + "</strong><br>" + l.name,
          { permanent: true, direction: l.side, offset: [l.side === "left" ? -10 : 10, 0], className: "lab-label" });
      pts.push(l.ll);
    });
    labsMap.fitBounds(pts, { padding: [70, 70], maxZoom: 7 });
  }

  /* ---- Page switching ---- */
  function pageFromHash() {
    var h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (PAGES.indexOf(h) > -1) return { page: h, alias: null };
    var key = h.normalize ? h.normalize("NFD").replace(/[̀-ͯ]/g, "") : h;
    var p = ALIASES[h] || ALIASES[key];
    return { page: p || "le-projet", alias: h };
  }
  function showPage(scrollTop) {
    var r = pageFromHash();
    current = r.page;
    PAGES.forEach(function (id) { var s = document.getElementById(id); if (s) s.hidden = id !== r.page; });
    each("#tabs a", function (a) { if (a.getAttribute("data-page") === r.page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (r.alias === "programme" && tabButtons[1]) selectTab(tabButtons[1], false);
    if (r.page === "cartographie" && frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
    if (r.page === "equipe") initLabsMap();
    if (r.page === "le-projet") fitPlate();
    if (scrollTop) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", function () { showPage(true); });

  /* ---- Normandy map in the project page ---- */
  function fitPlate() {
    var svg = document.querySelector(".plate-svg");
    if (!svg) return;
    svg.setAttribute("viewBox", svg.getAttribute("data-crop"));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var m = svg.getScreenCTM();
    if (m && m.a) svg.style.setProperty("--k", (1 / m.a).toFixed(4));
  }
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitPlate, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPlate);

  /* ---- Start ---- */
  var wanted = null;
  try { wanted = new URLSearchParams(location.search).get("carte"); } catch (e) { }
  if (wanted) {
    showMap(wanted, false);
    if (!location.hash) { try { history.replaceState(null, "", location.pathname + location.search + "#cartographie"); } catch (e) { } }
  }
  showPage(false);
  setLang(root.getAttribute("data-lang") || "fr", false);
})();
