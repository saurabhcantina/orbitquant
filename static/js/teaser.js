/* ============================================================
   Interactive teaser — wipe-compare cards (BF16 vs OrbitQuant)
   behind an Images/Videos toggle with per-modality backbone
   tabs. Media in non-default panels is lazy-hydrated from
   data-src on first activation; videos in a pair are kept in
   sync and paused while their panel is hidden.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- wipe slider ---------- */
  function initCompare(card) {
    var media = card.querySelector('.cmp-media');
    var handle = card.querySelector('.cmp-handle');
    if (!media || !handle) return;

    function setPos(pct) {
      pct = Math.max(0, Math.min(100, pct));
      media.style.setProperty('--pos', pct + '%');
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }

    function posFromEvent(e) {
      var rect = media.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    }

    var dragging = false;
    media.addEventListener('pointerdown', function (e) {
      dragging = true;
      media.setPointerCapture(e.pointerId);
      setPos(posFromEvent(e));
    });
    media.addEventListener('pointermove', function (e) {
      if (dragging) setPos(posFromEvent(e));
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      media.addEventListener(t, function () { dragging = false; });
    });

    handle.addEventListener('keydown', function (e) {
      var cur = parseFloat(media.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') { setPos(cur - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(cur + 5); e.preventDefault(); }
    });
  }

  /* ---------- panel hydration / video control ---------- */
  function hydratePanel(panel) {
    if (panel.dataset.hydrated) return;
    panel.dataset.hydrated = '1';
    panel.querySelectorAll('img[data-src], video[data-src]').forEach(function (el) {
      el.src = el.getAttribute('data-src');
      el.removeAttribute('data-src');
      if (el.tagName === 'VIDEO') el.load();
    });
  }

  function setVideosPlaying(panel, play) {
    panel.querySelectorAll('video').forEach(function (v) {
      if (play) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }

  // Keep each card's BF16/OrbitQuant clips aligned (same durations,
  // but decode hiccups can drift them apart over many loops).
  function syncPairs(panel) {
    panel.querySelectorAll('.cmp').forEach(function (card) {
      var vids = card.querySelectorAll('video');
      if (vids.length !== 2) return;
      var master = vids[0], slave = vids[1];
      if (master.readyState < 2 || slave.readyState < 2) return;
      if (Math.abs(master.currentTime - slave.currentTime) > 0.12) {
        slave.currentTime = master.currentTime;
      }
    });
  }

  /* ---------- toggles ---------- */
  function initTeaser(root) {
    var modalityBtns = root.querySelectorAll('.teaser-pill-modality .teaser-pill-btn');
    var backbonePills = root.querySelectorAll('.teaser-pill-backbone');
    var panels = root.querySelectorAll('.teaser-panel');

    // Remember the chosen backbone per modality.
    var state = { modality: 'videos', backbone: { images: 'flux', videos: 'wan14b' } };
    var syncTimer = null;

    function activePanel() {
      return root.querySelector('.teaser-panel[data-panel="' + state.backbone[state.modality] + '"]');
    }

    function render() {
      modalityBtns.forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.modality === state.modality);
      });
      backbonePills.forEach(function (pill) {
        var on = pill.dataset.for === state.modality;
        pill.hidden = !on;
        if (on) {
          pill.querySelectorAll('.teaser-pill-btn').forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.panel === state.backbone[state.modality]);
          });
        }
      });

      var target = activePanel();
      panels.forEach(function (p) {
        var on = p === target;
        p.hidden = !on;
        if (!on) setVideosPlaying(p, false);
      });
      hydratePanel(target);
      setVideosPlaying(target, true);

      if (syncTimer !== null) clearInterval(syncTimer);
      syncTimer = null;
      if (target.dataset.modality === 'videos') {
        syncTimer = setInterval(function () { syncPairs(target); }, 1500);
      }
    }

    modalityBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.modality = b.dataset.modality;
        render();
      });
    });
    backbonePills.forEach(function (pill) {
      pill.querySelectorAll('.teaser-pill-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          state.backbone[pill.dataset.for] = b.dataset.panel;
          render();
        });
      });
    });

    // Don't keep videos decoding while the tab is hidden.
    document.addEventListener('visibilitychange', function () {
      setVideosPlaying(activePanel(), !document.hidden);
    });

    root.querySelectorAll('.cmp').forEach(initCompare);
    render();
  }

  function boot() {
    var root = document.getElementById('teaser');
    if (root) initTeaser(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
