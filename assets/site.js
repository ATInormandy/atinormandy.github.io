/* ATI-Normandy — page switching, drop-down menus ("The project", "Research programme"),
   language switch, mobile menu, map selector, team map, slide viewer, the lists read from data/*.json
   (timeline, Datum, publications, presentations) and sizing of the Normandy map. */
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
  var pdfFrame = document.getElementById("pdf-frame");
  var pdfView = pdfFrame ? pdfFrame.closest(".pdf-view") : null;
  function loadPdfViewer() {
    if (!pdfFrame || pdfFrame.getAttribute("src") || !pdfFrame.getAttribute("data-src")) return;
    if (window.matchMedia("(max-width: 760px)").matches) return;
    pdfFrame.setAttribute("src", pdfFrame.getAttribute("data-src"));
  }
  function showPdf(url, title) {
    if (!pdfFrame) return;
    var src = url + "#view=FitH";
    pdfFrame.setAttribute("data-src", src);
    pdfFrame.setAttribute("title", title + " (PDF)");
    if (pdfFrame.getAttribute("src")) pdfFrame.setAttribute("src", src);
    else if (current === "publications") loadPdfViewer();
    each("[data-show-pdf]", function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-show-pdf") === url)); });
  }

  /* ---- Lists kept in data/*.json: timeline, Datum, publications, presentations ----
     They are edited in Pages CMS (see .pages.yml). Each file holds {"items": [...]}.
     Text comes in pairs (…_fr, …_en); when one of the two is empty, the other is shown in both languages. */
  var MONTHS = {
    fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  var CATEGORIES = {               /* Datum categories: the values offered in .pages.yml */
    "risques-naturels": ["Risques naturels", "Natural hazards"],
    "geographie": ["Géographie et réseau routier", "Geography and road network"],
    "transport": ["Transport", "Transport"],
    "insee": ["INSEE", "INSEE"],
    "evaluation-economique": ["Évaluation économique", "Economic appraisal"],
    "autre": ["Autre", "Other"]
  };
  var PUB_TYPES = ["article", "preprint", "communication"];
  var MSG = {
    error: ["Le contenu n'a pas pu être chargé. Rechargez la page.", "The content could not be loaded. Reload the page."],
    timeline: ["Aucun événement pour le moment.", "No events yet."],
    datum: ["Aucune source de données pour le moment.", "No data sources yet."],
    pubs: ["Aucune publication pour le moment.", "No publications yet."],
    talks: ["Aucune présentation pour le moment.", "No presentations yet."],
    upcoming: ["à venir", "upcoming"]
  };

  function str(v) { return v == null ? "" : String(v).trim(); }
  function pair(fr, en) { fr = str(fr); en = str(en); return { fr: fr || en, en: en || fr }; }
  function make(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  /* Bilingual text: one node when both languages read the same, otherwise a French node and an English node. */
  function addText(parent, p, tag) {
    if (!p.fr) return;
    if (p.fr === p.en) { var one = make(tag || "span"); one.textContent = p.fr; parent.appendChild(one); return; }
    ["fr", "en"].forEach(function (l) { var n = make(tag || "span"); n.lang = l; n.textContent = p[l]; parent.appendChild(n); });
  }
  function safeUrl(u) {
    u = str(u);
    return (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^(https?|mailto):/i.test(u)) ? "" : u;
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str(s));
    if (!m || +m[2] < 1 || +m[2] > 12) return null;
    return { y: +m[1], m: +m[2], d: +m[3], key: +m[1] * 10000 + +m[2] * 100 + +m[3] };
  }
  var NB = " ";               /* dates never break across lines */
  function dayLabel(d, lang) { return lang === "fr" && d.d === 1 ? "1er" : String(d.d); }
  function fmtDate(d, lang) { return dayLabel(d, lang) + NB + MONTHS[lang][d.m - 1] + NB + d.y; }
  function fmtRange(a, b, lang) {
    if (!b || b.key <= a.key) return fmtDate(a, lang);
    if (a.y === b.y && a.m === b.m) return dayLabel(a, lang) + "–" + dayLabel(b, lang) + NB + MONTHS[lang][a.m - 1] + NB + a.y;
    if (a.y === b.y) return dayLabel(a, lang) + NB + MONTHS[lang][a.m - 1] + " – " + fmtDate(b, lang);
    return fmtDate(a, lang) + " – " + fmtDate(b, lang);
  }
  function setStatus(id, msg) {
    var s = document.getElementById(id);
    if (!s) return;
    s.textContent = "";
    s.hidden = !msg;
    if (msg) addText(s, pair(msg[0], msg[1]));
  }
  function loadList(url) {
    return fetch(url, { cache: "no-cache" })                 /* always ask the server, so edits show at once */
      .then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); })
      .then(function (data) { return Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []); });
  }

  function renderTimeline(items) {
    var list = document.getElementById("timeline-list");
    if (!list) return;
    var t = new Date(), today = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
    var rows = items.map(function (it, i) { return { it: it, i: i, a: parseDate(it.date), b: parseDate(it.end_date) }; })
      .filter(function (r) { return r.a && pair(r.it.title_fr, r.it.title_en).fr; })
      .sort(function (x, y) { return (x.a.key - y.a.key) || (x.i - y.i); });   /* oldest first */
    list.textContent = "";
    rows.forEach(function (r) {
      var li = make("li", (r.b && r.b.key > r.a.key ? r.b : r.a).key >= today ? "is-upcoming" : "");
      var date = make("p", "tl-date");
      addText(date, { fr: fmtRange(r.a, r.b, "fr"), en: fmtRange(r.a, r.b, "en") });
      if (li.className) { var up = make("span", "status"); addText(up, pair(MSG.upcoming[0], MSG.upcoming[1])); date.appendChild(up); }
      var body = make("div", "tl-body");
      var h = make("h3");
      addText(h, pair(r.it.title_fr, r.it.title_en));
      body.appendChild(h);
      var text = pair(r.it.text_fr, r.it.text_en), link = safeUrl(r.it.link), label = pair(r.it.link_label_fr, r.it.link_label_en);
      if (link && !label.fr) label = { fr: "En savoir plus", en: "More" };
      if (text.fr || link) {
        var same = text.fr === text.en && label.fr === label.en;
        (same ? ["fr"] : ["fr", "en"]).forEach(function (l) {
          var p = make("p");
          if (!same) p.lang = l;
          if (text[l]) p.appendChild(document.createTextNode(text[l] + (link ? " " : "")));
          if (link) { var a = make("a"); a.href = link; a.textContent = label[l]; p.appendChild(a); }
          body.appendChild(p);
        });
      }
      li.appendChild(date);
      li.appendChild(body);
      list.appendChild(li);
    });
    setStatus("timeline-status", rows.length ? null : MSG.timeline);
  }

  function renderDatum(items) {
    var list = document.getElementById("datum-list");
    if (!list) return;
    list.textContent = "";
    items.forEach(function (it) {
      var title = pair(it.title, it.title_en);
      if (!title.fr) return;
      var li = make("li");
      var key = str(it.category), cat = CATEGORIES[key] || [key, key];
      if (cat[0]) { var c = make("p", "dl-cat"); addText(c, pair(cat[0], cat[1])); li.appendChild(c); }
      var h = make("h4"), url = safeUrl(it.url);
      if (url) { var a = make("a"); a.href = url; addText(a, title); h.appendChild(a); } else addText(h, title);
      li.appendChild(h);
      addText(li, pair(it.description_fr, it.description_en), "p");
      list.appendChild(li);
    });
    setStatus("datum-status", list.children.length ? null : MSG.datum);
  }

  function yearOf(it) { var m = /\d{4}/.exec(str(it.year)); return m ? +m[0] : 0; }
  function refItem(it) {
    var li = make("li");
    var title = str(it.title), head = [str(it.authors), str(it.year)].filter(Boolean).join(", ");
    if (head) li.appendChild(document.createTextNode(head + ". "));
    var url = safeUrl(it.url);
    if (url) { var a = make("a"); a.href = url; a.textContent = title; li.appendChild(a); }
    else li.appendChild(document.createTextNode(title));
    var venue = pair(it.venue_fr, it.venue_en);
    if (!/[.?!]$/.test(title)) li.appendChild(document.createTextNode("."));
    if (venue.fr) {
      var em = make("em"), vurl = safeUrl(it.venue_url), into = em;
      if (vurl) { into = make("a"); into.href = vurl; em.appendChild(into); }
      addText(into, venue);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(em);
      if (!/[.?!]$/.test(venue.fr)) li.appendChild(document.createTextNode("."));
    }
    return li;
  }
  function renderPublications(items) {
    var groups = {}, total = 0;
    PUB_TYPES.forEach(function (t) { groups[t] = []; });
    items.forEach(function (it, i) {
      if (!str(it.title)) return;
      groups[groups[str(it.type)] ? str(it.type) : "communication"].push({ it: it, i: i });
    });
    PUB_TYPES.forEach(function (t) {
      var card = document.querySelector('[data-pub-type="' + t + '"]');
      if (!card) return;
      var ul = card.querySelector(".refs");
      ul.textContent = "";
      groups[t].sort(function (a, b) { return (yearOf(b.it) - yearOf(a.it)) || (a.i - b.i); });   /* newest first */
      groups[t].forEach(function (g) { ul.appendChild(refItem(g.it)); });
      card.hidden = !groups[t].length;
      total += groups[t].length;
    });
    setStatus("pubs-status", total ? null : MSG.pubs);
  }

  function fmtSize(bytes, lang) {
    var mb = bytes / 1e6;
    if (mb >= 1) { var v = mb.toFixed(1); return lang === "fr" ? v.replace(".", ",") + " Mo" : v + " MB"; }
    return Math.max(1, Math.round(bytes / 1e3)) + (lang === "fr" ? " ko" : " KB");
  }
  function fileSize(url, done) {
    fetch(url, { method: "HEAD", cache: "no-cache" })
      .then(function (r) { var n = +(r.headers.get("content-length") || 0); if (r.ok && n > 0) done(n); })
      .catch(function () { /* size left out */ });
  }
  function renderTalks(items) {
    var box = document.getElementById("talks");
    if (!box) return;
    var talks = items.map(function (it, i) { return { it: it, i: i, d: parseDate(it.date) }; })
      .filter(function (t) { return str(t.it.title) && safeUrl(t.it.pdf); })
      .sort(function (a, b) { return ((b.d ? b.d.key : 0) - (a.d ? a.d.key : 0)) || (a.i - b.i); });   /* newest first */
    box.textContent = "";
    talks.forEach(function (t) {
      var it = t.it, pdf = safeUrl(it.pdf), cover = safeUrl(it.cover), title = str(it.title), authors = str(it.authors);
      var art = make("article", cover ? "talk" : "talk no-cover");
      if (cover) {
        var ca = make("a", "talk-cover");
        ca.href = pdf; ca.target = "_blank"; ca.rel = "noopener";
        var img = make("img"); img.src = cover; img.alt = ""; img.loading = "lazy";
        ca.appendChild(img);
        var cvh = make("span", "vh"); addText(cvh, { fr: "Ouvrir le PDF (nouvel onglet)", en: "Open the PDF (new tab)" }); ca.appendChild(cvh);
        art.appendChild(ca);
      }
      var tx = make("div", "talk-text");
      var h = make("h4"); h.textContent = title; tx.appendChild(h);
      if (authors || t.d) {
        var meta = make("p", "talk-meta");
        addText(meta, {
          fr: [authors, t.d ? fmtDate(t.d, "fr") : ""].filter(Boolean).join(", "),
          en: [authors, t.d ? fmtDate(t.d, "en") : ""].filter(Boolean).join(", ")
        });
        tx.appendChild(meta);
      }
      addText(tx, pair(it.description_fr, it.description_en), "p");
      var act = make("p", "talk-actions");
      var open = make("a", "btn");
      open.href = pdf; open.target = "_blank"; open.rel = "noopener";
      addText(open, { fr: "Ouvrir le PDF", en: "Open the PDF" });
      var ovh = make("span", "vh"); addText(ovh, { fr: " (nouvel onglet)", en: " (new tab)" }); open.appendChild(ovh);
      act.appendChild(open);
      var dl = make("a", "btn btn-quiet");
      dl.href = pdf; dl.setAttribute("download", "");
      addText(dl, { fr: "Télécharger (PDF)", en: "Download (PDF)" });
      act.appendChild(dl);
      fileSize(pdf, function (n) { dl.textContent = ""; addText(dl, { fr: "Télécharger (PDF, " + fmtSize(n, "fr") + ")", en: "Download (PDF, " + fmtSize(n, "en") + ")" }); });
      if (talks.length > 1 && pdfFrame) {
        var show = make("button", "btn btn-quiet talk-show");
        show.type = "button";
        show.setAttribute("data-show-pdf", pdf);
        show.setAttribute("aria-pressed", "false");
        addText(show, { fr: "Afficher ci-dessous", en: "Show below" });
        show.addEventListener("click", function () { showPdf(pdf, title); if (pdfView) pdfView.scrollIntoView({ block: "start" }); });
        act.appendChild(show);
      }
      tx.appendChild(act);
      art.appendChild(tx);
      box.appendChild(art);
    });
    if (pdfView) pdfView.hidden = !talks.length;
    if (talks.length) showPdf(safeUrl(talks[0].it.pdf), str(talks[0].it.title));
    setStatus("talks-status", talks.length ? null : MSG.talks);
  }

  /* Each page loads its lists the first time it is opened. */
  var DATA = {
    timeline: [["data/timeline.json", renderTimeline, "timeline-status"]],
    "phase-1": [["data/datum.json", renderDatum, "datum-status"]],
    publications: [["data/publications.json", renderPublications, "pubs-status"],
                   ["data/presentations.json", renderTalks, "talks-status"]]
  };
  var requested = {};
  var pendingPart = null;          /* part of a page to scroll back to once its lists have loaded (#datum, #presentations) */
  ["wheel", "touchmove", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function () { pendingPart = null; }, { passive: true }); });
  function ensureData(page) {
    (DATA[page] || []).forEach(function (d) {
      if (requested[d[0]]) return;
      requested[d[0]] = true;
      loadList(d[0])
        .then(function (items) { d[1](items); if (pendingPart && route().part === pendingPart) scrollToPart(pendingPart); })
        .catch(function () { requested[d[0]] = false; setStatus(d[2], MSG.error); });
    });
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
    pendingPart = r.part;
    ensureData(r.page);
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
