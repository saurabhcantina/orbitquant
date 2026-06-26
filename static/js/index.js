// Minimal JS for the project page.
//   1. Copy-to-clipboard for the BibTeX block.
//   2. Click-to-enlarge lightbox for the qualitative-results gallery.
//   3. Video gallery: lazy-load + autoplay-on-visible + click-to-modal.
//   4. (Smooth scroll is already handled via CSS `scroll-behavior: smooth`.)

(function () {
  'use strict';

  const copyBtn = document.getElementById('copy-bibtex');
  const bibCode = document.getElementById('bibtex-code');

  if (!copyBtn || !bibCode) return;

  copyBtn.addEventListener('click', async function () {
    const text = bibCode.innerText.trim();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS / older browsers.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      flashCopied(copyBtn);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });

  function flashCopied(btn) {
    const label = btn.querySelector('span:last-child');
    const icon = btn.querySelector('.icon i');
    const prevLabel = label ? label.textContent : null;
    const prevIcon = icon ? icon.className : null;

    btn.classList.add('is-copied');
    if (label) label.textContent = 'Copied!';
    if (icon) icon.className = 'fas fa-check';

    setTimeout(function () {
      btn.classList.remove('is-copied');
      if (label && prevLabel !== null) label.textContent = prevLabel;
      if (icon && prevIcon !== null) icon.className = prevIcon;
    }, 1600);
  }
})();

// ----------------------------------------------------------------------
// Qualitative-results lightbox.
// Event-delegated so it works for any current or future bit-width gallery
// table (they all share the same DOM contract: button.qual-thumb-btn with
// data-full / data-method / data-prompt attributes).
// ----------------------------------------------------------------------
(function () {
  'use strict';

  const lightbox = document.getElementById('qual-lightbox');
  if (!lightbox) return;

  const imgEl = lightbox.querySelector('.qual-lightbox-img');
  const captionEl = lightbox.querySelector('.qual-lightbox-caption');
  const closeBtn = lightbox.querySelector('.qual-lightbox-close');

  let lastFocus = null;

  function open(fullSrc, method, prompt) {
    imgEl.src = fullSrc;
    imgEl.alt = (method ? method + ': ' : '') + (prompt || '');
    captionEl.innerHTML = '';
    if (method) {
      const m = document.createElement('span');
      m.className = 'qual-lightbox-method';
      m.textContent = method;
      captionEl.appendChild(m);
    }
    if (prompt) {
      captionEl.appendChild(document.createTextNode(prompt));
    }
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    imgEl.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  document.addEventListener('click', function (ev) {
    const btn = ev.target.closest && ev.target.closest('.qual-thumb-btn');
    if (!btn) return;
    ev.preventDefault();
    open(
      btn.getAttribute('data-full'),
      btn.getAttribute('data-method') || '',
      btn.getAttribute('data-prompt') || ''
    );
  });

  closeBtn.addEventListener('click', close);

  lightbox.addEventListener('click', function (ev) {
    // Click on backdrop (not on the figure / image) closes the overlay.
    if (ev.target === lightbox) close();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && lightbox.classList.contains('is-open')) {
      close();
    }
  });
})();

// ----------------------------------------------------------------------
// Video gallery: lazy-load src on first visibility, play when visible,
// pause when offscreen. Reuses the same <video> element on subsequent
// scroll-throughs so we never re-download.
// ----------------------------------------------------------------------
(function () {
  'use strict';

  const clips = document.querySelectorAll('video.vid-clip[data-src]');
  if (!clips.length) return;

  // Browsers that lack IntersectionObserver get a one-shot src promotion
  // so the videos still play (just without scroll-driven pause).
  if (typeof IntersectionObserver === 'undefined') {
    clips.forEach(function (v) {
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      const p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    return;
  }

  function tryPlay(v) {
    const p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay block: ignore */ });
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const v = entry.target;
      if (entry.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        tryPlay(v);
      } else {
        try { v.pause(); } catch (_) {}
      }
    });
  }, {
    // Start loading slightly before the row enters the viewport so playback
    // begins close to the moment it actually scrolls into view.
    rootMargin: '300px 0px',
    threshold: 0.25,
  });

  clips.forEach(function (v) { io.observe(v); });
})();

// ----------------------------------------------------------------------
// Video row -> modal expansion. Clicking any video opens a modal that
// shows the entire row of methods at a larger size, all looping together.
// ----------------------------------------------------------------------
(function () {
  'use strict';

  const modal = document.getElementById('vid-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.vid-modal-close');
  const grid = modal.querySelector('.vid-modal-grid');
  const promptEl = modal.querySelector('.vid-modal-prompt');
  let lastFocus = null;

  function buildCell(label, src, isOurs) {
    const cell = document.createElement('div');
    cell.className = 'vid-modal-cell' + (isOurs ? ' vid-modal-cell-ours' : '');

    const lab = document.createElement('div');
    lab.className = 'vid-cell-label';
    lab.textContent = label;
    cell.appendChild(lab);

    const video = document.createElement('video');
    video.className = 'vid-clip';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', label + ' (modal)');
    video.src = src;
    cell.appendChild(video);
    return cell;
  }

  function open(row) {
    const prompt = row.getAttribute('data-prompt') || '';
    promptEl.textContent = prompt;
    grid.innerHTML = '';

    row.querySelectorAll('.vid-cell').forEach(function (cell) {
      const labelEl = cell.querySelector('.vid-cell-label');
      const videoEl = cell.querySelector('.vid-clip');
      if (!labelEl || !videoEl) return;
      const src = videoEl.getAttribute('src') || videoEl.dataset.src || '';
      grid.appendChild(buildCell(
        labelEl.textContent.trim(),
        src,
        cell.classList.contains('vid-cell-ours')
      ));
    });

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    grid.querySelectorAll('video').forEach(function (v) {
      try { v.pause(); } catch (_) {}
    });
    grid.innerHTML = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  document.addEventListener('click', function (ev) {
    const v = ev.target && ev.target.closest && ev.target.closest('.vid-clip');
    if (!v) return;
    // Ignore clicks on videos that are already inside the modal.
    if (v.closest('.vid-modal')) return;
    const row = v.closest('.vid-row');
    if (!row) return;
    ev.preventDefault();
    open(row);
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (ev) {
    if (ev.target === modal) close();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();
