/* ============================================================
   Results carousel — auto-sliding cards for the Main Results
   section. Builds dots from the slides, wires arrows, adapts
   viewport height to the active card, and auto-advances unless
   the user is hovering / focused or prefers reduced motion.
   ============================================================ */
(function () {
  'use strict';

  function initCarousel(root) {
    var viewport = root.querySelector('.results-carousel-viewport');
    var track = root.querySelector('.results-carousel-track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.results-slide'));
    var dotsWrap = root.querySelector('.results-carousel-dots');
    if (!viewport || !track || slides.length === 0 || !dotsWrap) return;

    var interval = parseInt(root.getAttribute('data-interval'), 10) || 9000;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 0;
    var timer = null;
    var paused = false;

    var dots = slides.map(function (slide, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'results-carousel-dot';
      var title = slide.getAttribute('data-title') || 'Result ' + (i + 1);
      dot.setAttribute('aria-label', 'Show: ' + title);
      dot.addEventListener('click', function () { goTo(i); restart(); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function syncHeight() {
      viewport.style.height = slides[current].offsetHeight + 'px';
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      slides.forEach(function (slide, j) {
        var active = j === current;
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        // Keep links/buttons in hidden slides out of the tab order.
        slide.querySelectorAll('a, button').forEach(function (el) {
          if (active) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });
      dots.forEach(function (dot, j) {
        dot.classList.toggle('is-active', j === current);
        dot.setAttribute('aria-current', j === current ? 'true' : 'false');
      });
      syncHeight();
    }

    function stop() {
      if (timer !== null) { clearInterval(timer); timer = null; }
    }

    function start() {
      if (reduceMotion || paused || timer !== null) return;
      timer = setInterval(function () { goTo(current + 1); }, interval);
    }

    function restart() { stop(); start(); }

    root.querySelectorAll('.results-carousel-arrow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goTo(current + parseInt(btn.getAttribute('data-dir'), 10));
        restart();
      });
    });

    // Pause while the user is reading (hover) or interacting (focus).
    root.addEventListener('mouseenter', function () { paused = true; stop(); });
    root.addEventListener('mouseleave', function () { paused = false; start(); });
    root.addEventListener('focusin', function () { paused = true; stop(); });
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) { paused = false; start(); }
    });

    // Don't burn cycles sliding while the tab is hidden.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    // Cards change height as fonts/images load and on resize.
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(syncHeight);
      slides.forEach(function (slide) { ro.observe(slide); });
    } else {
      window.addEventListener('resize', syncHeight);
    }
    window.addEventListener('load', syncHeight);

    goTo(0);
    start();
  }

  function boot() {
    document.querySelectorAll('.results-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
