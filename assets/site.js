/* ATI-Normandy — page switching; menus (a menu name opens its page, the arrow next to it or hovering with
   a mouse opens its drop-down list); language switch; mobile menu; map selector; team map; the lists read
   from data/*.json (timeline, Datum, publications, presentations); sizing of the Normandy map. */
(function () {
  "use strict";
  var root = document.documentElement;
  var PAGES = ["sujet", "partenaires", "equipe", "timeline", "rejoindre", "cartographie",
               "programme", "phase-1", "phase-2", "phase-3", "presentations", "presentation", "publications", "contact"];
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
    "research-programme": "programme", "programme-de-recherche": "programme", overview: "programme", phases: "programme",
    phase1: "phase-1", phase2: "phase-2", phase3: "phase-3", wp1: "phase-1", wp2: "phase-2", wp3: "phase-3",
    datum: "phase-1#datum", data: "phase-1#datum", donnees: "phase-1#datum",
    slides: "presentations", talks: "presentations",
    preprints: "publications", communications: "publications"
  };
  var current = null;
  var pageTitle = "";
  var narrowNav = window.matchMedia("(max-width: 1060px)");

  function each(sel, fn, scope) { Array.prototype.forEach.call((scope || document).querySelectorAll(sel), fn); }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } }
  function updateTitle() { document.title = pageTitle ? pageTitle + " | ATI-Normandy" : "ATI-Normandy"; }

  /* ---- Language ---- */
  function setLang(lang, fromUser) {
    if (lang !== "fr" && lang !== "en") lang = "fr";
    root.setAttribute("data-lang", lang);
    root.lang = lang;
    updateTitle();
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
  var masthead = document.querySelector(".masthead");
  var navCurrent = document.querySelector(".nav-current");
  function closeMenu() { if (tabs) tabs.classList.remove("open"); if (menuBtn) menuBtn.setAttribute("aria-expanded", "false"); }
  if (menuBtn && tabs) {
    menuBtn.addEventListener("click", function () {
      var open = tabs.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
      /* bring the menu bar to the top of the screen so that the whole list fits below it */
      if (open && masthead && window.scrollY < masthead.offsetHeight) window.scrollTo(0, masthead.offsetHeight);
    });
    tabs.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
  }

  /* ---- Drop-down menus: the name is a link, the arrow (.dd-toggle) opens the list ---- */
  var dds = Array.prototype.slice.call(document.querySelectorAll(".dd")).filter(function (d) { return d.querySelector(".dd-toggle"); });
  dds.forEach(function (d) {
    d.toggle = d.querySelector(".dd-toggle");
    d.pages = (d.getAttribute("data-pages") || "").split(/\s+/);
  });
  function ddLinks(d) { return Array.prototype.slice.call(d.querySelectorAll(".dd-menu a")); }
  function setOpen(d, open) { d.classList.toggle("open", open); d.toggle.setAttribute("aria-expanded", String(open)); }
  function closeDropdowns(except) { dds.forEach(function (d) { if (d !== except) setOpen(d, false); }); }
  dds.forEach(function (d) {
    d.toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      closeDropdowns(d);
      setOpen(d, !d.classList.contains("open"));
      var links = ddLinks(d);
      if (d.classList.contains("open") && e.detail === 0 && links[0]) links[0].focus();     /* opened with the keyboard */
    });
    d.addEventListener("click", function (e) { if (e.target.closest(".dd-menu a")) closeDropdowns(); });
    d.addEventListener("keydown", function (e) {
      if (narrowNav.matches || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      var links = ddLinks(d);
      if (!links.length) return;
      if (!d.classList.contains("open")) {
        if (e.target === d.toggle || e.target.classList.contains("dd-link")) { closeDropdowns(d); setOpen(d, true); links[0].focus(); e.preventDefault(); }
        return;
      }
      var i = links.indexOf(document.activeElement), n = links.length;
      links[e.key === "ArrowDown" ? (i + 1) % n : (i < 0 ? n - 1 : (i - 1 + n) % n)].focus();
      e.preventDefault();
    });
    d.addEventListener("focusout", function (e) { if (e.relatedTarget && !d.contains(e.relatedTarget)) setOpen(d, false); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".dd")) closeDropdowns(); });
  if (narrowNav.addEventListener) narrowNav.addEventListener("change", function () { closeDropdowns(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    dds.forEach(function (d) { if (d.classList.contains("open")) { closeDropdowns(); d.toggle.focus(); } });
    closeMenu();
  });

  /* ---- Interactive maps (loaded the first time the page is opened) ---- */
  var carto = document.getElementById("page-cartographie");
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
    noTalk: ["Cette présentation n'existe pas ou a changé d'adresse.", "This presentation does not exist or has moved."],
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
  function slugify(s) {
    s = str(s);
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  /* Rich text written in Pages CMS (presentation pages): only plain formatting, links and images are kept. */
  var KEEP = { P: 1, BR: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, A: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1,
               FIGURE: 1, FIGCAPTION: 1, IMG: 1, SUP: 1, SUB: 1, HR: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1, CODE: 1 };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, NOSCRIPT: 1, FORM: 1, INPUT: 1, BUTTON: 1,
               TEXTAREA: 1, SELECT: 1, LINK: 1, META: 1, BASE: 1, SVG: 1, MATH: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1 };
  function cleanHtml(html) {
    var doc = new DOMParser().parseFromString("<body>" + str(html) + "</body>", "text/html");
    var out = document.createDocumentFragment();
    (function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1 || DROP[n.tagName]) return;
        if (!KEEP[n.tagName]) { walk(n, dst); return; }            /* other tags: keep what is inside */
        var e = document.createElement(n.tagName.toLowerCase());
        if (n.tagName === "A") {
          var href = safeUrl(n.getAttribute("href"));
          if (href) e.setAttribute("href", href);
          if (/^https?:/i.test(href)) { e.target = "_blank"; e.rel = "noopener"; }
        } else if (n.tagName === "IMG") {
          var src2 = safeUrl(n.getAttribute("src"));
          if (!src2) return;
          e.setAttribute("src", src2);
          e.setAttribute("alt", n.getAttribute("alt") || "");
          e.setAttribute("loading", "lazy");
        } else if (n.tagName === "TD" || n.tagName === "TH") {
          ["colspan", "rowspan"].forEach(function (k) { var v = n.getAttribute(k); if (/^\d+$/.test(v || "")) e.setAttribute(k, v); });
        }
        walk(n, e);
        dst.appendChild(e);
      });
    })(doc.body, out);
    return out;
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

  /* ---- Presentations: menu list, overview page (#presentations) and one page each (#presentations/<name>-<date>) ---- */
  var presList = null, presPromise = null;
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
  function loadPresentations() {
    if (!presPromise) {
      presPromise = loadList("data/presentations.json").then(function (items) {
        var seen = {};
        presList = items.filter(function (it) { return str(it.title); }).map(function (it) {   /* the order of the form */
          var base = [slugify(it.author || it.title).slice(0, 48), str(it.date)].filter(Boolean).join("-") || "presentation";
          var slug = base, k = 2;
          while (seen[slug]) slug = base + "-" + k++;
          seen[slug] = true;
          return { it: it, slug: slug, d: parseDate(it.date) };
        });
        renderPresMenu();
        return presList;
      });
      presPromise.catch(function () { presPromise = null; });
    }
    return presPromise;
  }
  function presWho(p) { return [str(p.it.author), str(p.it.affiliation)].filter(Boolean).join(", "); }
  function presWhen(p) {
    function one(lang) { return [pair(p.it.event_fr, p.it.event_en)[lang], p.d ? fmtDate(p.d, lang) : ""].filter(Boolean).join(", "); }
    return { fr: one("fr"), en: one("en") };
  }
  function renderPresMenu() {
    var menu = document.getElementById("dd-presentations");
    if (!menu) return;
    menu.textContent = "";
    presList.forEach(function (p) {
      var a = make("a");
      a.href = "#presentations/" + p.slug;
      a.setAttribute("data-slug", p.slug);
      var k = make("span", "dd-kicker"); k.textContent = str(p.it.author); a.appendChild(k);
      var t = make("span", "dd-title"); t.textContent = str(p.it.title); a.appendChild(t);
      menu.appendChild(a);
    });
    var dd = menu.closest(".dd");
    if (dd) dd.classList.toggle("is-empty", !presList.length);
    markCurrent(route());
  }
  function renderPresList() {
    var ol = document.getElementById("pres-list");
    if (!ol) return;
    ol.textContent = "";
    presList.forEach(function (p) {
      var li = make("li");
      var who = make("p", "pres-who"); who.textContent = presWho(p); li.appendChild(who);
      var h = make("h3"), a = make("a");
      a.href = "#presentations/" + p.slug; a.textContent = str(p.it.title);
      h.appendChild(a); li.appendChild(h);
      var when = make("p", "pres-when"); addText(when, presWhen(p)); if (when.firstChild) li.appendChild(when);
      var sum = make("div", "pres-sum"); addText(sum, pair(p.it.summary_fr, p.it.summary_en), "p"); if (sum.firstChild) li.appendChild(sum);
      var more = make("a", "pres-more"); more.href = "#presentations/" + p.slug;
      addText(more, { fr: "Lire la présentation", en: "Read the presentation" });
      var mp = make("p"); mp.appendChild(more); li.appendChild(mp);
      ol.appendChild(li);
    });
    setStatus("pres-status", presList.length ? null : MSG.talks);
  }
  function renderPresPage(slug) {
    var art = document.getElementById("pres-article");
    if (!art) return;
    var p = presList.filter(function (x) { return x.slug === slug; })[0];
    art.textContent = "";
    var crumb = make("p", "card-title pres-crumb"), back = make("a");
    back.href = "#presentations"; addText(back, { fr: "Présentations", en: "Presentations" });
    crumb.appendChild(back);
    art.appendChild(crumb);
    var body = make("div", "pres-article");
    art.appendChild(body);
    if (!p) {
      var nf = make("p", "data-status"); addText(nf, pair(MSG.noTalk[0], MSG.noTalk[1])); body.appendChild(nf);
      pageTitle = ""; updateTitle();
      return;
    }
    var who = make("p", "pres-who"); who.textContent = presWho(p); body.appendChild(who);
    var h = make("h2"); h.id = "t-presentation"; h.textContent = str(p.it.title); body.appendChild(h);
    var when = make("p", "pres-when"); addText(when, presWhen(p)); if (when.firstChild) body.appendChild(when);
    var bfr = str(p.it.body_fr), ben = str(p.it.body_en);
    if (bfr || ben) {
      if (!bfr || !ben || bfr === ben) { var one = make("div", "pres-body"); one.appendChild(cleanHtml(bfr || ben)); body.appendChild(one); }
      else {
        var dfr = make("div", "pres-body"); dfr.lang = "fr"; dfr.appendChild(cleanHtml(bfr)); body.appendChild(dfr);
        var den = make("div", "pres-body"); den.lang = "en"; den.appendChild(cleanHtml(ben)); body.appendChild(den);
      }
    } else {
      var sum = make("div", "pres-body"); addText(sum, pair(p.it.summary_fr, p.it.summary_en), "p"); body.appendChild(sum);
    }
    each(".pres-body img", function (img) {                      /* a figure opens at full size */
      if (img.closest("a")) return;
      var a = make("a", "fig-link"); a.href = img.getAttribute("src"); a.target = "_blank"; a.rel = "noopener";
      img.parentNode.insertBefore(a, img); a.appendChild(img);
    }, body);
    var foot = make("p", "pres-foot"), pdf = safeUrl(p.it.pdf);
    if (pdf) {
      var dl = make("a", "btn btn-quiet"); dl.href = pdf; dl.target = "_blank"; dl.rel = "noopener";
      addText(dl, { fr: "Diapositives (PDF)", en: "Slides (PDF)" });
      fileSize(pdf, function (n) { dl.textContent = ""; addText(dl, { fr: "Diapositives (PDF, " + fmtSize(n, "fr") + ")", en: "Slides (PDF, " + fmtSize(n, "en") + ")" }); });
      foot.appendChild(dl);
    }
    var all = make("a"); all.href = "#presentations"; addText(all, { fr: "Toutes les présentations", en: "All presentations" });
    foot.appendChild(all);
    body.appendChild(foot);
    pageTitle = str(p.it.title); updateTitle();
  }

  /* Each page loads its lists the first time it is opened. */
  var DATA = {
    timeline: [["data/timeline.json", renderTimeline, "timeline-status"]],
    "phase-1": [["data/datum.json", renderDatum, "datum-status"]],
    publications: [["data/publications.json", renderPublications, "pubs-status"]]
  };
  var requested = {};
  var pendingPart = null;          /* part of a page to scroll back to once its lists have loaded (#datum) */
  ["wheel", "touchmove", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function () { pendingPart = null; }, { passive: true }); });
  function ensureData(r) {
    if (r.page === "presentations" || r.page === "presentation") {
      loadPresentations().then(function () {
        var now = route();
        if (now.page === "presentations") renderPresList();
        else if (now.page === "presentation") renderPresPage(now.param);
      }).catch(function () { setStatus(r.page === "presentations" ? "pres-status" : "pres-page-status", MSG.error); });
    }
    (DATA[r.page] || []).forEach(function (d) {
      if (requested[d[0]]) return;
      requested[d[0]] = true;
      loadList(d[0])
        .then(function (items) { d[1](items); if (pendingPart && route().part === pendingPart) scrollToPart(pendingPart); })
        .catch(function () { requested[d[0]] = false; setStatus(d[2], MSG.error); });
    });
  }

  /* ---- Page switching ----
     The address #name shows <section id="page-name">. Sections do not carry the bare name, so the browser
     does not scroll to them (past the title band) when the address changes. */
  function route() {
    var h = (location.hash || "").replace(/^#/, "");
    try { h = decodeURIComponent(h); } catch (e) { }
    h = h.toLowerCase();
    var m = /^presentations?\/(.+)$/.exec(h);
    if (m) return { page: "presentation", part: null, param: m[1] };
    if (h === "presentation") return { page: "presentations", part: null, param: null };
    if (PAGES.indexOf(h) > -1) return { page: h, part: null, param: null };
    var key = h.normalize ? h.normalize("NFD").replace(/[̀-ͯ]/g, "") : h;
    key = key.replace(/['’]/g, "").replace(/[\s_]+/g, "-");
    var target = ALIASES[h] || ALIASES[key];
    if (!target) {                                   /* a part of a page, e.g. #datum */
      var el = h && document.getElementById(h);
      var sec = el && el.closest ? el.closest("section.page") : null;
      target = sec ? sec.id.replace(/^page-/, "") + "#" + h : "sujet";
    }
    var bits = target.split("#");
    return { page: bits[0], part: bits[1] || null, param: null };
  }
  function scrollToPart(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  }
  function setNavCurrent(page) {                     /* name of the open page in the phone menu bar */
    if (!navCurrent) return;
    navCurrent.textContent = "";
    var a = page === "presentation" ? null
      : (document.querySelector('#tabs .dd-menu a[data-page="' + page + '"]') || document.querySelector('#tabs a[data-page="' + page + '"]'));
    if (!a) { var g = dds.filter(function (d) { return d.pages.indexOf(page) > -1; })[0]; a = g ? g.querySelector(".dd-link") : null; }
    if (!a) return;
    var k = a.querySelector(".dd-kicker");
    if (k) { navCurrent.textContent = k.textContent; return; }
    Array.prototype.forEach.call(a.children, function (n) { if (n.tagName === "SPAN" && !n.classList.contains("vh")) navCurrent.appendChild(n.cloneNode(true)); });
  }
  function markCurrent(r) {
    each("#tabs a[data-page]", function (a) { if (a.getAttribute("data-page") === r.page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    each("#tabs a[data-slug]", function (a) { if (r.page === "presentation" && a.getAttribute("data-slug") === r.param) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    dds.forEach(function (d) { d.classList.toggle("is-current", d.pages.indexOf(r.page) > -1); });
    setNavCurrent(r.page);
  }
  function showPage(scrollTop) {
    var r = route();
    current = r.page;
    PAGES.forEach(function (id) { var s = document.getElementById("page-" + id); if (s) s.hidden = id !== r.page; });
    markCurrent(r);
    pageTitle = "";
    updateTitle();
    if (r.page === "cartographie" && frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
    if (r.page === "equipe") initLabsMap();
    if (r.page === "sujet") fitPlate();
    pendingPart = r.part;
    ensureData(r);
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
  loadPresentations().catch(function () { /* the Presentations menu then only opens the overview page */ });
})();
