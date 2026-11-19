/* Site content overrides. Written by /admin/. Defensive: if anything fails, the game runs unchanged. */
(function () {
  'use strict';
  var C = { text: {}, sub: {}, assets: {}, imgs: {} };
  var base = '';
  try {
    var cs = document.currentScript;
    base = cs && cs.src ? cs.src.replace(/[^\/]*$/, '') : '';
    var x = new XMLHttpRequest();
    x.open('GET', base + 'content.json?t=' + Date.now(), false);
    x.send();
    if (x.status === 200) {
      var j = JSON.parse(x.responseText);
      ['text', 'sub', 'assets', 'imgs'].forEach(function (k) {
        if (j && j[k] && typeof j[k] === 'object') C[k] = j[k];
      });
    }
  } catch (e) {}
  window.__SITE_CONTENT = C;
  var total = 0;
  for (var k0 in C) total += Object.keys(C[k0]).length;
  if (!total) return;

  var has = Object.prototype.hasOwnProperty;

  // 1) Replace embedded card images: game reads window.__ASSETS lazily, so patch it when it is assigned.
  try {
    var store;
    Object.defineProperty(window, '__ASSETS', {
      configurable: true, enumerable: true,
      get: function () { return store; },
      set: function (v) {
        store = v;
        try { for (var k in C.assets) if (C.assets[k]) v[k] = base + C.assets[k]; } catch (e) {}
      }
    });
  } catch (e) {}

  function hash(s) { var x = 5381, i = s.length; while (i) x = (x * 33) ^ s.charCodeAt(--i); return (x >>> 0).toString(36); }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  var subKeys = Object.keys(C.sub);
  function rewrite(s) {
    var n = norm(s), out = s;
    if (n && has.call(C.text, n) && C.text[n] !== n) {
      var m = s.match(/^(\s*)[\s\S]*?(\s*)$/);
      out = m[1] + C.text[n] + m[2];
    }
    for (var i = 0; i < subKeys.length; i++) {
      if (subKeys[i] && out.indexOf(subKeys[i]) > -1) out = out.split(subKeys[i]).join(C.sub[subKeys[i]]);
    }
    return out === s ? null : out;
  }

  var ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  function fixNode(n) {
    try {
      var v = n.nodeValue;
      if (n.__ov === v) return;
      var r = rewrite(v);
      if (r !== null) { n.__ov = r; n.nodeValue = r; }
    } catch (e) {}
  }
  function fixEl(el) {
    try {
      var ov = el.__ova || (el.__ova = {});
      for (var i = 0; i < ATTRS.length; i++) {
        var a = ATTRS[i], v = el.getAttribute(a);
        if (!v || ov[a] === v) continue;
        var r = rewrite(v);
        if (r !== null) { ov[a] = r; el.setAttribute(a, r); }
      }
      if (el.tagName === 'IMG') {
        var s = el.getAttribute('src');
        if (s && s.slice(0, 5) === 'data:') {
          var p = C.imgs[hash(s)];
          if (p) el.setAttribute('src', base + p);
        }
      }
    } catch (e) {}
  }
  function walk(n) {
    if (n.nodeType === 3) { fixNode(n); return; }
    if (n.nodeType !== 1) return;
    var t = n.tagName;
    if (t === 'SCRIPT' || t === 'STYLE') return;
    fixEl(n);
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
  }

  try {
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'childList') { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
        else if (m.type === 'characterData') fixNode(m.target);
        else if (m.type === 'attributes') fixEl(m.target);
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['src', 'placeholder', 'title', 'alt', 'aria-label']
    });
    walk(document.documentElement);
    document.addEventListener('DOMContentLoaded', function () { walk(document.documentElement); });
  } catch (e) {}
})();
