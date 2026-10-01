/* =====================================================================
 * render.js  ·  Config-driven renderer for the research project page.
 *
 * This file is the UI layer. It contains NO paper-specific content:
 * every piece of text, link, figure, and table is read at runtime from
 * config.json (the data layer). To change the page, edit config.json;
 * you should rarely need to touch this file.
 *
 * Supported section/block types (see config.schema.json for the full
 * contract): text, list, figure, table, callout, subtitle, html, group, video,
 * pdf.
 * ===================================================================== */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var CONFIG_PATH = (app && app.getAttribute("data-config")) || "config.json";
  // Directory of this script, used to locate bundled assets (static/js/pdfjs/).
  var SCRIPT_DIR = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/[^\/]*$/, "")
    : "static/js/";

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === "class") e.className = v;
        else if (k === "html") e.innerHTML = v;
        else if (k === "text") e.textContent = v;
        else e.setAttribute(k, v);
      }
    }
    appendChildren(e, children);
    return e;
  }

  function appendChildren(e, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
  }

  function alignClass(a) {
    if (a === "left") return "has-text-left";
    if (a === "center") return "has-text-centered";
    return "has-text-justified";
  }


  /* ---------- <head> / SEO / citation meta ---------- */
  function setMetaTag(attr, name, content) {
    if (content == null || content === "") return;
    var sel = "meta[" + attr + '="' + name + '"]';
    var m = document.head.querySelector(sel);
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute(attr, name);
      document.head.appendChild(m);
    }
    m.setAttribute("content", content);
  }

  function addMetaTag(attr, name, content) {
    if (content == null || content === "") return;
    var m = document.createElement("meta");
    m.setAttribute(attr, name);
    m.setAttribute("content", content);
    document.head.appendChild(m);
  }

  function setFavicon(href) {
    var l = document.head.querySelector('link[rel="icon"]');
    if (!l) {
      l = document.createElement("link");
      l.setAttribute("rel", "icon");
      document.head.appendChild(l);
    }
    l.setAttribute("href", href);
  }

  function applyHead(cfg) {
    var site = cfg.site || {};
    if (site.title) document.title = site.title;
    if (site.lang) document.documentElement.setAttribute("lang", site.lang);
    setMetaTag("name", "description", site.description);
    setMetaTag("name", "keywords", site.keywords);
    if (site.favicon) setFavicon(site.favicon);
    // Google Scholar / citation meta
    setMetaTag("name", "citation_title", site.title);
    (cfg.authors || []).forEach(function (a) {
      addMetaTag("name", "citation_author", a.name);
    });
    if (site.publicationDate) setMetaTag("name", "citation_publication_date", site.publicationDate);
    if (site.venue) setMetaTag("name", "citation_conference_title", site.venue);
  }

  /* ---------- hero ---------- */
  function buildHero(cfg) {
    var site = cfg.site || {};
    var col = h("div", { "class": "column has-text-centered" });

    col.appendChild(h("h1", { "class": "title is-2 publication-title", html: site.title || "" }));
    if (site.venue) col.appendChild(h("h2", { "class": "publication-venue-line", html: site.venue }));

    var affs = cfg.affiliations || [];
    var multiAff = affs.length > 1;

    var authors = cfg.authors || [];
    if (authors.length) {
      var aDiv = h("div", { "class": "is-size-5 publication-authors" });
      authors.forEach(function (a, i) {
        var block = h("span", { "class": "author-block" });
        if (a.url) block.appendChild(h("a", { href: a.url, target: "_blank", rel: "noopener" }, a.name));
        else block.appendChild(document.createTextNode(a.name));
        if (multiAff && a.affiliations && a.affiliations.length)
          block.appendChild(h("sup", { html: a.affiliations.join(",") }));
        if (a.note) block.appendChild(h("sup", { html: a.note }));
        aDiv.appendChild(block);
        // Exactly two authors are joined with "and"; three or more use commas.
        if (i < authors.length - 1)
          aDiv.appendChild(document.createTextNode(authors.length === 2 ? " and " : ", "));
      });
      col.appendChild(aDiv);
    }

    if (affs.length) {
      var afDiv = h("div", { "class": "is-size-5 publication-affiliations" });
      affs.forEach(function (af, i) {
        var span = h("span", { "class": "affiliation-block" });
        if (multiAff) span.appendChild(h("sup", { html: String(af.id) + " " }));
        span.appendChild(document.createTextNode(af.name));
        afDiv.appendChild(span);
        if (i < affs.length - 1) afDiv.appendChild(document.createTextNode("   "));
      });
      col.appendChild(afDiv);
    }

    var links = (cfg.links || []).filter(function (l) { return l.enabled !== false && l.url; });
    if (links.length) {
      var lc = h("div", { "class": "publication-links" });
      links.forEach(function (l) {
        var a = h("a", {
          href: l.url,
          "class": "external-link button is-normal is-rounded is-dark",
          target: "_blank",
          rel: "noopener"
        }, [
          h("span", { "class": "icon" }, h("i", { "class": l.icon || "fas fa-link" })),
          h("span", null, l.label || l.type || "Link")
        ]);
        lc.appendChild(h("span", { "class": "link-block" }, a));
      });
      col.appendChild(lc);
    }

    return h("section", { "class": "hero" },
      h("div", { "class": "hero-body" },
        h("div", { "class": "container is-max-desktop" },
          h("div", { "class": "columns is-centered" }, col))));
  }

  /* ---------- generic section wrapper ---------- */
  function sectionWrap(col, opts) {
    opts = opts || {};
    var attrs = { "class": "section" };
    if (opts.tightTop) attrs.style = "padding-top:0";
    if (opts.id) attrs.id = opts.id;
    return h("section", attrs,
      h("div", { "class": "container is-max-desktop" },
        h("div", { "class": "columns is-centered" }, col)));
  }

  /* ---------- block renderers (append into a column) ---------- */
  function appendBody(col, node) {
    switch (node.type) {
      case "text":
        col.appendChild(h("div", { "class": "content " + alignClass(node.align), html: "<p>" + (node.body || "") + "</p>" }));
        break;
      case "list":
        var listTag = node.ordered === false ? "ul" : "ol";
        var list = h(listTag, { "class": "contrib-list " + alignClass(node.align || "left") });
        (node.items || []).forEach(function (it) { list.appendChild(h("li", { html: it })); });
        col.appendChild(list);
        break;
      case "figure":
        col.appendChild(buildFigure(node));
        break;
      case "table":
        col.appendChild(buildTable(node));
        break;
      case "callout":
        var cls = "callout" + (node.variant ? " callout-" + node.variant : "");
        col.appendChild(h("div", { "class": cls, html: node.body || "" }));
        break;
      case "subtitle":
        col.appendChild(h("h3", { "class": "title is-4 has-text-left", html: node.text || node.title || "" }));
        break;
      case "video":
        (Array.isArray(node.videos) ? node.videos : (node.url ? [{ url: node.url, caption: node.caption }] : []))
          .forEach(function (v) {
            if (!v || v.enabled === false || !v.url) return;
            if (v.title) col.appendChild(h("h3", { "class": "title is-4 has-text-centered", html: v.title }));
            col.appendChild(buildVideoEmbed(v.url));
            if (v.caption) col.appendChild(h("p", { "class": "fig-caption has-text-centered", html: v.caption }));
          });
        break;
      case "pdf":
        col.appendChild(buildPdfViewer(node));
        break;
      case "html":
        col.appendChild(h("div", { "class": "content " + alignClass(node.align), html: node.body || "" }));
        break;
      case "group":
        (node.blocks || []).forEach(function (b) { if (b && b.enabled !== false) appendBody(col, b); });
        break;
      default:
        if (node.body) col.appendChild(h("div", { "class": "content", html: node.body }));
    }
  }

  function buildSection(section, opts) {
    if (section.enabled === false) return null;
    var col = h("div", { "class": "column is-four-fifths" });
    if (section.title && section.type !== "subtitle")
      col.appendChild(h("h2", { "class": "title is-3 has-text-centered", html: section.title }));
    appendBody(col, section);
    return sectionWrap(col, opts);
  }

  /* ---------- video embed (YouTube / Vimeo / mp4) ---------- */
  function toYouTubeEmbed(url) {
    if (!url) return url;
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{6,})/);
    return m ? "https://www.youtube.com/embed/" + m[1] : url;
  }

  function buildVideoEmbed(url) {
    var wrap = h("div", { "class": "publication-video" });
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
      var v = h("video", { controls: "", playsinline: "", preload: "metadata" });
      v.appendChild(h("source", { src: url }));
      wrap.appendChild(v);
    } else {
      wrap.appendChild(h("iframe", {
        src: toYouTubeEmbed(url),
        title: "Embedded video",
        frameborder: "0",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        referrerpolicy: "strict-origin-when-cross-origin",
        allowfullscreen: ""
      }));
    }
    return wrap;
  }

  /* ---------- figure with graceful placeholder ---------- */
  function buildFigure(node) {
    var frag = document.createDocumentFragment();
    var width = node.width || "100%";
    var img = h("img", {
      src: node.image,
      alt: node.alt || "",
      style: "width:" + width + ";display:block;margin:0 auto;"
    });
    img.addEventListener("error", function () {
      var ph = h("div", { "class": "figure-placeholder", style: "max-width:" + width },
        [
          h("div", { "class": "figure-placeholder-icon", html: "&#x1F5BC;" }),
          h("div", { "class": "figure-placeholder-title", text: node.alt || "Figure" }),
          h("div", { "class": "figure-placeholder-note", text: "Missing image: " + node.image })
        ]);
      if (img.parentNode) img.parentNode.replaceChild(ph, img);
    });
    frag.appendChild(img);
    if (node.caption) frag.appendChild(h("p", { "class": "fig-caption", html: node.caption }));
    return frag;
  }

  /* ---------- PDF viewer: scrollable pages rendered with self-hosted PDF.js ----------
   * Block: { "type": "pdf", "title"?, "file", "label"?, "caption"? }
   * PDF.js (static/js/pdfjs/) is loaded only when the viewer approaches the
   * viewport. If it cannot load, the browser's built-in PDF viewer is used. */
  var PDFJS_DIR = SCRIPT_DIR + "pdfjs/";
  var pdfjsPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = PDFJS_DIR + "pdf.min.js";
      s.async = true;
      s.onload = function () {
        var lib = window.pdfjsLib;
        if (!lib) { reject(new Error("PDF.js did not initialise")); return; }
        lib.GlobalWorkerOptions.workerSrc = PDFJS_DIR + "pdf.worker.min.js";
        resolve(lib);
      };
      s.onerror = function () { reject(new Error("Could not load PDF.js")); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }

  function pdfButton(icon, label, extraClass) {
    return h("button", {
      type: "button",
      "class": "pdf-btn" + (extraClass ? " " + extraClass : ""),
      title: label,
      "aria-label": label
    }, h("i", { "class": icon, "aria-hidden": "true" }));
  }

  function buildPdfViewer(node) {
    var frag = document.createDocumentFragment();
    var file = node.file || node.url;
    if (!file) return frag;
    var unit = node.label || "Page";
    var name = node.title || "Document";
    var PAD = 14;

    var prev = pdfButton("fas fa-chevron-up", "Previous " + unit.toLowerCase());
    var next = pdfButton("fas fa-chevron-down", "Next " + unit.toLowerCase());
    var counter = h("span", { "class": "pdf-counter", "aria-live": "polite" });
    var fsBtn = pdfButton("fas fa-expand", "Full screen");
    var openLink = h("a", { "class": "pdf-btn", href: file, target: "_blank", rel: "noopener", title: "Open the PDF in a new tab" },
      [h("i", { "class": "fas fa-external-link-alt", "aria-hidden": "true" }), h("span", { "class": "pdf-btn-text", text: "Open" })]);
    var dlLink = h("a", { "class": "pdf-btn", href: file, download: "", title: "Download the PDF" },
      [h("i", { "class": "fas fa-download", "aria-hidden": "true" }), h("span", { "class": "pdf-btn-text", text: "Download" })]);
    prev.disabled = true;
    next.disabled = true;

    var bar = h("div", { "class": "pdf-toolbar" },
      [prev, counter, next, h("span", { "class": "pdf-spacer" }), fsBtn, openLink, dlLink]);
    var scroller = h("div", { "class": "pdf-scroll", tabindex: "0", role: "region", "aria-label": name + " (scrollable)" },
      h("div", { "class": "pdf-status", text: "Loading " + name.toLowerCase() + "…" }));
    var wrap = h("div", { "class": "pdf-viewer" }, [bar, scroller]);
    frag.appendChild(wrap);
    if (node.caption) frag.appendChild(h("p", { "class": "fig-caption", html: node.caption }));

    var canFullscreen = !!(wrap.requestFullscreen || wrap.webkitRequestFullscreen);
    if (!canFullscreen) fsBtn.style.display = "none";

    var pdfDoc = null, pages = [], total = 0, current = 0, ratio = 9 / 16, started = false;

    function isFullscreen() {
      return (document.fullscreenElement || document.webkitFullscreenElement) === wrap;
    }

    function layout() {
      if (!total) return;
      var innerW = scroller.clientWidth - 2 * PAD;
      var pageW = innerW;
      if (isFullscreen()) {
        scroller.style.height = "";
        var availH = window.innerHeight - bar.offsetHeight - 2 * PAD;
        pageW = Math.min(innerW, availH / ratio);
      } else {
        scroller.style.height = Math.round(innerW * ratio + 2 * PAD) + "px";
      }
      scroller.style.setProperty("--pdf-page-w", Math.floor(pageW) + "px");
    }

    function centerTop(i) {
      var p = pages[i];
      return p.offsetTop - (scroller.clientHeight - p.offsetHeight) / 2;
    }

    function goTo(i, instant) {
      if (!total) return;
      i = Math.max(0, Math.min(total - 1, i));
      if (instant) scroller.scrollTop = centerTop(i);
      else scroller.scrollTo({ top: centerTop(i), behavior: "smooth" });
    }

    function updateCurrent() {
      if (!total) return;
      var mid = scroller.scrollTop + scroller.clientHeight / 2, best = 0, bestD = Infinity;
      for (var i = 0; i < total; i++) {
        var d = Math.abs(pages[i].offsetTop + pages[i].offsetHeight / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      }
      current = best;
      counter.textContent = unit + " " + (best + 1) + " / " + total;
      prev.disabled = best === 0;
      next.disabled = best === total - 1;
    }

    function renderPage(i) {
      var el = pages[i];
      if (el.getAttribute("data-state")) return;
      el.setAttribute("data-state", "loading");
      var canvas = document.createElement("canvas");
      pdfDoc.getPage(i + 1).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var cssW = el.clientWidth || scroller.clientWidth;
        var target = Math.min(2400, Math.max(1600, cssW * (window.devicePixelRatio || 1)));
        var vp = page.getViewport({ scale: target / base.width });
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise.then(function () {
          el.style.aspectRatio = base.width + " / " + base.height;
          page.cleanup();
          return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
        });
      }).then(function (blob) {
        if (!blob) throw new Error("Could not encode page");
        el.appendChild(h("img", { src: URL.createObjectURL(blob), alt: unit + " " + (i + 1) + " of " + total, draggable: "false" }));
        el.setAttribute("data-state", "done");
        canvas.width = canvas.height = 0;
      }).catch(function () {
        el.removeAttribute("data-state");
      });
    }

    function fallback() {
      total = 0;
      scroller.innerHTML = "";
      scroller.style.height = "";
      scroller.className = "pdf-scroll pdf-fallback";
      scroller.appendChild(h("iframe", { src: file, title: name }));
      counter.textContent = "";
      prev.style.display = next.style.display = fsBtn.style.display = "none";
    }

    function start() {
      if (started) return;
      started = true;
      loadPdfJs().then(function (lib) {
        return lib.getDocument({ url: file, isEvalSupported: false }).promise;
      }).then(function (doc) {
        pdfDoc = doc;
        return doc.getPage(1);
      }).then(function (first) {
        var v = first.getViewport({ scale: 1 });
        ratio = v.height / v.width;
        total = pdfDoc.numPages;
        scroller.innerHTML = "";
        for (var i = 0; i < total; i++) {
          var el = h("div", { "class": "pdf-page", "data-page": String(i + 1) });
          el.style.aspectRatio = v.width + " / " + v.height;
          pages.push(el);
          scroller.appendChild(el);
        }
        layout();
        updateCurrent();

        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) renderPage(Number(e.target.getAttribute("data-page")) - 1);
            });
          }, { root: scroller, rootMargin: "150% 0px" });
          pages.forEach(function (el) { io.observe(el); });
        } else {
          for (var j = 0; j < total; j++) renderPage(j);
        }

        var ticking = false;
        scroller.addEventListener("scroll", function () {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(function () { ticking = false; updateCurrent(); });
        }, { passive: true });
        prev.addEventListener("click", function () { goTo(current - 1); });
        next.addEventListener("click", function () { goTo(current + 1); });
        wrap.addEventListener("keydown", function (e) {
          if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
          else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
        });

        function relayout() {
          var keep = current;
          layout();
          window.requestAnimationFrame(function () { goTo(keep, true); updateCurrent(); });
        }
        var resizeQueued = false;
        window.addEventListener("resize", function () {
          if (resizeQueued) return;
          resizeQueued = true;
          window.requestAnimationFrame(function () { resizeQueued = false; relayout(); });
        });
        if (canFullscreen) {
          fsBtn.addEventListener("click", function () {
            if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            else (wrap.requestFullscreen || wrap.webkitRequestFullscreen).call(wrap);
          });
          var onFullscreenChange = function () {
            var on = isFullscreen();
            fsBtn.firstChild.className = on ? "fas fa-compress" : "fas fa-expand";
            fsBtn.setAttribute("title", on ? "Exit full screen" : "Full screen");
            fsBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
            relayout();
            if (on) scroller.focus({ preventScroll: true });
          };
          document.addEventListener("fullscreenchange", onFullscreenChange);
          document.addEventListener("webkitfullscreenchange", onFullscreenChange);
        }
      }).catch(fallback);
    }

    // Start loading only when the viewer approaches the viewport.
    setTimeout(function () {
      if (!("IntersectionObserver" in window)) { start(); return; }
      var near = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { near.disconnect(); start(); }
      }, { rootMargin: "800px 0px" });
      near.observe(wrap);
    }, 0);

    return frag;
  }

  /* ---------- table ---------- */
  function buildTable(t) {
    var frag = document.createDocumentFragment();
    var wrap = h("div", { "class": "table-wrap" });
    var table = h("table", { "class": "results-table" });
    if (t.caption) table.appendChild(h("caption", { html: t.caption }));

    var cols = t.columns || [];
    var thead = h("thead");
    var trh = h("tr");
    cols.forEach(function (c) {
      trh.appendChild(h("th", { "class": c.align === "left" ? "t-left" : null, html: c.header || "" }));
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = h("tbody");
    (t.rows || []).forEach(function (r) {
      var tr = h("tr", { "class": r["class"] || null });
      (r.cells || []).forEach(function (cell, idx) {
        var val, cellClass = null;
        if (cell && typeof cell === "object") { val = cell.v; cellClass = cell["class"] || null; }
        else { val = (cell == null ? "" : String(cell)); }
        var colAlign = (cols[idx] && cols[idx].align === "left") ? "t-left" : null;
        var klass = [colAlign, cellClass].filter(Boolean).join(" ") || null;
        tr.appendChild(h("td", { "class": klass, html: val }));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    frag.appendChild(wrap);
    if (t.legend) frag.appendChild(h("p", { "class": "table-legend", html: t.legend }));
    return frag;
  }

  /* ---------- abstract ---------- */
  function buildAbstract(cfg) {
    var ab = cfg.abstract;
    if (!ab || !ab.body) return null;
    var col = h("div", { "class": "column is-four-fifths" });
    col.appendChild(h("h2", { "class": "title is-3 has-text-centered", html: ab.title || "Abstract" }));
    col.appendChild(h("div", { "class": "content has-text-justified", html: "<p>" + ab.body + "</p>" }));
    return sectionWrap(col, {});
  }

  /* ---------- poster ---------- */
  function buildPoster(cfg) {
    var p = cfg.poster || {};
    if (!p.enabled || !p.file) return null;
    var col = h("div", { "class": "column is-four-fifths has-text-centered" });
    col.appendChild(h("hr"));
    col.appendChild(h("h2", { "class": "title is-3", html: p.title || "Poster" }));
    var pdf = h("div", { "class": "publication-pdf" });
    pdf.appendChild(h("iframe", { src: p.file, frameborder: "0", loading: "lazy" }));
    col.appendChild(pdf);
    col.appendChild(h("p", { "class": "fig-caption has-text-centered",
      html: 'If the poster does not display, <a href="' + p.file + '" target="_blank" rel="noopener">open it directly</a>.' }));
    return sectionWrap(col, {});
  }

  /* ---------- bibtex ---------- */
  var COPY_SVG =
    '<svg height="100%" viewBox="0 0 36 36" width="100%">' +
    '<path d="M21.9,8.3H11.3c-0.9,0-1.7,.8-1.7,1.7v12.3h1.7V10h10.6V8.3z M24.6,11.8h-9.7c-1,0-1.8,.8-1.8,1.8v12.3' +
    'c0,1,.8,1.8,1.8,1.8h9.7c1,0,1.8-0.8,1.8-1.8V13.5C26.3,12.6,25.5,11.8,24.6,11.8z M24.6,25.9h-9.7V13.5h9.7V25.9z"></path>' +
    '</svg>';

  function showToast(msg) {
    var t = h("div", { "class": "copy-toast", text: msg });
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1500);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast("BibTeX copied to clipboard!"); })
        .catch(function () { showToast("Copy failed. Select the text manually."); });
    } else {
      showToast("Copy not supported. Select the text manually.");
    }
  }

  function buildBibtex(cfg) {
    var b = cfg.bibtex;
    if (!b || !b.entry || b.enabled === false) return null;
    var col = h("div", { "class": "column is-four-fifths", style: "position:relative" });
    col.appendChild(h("h2", { "class": "title", html: b.title || "BibTeX" }));
    var content = h("div", { "class": "content has-text-justified", style: "position:relative" });
    var pre = h("pre");
    var code = h("code", { id: "bibtexContent" });
    code.textContent = b.entry;
    pre.appendChild(code);
    content.appendChild(pre);
    var copy = h("div", { "class": "copy-icon", title: "Copy to clipboard", html: COPY_SVG });
    copy.addEventListener("click", function () { copyText(b.entry); });
    content.appendChild(copy);
    col.appendChild(content);
    return h("section", { "class": "section", id: "BibTeX" },
      h("div", { "class": "container is-max-desktop" },
        h("div", { "class": "columns is-centered has-text-centered" }, col)));
  }

  /* ---------- footer ---------- */
  function buildFooter(cfg) {
    var f = cfg.footer || {};
    var content = h("div", { "class": "content has-text-centered" });
    var any = false;
    if (f.showLinks) {
      var links = (cfg.links || []).filter(function (l) { return l.enabled !== false && l.url; });
      if (links.length) {
        var p = h("p", { "class": "footer-icons" });
        links.forEach(function (l) {
          p.appendChild(h("a", { href: l.url, "class": "icon-link", target: "_blank", rel: "noopener", title: l.label || l.type },
            h("i", { "class": l.icon || "fas fa-link" })));
        });
        content.appendChild(p);
        any = true;
      }
    }
    if (f.text) { content.appendChild(h("p", { "class": "footer-note", html: f.text })); any = true; }
    if (!any) return null;
    return h("footer", { "class": "footer" },
      h("div", { "class": "container" },
        h("div", { "class": "columns is-centered" },
          h("div", { "class": "column is-8" }, content))));
  }

  /* ---------- orchestration ---------- */
  function render(cfg) {
    applyHead(cfg);
    var frag = document.createDocumentFragment();
    frag.appendChild(buildHero(cfg));
    var abs = buildAbstract(cfg);
    if (abs) frag.appendChild(abs);
    (cfg.sections || []).forEach(function (s) {
      var sec = buildSection(s, {});
      if (sec) frag.appendChild(sec);
    });
    var poster = buildPoster(cfg);
    if (poster) frag.appendChild(poster);
    var bib = buildBibtex(cfg);
    if (bib) frag.appendChild(bib);
    var foot = buildFooter(cfg);
    if (foot) frag.appendChild(foot);
    app.innerHTML = "";
    app.appendChild(frag);
  }

  function showError(err) {
    var isFile = location.protocol === "file:";
    var box = h("section", { "class": "section" },
      h("div", { "class": "container is-max-desktop" },
        h("div", { "class": "notification config-error" }, [
          h("h2", { "class": "title is-4", text: "Could not load config.json" }),
          isFile
            ? h("div", null, [
                h("p", { html: "The page was opened directly from the file system, so the browser blocked loading <code>config.json</code> (CORS on the <code>file://</code> protocol)." }),
                h("p", { html: "Start a tiny local server from the project folder, then reload:" }),
                h("pre", { text: "python -m http.server 8000" }),
                h("p", { html: "and open <a href=\"http://localhost:8000\">http://localhost:8000</a>. Deploying to GitHub Pages works without this step." })
              ])
            : h("p", { text: "Details: " + (err && err.message ? err.message : String(err)) })
        ])));
    app.innerHTML = "";
    app.appendChild(box);
  }

  function init() {
    if (!app) return;
    fetch(CONFIG_PATH, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status + " for " + CONFIG_PATH); return r.json(); })
      .then(render)
      .catch(showError);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
