/* Start Your Dream: interactive particle fields (no dependencies) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.innerWidth < 760 || !window.matchMedia('(hover: hover)').matches;
  var DPR = small ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  var pointer = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });

  function Field(canvas) {
    var density = (+canvas.dataset.density || 14000) * (small ? 2.4 : 1), ctx = canvas.getContext('2d');
    var w = 0, h = 0, ps = [], link = small ? 95 : 125, repel = 140, visible = true, raf = 0;

    function build() {
      var r = canvas.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(small ? 38 : 85, Math.round(w * h / density)); ps = [];
      for (var i = 0; i < n; i++) {
        var k = Math.random();
        ps.push({
          x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .32, vy: (Math.random() - .5) * .32,
          r: Math.random() * 1.6 + .6, c: k < .2 ? '34,216,238' : k < .3 ? '245,184,0' : k < .4 ? '47,127,209' : '226,236,246'
        });
      }
    }
    function draw() {
      var rect = canvas.getBoundingClientRect(), mx = pointer.x - rect.left, my = pointer.y - rect.top, i, j, p, q, dx, dy, d;
      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < ps.length; i++) {
        p = ps[i];
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
          dx = p.x - mx; dy = p.y - my; d = Math.sqrt(dx * dx + dy * dy);
          if (d < repel && d > 0) { var f = (1 - d / repel) * 1.8; p.x += dx / d * f; p.y += dy / d * f; }
        }
      }
      ctx.lineWidth = 1;
      var L2 = link * link, bk = [[], [], []], al = [.07, .15, .26];
      for (i = 0; i < ps.length; i++) {
        p = ps[i];
        for (j = i + 1; j < ps.length; j++) {
          q = ps[j]; dx = p.x - q.x; if (dx > link || dx < -link) continue;
          dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < L2) { var t = 1 - d / L2, a = t > .66 ? 2 : t > .33 ? 1 : 0; bk[a].push(p.x, p.y, q.x, q.y); }
        }
        dx = p.x - mx; dy = p.y - my; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) {
          ctx.strokeStyle = 'rgba(245,184,0,' + (0.5 * (1 - d / 180)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
        }
      }
      for (var k = 0; k < 3; k++) {
        var arr = bk[k]; if (!arr.length) continue;
        ctx.strokeStyle = 'rgba(90,190,225,' + al[k] + ')'; ctx.beginPath();
        for (var m = 0; m < arr.length; m += 4) { ctx.moveTo(arr[m], arr[m + 1]); ctx.lineTo(arr[m + 2], arr[m + 3]); }
        ctx.stroke();
      }
      for (i = 0; i < ps.length; i++) {
        p = ps[i]; ctx.fillStyle = 'rgba(' + p.c + ',.85)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
    }
    function loop() { raf = 0; if (visible && !document.hidden) { draw(); raf = requestAnimationFrame(loop); } }
    function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
    build();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { build(); if (reduce) draw(); }, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', start);
    if (reduce) draw(); else start();
  }
  document.querySelectorAll('canvas.field').forEach(Field);
})();
