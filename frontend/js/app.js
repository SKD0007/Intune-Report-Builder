/* Copyright 2026 Orynr LLC. Developed by SKDOSS.
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Reports page. Hash routes:
   #/                 home (report gallery)
   #/r/<id>           built-in or saved report
   #/new              build your own: pick a data source
   #/new/<sourceId>   build your own: new report from a source
   #/query            advanced: type a Graph query
   #/q/<encodedPath>  advanced: results of a Graph query */
(function () {
  const C = window.CATALOG;
  const { icon, esc, toast } = UI;
  const $app = document.getElementById('app');
  const DAY = 86400000;
  const BLANK = '__blank__';
  const GB = 1024 ** 3;

  const state = {
    status: null,
    saved: [],
    savedLoaded: false,
    cache: new Map(),
    home: { cat: 'all', q: '' },
    view: null
  };

  // =================================================================== helpers
  const splitCamel = s => String(s)
    .replace(/^#?microsoft\.graph\./, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_.]/g, ' ')
    .replace(/^./, c => c.toUpperCase());

  function labelFor(key) {
    if (C.LABELS[key]) return C.LABELS[key];
    return key.split('.').map(splitCamel).join(' › ');
  }

  function odataLabel(v) {
    const k = String(v).replace(/^#?microsoft\.graph\./, '');
    return C.ODATA_TYPES[k] || splitCamel(k);
  }

  function valueLabel(key, v) {
    if (v == null) return '';
    if (key === '@odata.type') return odataLabel(v);
    const map = C.VALUES[key.split('.').pop()] || C.VALUES[key];
    if (map && Object.prototype.hasOwnProperty.call(map, v)) return map[v];
    if (C.ENUM_FIELDS.includes(key.split('.').pop()) && typeof v === 'string') {
      return v.split(',').map(x => splitCamel(x.trim())).join(', ');
    }
    return String(v);
  }

  function hasPermission(perm) {
    const roles = (state.status && state.status.roles) || [];
    if (!perm || !roles.length) return true; // unknown → don't nag
    const needed = Array.isArray(perm) ? perm : [perm];
    return needed.some(p => roles.includes(p) || roles.includes(p.replace('.Read.', '.ReadWrite.')) || roles.includes(p.replace('.ReadBasic.', '.Read.')) ||
      (/^(User|Group|Device|Organization)\./.test(p) && (roles.includes('Directory.Read.All') || roles.includes('Directory.ReadWrite.All'))));
  }
  const permName = perm => Array.isArray(perm) ? perm[0] : perm;

  function resolvePath(path) {
    return path.replace(/\{daysAgo:(\d+)\}/g, (_, d) =>
      new Date(Date.now() - Number(d) * DAY).toISOString().replace(/\.\d+Z$/, 'Z'));
  }

  function sourceOf(def) {
    return C.SOURCES[def.source] || null;
  }

  function fmtNum(n) { return Number(n).toLocaleString(); }

  function relTime(ms) {
    const diff = Date.now() - ms;
    const future = diff < 0;
    const days = Math.floor(Math.abs(diff) / DAY);
    let s;
    if (days === 0) s = 'today';
    else if (days === 1) s = future ? 'tomorrow' : 'yesterday';
    else if (days < 60) s = `${days} days`;
    else if (days < 730) s = `${Math.round(days / 30.4)} months`;
    else s = `${Math.round(days / 365)} years`;
    if (days <= 1) return s;
    return future ? `in ${s}` : `${s} ago`;
  }

  function dateMs(raw) {
    const t = Date.parse(raw);
    return isNaN(t) || t < 31536000000 ? null : t; // before 1971 = "never"
  }

  function fmtDate(ms) {
    return new Date(ms).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function isoLocal(ms) {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  // =================================================================== data shaping
  function flatten(obj, prefix, out, depth) {
    for (const [k, v] of Object.entries(obj)) {
      if (k === '@odata.context' || k.endsWith('@odata.context') || k === '@odata.id' || k === '@odata.etag') continue;
      const key = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && depth < 3 && Object.keys(v).length) {
        flatten(v, key, out, depth + 1);
      } else {
        out[key] = v;
      }
    }
    return out;
  }

  function analyse(rawRows) {
    const rows = rawRows.map(r => (r && typeof r === 'object') ? flatten(r, '', {}, 0) : { value: r });
    const order = [];
    const seen = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => { if (!seen.has(k)) { seen.add(k); order.push(k); } }));
    const info = {};
    for (const key of order) {
      let nonEmpty = 0, bools = 0, nums = 0, dates = 0, arrays = 0, objs = 0, maxLen = 0;
      const distinct = new Map();
      for (const r of rows) {
        const v = r[key];
        if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
        nonEmpty++;
        if (typeof v === 'boolean') bools++;
        else if (typeof v === 'number') nums++;
        else if (Array.isArray(v)) arrays++;
        else if (typeof v === 'object') objs++;
        else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) dates++;
        if (typeof v === 'string') maxLen = Math.max(maxLen, v.length);
        if (distinct.size <= 200) {
          const dk = Array.isArray(v) ? v.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v));
          distinct.set(dk, (distinct.get(dk) || 0) + 1);
        }
      }
      let type = 'text';
      if (!nonEmpty) type = 'text';
      else if (bools === nonEmpty) type = 'bool';
      else if (nums === nonEmpty) type = /InBytes$|sizeInByte$/i.test(key) ? 'bytes' : 'number';
      else if (dates === nonEmpty) type = 'date';
      else if (arrays === nonEmpty) type = 'list';
      else if (objs) type = 'json';
      else if (key === '@odata.type' || C.ENUM_FIELDS.includes(key.split('.').pop()) ||
        (distinct.size <= 30 && distinct.size < Math.max(4, nonEmpty * 0.5) && maxLen <= 80)) type = 'enum';
      info[key] = { key, label: labelFor(key), type, distinct, nonEmpty };
    }
    return { rows, order, info };
  }

  function isEmpty(raw) {
    if (raw == null || raw === '') return true;
    if (Array.isArray(raw)) return raw.length === 0;
    if (typeof raw === 'string' && /^000[01]-01-01T/.test(raw)) return true;
    if (typeof raw === 'object' && !Object.keys(raw).length) return true;
    return false;
  }

  function listItemText(key, x) {
    if (x && typeof x === 'object') return x.displayName || x.name || x.id || JSON.stringify(x);
    return valueLabel(key, x);
  }

  // Plain text used for search, summary, CSV.
  function cellText(info, raw) {
    if (isEmpty(raw)) return (typeof raw === 'string' && raw) ? 'Never' : '';
    const key = info ? info.key : '';
    const type = info ? info.type : 'text';
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    if (type === 'date') { const ms = dateMs(raw); return ms ? fmtDate(ms) : String(raw); }
    if (type === 'bytes') return (raw / GB).toFixed(1) + ' GB';
    // Windows/Intune error codes are recognised in hex (0x87D1041C), not as large negative numbers.
    if (type === 'number' && /error ?code|hresult/i.test(key) && raw) return '0x' + (raw >>> 0).toString(16).toUpperCase().padStart(8, '0');
    if (type === 'number') return fmtNum(raw);
    if (Array.isArray(raw)) return raw.map(x => listItemText(key, x)).join(', ');
    if (typeof raw === 'object') return JSON.stringify(raw);
    return valueLabel(key, raw);
  }

  function cellHtml(info, raw) {
    const key = info ? info.key : '';
    if (isEmpty(raw)) {
      return (typeof raw === 'string' && raw) ? '<span class="muted">Never</span>' : '<span class="muted">—</span>';
    }
    const base = key.split('.').pop();
    const tones = C.TONES[base];
    // Yes/No fields where "Yes" is the bad news (e.g. "May not work") carry their own tones.
    if (typeof raw === 'boolean' && tones) return `<span class="badge ${tones[String(raw)] || ''}">${raw ? 'Yes' : 'No'}</span>`;
    if (typeof raw === 'boolean') return raw ? '<span class="yes">Yes</span>' : '<span class="no">No</span>';
    if (tones && typeof raw === 'string') {
      return `<span class="badge ${tones[raw] || ''}">${esc(valueLabel(key, raw))}</span>`;
    }
    if (info && info.type === 'date') {
      const ms = dateMs(raw);
      if (!ms) return esc(raw);
      const rel = C.RELATIVE_DATES.includes(base) ? `<span class="rel">${esc(relTime(ms))}</span>` : '';
      return esc(fmtDate(ms)) + rel;
    }
    return esc(cellText(info, raw));
  }

  // =================================================================== filters
  const OPS = {
    eq: { label: 'is', input: 'value' },
    ne: { label: 'is not', input: 'value' },
    in: { label: 'is one of', input: 'multi' },
    notin: { label: 'is none of', input: 'multi' },
    contains: { label: 'contains', input: 'text' },
    notcontains: { label: "doesn't contain", input: 'text' },
    istrue: { label: 'is Yes', input: null },
    isfalse: { label: 'is No', input: null },
    olderThan: { label: 'is more than … days ago (or never)', short: 'more than', input: 'days' },
    newerThan: { label: 'is within the last … days', short: 'within the last', input: 'days' },
    withinNext: { label: 'is within the next … days (or already past)', short: 'within the next', input: 'days' },
    gt: { label: 'is more than', input: 'number' },
    lt: { label: 'is less than', input: 'number' },
    empty: { label: 'is empty', input: null },
    notempty: { label: 'is not empty', input: null }
  };
  const OPS_BY_TYPE = {
    text: ['contains', 'notcontains', 'eq', 'ne', 'empty', 'notempty'],
    json: ['contains', 'notcontains', 'empty', 'notempty'],
    enum: ['eq', 'ne', 'in', 'notin', 'contains', 'empty', 'notempty'],
    list: ['contains', 'notcontains', 'empty', 'notempty'],
    bool: ['istrue', 'isfalse', 'empty'],
    date: ['olderThan', 'newerThan', 'withinNext', 'empty', 'notempty'],
    number: ['gt', 'lt', 'eq', 'empty', 'notempty'],
    bytes: ['lt', 'gt', 'empty']
  };

  const norm = v => String(v == null ? '' : v).toLowerCase();

  function testFilter(f, raw, info) {
    const empty = isEmpty(raw);
    const v = f.value;
    switch (f.op) {
      case 'empty': return empty;
      case 'notempty': return !empty;
      case 'istrue': return raw === true || norm(raw) === 'true';
      case 'isfalse': return raw === false || norm(raw) === 'false';
      case 'eq': return !empty && (typeof raw === 'number' ? raw === Number(v) : norm(raw) === norm(v));
      case 'ne': return empty || norm(raw) !== norm(v);
      case 'in': return !empty && (v || []).some(x => norm(x) === norm(raw));
      case 'notin': return empty || !(v || []).some(x => norm(x) === norm(raw));
      case 'contains':
      case 'notcontains': {
        const needle = norm(v).trim();
        const hay = norm(Array.isArray(raw) ? raw.join(' ') : (typeof raw === 'object' ? JSON.stringify(raw) : raw)) + ' ' + norm(cellText(info, raw));
        const hit = !empty && hay.includes(needle);
        return f.op === 'contains' ? hit : !hit;
      }
      case 'olderThan': { const ms = dateMs(raw); return !ms || ms < Date.now() - Number(v) * DAY; }
      case 'newerThan': { const ms = dateMs(raw); return !!ms && ms >= Date.now() - Number(v) * DAY; }
      case 'withinNext': { const ms = dateMs(raw); return !!ms && ms <= Date.now() + Number(v) * DAY; }
      case 'gt':
      case 'lt': {
        if (empty) return false;
        const n = info && info.type === 'bytes' ? raw / GB : Number(raw);
        return f.op === 'gt' ? n > Number(v) : n < Number(v);
      }
    }
    return true;
  }

  function filterText(f, info) {
    const label = info ? info.label : labelFor(f.col);
    const op = OPS[f.op] || { label: f.op };
    const key = info ? info.key : f.col;
    const vl = x => typeof x === 'boolean' ? (x ? 'Yes' : 'No') : valueLabel(key, x);
    switch (op.input) {
      case null: return `<b>${esc(label)}</b> ${esc(op.label)}`;
      case 'multi': return `<b>${esc(label)}</b> ${esc(op.label)} ${esc((f.value || []).map(vl).join(', '))}`;
      case 'days': return `<b>${esc(label)}</b> ${esc(op.short)} ${esc(f.value)} days${f.op === 'olderThan' ? ' ago' : ''}`;
      case 'number': return `<b>${esc(label)}</b> ${esc(op.label)} ${esc(f.value)}${info && info.type === 'bytes' ? ' GB' : ''}`;
      default: return `<b>${esc(label)}</b> ${esc(op.label)} “${esc(vl(f.value))}”`;
    }
  }

  // =================================================================== overlays
  function closeOverlays() {
    document.querySelectorAll('.overlay, .popover, .drawer, .modal').forEach(el => el.remove());
    document.removeEventListener('keydown', escListener);
  }
  function escListener(e) { if (e.key === 'Escape') closeOverlays(); }

  function openLayer(html, cls, opts) {
    closeOverlays();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    if (cls === 'popover') ov.style.background = 'transparent';
    ov.addEventListener('click', closeOverlays);
    document.body.appendChild(ov);
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('role', 'dialog');
    el.innerHTML = html;
    document.body.appendChild(el);
    if (opts && opts.anchor) {
      const r = opts.anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      el.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
      const below = r.bottom + 6;
      el.style.top = (below + el.offsetHeight > window.innerHeight - 12 ? Math.max(12, r.top - el.offsetHeight - 6) : below) + 'px';
    }
    document.addEventListener('keydown', escListener);
    const first = el.querySelector('input:not([type=checkbox]), select, textarea, button.primary');
    if (first) setTimeout(() => first.focus(), 30);
    return el;
  }

  function confirmDialog(title, text, okLabel, danger) {
    return new Promise(resolve => {
      const el = openLayer(`
        <div class="modal-head"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>
        <div class="modal-foot">
          <button class="btn" data-a="no">Cancel</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(okLabel)}</button>
        </div>`, 'modal');
      el.querySelector('[data-a=no]').onclick = () => { closeOverlays(); resolve(false); };
      el.querySelector('[data-a=yes]').onclick = () => { closeOverlays(); resolve(true); };
      el.querySelector('[data-a=yes]').focus();
    });
  }

  // =================================================================== top bar status
  function renderConn() {
    const el = document.getElementById('conn');
    const s = state.status;
    if (!s) { el.innerHTML = '<span class="dot warn"></span><span class="txt">Checking connection…</span>'; return; }
    if (s.connected) {
      el.innerHTML = '<span class="dot ok"></span><span class="txt">Connected to Microsoft</span>';
      el.title = 'Connected to Microsoft Graph (read-only)';
    } else if (s.offline) {
      el.innerHTML = '<span class="dot bad"></span><span class="txt">Server not reachable</span>';
    } else {
      el.innerHTML = `<span class="dot bad"></span><span class="txt">${s.configured ? 'Sign-in problem' : 'Not set up'}</span>`;
      el.title = s.error || 'Not connected';
    }
  }

  function statusBanner() {
    const s = state.status;
    if (!s || s.connected) return '';
    if (s.offline) return `<div class="banner bad">${icon('alert')}<div class="grow"><b>Can't reach the Report Builder server.</b>Make sure the service or start-app window is still running, then refresh this page.</div></div>`;
    if (s.credentialsUnreadable) return `<div class="banner warn">${icon('alert')}<div class="grow"><b>The saved connection can't be read on this computer.</b>An admin needs to re-enter the connection details in Settings.</div><a class="btn sm" href="/settings#/admin">Open Settings</a></div>`;
    if (s.error) return `<div class="banner bad">${icon('alert')}<div class="grow"><b>Can't sign in to Microsoft.</b>${esc(s.error)}</div><a class="btn sm" href="/settings#/admin">Open Settings</a></div>`;
    return `<div class="banner info">${icon('info')}<div class="grow"><b>Almost ready.</b>An admin needs to connect this tool to your Microsoft tenant (one-time setup).</div><a class="btn sm primary" href="/settings#/admin">Set up now</a></div>`;
  }

  // =================================================================== expiry alerts (home)
  // Apple push certificate, Apple tokens, app secrets and certificates that expired recently or expire soon.
  // Built server-side from the Connectors & tokens and App secrets & certificates reports.
  const ALERT_SHOW = 5;
  // from=home: opened from the home page, not a link someone sent (no "Shared view" note).
  const reportLink = (id, view) => `#/r/${encodeURIComponent(id)}` + (view ? '?v=' + encodeView(view) + '&from=home' : '');

  function alertWhen(i) {
    const n = i.daysLeft;
    const date = new Date(dateMs(i.expires) || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const rel = n < 0 ? `Expired ${-n === 1 ? 'yesterday' : -n + ' days ago'}` : n === 0 ? 'Expires today' : n === 1 ? 'Expires tomorrow' : `Expires in ${n} days`;
    return `${rel} · ${date}`;
  }

  function alertsHtml() {
    const a = state.alerts;
    if (!a || !a.enabled || !a.connected) return '';
    const checked = ['Apple and connector tokens', 'App secrets and certificates'].filter(w => !a.skipped.some(s => s.what === w));
    if (!checked.length) return '';
    const skippedNote = a.skipped.length ? ` <span class="muted small" title="${esc(a.skipped.map(s => s.what + ': ' + s.why).join('\n'))}">(${esc(a.skipped.map(s => s.what.toLowerCase()).join(', '))} couldn't be checked)</span>` : '';
    const refresh = `<button class="btn sm icon subtle" id="expRefresh" title="Check again${a.checkedAt ? ' (last checked ' + esc(relTime(a.checkedAt * 1000)) + ')' : ''}" aria-label="Check again">${icon('refresh', 'sm')}</button>`;
    if (!a.items.length) {
      return `<div class="expiry-ok">${icon('check', 'sm')}<span>Nothing expires in the next ${a.days} days. Checked: ${esc(checked.join(' and ').toLowerCase())}.${skippedNote}</span>${refresh}</div>`;
    }
    const shown = state.alertsAll ? a.items : a.items.slice(0, ALERT_SHOW);
    const sevOf = i => i.daysLeft < 0 || i.daysLeft <= 7 || i.own ? 'bad' : 'warn';
    const all = { filters: [{ col: 'daysLeft', op: 'gt', value: -a.days - 1 }, { col: 'daysLeft', op: 'lt', value: a.days + 1 }], sort: { col: 'daysLeft', dir: 'asc' } };
    return `<section class="card expiry" aria-label="Expiry alerts">
      <div class="expiry-head">${icon('alert')}<h2>Expiring soon</h2><span class="n">${a.items.length}</span>
        <span class="muted small grow">Expired in the last ${a.days} days or expiring in the next ${a.days}.${skippedNote}</span>
        <a class="btn sm subtle" href="${reportLink('connectors', all)}">Apple tokens</a>
        <a class="btn sm subtle" href="${reportLink('app-credentials', all)}">App secrets</a>${refresh}</div>
      <ul class="expiry-list">${shown.map(i => `<li><a href="${reportLink(i.report, i.find ? { search: i.find } : null)}">
        <span class="dot ${sevOf(i)}"></span>
        <span class="what"><b>${esc(i.name || i.kind)}</b><small>${esc(i.kind)}</small>
          ${i.own ? '<span class="badge bad" title="The secret this app uses to connect to Microsoft. Renew it and enter the new one in Settings, or reports stop working.">This app\'s connection</span>' : ''}</span>
        <span class="when ${sevOf(i)}">${esc(alertWhen(i))}</span></a></li>`).join('')}</ul>
      ${a.items.length > ALERT_SHOW ? `<button class="btn sm subtle expiry-more" id="expMore">${state.alertsAll ? 'Show fewer' : `Show all ${a.items.length}`}</button>` : ''}
    </section>`;
  }

  function wireAlerts() {
    const more = document.getElementById('expMore');
    if (more) more.onclick = () => { state.alertsAll = !state.alertsAll; renderHome(); };
    const r = document.getElementById('expRefresh');
    if (r) r.onclick = () => { r.disabled = true; loadAlerts(true); };
  }

  async function loadAlerts(refresh) {
    if (!state.status || !state.status.connected) return;
    try { state.alerts = await API.alerts(refresh); }
    catch (e) { if (refresh) toast(e.message, 'bad'); return; }
    if (isHome()) renderHome();
  }

  // =================================================================== home
  function allTiles() {
    const saved = state.saved.map(r => ({ ...r, mine: true, category: 'mine' }));
    return saved.concat(C.REPORTS);
  }

  function tileHtml(r) {
    const src = C.SOURCES[r.source];
    const iconName = r.mine ? 'report' : (src ? src.icon : 'report');
    const locked = src && !hasPermission(src.permission);
    const lic = missingLicense(src);
    return `<a class="tile ${r.mine ? 'mine' : ''}" href="#/r/${encodeURIComponent(r.id)}">
      <span class="ic">${icon(iconName)}</span>
      <span class="body">
        <span class="t">${esc(r.name)}</span>
        <span class="d">${esc(r.description || (src ? src.name : r.source))}</span>
        ${lic ? `<span class="tag" title="Your tenant doesn't have ${esc(LICENSE_NAMES[lic])}">${icon('lock', 'sm')}Needs ${esc(LICENSE_NAMES[lic].replace('Microsoft ', ''))}</span>`
          : locked ? `<span class="tag" title="Needs ${esc(permName(src.permission))}">${icon('lock', 'sm')}Needs permission</span>` : ''}
      </span>
      ${r.mine && UI.getMe().canSave ? `<button class="btn sm icon subtle del" data-del="${esc(r.id)}" title="Delete this saved report" aria-label="Delete">${icon('trash', 'sm')}</button>` : ''}
    </a>`;
  }

  function renderHome() {
    const h = state.home;
    const q = h.q.trim().toLowerCase();
    const cats = [{ id: 'all', name: 'All reports' }].concat(
      state.saved.length ? [{ id: 'mine', name: 'My reports' }] : [], C.CATEGORIES);
    if (!cats.some(c => c.id === h.cat)) h.cat = 'all';

    const match = r => !q || (r.name + ' ' + (r.description || '') + ' ' + ((C.SOURCES[r.source] || {}).name || '')).toLowerCase().includes(q);
    const tiles = allTiles().filter(match);
    const groups = [{ id: 'mine', name: 'My reports', icon: 'report' }].concat(C.CATEGORIES)
      .filter(g => h.cat === 'all' || h.cat === g.id)
      .map(g => ({ ...g, items: tiles.filter(t => t.category === g.id || (g.id === 'mine' && t.mine)) }));

    const createTiles = `
      <a class="tile create" href="#/new"><span class="ic">${icon('plus')}</span><span class="body">
        <span class="t">Build your own report</span>
        <span class="d">Pick what to report on, choose columns and filters, then save it.</span></span></a>
      <a class="tile create" href="#/query"><span class="ic">${icon('code')}</span><span class="body">
        <span class="t">Advanced: Graph query</span>
        <span class="d">For experts: run any read-only Microsoft Graph URL.</span></span></a>`;

    let body = '';
    for (const g of groups) {
      const isMine = g.id === 'mine';
      if (!g.items.length && !(isMine && !q && (h.cat === 'all' || h.cat === 'mine'))) continue;
      body += `<section class="section">
        <div class="section-head">${icon(g.icon)}<h2>${esc(g.name)}</h2><span class="n">${g.items.length || ''}</span></div>
        <div class="grid">${isMine && !q ? createTiles : ''}${g.items.map(tileHtml).join('')}</div>
      </section>`;
    }
    if (!body) {
      body = `<div class="empty">${icon('search')}<b>No reports match “${esc(h.q)}”</b>Try another word, or <a href="#/new">build your own report</a>.</div>`;
    }

    $app.innerHTML = `<div class="page">
      ${statusBanner()}
      <div class="hero">
        <div class="titles"><h1>Reports</h1><p>Pick a ready-made report or build your own. Reports only read data; nothing in Intune is changed.</p></div>
        <label class="search-box">${icon('search')}<input id="homeSearch" type="search" placeholder="Search reports, e.g. “non-compliant”" value="${esc(h.q)}" aria-label="Search reports"></label>
      </div>
      ${q ? '' : alertsHtml()}
      <div class="chips" role="tablist">${cats.map(c => `<button class="chip ${h.cat === c.id ? 'active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${h.cat === c.id}">${esc(c.name)}</button>`).join('')}</div>
      <div id="homeBody">${body}</div>
    </div>`;

    const input = document.getElementById('homeSearch');
    input.addEventListener('input', debounce(() => {
      h.q = input.value;
      const pos = input.selectionStart;
      renderHome();
      const again = document.getElementById('homeSearch');
      again.focus(); again.setSelectionRange(pos, pos);
    }, 150));
    wireAlerts();
    $app.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { h.cat = b.dataset.cat; renderHome(); });
    $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const rep = state.saved.find(r => r.id === b.dataset.del);
      if (!rep || !await confirmDialog('Delete report?', `“${rep.name}” will be removed for everyone who uses this tool.`, 'Delete', true)) return;
      try {
        await API.deleteReport(rep.id);
        state.saved = state.saved.filter(r => r.id !== rep.id);
        toast('Report deleted');
        renderHome();
      } catch (err) { toast(err.message, 'bad'); }
    });
  }

  // =================================================================== build your own
  function renderSourcePicker() {
    const all = Object.entries(C.SOURCES);
    $app.innerHTML = `<div class="page">
      <a class="back" href="#/">${icon('left', 'sm')}All reports</a>
      <div class="page-head"><div class="titles"><h1>Build your own report</h1>
        <p>Step 1 of 2: what do you want to report on? ${fmtNum(all.length)} data sources, from Intune, Entra ID, Windows 365 and Microsoft 365.
          Next you'll choose columns and filters.</p></div>
        <label class="search-box">${icon('search', 'sm')}<input id="srcSearch" type="search" placeholder="Search data sources…" aria-label="Search data sources"></label></div>
      <div id="srcGroups"></div>
    </div>`;
    const draw = q => {
      q = (q || '').trim().toLowerCase();
      const order = C.AREAS || [];
      const groups = new Map();
      all.filter(([, s]) => !q || (s.name + ' ' + (s.description || '') + ' ' + (s.area || '')).toLowerCase().includes(q))
        .sort(([, a], [, b]) => (order.indexOf(a.area) - order.indexOf(b.area)) || ((b.curated ? 1 : 0) - (a.curated ? 1 : 0)) || a.name.localeCompare(b.name))
        .forEach(([id, s]) => { if (!groups.has(s.area)) groups.set(s.area, []); groups.get(s.area).push([id, s]); });
      document.getElementById('srcGroups').innerHTML = groups.size ? [...groups].map(([area, list]) => `
        <section class="section"><div class="section-head">${icon(list[0][1].icon)}<h2>${esc(area)}</h2><span class="n">${list.length}</span></div>
          <div class="source-list">${list.map(([id, s]) => {
            const locked = !hasPermission(s.permission);
            const lic = missingLicense(s);
            return `<a class="tile" href="#/new/${encodeURIComponent(id)}"><span class="ic">${icon(s.icon)}</span><span class="body">
              <span class="t">${esc(s.name)}</span><span class="d">${esc(s.description)}</span>
              ${lic ? `<span class="tag">${icon('lock', 'sm')}Needs ${esc(LICENSE_NAMES[lic].replace('Microsoft ', ''))}</span>`
                : locked ? `<span class="tag" title="Needs ${esc(permName(s.permission))}">${icon('lock', 'sm')}Needs permission</span>` : ''}</span></a>`;
          }).join('')}</div></section>`).join('')
        : `<div class="empty">${icon('search')}<b>No data source matches “${esc(q)}”</b></div>`;
    };
    draw('');
    const box = document.getElementById('srcSearch');
    box.oninput = debounce(() => draw(box.value), 150);
    box.focus();
  }

  function renderQueryPage() {
    const examples = [
      '/deviceManagement/managedDevices?$filter=operatingSystem eq \'Windows\'',
      '/deviceManagement/deviceCategories',
      '/deviceManagement/roleDefinitions',
      '/deviceAppManagement/mobileAppConfigurations',
      '/groups?$filter=startswith(displayName,\'Intune\')'
    ];
    $app.innerHTML = `<div class="page" style="max-width:900px">
      <a class="back" href="#/">${icon('left', 'sm')}All reports</a>
      <div class="page-head"><div class="titles"><h1>Advanced: Graph query</h1>
        <p>Run any read-only Microsoft Graph request (beta by default). Results open as a normal report you can filter, export and save.</p></div></div>
      <div class="card card-pad">
        <label class="field"><span>Graph URL or path</span>
          <textarea id="gq" class="mono" rows="3" placeholder="/deviceManagement/managedDevices?$select=deviceName,osVersion"></textarea>
          <small>Relative to https://graph.microsoft.com/beta. Start with /v1.0/ to use the v1.0 endpoint. Paging is followed automatically.</small></label>
        <div class="form-actions"><button class="btn primary" id="gqRun">${icon('chart', 'sm')}Run query</button></div>
        <div class="examples"><span class="muted small" style="align-self:center">Examples:</span>
          ${examples.map(e => `<button class="btn sm" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      </div>
    </div>`;
    const ta = document.getElementById('gq');
    const run = () => { const v = ta.value.trim(); if (v) location.hash = '#/q/' + encodeURIComponent(v); };
    document.getElementById('gqRun').onclick = run;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) { e.preventDefault(); run(); } });
    $app.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { ta.value = b.dataset.ex; ta.focus(); });
    ta.focus();
  }

  // =================================================================== report view
  function openReport(def, key) {
    const src = sourceOf(def);
    const v = {
      key, def,
      path: src ? src.path : def.source,
      sourceName: src ? src.name : 'Custom Graph query',
      permission: src ? src.permission : null,
      columns: (def.columns && def.columns.length) ? [...def.columns] : (src ? [...src.columns] : []),
      filters: (def.filters || []).map(f => ({ ...f })),
      search: def.search || '',
      sort: def.sort ? { ...def.sort } : null,
      summaryBy: def.summaryBy === undefined ? null : def.summaryBy,
      page: 0, pageSize: 100,
      data: null, loading: false, error: null, dirty: !!def.isNew
    };
    state.view = v;
    loadData(false);
  }

  function shapeResult(res) {
    const shaped = analyse(res.rows || []);
    shaped.fetchedAt = Date.now();
    shaped.truncated = res.truncated;
    shaped.dropped = res.droppedFields || [];
    shaped.notes = res.notes || [];
    return shaped;
  }

  // Reports Intune prepares on request run as background jobs: the user can wait here,
  // cancel, or leave and get a notification (bell, top right) when it's ready.
  async function loadJob(v, path, force) {
    v.loading = true; v.error = null; v.job = null;
    renderReport();
    try {
      v.job = await API.jobs.start(path.slice(5), force);
      JOBS.track(v.job, v.def.name, '/' + location.hash);
    } catch (e) {
      if (state.view !== v) return;
      v.error = e; v.loading = false; renderReport(); return;
    }
    JOBS.setViewing(v.job.id);
    renderReport();
    while (state.view === v && v.job) {
      const st = v.job.status;
      if (st === 'done') {
        try {
          const shaped = shapeResult(await API.jobs.result(v.job.id));
          state.cache.set(path, shaped);
          JOBS.update(v.job.id, { status: 'done', seen: true, rows: shaped.rows.length, finishedAt: Date.now() });
          if (state.view !== v) return;
          v.data = shaped; v.job = null; finishLoad();
        } catch (e) { if (state.view === v) { v.error = e; v.loading = false; v.job = null; renderReport(); } }
        return;
      }
      if (st === 'failed' || st === 'cancelled') {
        const err = new Error(st === 'cancelled' ? 'This report was cancelled.' : ((v.job.error && v.job.error.message) || "Intune couldn't prepare this report."));
        err.kind = (v.job.error && v.job.error.kind) || 'graph';
        JOBS.update(v.job.id, { status: st, seen: true, finishedAt: Date.now(), error: err.message });
        v.error = err; v.loading = false; v.job = null; renderReport();
        return;
      }
      await new Promise(r => setTimeout(r, 3000));
      if (state.view !== v || !v.job) return;
      try { v.job = await API.jobs.get(v.job.id); } catch (e) {
        if (state.view === v) { v.error = e; v.loading = false; v.job = null; renderReport(); }
        return;
      }
      const el = document.getElementById('jobElapsed');
      if (el) el.textContent = elapsedText(v.job.started);
    }
  }

  function elapsedText(startedSec) {
    const s = Math.max(0, Math.round(Date.now() / 1000 - startedSec));
    return s < 60 ? `${s} seconds` : `${Math.floor(s / 60)} min ${s % 60} s`;
  }

  // Licences a data source needs (from the catalog) vs. what the tenant has (from /api/status).
  const LICENSE_NAMES = { entraP1: 'Microsoft Entra ID P1', entraP2: 'Microsoft Entra ID P2', intune: 'Microsoft Intune', windows365: 'Windows 365' };
  function missingLicense(src) {
    const lic = state.status && state.status.licenses;
    if (!lic || !src || !src.requires) return null;
    return lic[src.requires] ? null : src.requires;
  }

  async function loadData(force) {
    const v = state.view;
    const path = resolvePath(v.path);
    let cached = state.cache.get(path);
    if (cached && path.startsWith('view:export:')) {
      const done = JOBS.latestDone(path.slice(5));
      if (done && done.finishedAt > cached.fetchedAt) cached = null; // a newer copy was prepared in the background
    }
    if (cached && !force) { v.data = cached; finishLoad(); return; }
    const need = !v.tryAnyway && missingLicense(sourceOf(v.def));
    if (need) {
      const err = new Error(`This report needs ${LICENSE_NAMES[need]}, which your tenant doesn't have.`);
      err.kind = 'notlicensed'; err.license = need;
      v.error = err; v.loading = false; renderReport(); return;
    }
    if (path.startsWith('view:export:')) return loadJob(v, path, force);
    v.loading = true; v.error = null;
    v.abort = new AbortController();
    renderReport();
    try {
      // "view:<name>" sources are combined reports built on the server from several Graph calls.
      const res = path.startsWith('view:') ? await API.view(path.slice(5), v.abort.signal) : await API.query(path, v.abort.signal);
      const shaped = shapeResult(res);
      state.cache.set(path, shaped);
      if (state.view !== v) return;
      v.data = shaped;
      finishLoad();
    } catch (e) {
      if (e.name === 'AbortError' || state.view !== v) return;
      v.error = e;
      v.loading = false;
      renderReport();
    }
  }

  function finishLoad() {
    const v = state.view;
    v.loading = false;
    const d = v.data;
    if (!v.columns.length) {
      v.columns = d.order.filter(k => k !== '@odata.type' && d.info[k].type !== 'json').slice(0, 10);
    }
    if (v.summaryBy && !d.info[v.summaryBy]) v.summaryBy = null;
    renderReport();
  }

  function visibleRows() {
    const v = state.view, d = v.data;
    let rows = d.rows;
    for (const f of v.filters) {
      const info = d.info[f.col];
      rows = rows.filter(r => testFilter(f, r[f.col], info));
    }
    const q = v.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r => v.columns.some(c => {
        const raw = r[c];
        return !isEmpty(raw) && (norm(raw).includes(q) || cellText(d.info[c], raw).toLowerCase().includes(q));
      }));
    }
    if (v.sort && v.sort.col) {
      const info = d.info[v.sort.col] || { type: 'text' };
      const dir = v.sort.dir === 'desc' ? -1 : 1;
      const keyOf = raw => {
        if (isEmpty(raw)) return null;
        if (info.type === 'date') return dateMs(raw);
        if (info.type === 'number' || info.type === 'bytes') return Number(raw);
        if (info.type === 'bool') return raw ? 1 : 0;
        return cellText(info, raw);
      };
      const keyed = rows.map(r => [keyOf(r[v.sort.col]), r]);
      keyed.sort((a, b) => {
        if (a[0] === null && b[0] === null) return 0;
        if (a[0] === null) return 1;
        if (b[0] === null) return -1;
        if (typeof a[0] === 'number' && typeof b[0] === 'number') return (a[0] - b[0]) * dir;
        return String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
      rows = keyed.map(k => k[1]);
    }
    return rows;
  }

  function summarizable(info) {
    return info && (info.type === 'enum' || info.type === 'bool' || (info.type === 'list' && info.distinct.size <= 60) ||
      (info.type === 'text' && info.distinct.size <= 60 && info.distinct.size > 1));
  }

  function summaryHtml(rows) {
    const v = state.view, d = v.data;
    const options = d.order.filter(k => summarizable(d.info[k]))
      .sort((a, b) => d.info[a].label.localeCompare(d.info[b].label));
    let bars = '';
    if (v.summaryBy && d.info[v.summaryBy]) {
      const info = d.info[v.summaryBy];
      const counts = new Map();
      for (const r of rows) {
        const raw = r[v.summaryBy];
        const k = isEmpty(raw) ? BLANK : (Array.isArray(raw) ? raw.join(', ') : String(raw));
        const e = counts.get(k) || { raw, n: 0 };
        e.n++; counts.set(k, e);
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
      const top = sorted.slice(0, 8);
      const rest = sorted.slice(8).reduce((s, e) => s + e[1].n, 0);
      const max = top.length ? top[0][1].n : 1;
      const total = rows.length || 1;
      bars = top.map(([k, e]) => {
        const txt = k === BLANK ? '(blank)' : cellText(info, e.raw);
        return `<button class="bar" data-sv="${esc(k)}" title="Show only: ${esc(txt)}">
          <span class="k">${esc(txt)}</span>
          <span class="track"><span class="fill" style="width:${(e.n / max * 100).toFixed(1)}%"></span></span>
          <span class="v"><b>${fmtNum(e.n)}</b> · ${Math.round(e.n / total * 100)}%</span></button>`;
      }).join('') + (rest ? `<div class="bar" style="cursor:default"><span class="k muted">${sorted.length - 8} other values</span><span></span><span class="v"><b>${fmtNum(rest)}</b></span></div>` : '');
      if (!rows.length) bars = '<span class="muted small">Nothing to summarize.</span>';
    }
    return `<div class="summary">
      <div class="summary-head">${icon('chart', 'sm')}<span>Summary by</span>
        <select id="sumBy" aria-label="Summarize by column">
          <option value="">— none —</option>
          ${options.map(k => `<option value="${esc(k)}" ${v.summaryBy === k ? 'selected' : ''}>${esc(d.info[k].label)}</option>`).join('')}
        </select>
        ${v.summaryBy ? '<span class="muted small">Click a bar to filter.</span>' : ''}
      </div>
      ${bars ? `<div class="bars">${bars}</div>` : ''}
    </div>`;
  }

  function errorHint(e) {
    const v = state.view;
    switch (e.kind) {
      case 'permission':
        return `The app registration needs the <code>${esc(permName(v.permission) || 'right')}</code> application permission, with admin consent granted. An admin can check this in <a href="/settings#/admin">Settings</a>.`;
      case 'notconfigured':
      case 'auth':
        return 'An admin needs to (re)connect this tool in <a href="/settings#/admin">Settings</a>.';
      case 'throttled':
        return 'Microsoft limits how often data can be read. Wait a minute, then try again.';
      case 'notlicensed':
        if (e.license === 'entraP1' || e.license === 'entraP2' || /Entra ID P[12]/.test(e.message))
          return 'Entra ID P1 comes with Microsoft 365 E3/E5, Business Premium and EMS; P2 with Microsoft 365 E5 and EMS E5. The licences your tenant has are listed in <a href="/settings#/admin">Settings</a>.';
        if (e.license === 'windows365') return 'This needs Windows 365 Cloud PCs in your tenant.';
        return 'Intune needs a licence such as Microsoft Intune Plan 1, Microsoft 365 Business Premium or Microsoft 365 E3/E5 (free trials are available in the Microsoft 365 admin center).';
      case 'badquery':
      case 'notfound':
        return v.def.isQuery ? 'Check the spelling of the Graph URL.' : 'This report may not be available in your tenant.';
      case 'offline':
        return 'Check that the Report Builder service is running.';
      default:
        return '';
    }
  }

  function renderReport() {
    const v = state.view;
    const def = v.def;
    const isSaved = !!def.mine;
    const head = `
      <a class="back" href="#/">${icon('left', 'sm')}All reports</a>
      <div class="report-head">
        <div class="titles"><h1>${esc(def.name)}</h1><p>${esc(def.description || v.sourceName)}</p></div>
        <div class="actions">
          <button class="btn" id="refreshBtn" ${v.loading ? 'disabled' : ''}>${icon('refresh', 'sm')}Refresh</button>
          <button class="btn" id="shareBtn" title="Copy a link to this exact view: columns, filters, search and sort">${icon('copy', 'sm')}Copy link</button>
          <button class="btn" id="exportBtn" ${!v.data || v.loading ? 'disabled' : ''}>${icon('download', 'sm')}Export to Excel</button>
          ${UI.getMe().canSave ? `<button class="btn ${v.dirty ? 'primary' : ''}" id="saveBtn" ${!v.data || v.loading ? 'disabled' : ''}>${icon('save', 'sm')}${isSaved ? 'Save' : 'Save as my report'}</button>` : ''}
        </div>
      </div>`;

    if (v.loading && v.job) {
      $app.innerHTML = `<div class="page wide">${head}<div class="card"><div class="loading">
        <div class="spinner"></div><b>We're preparing this report…</b>
        <p class="muted">Intune builds this report on request. It usually takes one to five minutes (<span id="jobElapsed">${esc(elapsedText(v.job.started))}</span> so far).
          You don't have to wait here: we'll show it as soon as it's ready, or tell you with the bell at the top right.</p>
        <div class="form-actions" style="justify-content:center">
          <button class="btn primary" id="notifyBtn">${icon('bell', 'sm')}Notify me when it's ready</button>
          <button class="btn" id="cancelJobBtn">Cancel</button></div></div></div></div>`;
      document.getElementById('notifyBtn').onclick = () => {
        JOBS.setViewing(null);
        toast("We'll let you know when it's ready. Look for the bell at the top right.");
        location.hash = '#/';
      };
      document.getElementById('cancelJobBtn').onclick = async () => {
        const id = v.job && v.job.id;
        v.job = null;
        if (id) { try { await API.jobs.cancel(id); } catch (e) { /* already done */ } JOBS.forget(id); }
        location.hash = '#/';
      };
      return;
    }
    if (v.loading) {
      $app.innerHTML = `<div class="page wide">${head}<div class="card"><div class="loading">
        <div class="spinner"></div><b>Getting data from Microsoft…</b>
        <p class="muted">Large tenants can take a minute or two. Please keep this page open.</p>
        <button class="btn" id="cancelBtn">Cancel</button></div></div></div>`;
      document.getElementById('cancelBtn').onclick = () => { v.abort && v.abort.abort(); location.hash = '#/'; };
      wireShare();
      return;
    }
    if (v.error) {
      const e = v.error;
      $app.innerHTML = `<div class="page wide">${head}
        <div class="banner bad">${icon('alert')}<div class="grow"><b>${esc(e.message)}</b>${errorHint(e)}</div>
        <button class="btn sm" id="retryBtn">${e.license ? 'Try anyway' : 'Try again'}</button></div></div>`;
      document.getElementById('retryBtn').onclick = () => { if (e.license) v.tryAnyway = true; loadData(true); };
      document.getElementById('refreshBtn').onclick = () => loadData(true);
      return;
    }

    const d = v.data;
    const rows = visibleRows();
    const pages = Math.max(1, Math.ceil(rows.length / v.pageSize));
    if (v.page >= pages) v.page = pages - 1;
    const start = v.page * v.pageSize;
    const slice = rows.slice(start, start + v.pageSize);
    const cols = v.columns;
    const numeric = c => d.info[c] && (d.info[c].type === 'number' || d.info[c].type === 'bytes');

    const tableHtml = !d.rows.length
      ? `<div class="empty">${icon('report')}<b>No data</b>Microsoft returned no records for this report.</div>`
      : !rows.length
        ? `<div class="empty">${icon('filter')}<b>Nothing matches your filters</b>${fmtNum(d.rows.length)} records were loaded, but none match. Try removing a filter.</div>`
        : `<div class="table-wrap"><table class="data">
            <thead><tr>${cols.map(c => {
              const s = v.sort && v.sort.col === c ? v.sort.dir : '';
              return `<th class="${numeric(c) ? 'num' : ''}" data-sort="${esc(c)}" aria-sort="${s ? (s === 'asc' ? 'ascending' : 'descending') : 'none'}" title="Sort by ${esc(labelFor(c))}">
                <span class="th">${esc(d.info[c] ? d.info[c].label : labelFor(c))}${s ? `<span class="arrow">${icon(s === 'asc' ? 'up' : 'down', 'sm')}</span>` : ''}</span></th>`;
            }).join('')}</tr></thead>
            <tbody>${slice.map((r, i) => `<tr data-row="${start + i}">${cols.map(c =>
              `<td class="${numeric(c) ? 'num' : ''}">${cellHtml(d.info[c], r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>
          <div class="pager">
            <span>Showing <b>${fmtNum(start + 1)}–${fmtNum(start + slice.length)}</b> of ${fmtNum(rows.length)}</span>
            <span class="spacer"></span>
            <label class="small">Rows per page <select id="pageSize">${[50, 100, 250, 500].map(n => `<option ${n === v.pageSize ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <button class="btn sm" id="prevPage" ${v.page === 0 ? 'disabled' : ''}>Previous</button>
            <span>Page ${v.page + 1} of ${pages}</span>
            <button class="btn sm" id="nextPage" ${v.page >= pages - 1 ? 'disabled' : ''}>Next</button>
          </div>`;

    const age = Math.round((Date.now() - d.fetchedAt) / 60000);
    const notices = [];
    if (d.truncated) notices.push(`<div class="banner warn">${icon('alert')}<div class="grow"><b>Only the first ${fmtNum(d.rows.length)} records were loaded.</b>Add a filter to the Graph query, or raise AGB_MAX_ROWS on the server.</div></div>`);
    if (d.notes && d.notes.length) notices.push(`<div class="banner info">${icon('info')}<div class="grow"><b>Some parts couldn't be read, so they're not in this report.</b>${d.notes.map(n => esc(n)).join('<br>')}</div></div>`);
    if (def.sharedView && !def.isNew) notices.push(`<div class="banner info">${icon('info')}<div class="grow"><b>Shared view.</b>Someone sent you this link with their columns and filters. Change anything you like; it won't affect them.</div></div>`);
    if (def.isNew) notices.push(`<div class="banner info">${icon('wand')}<div class="grow"><b>Step 2 of 2: make it yours.</b>Use <b>Columns</b> to pick what to show, <b>Add filter</b> to narrow it down, then <b>Save as my report</b>.</div></div>`);

    $app.innerHTML = `<div class="page wide">${head}${notices.join('')}
      <div class="card">
        <div class="toolbar">
          <label class="search-box">${icon('search', 'sm')}<input id="tblSearch" type="search" placeholder="Search in results…" value="${esc(v.search)}" aria-label="Search in results"></label>
          ${v.filters.map((f, i) => `<span class="fchip"><span class="lbl" data-edit="${i}" title="Edit filter">${filterText(f, d.info[f.col])}</span><button data-rm="${i}" aria-label="Remove filter" title="Remove filter">${icon('x', 'sm')}</button></span>`).join('')}
          <button class="btn sm" id="addFilter">${icon('filter', 'sm')}Add filter</button>
          ${v.filters.length ? '<button class="btn sm subtle" id="clearFilters">Clear all</button>' : ''}
          <span class="spacer"></span>
          <button class="btn sm" id="colsBtn">${icon('columns', 'sm')}Columns <span class="count">${cols.length}</span></button>
        </div>
        <div class="resultbar">
          <span><b>${fmtNum(rows.length)}</b> ${rows.length === 1 ? 'record' : 'records'}${rows.length !== d.rows.length ? ` (of ${fmtNum(d.rows.length)} loaded)` : ''}</span>
          <span class="spacer"></span>
          <span title="${esc(resolvePath(v.path))}">Source: ${esc(v.sourceName)}</span>
          <span>· Loaded ${age < 1 ? 'just now' : age + ' min ago'}</span>
        </div>
        ${d.rows.length ? summaryHtml(rows) : ''}
        ${tableHtml}
      </div></div>`;
    wireReport(rows);
  }

  function markDirty() { state.view.dirty = true; }

  function wireShare() {
    const b = document.getElementById('shareBtn');
    const v = state.view;
    if (!b || !v) return;
    b.onclick = async () => {
      if (!v.routeBase) return;
      try { await UI.copy(shareLink(v)); toast('Link copied. Anyone who can open the reports can use it.'); }
      catch (e) { toast('Copy failed: ' + e.message, 'bad'); }
    };
  }

  function wireReport(rows) {
    const v = state.view, d = v.data;
    const byId = id => document.getElementById(id);
    byId('refreshBtn').onclick = () => loadData(true);
    byId('exportBtn').onclick = () => exportCsv(rows);
    wireShare();
    if (byId('saveBtn')) byId('saveBtn').onclick = openSave;
    byId('colsBtn').onclick = openColumns;
    byId('addFilter').onclick = e => openFilter(null, e.currentTarget);
    const clear = byId('clearFilters');
    if (clear) clear.onclick = () => { v.filters = []; v.page = 0; markDirty(); renderReport(); };
    $app.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { v.filters.splice(+b.dataset.rm, 1); v.page = 0; markDirty(); renderReport(); });
    $app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openFilter(+b.dataset.edit, b));

    const search = byId('tblSearch');
    search.addEventListener('input', debounce(() => {
      v.search = search.value; v.page = 0;
      const pos = search.selectionStart;
      renderReport();
      const s2 = byId('tblSearch'); s2.focus(); s2.setSelectionRange(pos, pos);
    }, 250));

    const sumBy = byId('sumBy');
    if (sumBy) sumBy.onchange = () => { v.summaryBy = sumBy.value || null; markDirty(); renderReport(); };
    $app.querySelectorAll('.bar[data-sv]').forEach(b => b.onclick = () => {
      const info = d.info[v.summaryBy];
      const k = b.dataset.sv;
      let f;
      if (k === BLANK) f = { col: v.summaryBy, op: 'empty' };
      else if (info.type === 'bool') f = { col: v.summaryBy, op: k === 'true' ? 'istrue' : 'isfalse' };
      else if (info.type === 'list') f = { col: v.summaryBy, op: 'contains', value: k };
      else f = { col: v.summaryBy, op: 'eq', value: k };
      v.filters.push(f); v.page = 0; markDirty(); renderReport();
    });

    $app.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => {
      const c = th.dataset.sort;
      if (!v.sort || v.sort.col !== c) v.sort = { col: c, dir: 'asc' };
      else if (v.sort.dir === 'asc') v.sort.dir = 'desc';
      else v.sort = null;
      markDirty(); renderReport();
    });
    $app.querySelectorAll('tr[data-row]').forEach(tr => tr.onclick = () => openDetails(rows[+tr.dataset.row]));

    const ps = byId('pageSize');
    if (ps) {
      ps.onchange = () => { v.pageSize = +ps.value; v.page = 0; renderReport(); };
      byId('prevPage').onclick = () => { v.page--; renderReport(); };
      byId('nextPage').onclick = () => { v.page++; renderReport(); };
    }
  }

  // ------------------------------------------------------------ record details
  function openDetails(row) {
    const d = state.view.data;
    const title = row.deviceName || row.itemName || row.displayName || row.name || row.sourceApp || row.connector || row.userPrincipalName || row.serialNumber || 'Record details';
    const keys = d.order.filter(k => !isEmpty(row[k]));
    const empties = d.order.length - keys.length;
    const el = openLayer(`
      <div class="drawer-head"><h2>${esc(title)}</h2><button class="btn icon subtle" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="drawer-body"><div class="kv">${keys.map(k => `<div class="k">${esc(d.info[k].label)}</div><div>${cellHtml(d.info[k], row[k])}</div>`).join('')}</div>
        ${empties ? `<p class="muted small" style="margin-top:12px">${empties} empty field${empties > 1 ? 's' : ''} hidden.</p>` : ''}</div>
      <div class="drawer-foot"><button class="btn" data-copy>${icon('copy', 'sm')}Copy as text</button><span class="spacer"></span><button class="btn primary" data-close>Close</button></div>`, 'drawer');
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlays);
    el.querySelector('[data-copy]').onclick = async () => {
      const text = keys.map(k => `${d.info[k].label}: ${cellText(d.info[k], row[k])}`).join('\n');
      try { await UI.copy(text); toast('Copied'); } catch (e) { toast('Copy failed: ' + e.message, 'bad'); }
    };
  }

  // ------------------------------------------------------------ columns drawer
  function openColumns() {
    const v = state.view, d = v.data;
    const defaults = (v.def.columns && v.def.columns.length) ? v.def.columns : (sourceOf(v.def) || {}).columns || d.order.slice(0, 10);
    let q = '';
    const el = openLayer(`
      <div class="drawer-head"><h2>Choose columns</h2><button class="btn icon subtle" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="drawer-body">
        <div class="col-list"><h4>Shown, in this order</h4><div id="orderList"></div>
        <h4>All available columns</h4>
        <label class="search-box" style="padding:0;margin-bottom:6px">${icon('search', 'sm')}<input id="colSearch" type="search" placeholder="Find a column…"></label>
        <div id="allCols"></div></div>
      </div>
      <div class="drawer-foot"><button class="btn subtle" id="colReset">Reset to default</button><span class="spacer"></span><button class="btn primary" data-close>Done</button></div>`, 'drawer');

    const all = [...new Set(d.order.concat(v.columns))].sort((a, b) => labelFor(a).localeCompare(labelFor(b)));
    const draw = () => {
      el.querySelector('#orderList').innerHTML = v.columns.length ? v.columns.map((c, i) => `
        <div class="order-item"><span>${esc(labelFor(c))}</span>
          <button class="btn sm icon subtle" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up" title="Move up">${icon('up', 'sm')}</button>
          <button class="btn sm icon subtle" data-down="${i}" ${i === v.columns.length - 1 ? 'disabled' : ''} aria-label="Move down" title="Move down">${icon('down', 'sm')}</button>
          <button class="btn sm icon subtle" data-hide="${i}" aria-label="Hide" title="Hide">${icon('x', 'sm')}</button></div>`).join('')
        : '<p class="muted small">No columns selected.</p>';
      const ql = q.toLowerCase();
      el.querySelector('#allCols').innerHTML = all.filter(c => !ql || labelFor(c).toLowerCase().includes(ql) || c.toLowerCase().includes(ql)).map(c => `
        <label><input type="checkbox" data-col="${esc(c)}" ${v.columns.includes(c) ? 'checked' : ''}><span>${esc(labelFor(c))}</span><span class="key">${esc(c)}</span></label>`).join('')
        || '<p class="muted small">No matching columns.</p>';
      el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; [v.columns[i - 1], v.columns[i]] = [v.columns[i], v.columns[i - 1]]; changed(); });
      el.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { const i = +b.dataset.down; [v.columns[i + 1], v.columns[i]] = [v.columns[i], v.columns[i + 1]]; changed(); });
      el.querySelectorAll('[data-hide]').forEach(b => b.onclick = () => { v.columns.splice(+b.dataset.hide, 1); changed(); });
      el.querySelectorAll('[data-col]').forEach(cb => cb.onchange = () => {
        const c = cb.dataset.col;
        if (cb.checked && !v.columns.includes(c)) v.columns.push(c);
        if (!cb.checked) v.columns = v.columns.filter(x => x !== c);
        changed();
      });
    };
    const changed = () => { markDirty(); renderReport(); document.body.appendChild(el); draw(); };
    el.querySelector('#colSearch').addEventListener('input', e => { q = e.target.value; draw(); });
    el.querySelector('#colReset').onclick = () => { v.columns = [...defaults]; changed(); };
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlays);
    draw();
  }

  // ------------------------------------------------------------ filter popover
  function openFilter(index, anchor) {
    const v = state.view, d = v.data;
    const editing = index != null ? v.filters[index] : null;
    const cols = [...new Set(v.columns.concat(d.order))].filter(c => d.info[c]);
    const sorted = [...cols].sort((a, b) => d.info[a].label.localeCompare(d.info[b].label));
    const f = editing ? { ...editing, value: Array.isArray(editing.value) ? [...editing.value] : editing.value } : { col: v.columns.find(c => d.info[c]) || cols[0], op: null, value: '' };

    const el = openLayer(`<h3>${editing ? 'Edit filter' : 'Add a filter'}</h3>
      <label class="field"><span>Column</span><select id="fCol">
        <optgroup label="Shown columns">${v.columns.filter(c => d.info[c]).map(c => `<option value="${esc(c)}">${esc(d.info[c].label)}</option>`).join('')}</optgroup>
        <optgroup label="Other columns">${sorted.filter(c => !v.columns.includes(c)).map(c => `<option value="${esc(c)}">${esc(d.info[c].label)}</option>`).join('')}</optgroup>
      </select></label>
      <label class="field"><span>Condition</span><select id="fOp"></select></label>
      <div id="fVal"></div>
      <div class="row-actions">
        ${editing ? '<button class="btn danger" id="fDel" style="margin-right:auto">Remove</button>' : ''}
        <button class="btn" id="fCancel">Cancel</button><button class="btn primary" id="fApply">Apply</button>
      </div>`, 'popover', { anchor });

    const colSel = el.querySelector('#fCol'), opSel = el.querySelector('#fOp'), valBox = el.querySelector('#fVal');
    colSel.value = f.col;

    const drawOps = () => {
      const info = d.info[f.col];
      const ops = OPS_BY_TYPE[info.type] || OPS_BY_TYPE.text;
      if (!ops.includes(f.op)) f.op = ops[0];
      opSel.innerHTML = ops.map(o => `<option value="${o}" ${o === f.op ? 'selected' : ''}>${esc(OPS[o].label)}</option>`).join('');
      drawValue();
    };
    const distinctOptions = info => [...info.distinct.entries()].sort((a, b) => b[1] - a[1]);
    const drawValue = () => {
      const info = d.info[f.col];
      const kind = OPS[f.op].input;
      if (!kind) { valBox.innerHTML = ''; return; }
      if (kind === 'multi') {
        const chosen = (Array.isArray(f.value) ? f.value : [f.value]).filter(x => x !== '' && x != null).map(norm);
        valBox.innerHTML = `<div class="field"><span style="display:block;font-weight:600;font-size:13px;margin-bottom:5px">Values</span><div class="checklist">${distinctOptions(info).map(([k, n]) =>
          `<label><input type="checkbox" value="${esc(k)}" ${chosen.includes(norm(k)) ? 'checked' : ''}><span>${esc(valueLabel(f.col, k))}</span><span class="n">${fmtNum(n)}</span></label>`).join('')}</div></div>`;
        return;
      }
      if (kind === 'value' && info.type === 'enum') {
        const opts = distinctOptions(info);
        valBox.innerHTML = `<label class="field"><span>Value</span><select id="fV">${opts.map(([k, n]) =>
          `<option value="${esc(k)}" ${norm(k) === norm(f.value) ? 'selected' : ''}>${esc(valueLabel(f.col, k))} (${fmtNum(n)})</option>`).join('')}</select></label>`;
        return;
      }
      if (kind === 'days') {
        valBox.innerHTML = `<label class="field"><span>Number of days</span><input id="fV" type="number" min="0" step="1" value="${esc(f.value || 30)}"></label>`;
        return;
      }
      if (kind === 'number') {
        valBox.innerHTML = `<label class="field"><span>Value${info.type === 'bytes' ? ' (GB)' : ''}</span><input id="fV" type="number" step="any" value="${esc(f.value === '' || f.value == null ? '' : f.value)}"></label>`;
        return;
      }
      valBox.innerHTML = `<label class="field"><span>Text</span><input id="fV" type="text" value="${esc(Array.isArray(f.value) ? '' : (f.value || ''))}" placeholder="Type something…"></label>`;
    };

    colSel.onchange = () => { f.col = colSel.value; f.op = null; f.value = ''; drawOps(); };
    opSel.onchange = () => { const prevKind = OPS[f.op].input; f.op = opSel.value; if (OPS[f.op].input !== prevKind) f.value = ''; drawValue(); };
    el.querySelector('#fCancel').onclick = closeOverlays;
    if (editing) el.querySelector('#fDel').onclick = () => { v.filters.splice(index, 1); v.page = 0; markDirty(); closeOverlays(); renderReport(); };
    const apply = () => {
      const kind = OPS[f.op].input;
      const out = { col: f.col, op: f.op };
      if (kind === 'multi') {
        out.value = [...valBox.querySelectorAll('input:checked')].map(i => i.value);
        if (!out.value.length) { toast('Pick at least one value', 'bad'); return; }
      } else if (kind) {
        const raw = valBox.querySelector('#fV').value;
        if (raw === '') { toast('Enter a value', 'bad'); return; }
        out.value = (kind === 'days' || kind === 'number') ? Number(raw) : raw;
      }
      if (editing) v.filters[index] = out; else v.filters.push(out);
      v.page = 0; markDirty(); closeOverlays(); renderReport();
    };
    el.querySelector('#fApply').onclick = apply;
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') apply(); });
    drawOps();
  }

  // ------------------------------------------------------------ save
  function openSave() {
    const v = state.view, def = v.def;
    const isSaved = !!def.mine;
    const el = openLayer(`
      <div class="modal-head"><h2>${isSaved ? 'Save report' : 'Save as my report'}</h2>
        <p>Saved reports appear under “My reports” for everyone who uses this tool. The columns, filters, search and sort order are saved; the data is always fetched fresh.</p></div>
      <div class="modal-body">
        <label class="field"><span>Name</span><input id="sName" type="text" maxlength="120" value="${esc(isSaved ? def.name : (def.isNew || def.isQuery ? '' : def.name + ' (my version)'))}" placeholder="e.g. Sales laptops not checked in"></label>
        <label class="field"><span>Description <span class="muted" style="font-weight:400">(optional)</span></span><textarea id="sDesc" maxlength="1000" rows="2">${esc(isSaved || !def.isNew ? (def.description || '') : '')}</textarea></label>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        ${isSaved ? '<button class="btn" id="sNew">Save as new</button>' : ''}
        <button class="btn primary" id="sSave">${isSaved ? 'Save changes' : 'Save'}</button>
      </div>`, 'modal');
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlays);
    const doSave = async (asNew) => {
      const name = el.querySelector('#sName').value.trim();
      if (!name) { el.querySelector('#sName').focus(); toast('Give the report a name', 'bad'); return; }
      const body = {
        id: isSaved && !asNew ? def.id : null,
        name, description: el.querySelector('#sDesc').value.trim(),
        source: def.source, columns: v.columns, filters: v.filters, search: v.search,
        sort: v.sort, summaryBy: v.summaryBy, basedOn: def.basedOn || (def.mine ? null : def.id) || null
      };
      try {
        const rep = await API.saveReport(body);
        const i = state.saved.findIndex(r => r.id === rep.id);
        if (i >= 0) state.saved[i] = rep; else state.saved.unshift(rep);
        closeOverlays();
        toast(`Saved “${rep.name}”`);
        v.dirty = false;
        if (location.hash !== '#/r/' + rep.id) {
          state.pendingView = v;
          location.hash = '#/r/' + rep.id;
        } else {
          v.def = { ...rep, mine: true };
          renderReport();
        }
      } catch (e) { toast(e.message, 'bad'); }
    };
    el.querySelector('#sSave').onclick = () => doSave(false);
    if (isSaved) el.querySelector('#sNew').onclick = () => doSave(true);
    el.querySelector('#sName').addEventListener('keydown', e => { if (e.key === 'Enter') doSave(false); });
  }

  // ------------------------------------------------------------ export
  function exportCsv(rows) {
    const v = state.view, d = v.data;
    if (!rows.length) { toast('Nothing to export: no rows match.', 'bad'); return; }
    const cell = s => { s = String(s == null ? '' : s); return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const header = v.columns.map(c => { const info = d.info[c]; return cell(labelFor(c) + (info && info.type === 'bytes' ? ' (GB)' : '')); });
    const lines = rows.map(r => v.columns.map(c => {
      const info = d.info[c], raw = r[c];
      if (isEmpty(raw)) return cell(typeof raw === 'string' && raw ? 'Never' : '');
      if (info && info.type === 'bytes') return (raw / GB).toFixed(2);
      if (info && info.type === 'number') return String(raw);
      if (info && info.type === 'date') { const ms = dateMs(raw); return cell(ms ? isoLocal(ms) : raw); }
      return cell(cellText(info, raw));
    }).join(','));
    const csv = '﻿' + header.join(',') + '\r\n' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const safe = v.def.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'report';
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}-${isoLocal(Date.now()).slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${fmtNum(rows.length)} rows`);
  }

  // =================================================================== routing
  // ------------------------------------------------------------ shareable links
  // The view (columns, filters, search, sort, summary) travels in the link as ?v=<base64url JSON>.
  function encodeView(v) {
    const data = { c: v.columns, f: v.filters, q: v.search || undefined, s: v.sort || undefined, g: v.summaryBy || undefined };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeView(text) {
    try {
      const bin = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
      const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
      const str = (x, n) => typeof x === 'string' && x.length <= (n || 300);
      const out = {};
      if (Array.isArray(d.c)) out.columns = d.c.filter(x => str(x)).slice(0, 200);
      if (Array.isArray(d.f)) out.filters = d.f.filter(f => f && str(f.col) && OPS[f.op]).slice(0, 50)
        .map(f => ({ col: f.col, op: f.op, value: Array.isArray(f.value) ? f.value.filter(x => ['string', 'number', 'boolean'].includes(typeof x)).slice(0, 200) : f.value }));
      if (str(d.q, 500)) out.search = d.q;
      if (d.s && str(d.s.col) && ['asc', 'desc'].includes(d.s.dir)) out.sort = { col: d.s.col, dir: d.s.dir };
      if (str(d.g)) out.summaryBy = d.g;
      return out;
    } catch (e) {
      return null;
    }
  }

  function shareLink(v) {
    return location.origin + location.pathname + v.routeBase + '?v=' + encodeView(v);
  }

  async function route() {
    closeOverlays();
    JOBS.setViewing(null); // leaving a report: a finished background report now shows a notification
    const hash = location.hash || '#/';
    const [, kind, rawArg = ''] = hash.match(/^#\/([^/]*)\/?(.*)$/) || [];
    const qAt = rawArg.indexOf('?');
    const arg = qAt >= 0 ? rawArg.slice(0, qAt) : rawArg;
    const params = new URLSearchParams(qAt >= 0 ? rawArg.slice(qAt + 1) : '');
    const shared = qAt >= 0 ? decodeView(params.get('v') || '') : null;
    window.scrollTo(0, 0);

    if (!kind) {
      state.view = null;
      document.title = UI.title('Intune Report Builder');
      renderHome();
      if (!state.savedLoaded) { await loadSaved(); if (isHome()) renderHome(); }
      return;
    }
    if (kind === 'new' && !arg) { document.title = UI.title('Build your own report'); return renderSourcePicker(); }
    if (kind === 'query' && !arg) { document.title = UI.title('Graph query'); return renderQueryPage(); }

    let def = null;
    if (kind === 'new') {
      const sid = decodeURIComponent(arg);
      const src = C.SOURCES[sid];
      if (src) def = { id: null, name: 'New report: ' + src.name, description: src.description, source: sid, isNew: true, summaryBy: null };
    } else if (kind === 'q') {
      const path = decodeURIComponent(arg);
      def = { id: null, name: 'Custom Graph query', description: path, source: path, isQuery: true, isNew: true };
    } else if (kind === 'r') {
      const id = decodeURIComponent(arg);
      await loadSaved();
      const saved = state.saved.find(r => r.id === id);
      def = saved ? { ...saved, mine: true } : C.REPORTS.find(r => r.id === id);
    }
    if (!def) {
      $app.innerHTML = `<div class="page"><div class="empty">${icon('report')}<b>Report not found</b>It may have been deleted. <a href="#/">Back to all reports</a></div></div>`;
      return;
    }
    document.title = UI.title(def.name);
    if (shared && Object.keys(shared).length) def = { ...def, ...shared, sharedView: params.get('from') !== 'home' };
    const pending = state.pendingView;
    state.pendingView = null;
    if (pending && kind === 'r' && def.mine) {
      // Just saved: keep the current view and data instead of reloading.
      pending.def = def;
      pending.routeBase = '#/' + kind + '/' + arg;
      state.view = pending;
      return renderReport();
    }
    openReport(def, hash);
    state.view.routeBase = '#/' + kind + '/' + arg;
  }

  function loadSaved() {
    if (!state.savedPromise) {
      state.savedPromise = API.reports()
        .then(r => { state.saved = r; }, () => { state.saved = []; })
        .then(() => { state.savedLoaded = true; });
    }
    return state.savedPromise;
  }

  const isHome = () => !location.hash || location.hash === '#/' || location.hash === '#';

  async function loadStatus() {
    try { state.status = await API.status(); }
    catch (e) { state.status = { connected: false, offline: e.kind === 'offline', error: e.message, roles: [] }; }
    renderConn();
  }

  // =================================================================== start
  UI.hydrateIcons(document.querySelector('.topbar'));
  renderConn();
  window.addEventListener('hashchange', route);
  route();
  UI.updatePill();
  UI.applyBranding();
  UI.loadMe().then(() => { if (isHome()) renderHome(); else if (state.view && !state.view.loading) renderReport(); });
  loadStatus().then(() => {
    if (isHome()) renderHome();
    else if (location.hash === '#/new') renderSourcePicker();
    loadAlerts(false);
  });
})();
