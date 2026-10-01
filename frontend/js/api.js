/* Copyright 2026 Orynr LLC. Developed by Sai Kamal Doss (SKDOSS).
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
    reports: () => request('/api/reports', 'GET'),
    saveReport: (r) => request('/api/reports', 'POST', r),
    deleteReport: (id) => request('/api/reports/' + encodeURIComponent(id), 'DELETE'),
    admin: {
      state: () => request('/api/admin/state', 'GET'),
      setup: (username, password) => request('/api/admin/setup', 'POST', { username, password }),
      login: (username, password) => request('/api/admin/login', 'POST', { username, password }),
      logout: () => request('/api/admin/logout', 'POST'),
      changeLogin: (current, username, next) => request('/api/admin/password', 'POST', { current, username: username || null, new: next || null }),
      saveCredentials: (c) => request('/api/admin/credentials', 'POST', c),
      test: () => request('/api/admin/test', 'POST'),
      disconnect: () => request('/api/admin/disconnect', 'POST')
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

  function toast(text, tone) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.setAttribute('role', 'status');
    el.innerHTML = icon(tone === 'bad' ? 'alert' : 'check', 'sm') + `<span>${esc(text)}</span>`;
    host.appendChild(el);
    setTimeout(() => el.remove(), tone === 'bad' ? 6000 : 3200);
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

  return { icon, esc, toast, hydrateIcons, copy };
})();
