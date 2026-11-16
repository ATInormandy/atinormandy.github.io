/* ATI-Normandy — page tabs, "Research programme" drop-down menu, language switch, mobile menu,
   map selector, team map, slide viewer and sizing of the Normandy map. */
(function () {
  "use strict";
  var root = document.documentElement;
  var PAGES = ["le-projet", "programme", "datum", "cartographie", "presentations", "equipe", "publications", "partenaires"];
  var PROGRAMME = ["programme", "datum", "cartographie", "presentations"];   /* pages under "Research programme" */
  /* other names that lead to a page (old addresses, other spellings) */
  var ALIASES = { "": "le-projet", accueil: "le-projet", projet: "le-projet", project: "le-projet",
                  overview: "programme", "research-programme": "programme",
                  data: "datum", donnees: "datum",
                  maps: "cartographie", carte: "cartographie", cartes: "cartographie", "iterative-maps": "cartographie",
                  presentation: "presentations", slides: "presentations",
                  lequipe: "equipe", team: "equipe",
                  contact: "partenaires", partners: "partenaires" };
  var TITLES = { fr: "ATI-Normandy", en: "ATI-Normandy" };
  var current = null;
  var narrowNav = window.matchMedia("(max-width: 1060px)");

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
  }

  /* ---- "Research programme" drop-down ---- */
  var dd = document.querySelector(".dd");
  var ddBtn = dd ? dd.querySelector(".dd-btn") : null;
  function closeDropdown() { if (!dd) return; dd.classList.remove("open"); ddBtn.setAttribute("aria-expanded", narrowNav.matches ? "true" : "false"); }
  if (dd && ddBtn) {
    ddBtn.addEventListener("click", function (e) {
      if (narrowNav.matches) return;               /* in the phone menu the sub-pages are always listed */
      e.stopPropagation();
      var open = dd.classList.toggle("open");
      ddBtn.setAttribute("aria-expanded", String(open));
      if (open) { var first = dd.querySelector(".dd-menu a"); if (first && e.detail === 0) first.focus(); }
    });
    dd.addEventListener("click", function (e) { if (e.target.closest(".dd-menu a")) closeDropdown(); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".dd")) closeDropdown(); });
    var syncNav = function () { closeDropdown(); };
    if (narrowNav.addEventListener) narrowNav.addEventListener("change", syncNav);
    syncNav();
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (dd && dd.classList.contains("open")) { closeDropdown(); ddBtn.focus(); }
    closeMenu();
  });

  /* ---- Interactive maps (loaded the first time the page is opened) ---- */
  var carto = document.getElementById("cartographie");
  var frame = document.getElementById("map-frame");
  var full = document.getElementById("map-full");
  var mapButtons = carto ? carto.querySelectorAll("[data-map]") : [];
  var base = carto ? (carto.getAttribute("data-map-base") || "") : "";
  function showMap(slug, fromUser) {
    if (!frame || !mapButtons.length) return;
    var chosen = carto.querySelector('[data-map="' + slug + '"]') || mapButtons[0];
    Array.prototype.forEach.call(mapButtons, function (b) { b.setAttribute("aria-pressed", String(b === chosen)); });
    var url = base + (chosen.getAttribute("data-file") || "");
    if (full) full.href = url;
    if (current === "cartographie" && frame.getAttribute("src") !== url) frame.setAttribute("src", url);
    else frame.setAttribute("data-src", url);
    if (fromUser) {
      try {
        var u = new URL(location.href);
        if (chosen === mapButtons[0]) u.searchParams.delete("carte"); else u.searchParams.set("carte", chosen.getAttribute("data-map"));
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

  /* ---- Slide viewer (desktop only; phones get the buttons) ---- */
  function loadPdfViewer() {
    var pdf = document.getElementById("pdf-frame");
    if (!pdf || pdf.getAttribute("src")) return;
    if (window.matchMedia("(max-width: 760px)").matches) return;
    pdf.setAttribute("src", pdf.getAttribute("data-src"));
  }

  /* ---- Page switching ---- */
  function pageFromHash() {
    var h = decodeURIComponent((location.hash || "").replace(/^#/, "")).toLowerCase();
    if (PAGES.indexOf(h) > -1) return h;
    var key = h.normalize ? h.normalize("NFD").replace(/[̀-ͯ]/g, "") : h;
    key = key.replace(/['’]/g, "");
    return ALIASES[h] || ALIASES[key] || "le-projet";
  }
  function showPage(scrollTop) {
    var page = pageFromHash();
    current = page;
    PAGES.forEach(function (id) { var s = document.getElementById(id); if (s) s.hidden = id !== page; });
    each("#tabs a[data-page]", function (a) { if (a.getAttribute("data-page") === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (ddBtn) ddBtn.classList.toggle("is-current", PROGRAMME.indexOf(page) > -1);
    if (page === "cartographie" && frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
    if (page === "presentations") loadPdfViewer();
    if (page === "equipe") initLabsMap();
    if (page === "le-projet") fitPlate();
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
