/* ==========================================================================
   app.js — shared shell: starfield background, navigation, scroll reveal,
   animated counters, back-to-top, toast notifications, offline handling,
   fullscreen lightbox preview.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------- Starfield canvas ---------------- */
  function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.floor((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        speed: Math.random() * 0.15 + 0.02,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      }));
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.twinkle += s.twinkleSpeed;
        const alpha = 0.4 + Math.abs(Math.sin(s.twinkle)) * 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.fill();
        if (!reduceMotion) {
          s.y += s.speed;
          if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
        }
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
  }

  /* ---------------- Navbar: scroll state, mobile toggle, active link ---------------- */
  function initNav() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    toggle?.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    links?.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => links.classList.remove('open'));
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinkMap = new Map();
    document.querySelectorAll('.nav-link').forEach(l => navLinkMap.set(l.dataset.section, l));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = navLinkMap.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s));
  }

  /* ---------------- Fade-up scroll reveal ---------------- */
  function initScrollReveal() {
    const items = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(i => observer.observe(i));
  }

  /* ---------------- Animated counters (stats strip + facts) ---------------- */
  function initCounters() {
    const nums = document.querySelectorAll('.stat-num, .fact-num');
    const animate = (el) => {
      const target = parseFloat(el.dataset.target);
      const isDecimal = !Number.isInteger(target);
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = isDecimal ? value.toFixed(1) : Math.floor(value).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
      }
      requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    nums.forEach(n => observer.observe(n));
  }

  /* ---------------- Back to top ---------------- */
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  window.showToast = function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ---------------- Offline banner ---------------- */
  function initOfflineHandling() {
    const banner = document.getElementById('offlineBanner');
    function update() {
      banner.hidden = navigator.onLine;
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  /* ---------------- Simple API cache (sessionStorage, TTL-based) ---------------- */
  window.apiCache = {
    get(key, ttlMs) {
      try {
        const raw = sessionStorage.getItem('cache:' + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > ttlMs) return null;
        return data;
      } catch { return null; }
    },
    set(key, data) {
      try {
        sessionStorage.setItem('cache:' + key, JSON.stringify({ data, ts: Date.now() }));
      } catch { /* storage full or unavailable — ignore */ }
    },
    getStale(key) {
      try {
        const raw = sessionStorage.getItem('cache:' + key);
        if (!raw) return null;
        return JSON.parse(raw).data;
      } catch { return null; }
    }
  };

  /* ---------------- Lightbox (fullscreen image preview) ---------------- */
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');

    window.openLightbox = function (src, alt) {
      img.src = src;
      img.alt = alt || '';
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    function close() {
      lightbox.hidden = true;
      img.src = '';
      document.body.style.overflow = '';
    }
    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hidden) close(); });
  }

  /* ---------------- Footer year ---------------- */
  function initFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initNav();
    initScrollReveal();
    initCounters();
    initBackToTop();
    initOfflineHandling();
    initLightbox();
    initFooterYear();
  });
})();