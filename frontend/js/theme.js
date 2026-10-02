/* Copyright 2026 Orynr LLC. Developed by SKDOSS.
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Applies the chosen colour theme before the page paints (loaded in <head>).
   The choice is a per-browser preference. Default: Silver (id "steel").
   "auto" follows the computer's light/dark setting (Silver or Mist). */
(function () {
  var THEMES = ['steel', 'gold', 'blue', 'red', 'black', 'mist', 'navy'];
  var KEY = 'irb-theme';

  function resolve(name) {
    if (name === 'auto') {
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return dark ? 'mist' : 'steel';
    }
    return THEMES.indexOf(name) >= 0 ? name : 'steel';
  }

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  document.documentElement.setAttribute('data-theme', resolve(saved()));

  window.IRB_THEME = {
    list: THEMES,
    saved: saved,
    set: function (name) {
      try { localStorage.setItem(KEY, name); } catch (e) { /* storage blocked */ }
      document.documentElement.setAttribute('data-theme', resolve(name));
    }
  };
})();
