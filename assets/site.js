/* ATI-Normandy — page switching, drop-down menus ("The project", "Research programme"),
   language switch, mobile menu, map selector, team map, slide viewer and sizing of the Normandy map. */
(function () {
  "use strict";
  var root = document.documentElement;
  var PAGES = ["sujet", "partenaires", "equipe", "timeline", "rejoindre", "cartographie",
               "phase-1", "phase-2", "phase-3", "publications", "contact"];
  /* Other names that lead to a page: older addresses of this site and of ati-normandy.fr, English words.
     "page#part" opens the page and scrolls to that part of it. */
  var ALIASES = {
    "": "sujet", accueil: "sujet", home: "sujet", projet: "sujet", project: "sujet", "le-projet": "sujet",
    "the-project": "sujet", subject: "sujet", "sujet-de-letude": "sujet",
    partners: "partenaires", partenaire: "partenaires",
    lequipe: "equipe", team: "equipe", researchers: "equipe", members: "equipe",
    chronologie: "timeline", agenda: "timeline", events: "timeline", evenements: "timeline",
    join: "rejoindre", "join-us": "rejoindre", "nous-rejoindre": "rejoindre", recrutement: "rejoindre", jobs: "rejoindre",
    maps: "cartographie", carte: "cartographie", cartes: "cartographie", "iterative-maps": "cartographie", "cartes-iteratives": "cartographie",
    programme: "phase-1", "research-programme": "phase-1", "programme-de-recherche": "phase-1", overview: "phase-1",
    phase1: "phase-1", phase2: "phase-2", phase3: "phase-3", wp1: "phase-1", wp2: "phase-2", wp3: "phase-3",
    datum: "phase-1#datum", data: "phase-1#datum", donnees: "phase-1#datum",
    presentations: "publications#presentations", presentation: "publications#presentations", slides: "publications#presentations",
    preprints: "publications", communications: "publications"
  };
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

  /* ---- Drop-down menus in the navbar ---- */
  var dds = Array.prototype.slice.call(document.querySelectorAll(".dd"));
  dds.forEach(function (d) {
    d.btn = d.querySelector(".dd-btn");
    d.links = Array.prototype.slice.call(d.querySelectorAll(".dd-menu a"));
    d.pages = d.links.map(function (a) { return a.getAttribute("data-page"); });
  });
  function closeDropdowns(except) {
    dds.forEach(function (d) {
      if (d === except) return;
      d.classList.remove("open");
      d.btn.setAttribute("aria-expanded", narrowNav.matches ? "true" : "false");   /* phone menu: sub-pages always listed */
    });
  }
  dds.forEach(function (d) {
    d.btn.addEventListener("click", function (e) {
      if (narrowNav.matches) return;
      e.stopPropagation();
      closeDropdowns(d);
      var open = d.classList.toggle("open");
      d.btn.setAttribute("aria-expanded", String(open));
      if (open && e.detail === 0 && d.links[0]) d.links[0].focus();          /* opened with the keyboard */
    });
    d.addEventListener("click", function (e) { if (e.target.closest(".dd-menu a")) closeDropdowns(); });
    d.addEventListener("keydown", function (e) {
      if (narrowNav.matches || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      if (!d.classList.contains("open")) { if (e.target === d.btn) { d.btn.click(); e.preventDefault(); } return; }
      var i = d.links.indexOf(document.activeElement);
      var n = d.links.length;
      var next = e.key === "ArrowDown" ? (i + 1) % n : (i < 0 ? n - 1 : (i - 1 + n) % n);
      d.links[next].focus();
      e.preventDefault();
    });
    d.addEventListener("focusout", function (e) { if (e.relatedTarget && !d.contains(e.relatedTarget)) closeDropdowns(); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".dd")) closeDropdowns(); });
  if (narrowNav.addEventListener) narrowNav.addEventListener("change", function () { closeDropdowns(); });
  closeDropdowns();
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    dds.forEach(function (d) { if (d.classList.contains("open")) { closeDropdowns(); d.btn.focus(); } });
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
  function route() {
    var h = (location.hash || "").replace(/^#/, "");
    try { h = decodeURIComponent(h); } catch (e) { }
    h = h.toLowerCase();
    if (PAGES.indexOf(h) > -1) return { page: h, part: null };
    var key = h.normalize ? h.normalize("NFD").replace(/[̀-ͯ]/g, "") : h;
    key = key.replace(/['’]/g, "").replace(/[\s_]+/g, "-");
    var target = ALIASES[h] || ALIASES[key];
    if (!target) {                                   /* a part of a page, e.g. #datum */
      var el = h && document.getElementById(h);
      var sec = el && el.closest ? el.closest("section.page") : null;
      target = sec ? sec.id + "#" + h : "sujet";
    }
    var bits = target.split("#");
    return { page: bits[0], part: bits[1] || null };
  }
  function scrollToPart(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  }
  function showPage(scrollTop) {
    var r = route();
    current = r.page;
    PAGES.forEach(function (id) { var s = document.getElementById(id); if (s) s.hidden = id !== r.page; });
    each("#tabs a[data-page]", function (a) { if (a.getAttribute("data-page") === r.page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    dds.forEach(function (d) { d.btn.classList.toggle("is-current", d.pages.indexOf(r.page) > -1); });
    if (r.page === "cartographie" && frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
    if (r.page === "publications") loadPdfViewer();
    if (r.page === "equipe") initLabsMap();
    if (r.page === "sujet") fitPlate();
    if (r.part) {
      scrollToPart(r.part);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (route().part === r.part) scrollToPart(r.part); });
    } else if (scrollTop) window.scrollTo(0, 0);
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
