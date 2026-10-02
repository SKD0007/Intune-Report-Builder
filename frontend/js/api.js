/* Copyright 2026 Orynr LLC. Developed by SKDOSS.
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Backend API client + small UI helpers shared by both pages.
   All Graph calls go through the backend, so the client secret never reaches the browser. */
const API = (function () {
  async function request(path, method, body, signal) {
    const opts = { method, headers: {}, credentials: 'same-origin', signal };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let r;
    try {
      r = await fetch(path, opts);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      const err = new Error('Can\'t reach the Report Builder server. Is it still running?');
      err.kind = 'offline';
      throw err;
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const d = data && data.detail;
      let message = r.statusText || 'Request failed';
      let kind = 'error';
      if (typeof d === 'string') message = d;
      else if (Array.isArray(d)) message = d.map(x => x.msg).join('; ');
      else if (d && d.message) { message = d.message; kind = d.kind || kind; }
      const err = new Error(message);
      err.kind = kind;
      err.status = r.status;
      throw err;
    }
    return data;
  }

  return {
    status: () => request('/api/status', 'GET'),
    query: (q, signal) => request('/api/graph/query', 'POST', { query: q }, signal),
    view: (name, signal) => request('/api/graph/view', 'POST', { name }, signal),
    reports: () => request('/api/reports', 'GET'),
    saveReport: (r) => request('/api/reports', 'POST', r),
    deleteReport: (id) => request('/api/reports/' + encodeURIComponent(id), 'DELETE'),
    update: () => request('/api/update', 'GET'),
    jobs: {
      start: (name, force) => request('/api/jobs', 'POST', { name, force: !!force }),
      get: (id) => request('/api/jobs/' + encodeURIComponent(id), 'GET'),
      result: (id) => request('/api/jobs/' + encodeURIComponent(id) + '/result', 'GET'),
      cancel: (id) => request('/api/jobs/' + encodeURIComponent(id), 'DELETE')
    },
    admin: {
      state: () => request('/api/admin/state', 'GET'),
      setup: (username, password) => request('/api/admin/setup', 'POST', { username, password }),
      login: (username, password) => request('/api/admin/login', 'POST', { username, password }),
      logout: () => request('/api/admin/logout', 'POST'),
      changeLogin: (current, username, next) => request('/api/admin/password', 'POST', { current, username: username || null, new: next || null }),
      saveCredentials: (c) => request('/api/admin/credentials', 'POST', c),
      test: () => request('/api/admin/test', 'POST'),
      disconnect: () => request('/api/admin/disconnect', 'POST'),
      checkUpdate: () => request('/api/admin/update/check', 'POST'),
      updateSettings: (enabled) => request('/api/admin/update/settings', 'POST', { enabled })
    }
  };
})();

const UI = (function () {
  const PATHS = {
    device: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15l-3-3c1-4 4.5-8 12-9-1 7.5-5 11-9 12z"/><circle cx="14.5" cy="9.5" r="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .6 3.3 2.5 3.5 5.5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    columns: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9.5 4v16M14.5 4v16"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    plug: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
    report: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 13h6M9 17h6M9 9h3"/>',
    wand: '<path d="M4 20L16 8M14 6l4 4"/><path d="M18 2v3M20.5 3.5h-3M7 3v2M8 4H6M20 13v2M21 14h-2"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };

  function icon(name, cls) {
    return `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.report}</svg>`;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(text, tone, action) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.setAttribute('role', 'status');
    el.innerHTML = icon(tone === 'bad' ? 'alert' : 'check', 'sm') + `<span>${esc(text)}</span>` +
      (action ? `<a class="toast-act" href="${esc(action.href)}">${esc(action.label)}</a>` : '');
    if (action) el.querySelector('.toast-act').onclick = () => el.remove();
    host.appendChild(el);
    setTimeout(() => el.remove(), action ? 12000 : tone === 'bad' ? 6000 : 3200);
  }

  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, el.dataset.iconClass));
      el.removeAttribute('data-icon');
    });
  }

  // navigator.clipboard only exists on https/localhost; fall back for LAN http.
  async function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('your browser blocked it');
  }

  // "Update available" pill in the top bar. The server asks GitHub at most once a day.
  async function updatePill() {
    let u;
    try { u = await API.update(); } catch (e) { return null; }
    const bar = document.querySelector('.topbar');
    const old = bar && bar.querySelector('.update-pill');
    if (old) old.remove();
    if (bar && u.updateAvailable) {
      bar.querySelector('.spacer').insertAdjacentHTML('afterend',
        `<a class="update-pill" href="/settings#/about" title="Version ${esc(u.latest)} is available. You have ${esc(u.current)}.">${icon('download', 'sm')}<span>Update available: ${esc(u.latest)}</span></a>`);
    }
    return u;
  }

  return { icon, esc, toast, hydrateIcons, copy, updatePill };
})();


/* Report notifications: reports Intune prepares in the background (bell, top right).
   The list lives in this browser only; the server keeps finished reports for 30 minutes. */
const JOBS = (function () {
  const KEY = 'irb.jobs.v1';
  const KEEP = 24 * 3600 * 1000;
  let list = [];
  let timer = null;
  let viewing = null;            // job id of the report open on screen (no pop-up for that one)
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]').filter(j => Date.now() - j.startedAt < KEEP); } catch (e) { list = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20))); } catch (e) { /* private window */ } };
  const find = id => list.find(j => j.id === id);
  const { icon, esc, toast } = UI;

  function track(job, title, href) {
    list = list.filter(j => j.id !== job.id && !(j.name === job.name && j.status !== 'running'));
    list.unshift({ id: job.id, name: job.name, title, href, status: job.status, startedAt: Date.now(),
      finishedAt: job.status === 'running' ? null : Date.now(), error: null, seen: job.status !== 'running' });
    save(); draw(); poll();
  }
  function update(id, fields) { const j = find(id); if (j) { Object.assign(j, fields); save(); draw(); } }
  function forget(id) { list = list.filter(j => j.id !== id); save(); draw(); }
  function setViewing(id) { viewing = id; const j = id && find(id); if (j && j.status !== 'running' && !j.seen) update(id, { seen: true }); }

  async function poll() {
    clearTimeout(timer);
    const running = list.filter(j => j.status === 'running');
    if (!running.length) return;
    for (const j of running) {
      let s;
      try { s = await API.jobs.get(j.id); } catch (e) {
        if (e.status === 404) { j.status = 'expired'; j.finishedAt = Date.now(); }
        continue;
      }
      if (s.status === 'running') continue;
      j.status = s.status; j.finishedAt = Date.now(); j.error = s.error ? s.error.message : null; j.rows = s.rows;
      j.seen = j.id === viewing;
      if (!j.seen && s.status === 'done') toast(`Your report is ready: ${j.title}`, '', { label: 'Open', href: j.href });
      if (!j.seen && s.status === 'failed') toast(`Couldn't prepare: ${j.title}`, 'bad');
    }
    save(); draw();
    timer = setTimeout(poll, 4000);
  }

  function ago(ms) { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; }
  function line(j) {
    if (j.status === 'running') return `Preparing… started ${ago(j.startedAt)}`;
    if (j.status === 'done') return `Ready${j.rows != null ? ` · ${Number(j.rows).toLocaleString()} records` : ''} · ${ago(j.finishedAt)}`;
    if (j.status === 'failed') return `Couldn't prepare: ${j.error || 'error'}`;
    if (j.status === 'cancelled') return 'Cancelled';
    return 'No longer available: open it to run it again';
  }

  function draw() {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    let wrap = bar.querySelector('.bell-wrap');
    if (!list.length) { if (wrap) wrap.remove(); return; }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'bell-wrap';
      const anchor = bar.querySelector('.conn') || bar.lastElementChild;
      bar.insertBefore(wrap, anchor);
      document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
    }
    const unread = list.filter(j => j.status !== 'running' && !j.seen).length;
    const busy = list.some(j => j.status === 'running');
    const open = wrap.classList.contains('open');
    wrap.innerHTML = `<button class="btn subtle sm icon bell ${busy ? 'busy' : ''}" aria-label="Report notifications" title="Reports being prepared">${icon('bell')}${unread ? `<span class="bell-count">${unread}</span>` : ''}</button>
      <div class="bell-panel" role="dialog" aria-label="Report notifications">
        <div class="bell-head"><b>Reports</b><button class="btn subtle sm" data-clear>Clear finished</button></div>
        ${list.map(j => `<div class="bell-item ${j.status}">
          <div class="grow"><div class="t">${esc(j.title)}</div><div class="s">${esc(line(j))}</div></div>
          ${j.status === 'running' ? `<span class="spinner sm" aria-hidden="true"></span><button class="btn subtle sm" data-cancel="${esc(j.id)}">Cancel</button>`
            : `<a class="btn sm ${j.status === 'done' ? 'primary' : ''}" href="${esc(j.href)}" data-open="${esc(j.id)}">${j.status === 'done' ? 'Open' : 'Run again'}</a>
               <button class="btn subtle sm icon" data-forget="${esc(j.id)}" aria-label="Remove">${icon('x', 'sm')}</button>`}
        </div>`).join('')}
      </div>`;
    if (open) wrap.classList.add('open');
    wrap.querySelector('.bell').onclick = () => wrap.classList.toggle('open');
    wrap.querySelector('[data-clear]').onclick = () => { list = list.filter(j => j.status === 'running'); save(); draw(); };
    wrap.querySelectorAll('[data-forget]').forEach(b => b.onclick = () => forget(b.dataset.forget));
    wrap.querySelectorAll('[data-open]').forEach(a => a.onclick = () => { update(a.dataset.open, { seen: true }); wrap.classList.remove('open'); });
    wrap.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
      try { await API.jobs.cancel(b.dataset.cancel); } catch (e) { /* already finished */ }
      update(b.dataset.cancel, { status: 'cancelled', finishedAt: Date.now(), seen: true });
    });
  }

  document.addEventListener('DOMContentLoaded', () => { draw(); poll(); });
  if (document.readyState !== 'loading') setTimeout(() => { draw(); poll(); });
  // The newest finished copy of a report, so an old copy in the page cache isn't shown instead.
  const latestDone = name => list.find(j => j.name === name && j.status === 'done');
  return { track, update, forget, find, setViewing, poll, latestDone };
})();
