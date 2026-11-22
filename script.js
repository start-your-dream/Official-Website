(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- Loading screen ---- */
  var loader = $('#loader'), root = document.documentElement, t0 = performance.now(), gone = false;
  function hideLoader() {
    if (gone) return; gone = true;
    setTimeout(function () {
      root.classList.remove('loading');
      if (loader) { loader.classList.add('done'); setTimeout(function () { loader.remove(); }, 800); }
    }, Math.max(0, 1150 - (performance.now() - t0)));
  }
  if (document.readyState === 'complete') hideLoader(); else addEventListener('load', hideLoader);
  setTimeout(hideLoader, 3500);

  /* ---- Mobile menu ---- */
  var btn = $('.menu-btn'), nav = $('#nav');
  if (btn && nav) {
    btn.addEventListener('click', function () { var o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }); });
  }

  /* ---- Active nav link ---- */
  var links = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ---- Reveal on scroll (3D flip-up) ---- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { ro.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ---- Contact form ---- */
  var form = $('#contactForm'), status = $('#formStatus');
  if (form && window.fetch) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); status.className = 'form-status'; status.textContent = 'Sending…';
      fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.success) { form.reset(); status.textContent = 'Thank you. We have received your message.'; } else throw new Error(); })
        .catch(function () { status.className = 'form-status error'; status.textContent = 'That did not send. Please email startyourdream06@gmail.com instead.'; });
    });
  }

  /* ---- Scroll progress + hero depth on scroll ---- */
  var bar = $('#progress'), sy = 0, ticking = false;
  function onScroll() {
    sy = window.scrollY || 0;
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, sy / h) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (!fine || reduce) return;   /* everything below is mouse-driven */

  /* ---- 3D tilt cards ---- */
  $$('.tilt').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transition = 'transform .08s ease-out';
      card.style.transform = 'perspective(900px) rotateX(' + ((.5 - py) * 12).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 14).toFixed(2) + 'deg) translateZ(10px)';
      card.style.setProperty('--mx', (px * 100) + '%'); card.style.setProperty('--my', (py * 100) + '%');
    });
    card.addEventListener('pointerleave', function () { card.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)'; card.style.transform = ''; });
  });

  /* ---- Magnetic buttons ---- */
  $$('.btn').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  /* ---- Cursor: ring + dot + glowing trail (GPU-friendly, idle-aware) ---- */
  document.documentElement.classList.add('has-cursor');
  var ring = $('.cursor-ring'), dot = $('.cursor-dot'), glow = $('.cursor-glow'), trail = $('#trail'), tctx = trail.getContext('2d');
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my, nx = 0, ny = 0, tnx = 0, tny = 0;
  var sparks = [], palette = ['34,216,238', '47,127,209', '245,184,0'], lastX = mx, lastY = my, ci = 0, MAXS = 70;

  /* pre-rendered glow sprites: no gradients created per frame */
  var sprites = palette.map(function (c) {
    var s = document.createElement('canvas'); s.width = s.height = 48; var g = s.getContext('2d');
    var gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(.4, 'rgba(' + c + ',.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return s;
  });
  function sizeTrail() { trail.width = innerWidth; trail.height = innerHeight; }
  sizeTrail(); addEventListener('resize', sizeTrail);

  var rig = $('.rig'), scene = $('.scene'), heroInner = $('.hero-inner'), stack = $('.stack'), hero = $('.hero');
  var heroH = hero ? hero.offsetHeight : 800, running = false, last = 0;
  addEventListener('resize', function () { if (hero) heroH = hero.offsetHeight; wake(); });
  addEventListener('scroll', wake, { passive: true });

  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } }

  addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY; tnx = (mx / innerWidth - .5) * 2; tny = (my / innerHeight - .5) * 2;
    var dx = mx - lastX, dy = my - lastY, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8 && sparks.length < MAXS) {
      ci = (ci + 1) % 3;
      sparks.push({ x: mx, y: my, vx: (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8 - .15, life: 1, s: 7 + Math.random() * 9, c: ci });
      lastX = mx; lastY = my;
    }
    wake();
  }, { passive: true });
  document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
  document.addEventListener('pointerup', function () { ring.classList.remove('down'); });
  document.addEventListener('pointerover', function (e) { ring.classList.toggle('hot', !!e.target.closest('a,button,.tilt,input,textarea,label')); });
  document.addEventListener('pointerleave', function () { ring.style.opacity = 0; dot.style.opacity = 0; glow.style.opacity = 0; });
  document.addEventListener('pointerenter', function () { ring.style.opacity = ''; dot.style.opacity = ''; glow.style.opacity = ''; });

  function tick(now) {
    var dt = Math.min(48, now - last || 16); last = now;
    var k = 1 - Math.exp(-dt / 55);          /* frame-rate independent easing */
    var kSlow = 1 - Math.exp(-dt / 160), kGlow = 1 - Math.exp(-dt / 220);
    rx += (mx - rx) * k; ry += (my - ry) * k; gx += (mx - gx) * kGlow; gy += (my - gy) * kGlow;
    nx += (tnx - nx) * kSlow; ny += (tny - ny) * kSlow;
    ring.style.transform = 'translate3d(' + (rx - 20).toFixed(1) + 'px,' + (ry - 20).toFixed(1) + 'px,0)';
    dot.style.transform = 'translate3d(' + (mx - 3) + 'px,' + (my - 3) + 'px,0)';
    glow.style.transform = 'translate3d(' + (gx - 210).toFixed(0) + 'px,' + (gy - 210).toFixed(0) + 'px,0)';

    if (rig && sy < heroH * 1.2) {
      rig.style.transform = 'rotateX(' + (-ny * 7 + sy * .01).toFixed(2) + 'deg) rotateY(' + (nx * 10).toFixed(2) + 'deg) translateZ(' + (sy * .35).toFixed(0) + 'px)';
      scene.style.perspectiveOrigin = (50 + nx * 6).toFixed(1) + '% ' + (50 + ny * 5).toFixed(1) + '%';
      var p = Math.min(1, sy / (heroH * .7));
      heroInner.style.transform = 'translate3d(' + (nx * -10).toFixed(1) + 'px,' + (sy * .22 - ny * 6).toFixed(1) + 'px,0)';
      heroInner.style.opacity = (1 - p * .9).toFixed(3);
    }
    if (stack) stack.style.transform = 'rotateX(' + (58 + ny * 7).toFixed(1) + 'deg) rotateZ(' + (-35 + nx * 14).toFixed(1) + 'deg)';

    /* trail: draw only while sparks exist */
    if (sparks.length || trail._dirty) {
      tctx.clearRect(0, 0, trail.width, trail.height); trail._dirty = sparks.length > 0;
      tctx.globalCompositeOperation = 'lighter';
      for (var i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i]; s.x += s.vx; s.y += s.vy; s.life -= dt * .0017;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        var r = s.s * s.life + 4; tctx.globalAlpha = s.life * .9;
        tctx.drawImage(sprites[s.c], s.x - r, s.y - r, r * 2, r * 2);
      }
      tctx.globalAlpha = 1;
    }

    var settled = !sparks.length && Math.abs(mx - rx) < .15 && Math.abs(my - ry) < .15 && Math.abs(mx - gx) < .4 && Math.abs(my - gy) < .4 && Math.abs(tnx - nx) < .0008 && Math.abs(tny - ny) < .0008;
    if (settled) { running = false; return; }
    requestAnimationFrame(tick);
  }
  wake();
})();
