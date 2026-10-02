/* Copyright 2026 Orynr LLC. Developed by Sai Kamal Doss (SKDOSS).
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Settings page. Sections (hash routes):
   #/appearance  colour theme (anyone, saved per browser)       - default
   #/admin       Administrative tasks (username + password)
   #/about       About Orynr */
(function () {
  const C = window.CATALOG;
  const { icon, esc, toast } = UI;
  const $root = document.getElementById('settings');
  const logoutBtn = document.getElementById('logoutBtn');
  const VERSION = '2.0.7';
  let st = null;     // admin state from the server
  let roles = null;  // granted application permissions (null = unknown)

  // Previews use fixed colours so every card shows its own theme.
  const THEMES = [
    { id: 'steel', name: 'Silver', note: 'Light · default', sw: '#e9ecf1', bg: '#f4f5f7', surf: '#ffffff', line: '#e2e5ea', acc: '#3f5f8f' },
    { id: 'gold', name: 'Gold', note: 'Dark', sw: '#c8a24a', bg: '#12140f', surf: '#1e211a', line: '#2a2d24', acc: '#c8a24a' },
    { id: 'blue', name: 'Blue', note: 'Dark', sw: '#6e9fd4', bg: '#13161c', surf: '#20242e', line: '#2a303b', acc: '#6e9fd4' },
    { id: 'red', name: 'Red', note: 'Dark', sw: '#e1131f', bg: '#141013', surf: '#211a1c', line: '#2f2629', acc: '#e1131f' },
    { id: 'black', name: 'Black', note: 'Dark', sw: '#111111', bg: '#0a0a0a', surf: '#161616', line: '#262626', acc: '#e6e6e6' },
    { id: 'mist', name: 'Mist', note: 'Dark', sw: '#7e9dc8', bg: '#111317', surf: '#1f232a', line: '#2d323b', acc: '#7e9dc8' },
    { id: 'navy', name: 'Navy', note: 'Dark', sw: '#25406a', bg: '#0d1626', surf: '#172644', line: '#24365a', acc: '#a9c2e0' }
  ];

  UI.hydrateIcons(document.querySelector('.topbar'));

  logoutBtn.onclick = async () => {
    await API.admin.logout().catch(() => {});
    toast('Signed out');
    st = null;
    location.hash = '#/admin';
    render();
  };

  // ------------------------------------------------------------------ shell
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    return ['admin', 'about'].includes(h) ? h : 'appearance';
  }

  function render() {
    const r = route();
    const nav = [
      ['appearance', 'sliders', 'Appearance'],
      ['admin', 'lock', 'Administrative tasks'],
      ['about', 'info', 'About']
    ];
    $root.innerHTML = `<div class="settings-wrap">
      <nav class="settings-nav" aria-label="Settings sections"><h1>Settings</h1>
        ${nav.map(([id, ic, label]) => `<a href="#/${id}" class="${r === id ? 'active' : ''}" ${r === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('')}
      </nav>
      <div class="settings-main" id="pane"></div>
    </div>`;
    document.title = { appearance: 'Appearance', admin: 'Administrative tasks', about: 'About' }[r] + ' · Settings · Orynr';
    if (r === 'appearance') renderAppearance();
    else if (r === 'about') renderAbout();
    else loadAdmin();
  }

  const pane = () => document.getElementById('pane');

  // ------------------------------------------------------------- appearance
  function renderAppearance() {
    const saved = window.IRB_THEME.saved();
    const auto = saved === 'auto';
    const current = auto ? null : document.documentElement.getAttribute('data-theme');
    pane().innerHTML = `<section class="card card-pad">
      <h2 class="section-title">Theme</h2>
      <p class="section-lead">Pick the colours you like. Your choice is saved in this browser only, so everyone can have their own.</p>
      <div class="themes" role="radiogroup" aria-label="Theme">
        ${THEMES.map(t => `<button class="theme-opt ${current === t.id ? 'on' : ''}" role="radio" aria-checked="${current === t.id}" data-theme-id="${t.id}">
          <div class="theme-prev" style="background:${t.bg}">
            <div class="bar1" style="background:${t.surf};border:1px solid ${t.line}"></div>
            <div class="row"><div class="blk" style="background:${t.surf};border:1px solid ${t.line}"></div><div class="btn1" style="background:${t.acc}"></div></div>
          </div>
          <div class="theme-meta"><span class="sw" style="background:${t.sw};border:1px solid rgba(128,128,128,.45)"></span><b>${esc(t.name)}</b><small>${esc(t.note)}</small></div>
        </button>`).join('')}
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn ${auto ? 'primary' : ''}" id="autoTheme" aria-pressed="${auto}">${icon('refresh', 'sm')}Match my computer</button>
        <span class="muted small">${auto ? 'On: Silver in light mode, Mist in dark mode.' : 'Switches between Silver and Mist with your computer’s light/dark setting.'}</span>
      </div>
    </section>`;
    pane().querySelectorAll('[data-theme-id]').forEach(b => b.onclick = () => {
      window.IRB_THEME.set(b.dataset.themeId);
      renderAppearance();
    });
    document.getElementById('autoTheme').onclick = () => { window.IRB_THEME.set('auto'); renderAppearance(); };
  }

  // ------------------------------------------------------------------ about
  function renderAbout() {
    pane().innerHTML = `<section class="card card-pad">
      <div class="about-hero"><img src="/static/brand/logo.svg" alt="Orynr logo">
        <div><h2>Intune Report Builder</h2><p>by Orynr · version ${VERSION}</p></div></div>
      <div class="free-note">${icon('check')}Free to use for Intune reporting.</div>
      <p class="about-text">Orynr makes simple, practical tools for IT teams. Intune Report Builder turns your Microsoft Intune
        and Entra ID data into clear, ready-made reports that anyone can read. No scripts, no Graph queries, no spreadsheets
        to clean up. Pick a report, filter it, export it to Excel, and save the views you use every week.</p>
      <p class="about-text">It is read-only by design: it can never change anything in your tenant. Your data goes straight from
        Microsoft to this server and your browser, and nothing is sent to Orynr.</p>
      <div class="facts">
        <div class="k">Developed by</div><div><b>Sai Kamal Doss</b> (SKDOSS)</div>
        <div class="k">Contact</div><div><a href="mailto:info@orynr.com">info@orynr.com</a></div>
        <div class="k">Brand</div><div>Orynr</div>
        <div class="k">Version</div><div>${VERSION}</div>
        <div class="k">License</div><div>Apache License 2.0. You may use, change and share it, as long as you keep the credit to Orynr and Sai Kamal Doss (SKDOSS).</div>
        <div class="k">Open source</div><div>Runs on Python and open-source libraries such as FastAPI, Uvicorn, HTTPX and cryptography. Their licences are in the THIRD_PARTY_LICENSES folder where the app is installed. Thank you to their authors.</div>
      </div>
    </section>
    <section class="card card-pad" id="updCard"><div class="muted small">Checking for updates…</div></section>`;
    loadUpdate(false);
  }

  // ------------------------------------------------------------------ updates
  let upd = null;

  function ago(sec) {
    const m = Math.round((Date.now() / 1000 - sec) / 60);
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
  }

  function updateHtml(u, admin) {
    if (!u) return '<div class="muted small">Couldn\'t get update information from this server.</div>';
    const head = `<div class="step-head"><span class="step-num ${u.updateAvailable ? '' : 'done'}">${icon(u.updateAvailable ? 'download' : 'check', 'sm')}</span>
      <div><h2>Updates</h2><p>You have version <b>${esc(u.current)}</b>.</p></div></div>`;
    let body;
    if (!u.enabled) {
      body = `<p class="muted">Update checks are switched off.${admin ? '' : ' An admin can turn them on in <a href="#/admin">Administrative tasks</a>.'}</p>`;
    } else if (u.updateAvailable) {
      body = `<div class="banner info">${icon('download')}<div class="grow"><b>Version ${esc(u.latest)} is available.</b>
          Run the installer on this server as an administrator. It upgrades in place and keeps the port, settings, connection and saved reports.</div></div>
        <div class="form-actions">
          ${u.downloadUrl ? `<a class="btn primary" href="${esc(u.downloadUrl)}" rel="noopener" target="_blank">${icon('download', 'sm')}Download installer${u.sizeMB ? ` (${esc(u.sizeMB)} MB)` : ''}</a>` : ''}
          <a class="btn" href="${esc(u.releaseUrl || u.releasesPage)}" rel="noopener" target="_blank">What's new</a>
        </div>
        ${u.sha256 ? `<p class="muted small" style="margin-top:8px">SHA-256 of the installer: <code class="mono">${esc(u.sha256)}</code></p>` : ''}`;
    } else if (u.error) {
      body = `<p class="muted">${esc(u.error)} You can always find new versions on <a href="${esc(u.releasesPage)}" rel="noopener" target="_blank">GitHub</a>.</p>`;
    } else {
      body = `<p>${icon('check', 'sm')} You're on the latest version.</p>`;
    }
    const when = u.enabled && u.checkedAt ? `<span class="muted small">Last checked ${ago(u.checkedAt)}.</span>` : '';
    const ctl = admin ? `<hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
        <label class="check"><input type="checkbox" id="updToggle" ${u.enabled ? 'checked' : ''}> Check GitHub for new versions once a day</label>
        <p class="muted small" style="margin:6px 0 10px">Only this app's version number is sent. Nothing is downloaded or installed automatically.</p>
        <div class="form-actions"><button class="btn" id="updCheck" ${u.enabled ? '' : 'disabled'}>${icon('refresh', 'sm')}Check now</button>${when}</div>`
      : (when ? `<div style="margin-top:10px">${when}</div>` : '');
    return head + body + ctl;
  }

  function drawUpdate(admin) {
    const box = document.getElementById('updCard');
    if (!box) return;
    box.innerHTML = updateHtml(upd, admin);
    const t = document.getElementById('updToggle');
    if (t) t.onchange = async () => {
      try { upd = await API.admin.updateSettings(t.checked); toast(t.checked ? 'Update checks on' : 'Update checks off'); }
      catch (err) { toast(err.message, 'bad'); }
      drawUpdate(admin); UI.updatePill();
    };
    const b = document.getElementById('updCheck');
    if (b) b.onclick = async () => {
      b.disabled = true;
      try { upd = await API.admin.checkUpdate(); toast(upd.error ? 'Check failed' : (upd.updateAvailable ? 'An update is available' : "You're up to date"), upd.error ? 'bad' : ''); }
      catch (err) { toast(err.message, 'bad'); }
      drawUpdate(admin); UI.updatePill();
    };
  }

  async function loadUpdate(admin) {
    try { upd = await API.update(); } catch (e) { upd = null; }
    drawUpdate(admin);
  }

  // ------------------------------------------------------------------ admin
  async function loadAdmin() {
    pane().innerHTML = '<div class="card card-pad muted">Loading…</div>';
    try {
      st = await API.admin.state();
    } catch (e) {
      pane().innerHTML = `<div class="banner bad">${icon('alert')}<div class="grow"><b>Can't reach the server.</b>${esc(e.message)}</div></div>`;
      return;
    }
    if (route() !== 'admin') return;
    logoutBtn.classList.toggle('hidden', !st.loggedIn);
    if (!st.passwordSet) return st.isLocal ? renderCreateLogin() : renderSetupElsewhere();
    if (!st.loggedIn) return renderLogin();
    renderAdminMain();
    if (st.connected && roles === null) {
      API.status().then(s => { if (s.connected) { roles = s.roles; drawPermissions(); } }).catch(() => {});
    }
  }

  function authCard(inner) {
    pane().innerHTML = `<div class="auth-card card"><div class="card-pad">
      <span class="brand-mark" style="width:40px;height:40px;border-radius:10px">${icon('lock', 'lg')}</span>${inner}</div></div>`;
  }

  function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = 'inline-msg ' + (ok ? 'ok' : 'bad');
  }

  function renderSetupElsewhere() {
    authCard(`<h1>Administrative tasks</h1>
      <p class="lead">An admin login hasn't been created yet. For safety, that first step has to be done on the computer that runs this tool.</p>
      <div class="banner info" style="margin:0">${icon('info')}<div class="grow">On that computer, open <code>http://127.0.0.1:${esc(location.port || '80')}/settings#/admin</code> in a browser.</div></div>`);
  }

  function renderCreateLogin() {
    authCard(`<h1>Create the admin login</h1>
      <p class="lead">Administrative tasks (connecting to Microsoft, permissions) are protected by this username and password. Viewing reports and changing the theme never need it.</p>
      <form id="f">
        <label class="field"><span>Username</span><input type="text" id="u" value="admin" autocomplete="username" spellcheck="false" required></label>
        <label class="field"><span>Password</span><input type="password" id="p1" autocomplete="new-password" minlength="8" required><small>At least 8 characters.</small></label>
        <label class="field"><span>Type the password again</span><input type="password" id="p2" autocomplete="new-password" required></label>
        <p class="inline-msg bad hidden" id="msg"></p>
        <button class="btn primary block lg" type="submit">Create login &amp; continue</button>
      </form>`);
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const u = document.getElementById('u').value.trim();
      const p1 = document.getElementById('p1').value, p2 = document.getElementById('p2').value;
      const msg = document.getElementById('msg');
      if (p1.length < 8) return showMsg(msg, 'Use at least 8 characters for the password.');
      if (p1 !== p2) return showMsg(msg, "The two passwords don't match.");
      try { await API.admin.setup(u, p1); toast('Admin login created'); loadAdmin(); }
      catch (err) { showMsg(msg, err.message); }
    };
    document.getElementById('p1').focus();
  }

  function renderLogin() {
    authCard(`<h1>Administrative tasks</h1>
      <p class="lead">Sign in to manage the connection to Microsoft.</p>
      <form id="f">
        <label class="field"><span>Username</span><input type="text" id="u" autocomplete="username" spellcheck="false" required></label>
        <label class="field"><span>Password</span><input type="password" id="pw" autocomplete="current-password" required></label>
        <p class="inline-msg bad hidden" id="msg"></p>
        <button class="btn primary block lg" type="submit">Sign in</button>
      </form>
      <p class="muted small" style="margin-top:16px">Forgot it? On the server, delete <code>admin.json</code> from <code>C:\\ProgramData\\Orynr\\Intune Report Builder</code>, then create a new login from <code>http://127.0.0.1</code> on that server. The Microsoft connection is kept.</p>`);
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('msg');
      try { await API.admin.login(document.getElementById('u').value.trim(), document.getElementById('pw').value); toast('Signed in'); loadAdmin(); }
      catch (err) { showMsg(msg, err.message); document.getElementById('pw').select(); }
    };
    document.getElementById('u').focus();
  }

  function renderAdminMain() {
    const connected = st.connected;
    pane().innerHTML = `
      ${st.credentialsUnreadable ? `<div class="banner warn">${icon('alert')}<div class="grow"><b>The saved connection can't be read on this computer.</b>This happens if the data folder was copied from another machine. Enter the details again below.</div></div>` : ''}

      <section class="card card-pad">
        <div class="step-head"><span class="step-num ${connected ? 'done' : ''}">${connected ? icon('check', 'sm') : '1'}</span>
          <div><h2>Connect to Microsoft</h2><p>${connected ? 'Connected. You can update the details below at any time.' : 'Uses an Entra ID app registration with a client secret. Reports are read-only.'}</p></div></div>
        <details class="help" ${connected ? '' : 'open'}>
          <summary>How do I get these values? (5 minutes, one time)</summary>
          <ol>
            <li>Go to <b>entra.microsoft.com</b> → <b>Applications</b> → <b>App registrations</b> → <b>New registration</b>. Name it “Intune Report Builder”, keep “Single tenant”, leave Redirect URI empty, click <b>Register</b>.</li>
            <li>On the app's <b>Overview</b> page, copy the <b>Application (client) ID</b> and <b>Directory (tenant) ID</b>.</li>
            <li>Open <b>Certificates &amp; secrets</b> → <b>New client secret</b>. Copy the secret's <b>Value</b> right away (it's only shown once). Note when it expires.</li>
            <li>Open <b>API permissions</b> → <b>Add a permission</b> → <b>Microsoft Graph</b> → <b>Application permissions</b>, and add the permissions listed in step 2 below.</li>
            <li>Click <b>Grant admin consent</b> (needs a Global or Privileged Role Administrator).</li>
          </ol>
        </details>
        <form id="credForm">
          <label class="field"><span>Directory (tenant) ID</span><input type="text" id="tenant" value="${esc(st.tenantId || '')}" placeholder="00000000-0000-0000-0000-000000000000 or contoso.onmicrosoft.com" autocomplete="off" spellcheck="false" required></label>
          <label class="field"><span>Application (client) ID</span><input type="text" id="client" value="${esc(st.clientId || '')}" placeholder="00000000-0000-0000-0000-000000000000" autocomplete="off" spellcheck="false" required></label>
          <label class="field"><span>Client secret value</span><input type="password" id="secret" autocomplete="new-password" placeholder="${connected ? 'Leave empty to keep the saved secret' : 'Paste the secret Value'}">
            <small>Stored encrypted on this server and never shown in the browser again.</small></label>
          <div class="form-actions">
            <button class="btn primary" type="submit" id="saveCred">${connected ? 'Save & test connection' : 'Connect'}</button>
            <span class="inline-msg" id="credMsg"></span>
          </div>
        </form>
      </section>

      <section class="card card-pad">
        <div class="step-head"><span class="step-num" id="permNum">2</span>
          <div><h2>Check permissions</h2><p>Each permission unlocks a group of reports. Reports whose permission is missing show a “Needs permission” tag.</p></div></div>
        <div id="perms"></div>
        <div class="form-actions" style="margin-top:14px">
          <button class="btn" id="recheck" ${connected ? '' : 'disabled'}>${icon('refresh', 'sm')}Re-check</button>
          <button class="btn subtle" id="copyPerms">${icon('copy', 'sm')}Copy permission list</button>
          <span class="muted small">After granting consent it can take a few minutes to show up.</span>
        </div>
      </section>

      <section class="card card-pad">
        <div class="step-head"><span class="step-num">3</span>
          <div><h2>Share with your team</h2><p>Anyone on your network can open the reports at this address. They don't need a login.</p></div></div>
        <div class="form-actions"><input type="text" readonly value="${esc(location.origin + '/')}" id="shareUrl" style="max-width:380px" class="mono">
          <button class="btn" id="copyUrl">${icon('copy', 'sm')}Copy link</button></div>
        <p class="muted small" style="margin-top:8px">If you opened this page as 127.0.0.1, others need this computer's name or IP address instead, for example <code>http://${esc(location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'SERVER-NAME' : location.hostname)}:${esc(location.port || '80')}/</code>.</p>
      </section>

      <section class="card card-pad">
        <div class="step-head"><span class="step-num">${icon('lock', 'sm')}</span><div><h2>Admin login</h2>
          <p>Change the admin username or password. It's stored as a secure hash (never the password itself) in <code>admin.json</code>, in <code>C:\\ProgramData\\Orynr\\Intune Report Builder</code> on the server.</p></div></div>
        <form id="pwForm" style="max-width:400px">
          <label class="field"><span>Username</span><input type="text" id="nu" value="${esc(st.username || '')}" autocomplete="username" spellcheck="false" required></label>
          <label class="field"><span>New password <span class="muted" style="font-weight:400">(leave empty to keep it)</span></span><input type="password" id="nw" autocomplete="new-password" minlength="8"></label>
          <label class="field"><span>Current password</span><input type="password" id="cur" autocomplete="current-password" required><small>Needed to confirm any change.</small></label>
          <div class="form-actions"><button class="btn" type="submit">Save login</button><span class="inline-msg" id="pwMsg"></span></div>
        </form>
        <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
        <div class="form-actions"><button class="btn danger" id="disconnect" ${connected ? '' : 'disabled'}>${icon('trash', 'sm')}Remove Microsoft connection</button>
          <span class="muted small">Deletes the saved tenant, client ID and secret from this server.</span></div>
      </section>

      <section class="card card-pad" id="updCard"><div class="muted small">Checking for updates…</div></section>`;

    drawPermissions();
    wireAdmin();
    loadUpdate(true);
  }

  function drawPermissions() {
    const box = document.getElementById('perms');
    if (!box) return;
    const granted = p => roles && (roles.includes(p) || roles.includes(p.replace('.Read.', '.ReadWrite.')) || roles.includes(p.replace('.ReadBasic.', '.Read.')) ||
      (/^(User|Group|Device|Organization)\./.test(p) && (roles.includes('Directory.Read.All') || roles.includes('Directory.ReadWrite.All'))));
    const known = Array.isArray(roles);
    const okCount = known ? C.PERMISSIONS.filter(p => granted(p.name)).length : 0;
    box.innerHTML = (known ? `<p class="small" style="margin-bottom:10px"><b>${okCount} of ${C.PERMISSIONS.length}</b> permissions granted${okCount === C.PERMISSIONS.length ? '. Everything is ready.' : '.'}</p>` :
      `<p class="small muted" style="margin-bottom:10px">${st.connected ? 'Checking…' : 'Connect first to see which permissions are granted.'}</p>`) +
      `<div class="perm-list">${C.PERMISSIONS.map(p => {
        const ok = known && granted(p.name);
        return `<div class="perm"><span class="st ${ok ? 'ok' : 'no'}" title="${ok ? 'Granted' : known ? 'Not granted' : 'Unknown'}">${icon(ok ? 'check' : 'x')}</span>
          <div><div class="nm">${esc(p.name)}</div><div class="un">${esc(p.unlocks)}</div></div></div>`;
      }).join('')}</div>`;
    const num = document.getElementById('permNum');
    if (num && known && okCount === C.PERMISSIONS.length) { num.className = 'step-num done'; num.innerHTML = icon('check', 'sm'); }
  }

  function wireAdmin() {
    document.getElementById('credForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveCred'), msg = document.getElementById('credMsg');
      btn.disabled = true;
      msg.textContent = 'Checking with Microsoft…';
      msg.className = 'inline-msg muted';
      try {
        const res = await API.admin.saveCredentials({
          tenantId: document.getElementById('tenant').value.trim(),
          clientId: document.getElementById('client').value.trim(),
          clientSecret: document.getElementById('secret').value.trim()
        });
        roles = res.roles || [];
        toast('Connected to Microsoft');
        await loadAdmin();
        const m = document.getElementById('credMsg');
        if (m) showMsg(m, 'Connected and saved.', true);
      } catch (err) {
        showMsg(msg, err.message);
      } finally {
        const b = document.getElementById('saveCred'); if (b) b.disabled = false;
      }
    };

    document.getElementById('recheck').onclick = async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try { roles = (await API.admin.test()).roles || []; drawPermissions(); toast('Permissions re-checked'); }
      catch (err) { toast(err.message, 'bad'); }
      finally { btn.disabled = false; }
    };

    document.getElementById('copyPerms').onclick = async () => {
      try { await UI.copy(C.PERMISSIONS.map(p => p.name).join('\n')); toast('Permission list copied'); }
      catch (err) { toast('Copy failed: ' + err.message, 'bad'); }
    };
    document.getElementById('copyUrl').onclick = async () => {
      try { await UI.copy(document.getElementById('shareUrl').value); toast('Link copied'); }
      catch (err) { toast('Copy failed: ' + err.message, 'bad'); }
    };

    document.getElementById('pwForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById('pwMsg');
      const nw = document.getElementById('nw').value;
      if (nw && nw.length < 8) return showMsg(msg, 'Use at least 8 characters for the new password.');
      try {
        await API.admin.changeLogin(document.getElementById('cur').value, document.getElementById('nu').value.trim(), nw);
        document.getElementById('cur').value = '';
        document.getElementById('nw').value = '';
        showMsg(msg, 'Admin login saved.', true);
      } catch (err) { showMsg(msg, err.message); }
    };

    document.getElementById('disconnect').onclick = async () => {
      if (!window.confirm('Remove the Microsoft connection? Reports will stop working until someone connects again.')) return;
      try { await API.admin.disconnect(); roles = null; toast('Connection removed'); loadAdmin(); }
      catch (err) { toast(err.message, 'bad'); }
    };
  }

  window.addEventListener('hashchange', render);
  render();
  UI.updatePill();
})();
