/* ==========================================================================
   iss.js — ISS live position tracker
   Primary source: wheretheiss.at (https, rich telemetry)
   Fallback: Open Notify (iss-now.json)
   ========================================================================== */

(() => {
  'use strict';

  const PRIMARY_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
  const FALLBACK_URL = 'https://api.open-notify.org/iss-now.json';
  const REFRESH_MS = 5000;
  const CACHE_KEY = 'iss';

  const marker = document.getElementById('issMarker');
  const grid = document.getElementById('issMapGrid');
  const latEl = document.getElementById('issLat');
  const lonEl = document.getElementById('issLon');
  const altEl = document.getElementById('issAlt');
  const velEl = document.getElementById('issVel');
  const visEl = document.getElementById('issVis');
  const timeEl = document.getElementById('issTime');
  const lastUpdatedEl = document.getElementById('issLastUpdated');
  const distanceEl = document.getElementById('issDistance');

  let userLocation = null;
  let pollTimer = null;

  function buildGrid() {
    // 360 x 180 equirectangular grid: lines every 30deg lon, 15deg lat
    let svg = '';
    for (let x = 0; x <= 360; x += 30) {
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="180" class="${x === 180 ? 'meridian' : ''}" />`;
    }
    for (let y = 0; y <= 180; y += 15) {
      svg += `<line x1="0" y1="${y}" x2="360" y2="${y}" class="${y === 90 ? 'equator' : ''}" />`;
    }
    grid.innerHTML = svg;
  }

  function placeMarker(lat, lon) {
    const xPct = ((lon + 180) / 360) * 100;
    const yPct = ((90 - lat) / 180) * 100;
    marker.style.left = xPct + '%';
    marker.style.top = yPct + '%';
  }

  function placeUserMarker(lat, lon) {
    let el = document.getElementById('issUserMarker');
    if (!el) {
      el = document.createElement('div');
      el.id = 'issUserMarker';
      el.style.position = 'absolute';
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '50%';
      el.style.background = 'var(--secondary)';
      el.style.boxShadow = '0 0 10px var(--secondary)';
      el.style.transform = 'translate(-50%,-50%)';
      el.title = 'Your approximate location';
      document.getElementById('issMap').appendChild(el);
    }
    const xPct = ((lon + 180) / 360) * 100;
    const yPct = ((90 - lat) / 180) * 100;
    el.style.left = xPct + '%';
    el.style.top = yPct + '%';
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function render(data) {
    const { latitude, longitude, altitude, velocity, visibility, timestamp } = data;

    placeMarker(latitude, longitude);
    latEl.textContent = `${latitude.toFixed(4)}°`;
    lonEl.textContent = `${longitude.toFixed(4)}°`;
    altEl.textContent = altitude != null ? `${altitude.toFixed(1)} km` : 'N/A';
    velEl.textContent = velocity != null ? `${velocity.toFixed(0)} km/h` : 'N/A';
    visEl.textContent = visibility ? capitalize(visibility) : 'N/A';
    const date = timestamp ? new Date(timestamp * 1000) : new Date();
    timeEl.textContent = date.toISOString().replace('T', ' ').slice(0, 19);
    lastUpdatedEl.textContent = new Date().toLocaleTimeString();

    if (userLocation) {
      const dist = haversineKm(userLocation.lat, userLocation.lon, latitude, longitude);
      distanceEl.hidden = false;
      distanceEl.innerHTML = `<i class="fa-solid fa-ruler"></i> The ISS is currently <strong>${dist.toFixed(0)} km</strong> from your location.`;
    }
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  async function fetchPrimary() {
    const res = await fetch(PRIMARY_URL);
    if (!res.ok) throw new Error('wheretheiss.at failed: ' + res.status);
    const d = await res.json();
    return {
      latitude: d.latitude,
      longitude: d.longitude,
      altitude: d.altitude,
      velocity: d.velocity,
      visibility: d.visibility,
      timestamp: d.timestamp,
    };
  }

  async function fetchFallback() {
    const res = await fetch(FALLBACK_URL);
    if (!res.ok) throw new Error('open-notify failed: ' + res.status);
    const d = await res.json();
    return {
      latitude: parseFloat(d.iss_position.latitude),
      longitude: parseFloat(d.iss_position.longitude),
      altitude: null,
      velocity: null,
      visibility: null,
      timestamp: d.timestamp,
    };
  }

  async function poll() {
    try {
      const data = await fetchPrimary().catch(() => fetchFallback());
      window.apiCache.set(CACHE_KEY, data);
      render(data);
    } catch (err) {
      console.error('ISS fetch failed', err);
      const stale = window.apiCache.getStale(CACHE_KEY);
      if (stale) {
        render(stale);
        lastUpdatedEl.textContent = 'stale (offline)';
      }
    }
  }

  function startPolling() {
    poll();
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, REFRESH_MS);
  }

  document.getElementById('issLocateMe')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      window.showToast('Geolocation not supported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        placeUserMarker(userLocation.lat, userLocation.lon);
        window.showToast('Location set — comparing to ISS position');
        poll();
      },
      () => window.showToast('Could not get your location'),
      { timeout: 8000 }
    );
  });

  // Pause polling when tab is hidden to save requests/battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(pollTimer);
    } else {
      startPolling();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    buildGrid();
    startPolling();
  });
})();