/* ==========================================================================
   nasa.js — NASA Astronomy Picture of the Day
   ========================================================================== */

(() => {
  'use strict';

  const NASA_KEY = 'DEMO_KEY'; // Swap for a personal key from api.nasa.gov for higher rate limits
  const APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`;
  const CACHE_KEY = 'apod';
  const CACHE_TTL = 1000 * 60 * 60; // 1 hour

  const mediaEl = document.getElementById('apodMedia');
  const metaEl = document.getElementById('apodMeta');
  const titleEl = document.getElementById('apodTitle');
  const explanationEl = document.getElementById('apodExplanation');
  const copyrightEl = document.getElementById('apodCopyright');
  const hdLink = document.getElementById('apodHdLink');
  const errorBox = document.getElementById('apodError');
  const card = document.getElementById('apodCard');

  let currentData = null;

  function renderLoading() {
    errorBox.hidden = true;
    card.hidden = false;
    mediaEl.innerHTML = '<div class="skeleton skeleton-media"></div>';
    metaEl.innerHTML = '<div class="skeleton skeleton-line" style="width:40%"></div><div class="skeleton skeleton-line" style="width:25%"></div>';
    titleEl.textContent = '';
    titleEl.classList.add('skeleton-text');
    explanationEl.innerHTML = '<span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line" style="width:70%"></span>';
  }

  function render(data) {
    currentData = data;
    titleEl.classList.remove('skeleton-text');

    if (data.media_type === 'video') {
      mediaEl.innerHTML = `<iframe src="${data.url}" title="${escapeHtml(data.title)}" allowfullscreen loading="lazy"></iframe>`;
    } else {
      mediaEl.innerHTML = `<img src="${data.url}" alt="${escapeHtml(data.title)}" loading="lazy" />`;
      mediaEl.querySelector('img').addEventListener('click', () => {
        window.openLightbox(data.hdurl || data.url, data.title);
      });
    }

    metaEl.innerHTML = `
      <span><i class="fa-regular fa-calendar"></i> ${data.date}</span>
      ${data.copyright ? `<span><i class="fa-regular fa-circle-user"></i> ${escapeHtml(data.copyright.trim())}</span>` : ''}
    `;
    titleEl.textContent = data.title;
    explanationEl.textContent = data.explanation;
    copyrightEl.textContent = data.copyright ? `© ${data.copyright.trim()}` : 'Public Domain / Courtesy NASA';
    hdLink.href = data.hdurl || data.url;

    card.hidden = false;
    errorBox.hidden = true;
  }

  function renderError() {
    const stale = window.apiCache.getStale(CACHE_KEY);
    if (stale) {
      render(stale);
      window.showToast('Showing cached APOD — live fetch failed');
      return;
    }
    card.hidden = true;
    errorBox.hidden = false;
  }

  async function load(force = false) {
    if (!force) {
      const cached = window.apiCache.get(CACHE_KEY, CACHE_TTL);
      if (cached) { render(cached); return; }
    }
    renderLoading();
    try {
      const res = await fetch(APOD_URL);
      if (!res.ok) throw new Error('APOD request failed: ' + res.status);
      const data = await res.json();
      window.apiCache.set(CACHE_KEY, data);
      render(data);
    } catch (err) {
      console.error(err);
      renderError();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- Actions ---------------- */
  document.getElementById('apodRefresh')?.addEventListener('click', () => load(true));
  document.getElementById('apodRetry')?.addEventListener('click', () => load(true));

  document.getElementById('apodCopy')?.addEventListener('click', async () => {
    if (!currentData) return;
    const url = currentData.hdurl || currentData.url;
    try {
      await navigator.clipboard.writeText(url);
      window.showToast('Image URL copied to clipboard');
    } catch {
      window.showToast('Could not copy — copy manually: ' + url);
    }
  });

  document.getElementById('apodDownload')?.addEventListener('click', async () => {
    if (!currentData || currentData.media_type !== 'image') {
      window.showToast('Today\'s APOD is a video — open it instead');
      return;
    }
    try {
      const res = await fetch(currentData.hdurl || currentData.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `apod-${currentData.date}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.showToast('Download failed — try the HD link instead');
    }
  });

  document.getElementById('apodShare')?.addEventListener('click', async () => {
    if (!currentData) return;
    const shareData = {
      title: currentData.title,
      text: `NASA Astronomy Picture of the Day: ${currentData.title}`,
      url: currentData.hdurl || currentData.url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard?.writeText(shareData.url);
      window.showToast('Share link copied to clipboard');
    }
  });

  document.addEventListener('DOMContentLoaded', () => load());
})();