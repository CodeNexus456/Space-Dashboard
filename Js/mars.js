/* ==========================================================================
   mars.js — NASA Mars Rover Photos gallery (latest available frames)
   ========================================================================== */

(() => {
  'use strict';

  const NASA_KEY = 'DEMO_KEY';
  const ROVERS = ['curiosity', 'perseverance'];
  const CACHE_KEY = 'mars-photos';
  const CACHE_TTL = 1000 * 60 * 60; // 1 hour

  const gallery = document.getElementById('marsGallery');
  const errorBox = document.getElementById('marsError');

  function renderSkeleton() {
    gallery.innerHTML = Array.from({ length: 8 })
      .map(() => `<div class="mars-photo glass skeleton-card"><div class="skeleton skeleton-media"></div></div>`)
      .join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function cardTemplate(photo) {
    return `
      <figure class="mars-photo glass" data-src="${photo.img_src}" data-alt="${escapeHtml(photo.rover.name)} — ${escapeHtml(photo.camera.full_name)}">
        <img src="${photo.img_src}" alt="${escapeHtml(photo.rover.name)} rover photo from ${escapeHtml(photo.camera.full_name)}" loading="lazy" />
        <figcaption class="mars-info">
          <strong>${escapeHtml(photo.rover.name)}</strong>
          <span>${escapeHtml(photo.camera.full_name)}</span>
          <span>Earth date: ${photo.earth_date} · Sol ${photo.sol}</span>
        </figcaption>
      </figure>
    `;
  }

  async function fetchRoverLatest(rover) {
    const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${NASA_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${rover} photos failed: ${res.status}`);
    const data = await res.json();
    return (data.latest_photos || []).slice(0, 4);
  }

  async function load() {
    const cached = window.apiCache.get(CACHE_KEY, CACHE_TTL);
    if (cached) { render(cached); return; }

    renderSkeleton();
    errorBox.hidden = true;
    try {
      const results = await Promise.allSettled(ROVERS.map(fetchRoverLatest));
      const photos = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);
      if (!photos.length) throw new Error('No rover photos returned');
      window.apiCache.set(CACHE_KEY, photos);
      render(photos);
    } catch (err) {
      console.error(err);
      const stale = window.apiCache.getStale(CACHE_KEY);
      if (stale) {
        render(stale);
        window.showToast('Showing cached Mars photos — live fetch failed');
      } else {
        gallery.innerHTML = '';
        errorBox.hidden = false;
      }
    }
  }

  function render(photos) {
    gallery.innerHTML = photos.map(cardTemplate).join('');
    gallery.querySelectorAll('.mars-photo').forEach(fig => {
      fig.addEventListener('click', () => {
        window.openLightbox(fig.dataset.src, fig.dataset.alt);
      });
    });
  }

  document.getElementById('marsRetry')?.addEventListener('click', () => {
    sessionStorage.removeItem('cache:' + CACHE_KEY);
    load();
  });

  document.addEventListener('DOMContentLoaded', load);
})();