
  //  spacex.js — Upcoming SpaceX launches with live countdowns


(() => {
  'use strict';

  const LAUNCHES_URL = 'https://api.spacexdata.com/v4/launches/upcoming';
  const ROCKETS_URL = 'https://api.spacexdata.com/v4/rockets';
  const LAUNCHPADS_URL = 'https://api.spacexdata.com/v4/launchpads';
  const CACHE_KEY = 'spacex-launches';
  const CACHE_TTL = 1000 * 60 * 15; // 15 min

  const grid = document.getElementById('launchGrid');
  const errorBox = document.getElementById('launchError');
  let countdownTimers = [];

  function renderSkeleton() {
    grid.innerHTML = Array.from({ length: 3 })
      .map(() => `<div class="launch-card glass skeleton-card"><div class="skeleton skeleton-media"></div></div>`)
      .join('');
  }

  function statusBadge(launch) {
    if (launch.upcoming) return `<span class="launch-status status-upcoming"><i class="fa-solid fa-clock"></i> Upcoming</span>`;
    if (launch.success === true) return `<span class="launch-status status-success"><i class="fa-solid fa-check"></i> Success</span>`;
    if (launch.success === false) return `<span class="launch-status status-fail"><i class="fa-solid fa-xmark"></i> Failed</span>`;
    return `<span class="launch-status status-upcoming">TBD</span>`;
  }

  function cardTemplate(launch, rocketName, padName) {
    const patch = launch.links?.patch?.small;
    const webcast = launch.links?.webcast;
    const dateStr = new Date(launch.date_utc).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <article class="launch-card glass" data-launch-id="${launch.id}" data-date="${launch.date_unix}">
        <div class="launch-top">
          ${patch
            ? `<img class="launch-patch" src="${patch}" alt="${escapeHtml(launch.name)} mission patch" loading="lazy" />`
            : `<div class="launch-patch placeholder"><i class="fa-solid fa-rocket"></i></div>`}
          <div>
            <h3 class="launch-title">${escapeHtml(launch.name)}</h3>
            <span class="launch-rocket">${escapeHtml(rocketName)}</span>
          </div>
        </div>

        ${statusBadge(launch)}

        <ul class="launch-meta-list">
          <li><i class="fa-regular fa-calendar"></i> ${dateStr}</li>
          <li><i class="fa-solid fa-location-dot"></i> ${escapeHtml(padName)}</li>
          <li><i class="fa-solid fa-hashtag"></i> Flight ${launch.flight_number}</li>
        </ul>

        <p class="launch-details">${launch.details ? escapeHtml(launch.details) : 'Mission details have not been published yet.'}</p>

        <div class="launch-countdown" data-countdown>
          <div class="cd-unit"><span class="cd-num" data-d>00</span><span class="cd-label">Days</span></div>
          <div class="cd-unit"><span class="cd-num" data-h>00</span><span class="cd-label">Hrs</span></div>
          <div class="cd-unit"><span class="cd-num" data-m>00</span><span class="cd-label">Min</span></div>
          <div class="cd-unit"><span class="cd-num" data-s>00</span><span class="cd-label">Sec</span></div>
        </div>

        <div class="launch-footer">
          ${webcast ? `<a class="btn btn-small btn-outline" href="${webcast}" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> Watch Launch</a>` : ''}
        </div>
      </article>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function startCountdowns() {
    countdownTimers.forEach(clearInterval);
    countdownTimers = [];
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const card = el.closest('.launch-card');
      const targetSec = parseInt(card.dataset.date, 10) * 1000;
      function tick() {
        const diff = targetSec - Date.now();
        if (diff <= 0) {
          el.innerHTML = '<span class="cd-unit" style="grid-column:1/-1"><span class="cd-num">LIFTOFF WINDOW OPEN</span></span>';
          return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.querySelector('[data-d]').textContent = String(d).padStart(2, '0');
        el.querySelector('[data-h]').textContent = String(h).padStart(2, '0');
        el.querySelector('[data-m]').textContent = String(m).padStart(2, '0');
        el.querySelector('[data-s]').textContent = String(s).padStart(2, '0');
      }
      tick();
      countdownTimers.push(setInterval(tick, 1000));
    });
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ' failed: ' + res.status);
    return res.json();
  }

  async function load() {
    const cached = window.apiCache.get(CACHE_KEY, CACHE_TTL);
    if (cached) {
      render(cached);
      return;
    }
    renderSkeleton();
    errorBox.hidden = true;
    try {
      const [launches, rockets, pads] = await Promise.all([
        fetchJson(LAUNCHES_URL),
        fetchJson(ROCKETS_URL),
        fetchJson(LAUNCHPADS_URL),
      ]);
      const rocketMap = Object.fromEntries(rockets.map(r => [r.id, r.name]));
      const padMap = Object.fromEntries(pads.map(p => [p.id, p.full_name || p.name]));
      const payload = { launches: launches.slice(0, 6), rocketMap, padMap };
      window.apiCache.set(CACHE_KEY, payload);
      render(payload);
    } catch (err) {
      console.error(err);
      const stale = window.apiCache.getStale(CACHE_KEY);
      if (stale) {
        render(stale);
        window.showToast('Showing cached launch data — live fetch failed');
      } else {
        grid.innerHTML = '';
        errorBox.hidden = false;
      }
    }
  }

  function render({ launches, rocketMap, padMap }) {
    if (!launches.length) {
      grid.innerHTML = '<p class="empty-msg">No upcoming launches scheduled right now.</p>';
      return;
    }
    grid.innerHTML = launches
      .map(l => cardTemplate(l, rocketMap[l.rocket] || 'Unknown rocket', padMap[l.launchpad] || 'TBD'))
      .join('');
    startCountdowns();
  }

  document.getElementById('launchRetry')?.addEventListener('click', () => {
    sessionStorage.removeItem('cache:' + CACHE_KEY);
    load();
  });

  document.addEventListener('DOMContentLoaded', load);
})();
