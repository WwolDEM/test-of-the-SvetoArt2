/*!
 * SvetoART — режим правок для заказчика (review-виджет).
 * Включение: ?review=1   Выключение: ?review=0 (правки сохраняются).
 * Без флага ничего не делает: не создаёт DOM, не добавляет стили и обработчики.
 * Удаление перед запуском: node scripts/remove-review-widget.mjs
 */
(function () {
  "use strict";

  var FLAG_KEY = "svReviewOn";
  var DATA_KEY = "svReviewComments_v1";
  var HELP_KEY = "svReviewHelpSeen";

  /* ---------- хранилище и активация ---------- */
  var store = null;
  try {
    store = window.localStorage;
    store.setItem("__svrv_test", "1");
    store.removeItem("__svrv_test");
  } catch (e) {
    store = null;
  }

  var reviewParam = null;
  try {
    reviewParam = new URLSearchParams(window.location.search).get("review");
  } catch (e) {}

  if (reviewParam === "0") {
    try { if (store) store.removeItem(FLAG_KEY); } catch (e) {}
    return;
  }

  var active = false;
  if (reviewParam === "1") {
    active = true;
    try { if (store) store.setItem(FLAG_KEY, "1"); } catch (e) {}
  } else {
    try { active = !!store && store.getItem(FLAG_KEY) === "1"; } catch (e) { active = false; }
  }
  if (!active) return;

  var memoryOnly = !store;
  var memoryComments = [];

  /* ---------- корень сайта (учитывает /test-of-the-SvetoArt2/ и любые подпапки) ---------- */
  var siteRoot = "/";
  try {
    var scriptEl = document.currentScript || document.querySelector('script[src*="review-widget.js"]');
    if (scriptEl && scriptEl.src) {
      siteRoot = new url(scriptEl.src, window.location.href).pathname.replace(/assets\/js\/review-widget\.js.*$/, "");
    }
  } catch (e) {}

  function currentPage() {
    var p = window.location.pathname;
    if (p.indexOf(siteRoot) === 0) p = "/" + p.slice(siteRoot.length);
    p = p.replace(/index\.html$/, "");
    return p || "/";
  }

  function pageUrl(page) {
    return siteRoot.replace(/\/$/, "") + page;
  }

  /* ---------- данные ---------- */
  function loadComments() {
    if (memoryOnly) return memoryComments.slice();
    try {
      var raw = store.getItem(DATA_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return memoryComments.slice();
    }
  }

  function saveComments(list) {
    memoryComments = list.slice();
    if (memoryOnly) return;
    try {
      store.setItem(DATA_KEY, JSON.stringify(list));
    } catch (e) {
      memoryOnly = true;
      renderWarning();
    }
  }

  // чтение → изменение → запись, чтобы не затереть правки из соседних вкладок
  function mutate(fn) {
    var list = loadComments();
    fn(list);
    saveComments(list);
    comments = list;
    renderAll();
  }

  var comments = loadComments();

  function pageComments(page) {
    page = page || currentPage();
    return comments.filter(function (c) { return c.page === page; });
  }

  function uid() {
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function isTouch() {
    try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; }
  }

  /* ---------- стили (только при активации) ---------- */
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  var CSS = [
    "html.sv-rv-active .sv-cursor,html.sv-rv-active .sv-cursor-dot{display:none!important}",
    "html.sv-rv-active body.cursor-ready{cursor:auto!important}",
    "html.sv-rv-active body.cursor-ready a,html.sv-rv-active body.cursor-ready button,html.sv-rv-active body.cursor-ready [role=button]{cursor:pointer!important}",
    "html.sv-rv-active body.cursor-ready input,html.sv-rv-active body.cursor-ready textarea,html.sv-rv-active body.cursor-ready select{cursor:text!important}",
    "html.sv-rv-active.sv-rv-picking body,html.sv-rv-active.sv-rv-picking body *{cursor:crosshair!important}",
    "html.sv-rv-active.sv-rv-picking iframe{pointer-events:none!important}",
    "html.sv-rv-active body [data-sv-review-ui],html.sv-rv-active body [data-sv-review-ui] *{cursor:auto!important}",
    "html.sv-rv-active body [data-sv-review-ui] button,html.sv-rv-active body [data-sv-review-ui] a{cursor:pointer!important}",
    "html.sv-rv-active body [data-sv-review-ui] textarea{cursor:text!important}",

    ".sv-rv-root,.sv-rv-root *,.sv-rv-pins,.sv-rv-pins *{box-sizing:border-box;font-family:" + FONT + ";letter-spacing:normal;text-transform:none;text-shadow:none;-webkit-font-smoothing:antialiased}",
    ".sv-rv-root button,.sv-rv-pins button{margin:0;font:inherit;-webkit-appearance:none;appearance:none}",

    ".sv-rv-fab{position:fixed;left:16px;bottom:16px;z-index:2147483600;display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 18px;border:1px solid rgba(226,196,142,.55);border-radius:23px;background:#1a1612;color:#f3ece0;font-size:14px;font-weight:600;line-height:1;box-shadow:0 10px 30px rgba(0,0,0,.45)}",
    ".sv-rv-fab:hover{border-color:#e2c48e}",
    ".sv-rv-fab b{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#e2c48e;color:#1a1612;font-size:12px}",
    ".sv-rv-root.is-picking .sv-rv-fab{border-color:#e2c48e;box-shadow:0 0 0 3px rgba(226,196,142,.35),0 10px 30px rgba(0,0,0,.45)}",

    ".sv-rv-panel{position:fixed;left:16px;bottom:72px;z-index:2147483600;display:none;flex-direction:column;width:380px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);border:1px solid rgba(243,232,214,.18);border-radius:14px;background:#14110d;color:#f3ece0;font-size:14px;line-height:1.45;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}",
    ".sv-rv-panel.is-open{display:flex}",
    ".sv-rv-head{display:flex;align-items:center;gap:8px;padding:14px 14px 10px 16px;border-bottom:1px solid rgba(243,232,214,.12)}",
    ".sv-rv-title{flex:1;font-size:15px;font-weight:700}",
    ".sv-rv-icon{display:inline-grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid rgba(243,232,214,.2);border-radius:15px;background:transparent;color:#f3ece0;font-size:14px;line-height:1}",
    ".sv-rv-icon:hover{border-color:#e2c48e;color:#e2c48e}",
    ".sv-rv-body{flex:1;overflow-y:auto;padding:12px 16px;-webkit-overflow-scrolling:touch}",
    ".sv-rv-warn{margin:0 0 12px;padding:10px 12px;border-radius:8px;background:rgba(214,96,64,.16);border:1px solid rgba(214,96,64,.5);color:#ffd9cc;font-size:13px}",
    ".sv-rv-help{margin:0 0 12px;padding:12px 14px;border-radius:10px;background:rgba(226,196,142,.08);border:1px solid rgba(226,196,142,.3);font-size:13px}",
    ".sv-rv-help ol{margin:6px 0 0;padding-left:20px}",
    ".sv-rv-help li{margin:4px 0}",
    ".sv-rv-help-title{font-weight:700;color:#e2c48e}",
    ".sv-rv-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0}",
    ".sv-rv-switch{position:relative;flex:0 0 auto;width:44px;height:26px;padding:0;border:0;border-radius:13px;background:#3a332b;transition:background .2s}",
    ".sv-rv-switch::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#f3ece0;transition:transform .2s}",
    ".sv-rv-switch[aria-pressed=true]{background:#b08a52}",
    ".sv-rv-switch[aria-pressed=true]::after{transform:translateX(18px)}",
    ".sv-rv-hint{margin:2px 0 8px;color:rgba(243,236,224,.6);font-size:12.5px}",
    ".sv-rv-list{margin:6px 0 0;padding:0;list-style:none}",
    ".sv-rv-group{margin:14px 0 6px;color:#e2c48e;font-size:12px;font-weight:700}",
    ".sv-rv-group a{color:#e2c48e;text-decoration:underline}",
    ".sv-rv-item{display:flex;gap:10px;margin:0 0 8px;padding:10px;border:1px solid rgba(243,232,214,.12);border-radius:10px;background:#1a1612}",
    ".sv-rv-item:hover{border-color:rgba(226,196,142,.5)}",
    ".sv-rv-num{flex:0 0 auto;display:inline-grid;place-items:center;width:24px;height:24px;border-radius:12px;background:#e2c48e;color:#1a1612;font-size:12px;font-weight:700}",
    ".sv-rv-item-main{flex:1;min-width:0}",
    ".sv-rv-snip{color:rgba(243,236,224,.55);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".sv-rv-text{margin-top:3px;font-size:13.5px;word-wrap:break-word;overflow-wrap:anywhere}",
    ".sv-rv-chips-mini{margin-top:4px;color:#e2c48e;font-size:12px}",
    ".sv-rv-actions{display:flex;gap:6px;margin-top:8px}",
    ".sv-rv-link{padding:4px 10px;border:1px solid rgba(243,232,214,.2);border-radius:14px;background:transparent;color:#f3ece0;font-size:12px}",
    ".sv-rv-link:hover{border-color:#e2c48e;color:#e2c48e}",
    ".sv-rv-empty{padding:14px 0;color:rgba(243,236,224,.55);font-size:13px;text-align:center}",
    ".sv-rv-foot{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px 14px;border-top:1px solid rgba(243,232,214,.12)}",
    ".sv-rv-btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 12px;border:1px solid rgba(243,232,214,.22);border-radius:20px;background:transparent;color:#f3ece0;font-size:13px;font-weight:600;text-align:center}",
    ".sv-rv-btn:hover{border-color:#e2c48e;color:#e2c48e}",
    ".sv-rv-btn-gold{grid-column:1/-1;border-color:#b08a52;background:#b08a52;color:#14110d}",
    ".sv-rv-btn-gold:hover{background:#e2c48e;color:#14110d}",
    ".sv-rv-btn-danger:hover{border-color:#e07a5f;color:#e07a5f}",
    ".sv-rv-off{grid-column:1/-1;padding:4px;border:0;background:none;color:rgba(243,236,224,.5);font-size:12px;text-decoration:underline}",

    ".sv-rv-hover,.sv-rv-flash{position:fixed;z-index:2147483500;display:none;border:2px solid #e2c48e;border-radius:3px;background:rgba(226,196,142,.12);pointer-events:none}",
    ".sv-rv-flash{background:rgba(226,196,142,.22);box-shadow:0 0 0 4px rgba(226,196,142,.25)}",
    ".sv-rv-hover-label{position:absolute;left:-2px;bottom:100%;margin-bottom:2px;padding:2px 7px;border-radius:3px;background:#e2c48e;color:#1a1612;font:600 11px/1.5 " + FONT + ";white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}",
    ".sv-rv-hover.is-low .sv-rv-hover-label{bottom:auto;top:100%;margin:2px 0 0}",

    ".sv-rv-pins{position:absolute;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483400;pointer-events:none}",
    ".sv-rv-pin{position:absolute;display:inline-grid;place-items:center;width:24px;height:24px;padding:0;border:2px solid #14110d;border-radius:12px;background:#e2c48e;color:#14110d;font-size:12px;font-weight:700;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.45);pointer-events:auto}",
    ".sv-rv-pin:hover{transform:scale(1.15)}",

    ".sv-rv-backdrop{position:fixed;inset:0;z-index:2147483640;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}",
    ".sv-rv-backdrop.is-open{display:flex}",
    ".sv-rv-dialog{width:440px;max-width:100%;max-height:calc(100vh - 32px);overflow-y:auto;padding:18px;border:1px solid rgba(243,232,214,.18);border-radius:14px;background:#14110d;color:#f3ece0;font-size:14px;line-height:1.45;box-shadow:0 24px 70px rgba(0,0,0,.6)}",
    ".sv-rv-dlg-title{margin-bottom:10px;font-size:16px;font-weight:700}",
    ".sv-rv-target{margin-bottom:12px;padding:8px 10px;border-radius:8px;background:#1a1612;color:rgba(243,236,224,.75);font-size:12.5px;overflow-wrap:anywhere}",
    ".sv-rv-target b{color:#e2c48e}",
    ".sv-rv-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}",
    ".sv-rv-chip{padding:6px 11px;border:1px solid rgba(243,232,214,.25);border-radius:15px;background:transparent;color:#f3ece0;font-size:12.5px}",
    ".sv-rv-chip[aria-pressed=true]{border-color:#e2c48e;background:#e2c48e;color:#14110d}",
    ".sv-rv-textarea{display:block;width:100%;min-height:110px;margin:0;padding:10px 12px;border:1px solid rgba(243,232,214,.25);border-radius:8px;background:#0d0b09;color:#f3ece0;font:14px/1.45 " + FONT + ";resize:vertical;outline:none}",
    ".sv-rv-textarea:focus{border-color:#e2c48e;box-shadow:0 0 0 3px rgba(226,196,142,.2)}",
    ".sv-rv-error{display:none;margin-top:6px;color:#f0a58e;font-size:12.5px}",
    ".sv-rv-dlg-foot{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}",
    ".sv-rv-dlg-foot .sv-rv-btn{flex:1}",
    ".sv-rv-dlg-foot .sv-rv-btn-gold{grid-column:auto}",

    ".sv-rv-toast{position:fixed;left:50%;bottom:24px;z-index:2147483647;transform:translateX(-50%);padding:10px 16px;border-radius:20px;background:#e2c48e;color:#14110d;font-size:13.5px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.4);opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100vw - 32px);text-align:center}",
    ".sv-rv-toast.is-on{opacity:1}",

    "@media (max-width:640px){",
    ".sv-rv-fab{left:12px;bottom:88px;height:44px;padding:0 14px}",
    ".sv-rv-panel{left:8px;right:8px;bottom:142px;width:auto;max-width:none;max-height:calc(100vh - 160px)}",
    ".sv-rv-backdrop{align-items:flex-end;padding:8px}",
    ".sv-rv-dialog{width:100%}",
    ".sv-rv-toast{bottom:150px}",
    "}"
  ].join("");

  /* ---------- утилиты ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function ui(n) {
    n.setAttribute("data-sv-review-ui", "");
    return n;
  }

  function isUI(node) {
    return !!(node && node.closest && node.closest("[data-sv-review-ui]"));
  }

  function cssEsc(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (ch) { return "\\" + ch; });
  }

  function cleanText(s, n) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    return n && s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function visibleText(node) {
    var t = "";
    try { t = node.innerText; } catch (e) {}
    if (!t) t = node.textContent || "";
    return cleanText(t, 120);
  }

  function hasOwnText(node) {
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    }
    return false;
  }

  function bgImage(node) {
    try {
      var bg = window.getComputedStyle(node).backgroundImage;
      return bg && bg !== "none" && bg.indexOf("url(") > -1 ? bg : "";
    } catch (e) { return ""; }
  }

  /* ---------- выбор элемента ---------- */
  var CONTENT_TAGS = /^(IMG|SVG|VIDEO|PICTURE|IFRAME|CANVAS|INPUT|TEXTAREA|SELECT|BUTTON|A|H1|H2|H3|H4|H5|H6|P|LI|DT|DD|FIGURE|FIGCAPTION|LABEL|BLOCKQUOTE|TABLE|FORM|SECTION|HEADER|FOOTER|NAV|ARTICLE|ASIDE|MAIN)$/;
  var INLINE_TAGS = /^(EM|STRONG|B|I|SMALL|SPAN|BR|SUP|SUB|MARK|U|S)$/;

  function isMeaningful(node) {
    if (CONTENT_TAGS.test(node.tagName)) return true;
    if (hasOwnText(node)) return true;
    if (bgImage(node)) return true;
    if (node.children.length > 1) return true;
    try { if (node.querySelector(":scope > img, :scope > iframe, :scope > video, :scope > picture, :scope > svg")) return true; } catch (e) {}
    return false;
  }

  function resolveTarget(node) {
    if (!node) return null;
    if (node.nodeType !== 1) node = node.parentElement;
    if (!node || isUI(node)) return null;
    var svg = node.closest && node.closest("svg");
    if (svg) node = svg;
    // форматирование внутри текста (em, b, span…) → весь абзац/заголовок
    while (node && node !== document.body && INLINE_TAGS.test(node.tagName) && node.parentElement && hasOwnText(node.parentElement)) {
      node = node.parentElement;
    }
    var guard = 0;
    while (node && node !== document.body && !isMeaningful(node) && guard++ < 10) node = node.parentElement;
    if (!node || node === document.body || node === document.documentElement || isUI(node)) return null;
    return node;
  }

  /* ---------- устойчивый селектор ---------- */
  var VOLATILE = /^(is-|has-|js-|sv-|cursor-|swiper-|aos-)|^(visible|reveal|reveal-scale|reveal-left|open|active|lit|flicker|flicker-a|flicker-b|hover|focus|focused|selected|current|menu-open|show|shown|hidden|loaded|in-view|animated|preloader-.*)$/;

  function partFor(node) {
    var tag = node.tagName.toLowerCase();
    if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) return { s: "#" + cssEsc(node.id), id: true };
    var classes = [];
    for (var i = 0; i < node.classList.length && classes.length < 2; i++) {
      if (!VOLATILE.test(node.classList[i])) classes.push("." + cssEsc(node.classList[i]));
    }
    var s = tag + classes.join("");
    var parent = node.parentElement;
    if (parent) {
      var same = [];
      for (var j = 0; j < parent.children.length; j++) {
        if (parent.children[j].tagName === node.tagName) same.push(parent.children[j]);
      }
      if (same.length > 1) s += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
    }
    return { s: s, id: false };
  }

  function buildSelector(node) {
    var parts = [];
    var cur = node;
    for (var depth = 0; cur && cur !== document.documentElement && depth < 6; depth++) {
      if (cur === document.body) { parts.unshift("body"); break; }
      var p = partFor(cur);
      parts.unshift(p.s);
      var sel = parts.join(" > ");
      if (p.id) return sel;
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch (e) {}
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  function findElement(c) {
    var found = null;
    try { found = c.selector ? document.querySelector(c.selector) : null; } catch (e) {}
    if (found) return found;
    // запасной вариант: тот же тег с тем же началом текста
    if (c.tag && c.text) {
      var probe = c.text.replace(/…$/, "").slice(0, 40);
      var cands = document.getElementsByTagName(c.tag);
      for (var i = 0; i < cands.length; i++) {
        if (!isUI(cands[i]) && visibleText(cands[i]).indexOf(probe) === 0) return cands[i];
      }
    }
    return null;
  }

  function nearestHeading(node) {
    if (/^H[1-4]$/.test(node.tagName)) return cleanText(node.textContent, 120);
    var inner = node.querySelector && node.querySelector("h1,h2,h3,h4");
    if (inner && !isUI(inner)) return cleanText(inner.textContent, 120);
    var hs = document.querySelectorAll("h1,h2,h3,h4");
    var best = null;
    for (var i = 0; i < hs.length; i++) {
      if (isUI(hs[i])) continue;
      if (hs[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) best = hs[i];
    }
    return best ? cleanText(best.textContent, 120) : "";
  }

  function describe(node) {
    var d = {
      page: currentPage(),
      pageTitle: document.title || "",
      selector: buildSelector(node),
      tag: node.tagName.toLowerCase(),
      text: node.tagName === "IMG" ? cleanText(node.getAttribute("alt"), 120) : visibleText(node),
      nearestHeading: nearestHeading(node),
      viewport: window.innerWidth + "×" + window.innerHeight,
      device: isTouch() ? "touch" : "mouse"
    };
    if (node.tagName === "IMG") {
      d.src = node.getAttribute("src") || node.currentSrc || "";
      d.alt = node.getAttribute("alt") || "";
    } else {
      var img = node.querySelector && node.querySelector("img");
      if (img && !isUI(img)) d.imageInside = img.getAttribute("src") || "";
    }
    var bg = bgImage(node);
    if (bg) d.backgroundImage = bg;
    return d;
  }

  function labelFor(node) {
    var cls = "";
    for (var i = 0; i < node.classList.length; i++) {
      if (!VOLATILE.test(node.classList[i])) { cls = "." + node.classList[i]; break; }
    }
    return node.tagName.toLowerCase() + cls;
  }

  function describeShort(c) {
    var what = c.tag === "img" ? "картинка" + (c.alt ? " «" + cleanText(c.alt, 60) + "»" : "") : (c.text ? "«" + cleanText(c.text, 70) + "»" : "блок без текста");
    return { tag: c.tag, what: what };
  }

  /* ---------- DOM виджета ---------- */
  var html = document.documentElement;
  var root, fab, fabCount, panel, panelBody, warnBox, helpBox, pickSwitch, allSwitch, listBox;
  var hoverBox, hoverLabel, flashBox, pinLayer, backdrop, dlgTitle, dlgTarget, dlgChips, dlgText, dlgError, dlgDelete, toastBox;
  var picking = false, showAll = false, editing = null, pending = null;
  var CHIPS = ["Не нравится", "Изменить текст", "Заменить фото", "Убрать", "Другое"];

  function buildUI() {
    var style = ui(el("style"));
    style.textContent = CSS;
    document.head.appendChild(style);

    root = ui(el("div", "sv-rv-root"));

    fab = el("button", "sv-rv-fab");
    fab.type = "button";
    fab.setAttribute("aria-label", "Открыть панель правок");
    fab.appendChild(el("span", null, "✍ Правки"));
    fabCount = el("b", null, "0");
    fab.appendChild(fabCount);
    fab.addEventListener("click", function () { togglePanel(); });
    root.appendChild(fab);

    // панель
    panel = el("div", "sv-rv-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Правки к сайту");
    var head = el("div", "sv-rv-head");
    head.appendChild(el("div", "sv-rv-title", "Правки к сайту"));
    var helpBtn = el("button", "sv-rv-icon", "?");
    helpBtn.type = "button";
    helpBtn.title = "Как это работает";
    helpBtn.addEventListener("click", function () { helpBox.hidden = !helpBox.hidden; });
    var closeBtn = el("button", "sv-rv-icon", "✕");
    closeBtn.type = "button";
    closeBtn.title = "Свернуть";
    closeBtn.addEventListener("click", function () { togglePanel(false); });
    head.appendChild(helpBtn);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    panelBody = el("div", "sv-rv-body");
    warnBox = el("div", "sv-rv-warn", "Браузер не даёт сохранять данные: правки исчезнут после закрытия страницы. Скачайте файл правок, прежде чем закрывать сайт.");
    warnBox.hidden = true;
    panelBody.appendChild(warnBox);

    helpBox = el("div", "sv-rv-help");
    helpBox.appendChild(el("div", "sv-rv-help-title", "Как оставить правку"));
    var ol = el("ol");
    ["Включите «Режим выбора».", "Нажмите на то, что хотите изменить.", "Напишите, что не так. В конце нажмите «Скачать файл правок» и пришлите его."].forEach(function (t) {
      ol.appendChild(el("li", null, t));
    });
    helpBox.appendChild(ol);
    helpBox.hidden = true;
    panelBody.appendChild(helpBox);

    var row1 = el("div", "sv-rv-row");
    row1.appendChild(el("span", null, "Режим выбора"));
    pickSwitch = el("button", "sv-rv-switch");
    pickSwitch.type = "button";
    pickSwitch.setAttribute("aria-pressed", "false");
    pickSwitch.setAttribute("aria-label", "Режим выбора");
    pickSwitch.addEventListener("click", function () { setPicking(!picking); });
    row1.appendChild(pickSwitch);
    panelBody.appendChild(row1);
    panelBody.appendChild(el("div", "sv-rv-hint", "Пока режим включён, ссылки и кнопки сайта не срабатывают — нажатие выбирает элемент."));

    var row2 = el("div", "sv-rv-row");
    row2.appendChild(el("span", null, "Показать все страницы"));
    allSwitch = el("button", "sv-rv-switch");
    allSwitch.type = "button";
    allSwitch.setAttribute("aria-pressed", "false");
    allSwitch.setAttribute("aria-label", "Показать правки всех страниц");
    allSwitch.addEventListener("click", function () {
      showAll = !showAll;
      allSwitch.setAttribute("aria-pressed", String(showAll));
      renderList();
    });
    row2.appendChild(allSwitch);
    panelBody.appendChild(row2);

    listBox = el("div");
    panelBody.appendChild(listBox);
    panel.appendChild(panelBody);

    var foot = el("div", "sv-rv-foot");
    var dl = el("button", "sv-rv-btn sv-rv-btn-gold", "Скачать файл правок");
    dl.type = "button";
    dl.addEventListener("click", exportFile);
    var cp = el("button", "sv-rv-btn", "Копировать текстом");
    cp.type = "button";
    cp.addEventListener("click", copyText);
    var clr = el("button", "sv-rv-btn sv-rv-btn-danger", "Очистить всё");
    clr.type = "button";
    clr.addEventListener("click", clearAll);
    var off = el("button", "sv-rv-off", "Выключить режим правок (правки сохранятся)");
    off.type = "button";
    off.addEventListener("click", deactivate);
    foot.appendChild(dl);
    foot.appendChild(cp);
    foot.appendChild(clr);
    foot.appendChild(off);
    panel.appendChild(foot);
    root.appendChild(panel);

    // рамка наведения и подсветка
    hoverBox = el("div", "sv-rv-hover");
    hoverLabel = el("div", "sv-rv-hover-label");
    hoverBox.appendChild(hoverLabel);
    root.appendChild(hoverBox);
    flashBox = el("div", "sv-rv-flash");
    root.appendChild(flashBox);

    // окно комментария
    backdrop = el("div", "sv-rv-backdrop");
    var dlg = el("div", "sv-rv-dialog");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlgTitle = el("div", "sv-rv-dlg-title", "Новая правка");
    dlgTarget = el("div", "sv-rv-target");
    dlgChips = el("div", "sv-rv-chips");
    CHIPS.forEach(function (name) {
      var ch = el("button", "sv-rv-chip", name);
      ch.type = "button";
      ch.setAttribute("aria-pressed", "false");
      ch.addEventListener("click", function () {
        ch.setAttribute("aria-pressed", ch.getAttribute("aria-pressed") === "true" ? "false" : "true");
      });
      dlgChips.appendChild(ch);
    });
    dlgText = el("textarea", "sv-rv-textarea");
    dlgText.placeholder = "Что не так и как должно быть?";
    dlgText.setAttribute("aria-label", "Комментарий");
    dlgText.addEventListener("input", function () { dlgError.style.display = "none"; });
    dlgError = el("div", "sv-rv-error", "Напишите комментарий — без него правку не сохранить.");
    var dfoot = el("div", "sv-rv-dlg-foot");
    var saveBtn = el("button", "sv-rv-btn sv-rv-btn-gold", "Сохранить");
    saveBtn.type = "button";
    saveBtn.addEventListener("click", saveDialog);
    var cancelBtn = el("button", "sv-rv-btn", "Отмена");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", closeDialog);
    dlgDelete = el("button", "sv-rv-btn sv-rv-btn-danger", "Удалить");
    dlgDelete.type = "button";
    dlgDelete.addEventListener("click", function () {
      if (editing && window.confirm("Удалить эту правку?")) {
        var id = editing.id;
        closeDialog();
        removeComment(id);
      }
    });
    dfoot.appendChild(saveBtn);
    dfoot.appendChild(cancelBtn);
    dfoot.appendChild(dlgDelete);
    dlg.appendChild(dlgTitle);
    dlg.appendChild(dlgTarget);
    dlg.appendChild(dlgChips);
    dlg.appendChild(dlgText);
    dlg.appendChild(dlgError);
    dlg.appendChild(dfoot);
    backdrop.appendChild(dlg);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeDialog(); });
    root.appendChild(backdrop);

    toastBox = el("div", "sv-rv-toast");
    toastBox.setAttribute("role", "status");
    root.appendChild(toastBox);

    document.body.appendChild(root);

    pinLayer = ui(el("div", "sv-rv-pins"));
    document.body.appendChild(pinLayer);
  }

  /* ---------- панель ---------- */
  function togglePanel(force) {
    var open = typeof force === "boolean" ? force : !panel.classList.contains("is-open");
    panel.classList.toggle("is-open", open);
    if (open) {
      var seen = false;
      try { seen = !!store && store.getItem(HELP_KEY) === "1"; } catch (e) {}
      if (!seen) {
        helpBox.hidden = false;
        try { if (store) store.setItem(HELP_KEY, "1"); } catch (e) {}
      }
      renderList();
    }
  }

  function renderWarning() {
    if (warnBox) warnBox.hidden = !memoryOnly;
  }

  function renderList() {
    if (!listBox) return;
    listBox.textContent = "";
    var here = currentPage();
    var pages = [];
    var groups = {};
    var source = showAll ? comments : pageComments(here);
    source.forEach(function (c) {
      if (!groups[c.page]) { groups[c.page] = []; pages.push(c.page); }
      groups[c.page].push(c);
    });
    if (!source.length) {
      listBox.appendChild(el("div", "sv-rv-empty", showAll ? "Правок пока нет." : "На этой странице правок пока нет."));
      return;
    }
    pages.forEach(function (page) {
      if (showAll) {
        var g = el("div", "sv-rv-group");
        var title = (groups[page][0].pageTitle || page).replace(/\s+[—-]\s+SvetoART.*$/, "");
        if (page === here) {
          g.textContent = title + " — эта страница";
        } else {
          var a = el("a", null, title);
          a.href = pageUrl(page);
          g.appendChild(a);
          g.appendChild(document.createTextNode("  " + page));
        }
        listBox.appendChild(g);
      }
      var ul = el("ul", "sv-rv-list");
      groups[page].forEach(function (c, i) {
        var li = el("li", "sv-rv-item");
        li.appendChild(el("span", "sv-rv-num", String(i + 1)));
        var main = el("div", "sv-rv-item-main");
        var d = describeShort(c);
        main.appendChild(el("div", "sv-rv-snip", d.tag + " · " + d.what));
        main.appendChild(el("div", "sv-rv-text", c.comment));
        if (c.chips && c.chips.length) main.appendChild(el("div", "sv-rv-chips-mini", c.chips.join(", ")));
        var acts = el("div", "sv-rv-actions");
        var ed = el("button", "sv-rv-link", "Изменить");
        ed.type = "button";
        ed.addEventListener("click", function (e) { e.stopPropagation(); openDialog(null, c); });
        var rm = el("button", "sv-rv-link", "Удалить");
        rm.type = "button";
        rm.addEventListener("click", function (e) {
          e.stopPropagation();
          if (window.confirm("Удалить эту правку?")) removeComment(c.id);
        });
        acts.appendChild(ed);
        acts.appendChild(rm);
        main.appendChild(acts);
        li.appendChild(main);
        if (page === here) {
          li.title = "Показать на странице";
          li.addEventListener("click", function () { showOnPage(c); });
        }
        ul.appendChild(li);
      });
      listBox.appendChild(ul);
    });
  }

  function updateFab() {
    fabCount.textContent = String(comments.length);
  }

  function renderAll() {
    updateFab();
    renderList();
    renderPins();
    renderWarning();
  }

  /* ---------- пины ---------- */
  function renderPins() {
    if (!pinLayer) return;
    pinLayer.textContent = "";
    var vw = document.documentElement.clientWidth;
    pageComments().forEach(function (c, i) {
      var target = findElement(c);
      if (!target) return;
      var r = target.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var pin = el("button", "sv-rv-pin", String(i + 1));
      pin.type = "button";
      pin.title = c.comment;
      pin.setAttribute("aria-label", "Правка " + (i + 1) + ": " + c.comment);
      var left = Math.min(Math.max(r.left - 10, 2), vw - 28) + window.scrollX;
      var top = Math.max(r.top + window.scrollY - 10, 2);
      pin.style.left = left + "px";
      pin.style.top = top + "px";
      pin.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openDialog(null, c);
      });
      pinLayer.appendChild(pin);
    });
  }

  var pinTimer = null;
  function schedulePins(delay) {
    clearTimeout(pinTimer);
    pinTimer = setTimeout(renderPins, delay == null ? 120 : delay);
  }

  /* ---------- подсветка ---------- */
  function placeBox(box, node) {
    var r = node.getBoundingClientRect();
    box.style.left = r.left - 2 + "px";
    box.style.top = r.top - 2 + "px";
    box.style.width = r.width + 4 + "px";
    box.style.height = r.height + 4 + "px";
    box.style.display = "block";
    return r;
  }

  var flashTimer = null;
  function flash(node) {
    placeBox(flashBox, node);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { flashBox.style.display = "none"; }, 1600);
  }

  function showOnPage(c) {
    var target = findElement(c);
    if (!target) { toast("Элемент не найден на странице — возможно, он изменился."); return; }
    if (window.innerWidth <= 640) togglePanel(false);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () { flash(target); }, 450);
  }

  /* ---------- режим выбора ---------- */
  function setPicking(on) {
    picking = !!on;
    html.classList.toggle("sv-rv-picking", picking);
    root.classList.toggle("is-picking", picking);
    pickSwitch.setAttribute("aria-pressed", String(picking));
    if (picking) {
      // панель сворачивается, чтобы не закрывать страницу (на телефоне она почти во весь экран)
      togglePanel(false);
      toast("Нажмите на то, что хотите изменить");
    } else {
      hoverBox.style.display = "none";
    }
  }

  function blockEvent(e) {
    if (!picking) return;
    if (isUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function onPickClick(e) {
    if (!picking || isUI(e.target)) return;
    blockEvent(e);
    if (backdrop.classList.contains("is-open")) return;
    var target = resolveTarget(e.target);
    if (!target) return;
    try {
      var ae = document.activeElement;
      if (ae && ae !== document.body && !isUI(ae) && ae.blur) ae.blur();
    } catch (err) {}
    hoverBox.style.display = "none";
    openDialog(target, null);
  }

  var hoverRaf = null;
  var lastMove = null;
  function onPickMove(e) {
    if (!picking || isTouch()) return;
    lastMove = e;
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = null;
      var ev = lastMove;
      if (!ev || backdrop.classList.contains("is-open") || isUI(ev.target)) { hoverBox.style.display = "none"; return; }
      var t = resolveTarget(ev.target);
      if (!t) { hoverBox.style.display = "none"; return; }
      var r = placeBox(hoverBox, t);
      hoverLabel.textContent = labelFor(t);
      hoverBox.classList.toggle("is-low", r.top < 24);
    });
  }

  /* ---------- окно комментария ---------- */
  function setChips(list) {
    var btns = dlgChips.querySelectorAll(".sv-rv-chip");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(list.indexOf(btns[i].textContent) > -1));
    }
  }

  function getChips() {
    var out = [];
    var btns = dlgChips.querySelectorAll(".sv-rv-chip");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("aria-pressed") === "true") out.push(btns[i].textContent);
    }
    return out;
  }

  function fillTarget(info) {
    dlgTarget.textContent = "";
    dlgTarget.appendChild(el("b", null, "Что выбрано: "));
    var d = describeShort(info);
    dlgTarget.appendChild(document.createTextNode(d.tag + " — " + d.what));
    if (info.nearestHeading && info.nearestHeading !== info.text) {
      dlgTarget.appendChild(el("br"));
      dlgTarget.appendChild(document.createTextNode("Раздел: «" + cleanText(info.nearestHeading, 80) + "»"));
    }
  }

  function openDialog(targetNode, comment) {
    editing = comment || null;
    pending = null;
    if (comment) {
      dlgTitle.textContent = "Правка";
      fillTarget(comment);
      setChips(comment.chips || []);
      dlgText.value = comment.comment || "";
      dlgDelete.style.display = "";
      var t = comment.page === currentPage() ? findElement(comment) : null;
      if (t) placeBox(flashBox, t);
    } else {
      pending = describe(targetNode);
      dlgTitle.textContent = "Новая правка";
      fillTarget(pending);
      setChips([]);
      dlgText.value = "";
      dlgDelete.style.display = "none";
      placeBox(flashBox, targetNode);
    }
    dlgError.style.display = "none";
    backdrop.classList.add("is-open");
    setTimeout(function () { try { dlgText.focus({ preventScroll: true }); } catch (e) { dlgText.focus(); } }, 30);
  }

  function closeDialog() {
    backdrop.classList.remove("is-open");
    flashBox.style.display = "none";
    editing = null;
    pending = null;
  }

  function saveDialog() {
    var text = dlgText.value.trim();
    if (!text) {
      dlgError.style.display = "block";
      dlgText.focus();
      return;
    }
    var chips = getChips();
    if (editing) {
      var id = editing.id;
      mutate(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            list[i].comment = text;
            list[i].chips = chips;
            list[i].updatedAt = new Date().toISOString();
          }
        }
      });
      toast("Правка обновлена");
    } else if (pending) {
      var item = {
        id: uid(),
        page: pending.page,
        pageTitle: pending.pageTitle,
        selector: pending.selector,
        tag: pending.tag,
        text: pending.text,
        nearestHeading: pending.nearestHeading
      };
      ["src", "alt", "imageInside", "backgroundImage"].forEach(function (k) {
        if (pending[k] != null && pending[k] !== "") item[k] = pending[k];
      });
      item.viewport = pending.viewport;
      item.device = pending.device;
      item.chips = chips;
      item.comment = text;
      item.createdAt = new Date().toISOString();
      mutate(function (list) { list.push(item); });
      toast("Правка сохранена — " + comments.length + " всего");
    }
    closeDialog();
  }

  function removeComment(id) {
    mutate(function (list) {
      for (var i = list.length - 1; i >= 0; i--) if (list[i].id === id) list.splice(i, 1);
    });
    toast("Правка удалена");
  }

  function clearAll() {
    if (!comments.length) { toast("Правок пока нет"); return; }
    if (!window.confirm("Удалить все правки на всех страницах (" + comments.length + ")? Это нельзя отменить.\nСовет: сначала скачайте файл правок.")) return;
    mutate(function (list) { list.length = 0; });
    toast("Все правки удалены");
  }

  function deactivate() {
    try { if (store) store.removeItem(FLAG_KEY); } catch (e) {}
    setPicking(false);
    unbind();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (pinLayer && pinLayer.parentNode) pinLayer.parentNode.removeChild(pinLayer);
    var st = document.head.querySelector("style[data-sv-review-ui]");
    if (st) st.parentNode.removeChild(st);
    html.classList.remove("sv-rv-active", "sv-rv-picking");
  }

  /* ---------- экспорт ---------- */
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function code(s) { return "`" + String(s).replace(/`/g, "'") + "`"; }

  function buildMarkdown(list) {
    var now = new Date();
    var out = [];
    out.push("# Правки заказчика к сайту SvetoART");
    out.push("Дата: " + pad(now.getDate()) + "." + pad(now.getMonth() + 1) + "." + now.getFullYear() + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + "  |  Всего правок: " + list.length);
    out.push("");
    out.push("> Для Claude Code: это список правок от заказчика. Для каждой правки указаны страница, CSS-селектор, текст элемента и комментарий. Найди элемент в коде, внеси изменение, ничего лишнего не трогай. Если селектор не находит элемент — ищи по тексту и ближайшему заголовку. Если правка неоднозначна — не гадай, вынеси в отдельный список «Вопросы».");
    var pages = [];
    var groups = {};
    list.forEach(function (c) {
      if (!groups[c.page]) { groups[c.page] = []; pages.push(c.page); }
      groups[c.page].push(c);
    });
    pages.forEach(function (page) {
      out.push("");
      out.push("## Страница: " + page + " — «" + (groups[page][0].pageTitle || page) + "»");
      groups[page].forEach(function (c, i) {
        out.push("");
        out.push("### " + (i + 1) + "." + (c.chips && c.chips.length ? " [" + c.chips.join(", ") + "]" : ""));
        if (c.tag === "img") {
          out.push("- Элемент: " + code("img") + " — alt: «" + (c.alt || "") + "», src: " + code(c.src || ""));
        } else {
          out.push("- Элемент: " + code(c.tag) + (c.text ? " — «" + c.text + "»" : " — без текста"));
        }
        out.push("- Селектор: " + code(c.selector));
        if (c.nearestHeading) out.push("- Рядом заголовок: «" + c.nearestHeading + "»");
        if (c.imageInside) out.push("- Картинка внутри: " + code(c.imageInside));
        if (c.backgroundImage) out.push("- Фоновое изображение: " + code(c.backgroundImage));
        out.push("- Экран: " + c.viewport + " (" + (c.device === "touch" ? "телефон/планшет" : "компьютер") + ")");
        out.push("- Комментарий: " + String(c.comment).replace(/\r?\n/g, "\n  "));
      });
    });
    out.push("");
    out.push("---");
    out.push("## Данные в JSON");
    out.push("```json");
    out.push(JSON.stringify(list, null, 2));
    out.push("```");
    out.push("");
    return out.join("\n");
  }

  function fileName() {
    var d = new Date();
    return "pravki-svetoart-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".md";
  }

  function downloadText(text, name) {
    var blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = ui(el("a"));
    a.href = url;
    a.download = name;
    a.style.display = "none";
    root.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
  }

  function exportFile() {
    comments = loadComments();
    if (!comments.length) { toast("Правок пока нет — скачивать нечего"); return; }
    var text = buildMarkdown(comments);
    var name = fileName();
    var file = null;
    try { file = new File([text], name, { type: "text/markdown" }); } catch (e) {}
    var canShare = false;
    try { canShare = isTouch() && !!file && !!navigator.share && !!navigator.canShare && navigator.canShare({ files: [file] }); } catch (e) {}
    if (canShare) {
      navigator.share({ files: [file], title: "Правки к сайту SvetoART" })
        .then(function () { toast("Файл правок отправлен"); })
        .catch(function () { downloadText(text, name); toast("Файл правок скачан"); });
      return;
    }
    downloadText(text, name);
    toast("Файл правок скачан: " + name);
  }

  function copyText() {
    comments = loadComments();
    if (!comments.length) { toast("Правок пока нет"); return; }
    var text = buildMarkdown(comments);
    var fallback = function () {
      var ta = ui(el("textarea"));
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
      root.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      root.removeChild(ta);
      toast(ok ? "Правки скопированы — вставьте их в сообщение" : "Не удалось скопировать — скачайте файл");
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Правки скопированы — вставьте их в сообщение");
      }, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- уведомления ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastBox.textContent = msg;
    toastBox.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove("is-on"); }, 2600);
  }

  /* ---------- обработчики ---------- */
  var blockedTypes = ["mousedown", "mouseup", "auxclick", "dblclick", "submit", "dragstart"];
  var resizeObs = null;

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (backdrop.classList.contains("is-open")) closeDialog();
    else if (picking) setPicking(false);
  }

  function onStorage(e) {
    if (e.key === DATA_KEY) {
      comments = loadComments();
      renderAll();
    }
  }

  function onScroll() {
    hoverBox.style.display = "none";
    schedulePins(180);
  }

  function onResize() { schedulePins(120); }
  function onLoad() { schedulePins(50); }

  function bind() {
    window.addEventListener("click", onPickClick, true);
    blockedTypes.forEach(function (t) { window.addEventListener(t, blockEvent, true); });
    window.addEventListener("mousemove", onPickMove, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("storage", onStorage);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", onLoad);
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) imgs[i].addEventListener("load", onLoad, { once: true });
    }
    if (window.ResizeObserver) {
      resizeObs = new ResizeObserver(function () { schedulePins(150); });
      resizeObs.observe(document.body);
    }
  }

  function unbind() {
    window.removeEventListener("click", onPickClick, true);
    blockedTypes.forEach(function (t) { window.removeEventListener(t, blockEvent, true); });
    window.removeEventListener("mousemove", onPickMove, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("load", onLoad);
    if (resizeObs) resizeObs.disconnect();
  }

  /* ---------- запуск ---------- */
  function init() {
    if (!document.body) return;
    buildUI();
    html.classList.add("sv-rv-active");
    bind();
    renderAll();
    // анимации появления сдвигают блоки — пересчитываем пины ещё пару раз
    schedulePins(400);
    setTimeout(renderPins, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
