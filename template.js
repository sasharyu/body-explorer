/* Anatomical Price Explorer - plain JS, no build step.
 *
 * Idea: the diagram is made of small "zones". Every item in your price list
 * (data/items.csv) covers one or more zones (see ITEMS below). Clicking a zone
 * selects the most specific item covering it; combination items (e.g. "Torso
 * with Cephalus") are listed underneath and highlight all the zones they cover.
 *
 * Side convention: the figure faces us, so screen-LEFT = the person's RIGHT.
 * Suffix _r / _l on zone ids means the person's right / left.
 */
(function () {
  var SVGNS = "http://www.w3.org/2000/svg";

  // ================== 1. ZONES (geometry) ==============================
  // viewBox 0 0 340 490: body figure on the left (axis x=100), head detail on the right (axis x=275)
  var ZONES = [];
  function addC(id, label, d, kind) { ZONES.push({ id: id, label: label, d: d, kind: kind || "" }); }
  function addP(id, label, d, axis) {
    ZONES.push({ id: id + "_r", label: "Right " + label, d: d });
    ZONES.push({ id: id + "_l", label: "Left " + label, d: d, mirror: 2 * axis });
  }

  // Body figure (drawn bottom to top; later shapes sit on top)
  addP("foot", "foot", "M74 440 L94 440 L96 462 Q96 472 86 474 L66 474 Q64 462 74 440 Z", 100);
  addP("shin", "lower leg (below knee)", "M70 346 L96 346 L94 440 L74 440 Q70 390 70 346 Z", 100);
  addP("knee", "knee", "M68 318 L97 318 L96 346 L70 346 Q66 332 68 318 Z", 100);
  addP("thigh_dist", "lower thigh (mid-femur to knee)", "M67 280 L98 280 L97 318 L68 318 Q66 298 67 280 Z", 100);
  addP("thigh_prox", "upper thigh (hip to mid-femur)", "M72 226 L100 240 L98 280 L67 280 Q62 252 72 226 Z", 100);
  addP("pelvis", "hemi-pelvis", "M76 190 L100 190 L100 240 L72 226 Q68 210 76 190 Z", 100);
  addP("arm_rest", "arm below mid-humerus (to hand)", "M49 127 L69 127 L66 160 L62 224 L62 256 Q54 264 46 256 L44 224 Q44 190 48 160 Z", 100);
  addP("arm_upper", "upper arm (to mid-humerus)", "M51 94 L72 96 L69 127 L49 127 Q47 110 51 94 Z", 100);
  addP("shoulder", "shoulder", "M88 70 L68 74 Q54 78 51 94 L72 96 L84 82 Z", 100);
  addC("torso", "Torso (chest & abdomen)", "M72 96 L84 82 Q100 78 116 82 L128 96 Q131 130 127 150 Q127 172 124 190 L76 190 Q73 172 73 150 Q69 130 72 96 Z");
  addC("neck", "Neck", "M92 52 L108 52 L110 80 L90 80 Z");
  addC("spine_c", "Cervical spine", "M95 52 L105 52 L105 82 L95 82 Z", "spine");
  addC("spine_t", "Thoracic spine", "M95 82 L105 82 L105 150 L95 150 Z", "spine");
  addC("spine_l", "Lumbar spine", "M95 150 L105 150 L105 190 L95 190 Z", "spine");
  addC("spine_s", "Sacral spine", "M95 190 L105 190 L105 214 L95 214 Z", "spine");
  addC("head_fig", "Head (whole cephalus)", "M83 32 A17 22 0 1 0 117 32 A17 22 0 1 0 83 32 Z");

  // Head detail (schematic front view of the skull)
  addP("calvaria", "calvaria", "M232 56 Q232 14 275 14 L275 56 Z", 275);
  addP("temporal", "temporal", "M232 56 L250 56 L250 98 Q238 98 232 86 Z", 275);
  addP("brain", "brain", "M250 56 L275 56 L275 102 Q258 102 250 98 Z", 275);
  addP("maxilla", "maxilla", "M250 102 Q262 106 275 106 L275 130 L252 128 Z", 275);
  addP("mandible", "mandible", "M252 130 L275 130 L275 160 Q262 158 254 148 Z", 275);
  addC("occiput", "Occiput (back of skull)", "M255 166 Q275 156 295 166 L291 182 Q275 176 259 182 Z");

  // ================== 2. ITEMS (which zones each price-list code covers) ==
  // Edit this section if you disagree with how I interpreted a combination.
  var R = ["r"], L = ["l"], B = ["r", "l"];
  function sd(bases, sides) {
    var out = [];
    sides.forEach(function (s) { bases.forEach(function (b) { out.push(b + "_" + s); }); });
    return out;
  }
  var ALL = ZONES.map(function (z) { return z.id; });
  var CRANIAL = ["calvaria", "temporal", "brain", "maxilla", "mandible"];
  var HEAD = ["head_fig", "occiput"].concat(sd(CRANIAL, B));
  var SKULL = ["occiput"].concat(sd(["calvaria", "temporal", "maxilla", "mandible"], B));
  var NECK = ["neck", "spine_c"];
  var TORSO = ["torso", "spine_t", "spine_l"];
  var PELVIS = ["spine_s"].concat(sd(["pelvis"], B));
  var SPINE = ["spine_c", "spine_t", "spine_l", "spine_s"];
  var ARM = ["shoulder", "arm_upper", "arm_rest"];
  var LEG = ["thigh_prox", "thigh_dist", "knee", "shin", "foot"];

  var ITEMS = {
    "WC-UN": ALL, "WC-EM": ALL, "WC-SKEL": ALL,
    "C-HD": HEAD,
    "C-RHH": sd(CRANIAL, R), "C-LHH": sd(CRANIAL, L),
    "C-CS": HEAD.concat(["spine_c"]),
    "C-OC": ["occiput", "spine_c"],
    "C-BS": SKULL,
    "C-BTR": ["temporal_r"], "C-BTL": ["temporal_l"],
    "C-BC": sd(["calvaria"], B),
    "C-BMR": sd(["mandible"], B),
    "C-BML": sd(["maxilla"], B),
    "C-WB": sd(["brain"], B),
    "T-W": TORSO,
    "T-WL": TORSO.concat(PELVIS, sd(ARM, B), sd(LEG, B)),
    "T-WSH": TORSO.concat(sd(["shoulder"], B)),
    "T-UL": TORSO.concat(sd(ARM, B)),
    "T-LL": TORSO.concat(PELVIS, sd(LEG, B)),
    "T-WHD": HEAD.concat(NECK, TORSO),
    "T-HDSH": HEAD.concat(NECK, TORSO, sd(["shoulder"], B)),
    "T-HDWUL": HEAD.concat(NECK, TORSO, sd(ARM, B)),
    "T-CTUL": HEAD.concat(NECK, TORSO, sd(ARM, B)),
    "T-SW": SPINE,
    "T-SCV": ["spine_c"], "T-STH": ["spine_t"],
    "T-SCT": ["spine_c", "spine_t"], "T-STL": ["spine_t", "spine_l"],
    "T-SLU": ["spine_l"], "T-SLS": ["spine_l", "spine_s"], "T-SS": ["spine_s"],
    "T-SCD": SPINE,
    "T-PW": PELVIS, "T-PHR": ["pelvis_r"], "T-PHL": ["pelvis_l"],
    "T-PLL": PELVIS.concat(sd(LEG, B)),
    "T-PLLMF": PELVIS.concat(sd(["thigh_prox"], B)),
    "T-ORG": [], // organs are internal: listed under "Not on the diagram"
    "UL-WR": sd(ARM, R), "UL-WL": sd(ARM, L),
    "UL-SR": ["shoulder_r"], "UL-SL": ["shoulder_l"],
    "UL-MR": sd(["shoulder", "arm_upper"], R), "UL-ML": sd(["shoulder", "arm_upper"], L),
    "LL-HPR": ["pelvis_r"].concat(sd(LEG, R)), "LL-HPL": ["pelvis_l"].concat(sd(LEG, L)),
    "LL-MR": sd(["thigh_dist", "knee", "shin", "foot"], R), "LL-ML": sd(["thigh_dist", "knee", "shin", "foot"], L),
    "LL-TFR": sd(["shin", "foot"], R), "LL-TFL": sd(["shin", "foot"], L),
    "LL-KR": ["knee_r"], "LL-KL": ["knee_l"],
    "LL-FR": ["foot_r"], "LL-FL": ["foot_l"],
    "O-PR": [],
    "H-LI": HEAD
  };

  // ================== 3. State & helpers ===============================
  var built = false, els = {}, root, svg, panel;
  var selectedCode = null, selectedZone = null, hoverCode = null, modeOverride = null;

  function s(name, fallback) {
    var v = template.state && template.state[name];
    return v === undefined || v === null || v === "" ? fallback : v;
  }
  function num(v) {
    if (v === undefined || v === null || v === "") return null;
    var n = parseFloat(String(v).replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }
  function money(n) { return n === null ? "\u2014" : s("currency_symbol", "$") + n.toLocaleString("en-US"); }
  function toSet(arr) { var o = {}; arr.forEach(function (k) { o[k] = true; }); return o; }
  function darken(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return "rgb(" + c(n >> 16) + "," + c((n >> 8) & 255) + "," + c(n & 255) + ")";
  }
  function mode() { return modeOverride || s("default_mode", "price"); }

  function getItems() {
    var rows = (template.data && template.data.items) || [];
    var out = [];
    rows.forEach(function (r, i) {
      var code = String(r.code || "").trim();
      if (!code) return;
      out.push({
        code: code, label: r.label || code, number: r.number, order: i,
        prices: { index: num(r.price_index), outb: num(r.price_outb), outc: num(r.price_outc) },
        zones: ITEMS[code] || []
      });
    });
    return out;
  }
  function itemsForZone(items, zoneId) {
    return items.filter(function (it) { return it.zones.indexOf(zoneId) !== -1; })
      .sort(function (a, b) { return a.zones.length - b.zones.length || a.order - b.order; });
  }
  function byCode(items) { var m = {}; items.forEach(function (it) { m[it.code] = it; }); return m; }

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ================== 4. Build DOM once ================================
  function build() {
    var style = document.createElement("style");
    style.textContent =
      "html,body{margin:0;height:100%;font-family:system-ui,-apple-system,Segoe UI,sans-serif}" +
      ".be-root{display:flex;gap:20px;align-items:stretch;justify-content:center;height:100%;box-sizing:border-box;padding:12px}" +
      ".be-svg{flex:1 1 55%;min-width:0;height:100%}" +
      ".be-zone{cursor:pointer;outline:none;transition:fill .12s}" +
      ".be-zone:focus{stroke-width:2.5}" +
      ".be-panel{flex:0 1 330px;min-width:200px;overflow:auto}" +
      ".be-toggle{display:flex;gap:6px;margin-bottom:12px}" +
      ".be-btn{font:inherit;border-radius:6px;padding:5px 10px;cursor:pointer;background:transparent;border:1px solid}" +
      ".be-title{font-size:1.35em;font-weight:700;margin:0 0 2px}" +
      ".be-code{opacity:.65;margin-bottom:10px}" +
      ".be-big{font-size:3.4em;font-weight:800;line-height:1.1;margin:4px 0}" +
      ".be-prices{border-collapse:collapse;margin-bottom:6px}" +
      ".be-prices td{padding:3px 14px 3px 0}" +
      ".be-prices td:last-child{text-align:right;padding-right:0}" +
      ".be-h{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;opacity:.65;margin:16px 0 6px}" +
      ".be-list .be-btn{display:flex;justify-content:space-between;gap:10px;width:100%;margin-bottom:4px;text-align:left}" +
      ".be-hint{opacity:.65}" +
      "@media (max-width:620px){.be-root{flex-direction:column}.be-svg{flex:1 1 55%;height:auto}.be-panel{flex:1 1 45%}}";
    document.head.appendChild(style);

    root = h("div", "be-root");
    svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 340 490");
    svg.setAttribute("class", "be-svg");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "Human body diagram");
    svg.addEventListener("click", function (e) {
      if (e.target === svg) { selectedCode = null; selectedZone = null; renderAll(); }
    });

    ZONES.forEach(function (z) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", z.d);
      p.setAttribute("class", "be-zone");
      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("stroke-width", "1.4");
      p.setAttribute("stroke-linejoin", "round");
      if (z.mirror) p.setAttribute("transform", "translate(" + z.mirror + ",0) scale(-1,1)");
      var t = document.createElementNS(SVGNS, "title");
      t.textContent = z.label;
      p.appendChild(t);

      function enter() {
        var c = itemsForZone(getItems(), z.id)[0];
        hoverCode = c ? c.code : null;
        renderDiagram();
      }
      function leave() { hoverCode = null; renderDiagram(); }
      p.addEventListener("mouseenter", enter);
      p.addEventListener("mouseleave", leave);
      p.addEventListener("focus", enter);
      p.addEventListener("blur", leave);
      p.addEventListener("click", function (e) { e.stopPropagation(); selectZone(z.id); });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectZone(z.id); }
      });
      svg.appendChild(p);
      els[z.id] = p;
    });

    // Static labels
    [["R", 20, 24], ["L", 180, 24]].forEach(function (a) {
      var t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", a[1]); t.setAttribute("y", a[2]);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "11");
      t.setAttribute("class", "be-label");
      t.textContent = a[0];
      svg.appendChild(t);
    });
    var cap = document.createElementNS(SVGNS, "text");
    cap.setAttribute("x", 275); cap.setAttribute("y", 204);
    cap.setAttribute("text-anchor", "middle"); cap.setAttribute("font-size", "9");
    cap.setAttribute("class", "be-label");
    cap.textContent = "Head detail (schematic)";
    svg.appendChild(cap);

    panel = h("div", "be-panel");
    root.appendChild(svg);
    root.appendChild(panel);
    document.body.appendChild(root);
    built = true;
  }

  function selectZone(zoneId) {
    var best = itemsForZone(getItems(), zoneId)[0];
    selectedZone = zoneId;
    selectedCode = best ? best.code : null;
    renderAll();
  }
  function selectItem(code) { selectedCode = code; renderAll(); }

  // ================== 5. Render ========================================
  function renderDiagram() {
    var items = getItems(), map = byCode(items);
    var base = s("body_colour", "#e6d3c3"), hi = s("highlight_colour", "#e4572e");
    var outline = s("outline_colour", "#6b5446");
    var sel = map[selectedCode], hov = map[hoverCode];
    var selSet = toSet(sel ? sel.zones : []), hovSet = toSet(hov ? hov.zones : []);

    ZONES.forEach(function (z) {
      var el = els[z.id], fill = z.kind === "spine" ? darken(base, 0.9) : base, op = 1;
      if (selSet[z.id]) { fill = hi; }
      else if (hovSet[z.id]) { fill = hi; op = 0.45; }
      el.setAttribute("fill", fill);
      el.setAttribute("fill-opacity", String(op));
      el.setAttribute("stroke", outline);
      el.setAttribute("aria-label", z.label);
    });
    var labels = svg.querySelectorAll(".be-label");
    for (var i = 0; i < labels.length; i++) labels[i].setAttribute("fill", outline);
  }

  function renderPanel() {
    var items = getItems(), map = byCode(items);
    var outline = s("outline_colour", "#6b5446"), hi = s("highlight_colour", "#e4572e");
    var tier = s("price_tier", "index"), m = mode();
    panel.style.fontSize = s("panel_font_size", 15) + "px";
    panel.style.color = outline;
    panel.innerHTML = "";

    // Mode toggle
    var tog = h("div", "be-toggle");
    [["price", "Prices"], ["number", "Part numbers"]].forEach(function (o) {
      var b = h("button", "be-btn", o[1]);
      b.style.borderColor = outline;
      b.style.color = m === o[0] ? "#fff" : outline;
      b.style.background = m === o[0] ? hi : "transparent";
      b.style.borderColor = m === o[0] ? hi : outline;
      b.addEventListener("click", function () { modeOverride = o[0]; renderPanel(); });
      tog.appendChild(b);
    });
    panel.appendChild(tog);

    function itemButton(it) {
      var b = h("button", "be-btn");
      b.style.borderColor = outline;
      b.style.color = outline;
      if (it.code === selectedCode) { b.style.background = hi; b.style.color = "#fff"; b.style.borderColor = hi; }
      b.appendChild(h("span", "", it.code + " \u2013 " + it.label));
      b.appendChild(h("span", "", m === "price" ? money(it.prices[tier]) : "#" + it.number));
      b.addEventListener("click", function () { selectItem(it.code); });
      return b;
    }

    var sel = map[selectedCode];
    if (!sel) {
      panel.appendChild(h("p", "be-hint", "Click a part of the body to see its " + (m === "price" ? "price." : "part number.")));
    } else {
      panel.appendChild(h("div", "be-title", sel.label));
      panel.appendChild(h("div", "be-code", sel.code));
      if (m === "price") {
        var tbl = h("table", "be-prices");
        [["index", "Index (internal)"], ["outb", "Out B"], ["outc", "Out C"]].forEach(function (r) {
          var tr = h("tr");
          tr.style.fontWeight = r[0] === tier ? "700" : "400";
          tr.appendChild(h("td", "", r[1]));
          tr.appendChild(h("td", "", money(sel.prices[r[0]])));
          tbl.appendChild(tr);
        });
        panel.appendChild(tbl);
        panel.appendChild(h("div", "be-code", "Part #" + sel.number));
      } else {
        panel.appendChild(h("div", "be-big", "#" + sel.number));
      }
    }

    // Other items that cover the clicked area
    if (selectedZone) {
      var related = itemsForZone(items, selectedZone);
      if (related.length > 1) {
        panel.appendChild(h("div", "be-h", "All items covering this area"));
        var list = h("div", "be-list");
        related.forEach(function (it) { list.appendChild(itemButton(it)); });
        panel.appendChild(list);
      }
    }

    // Items with no spot on the diagram
    var off = items.filter(function (it) { return it.zones.length === 0; });
    if (off.length) {
      panel.appendChild(h("div", "be-h", "Not shown on the diagram"));
      var list2 = h("div", "be-list");
      off.forEach(function (it) { list2.appendChild(itemButton(it)); });
      panel.appendChild(list2);
    }
  }

  function renderAll() { renderDiagram(); renderPanel(); }

  // ================== 6. Flourish template API =========================
  window.template = {
    data: {},
    state: {},
    draw: function () { if (!built) build(); document.body.style.background = s("background_colour", "#ffffff"); renderAll(); },
    update: function () { if (!built) build(); document.body.style.background = s("background_colour", "#ffffff"); renderAll(); }
  };
})();
