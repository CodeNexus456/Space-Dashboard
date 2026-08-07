/* ==========================================================================
   news.js — Spaceflight News API: articles, search, category filters
   ========================================================================== */

(() => {
  'use strict';

  const NEWS_URL = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=15';
  const CACHE_KEY = 'space-news';
  const CACHE_TTL = 1000 * 60 * 10; // 10 min

  const grid = document.getElementById('newsGrid');
  const errorBox = document.getElementById('newsError');
  const emptyBox = document.getElementById('newsEmpty');
  const searchInput = document.getElementById('newsSearch');
  const filterBar = document.getElementById('newsFilters');

  const CATEGORY_KEYWORDS = {
    nasa: ['nasa'],
    spacex: ['spacex', 'starship', 'falcon'],
    astronomy: ['astronomy', 'telescope', 'galaxy', 'star', 'exoplanet', 'black hole'],
    iss: ['iss', 'space station', 'astronaut'],
    mars: ['mars', 'rover', 'perseverance', 'curiosity'],
  };

  let allArticles = [];
  let activeFilter = 'all';
  let searchTerm = '';

  function renderSkeleton() {
    grid.innerHTML = Array.from({ length: 6 })
      .map(() => `<div class="news-card glass skeleton-card"><div class="skeleton skeleton-media"></div></div>`)
      .join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function matchesFilter(article) {
    if (activeFilter === 'all') return true;
    const haystack = `${article.title} ${article.summary}`.toLowerCase();
    return (CATEGORY_KEYWORDS[activeFilter] || []).some(kw => haystack.includes(kw));
  }

  function matchesSearch(article) {
    if (!searchTerm) return true;
    const haystack = `${article.title} ${article.summary} ${article.news_site}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  }

  function cardTemplate(article) {
    const date = new Date(article.published_at).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    return `
      <article class="news-card glass">
        ${article.image_url ? `<img class="news-img" src="${article.image_url}" alt="${escapeHtml(article.title)}" loading="lazy" />` : ''}
        <div class="news-body">
          <span class="news-source">${escapeHtml(article.news_site)}</span>
          <h3 class="news-title">${escapeHtml(article.title)}</h3>
          <p class="news-summary">${escapeHtml((article.summary || '').slice(0, 140))}${article.summary && article.summary.length > 140 ? '…' : ''}</p>
          <div class="news-footer">
            <span class="news-date">${date}</span>
            <a class="btn btn-small btn-outline" href="${article.url}" target="_blank" rel="noopener">Read More <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          </div>
        </div>
      </article>
    `;
  }

  function renderList() {
    const filtered = allArticles.filter(a => matchesFilter(a) && matchesSearch(a));
    if (!filtered.length) {
      grid.innerHTML = '';
      emptyBox.hidden = false;
      return;
    }
    emptyBox.hidden = true;
    grid.innerHTML = filtered.map(cardTemplate).join('');
  }

  async function load() {
    const cached = window.apiCache.get(CACHE_KEY, CACHE_TTL);
    if (cached) {
      allArticles = cached;
      renderList();
      return;
    }
    renderSkeleton();
    errorBox.hidden = true;
    try {
      const res = await fetch(NEWS_URL);
      if (!res.ok) throw new Error('News request failed: ' + res.status);
      const data = await res.json();
      allArticles = data.results || [];
      window.apiCache.set(CACHE_KEY, allArticles);
      renderList();
    } catch (err) {
      console.error(err);
      const stale = window.apiCache.getStale(CACHE_KEY);
      if (stale) {
        allArticles = stale;
        renderList();
        window.showToast('Showing cached news — live fetch failed');
      } else {
        grid.innerHTML = '';
        errorBox.hidden = false;
      }
    }
  }

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderList();
  });

  filterBar?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filterBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderList();
  });

  document.getElementById('newsRetry')?.addEventListener('click', () => {
    sessionStorage.removeItem('cache:' + CACHE_KEY);
    load();
  });

  document.addEventListener('DOMContentLoaded', load);
})();