/* =============================================
   Predylics — micro-interactions
   Tout est progressif : sans ce script, le site reste entièrement lisible.
============================================= */
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  // ---------- Cartes ----------
  var cards = $$([
    '#accueil .lg\\:grid-cols-4 > div',
    '#expertises .lg\\:grid-cols-2 > div',
    'main .lg\\:grid-cols-3 > div',
    '#approche .lg\\:grid-cols-4 > div',
    '#a-propos .lg\\:col-span-7 > div'
  ].join(','));
  cards.forEach(function (card) {
    card.classList.add('card');
    if (!canHover) return;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });

  // ---------- Flèches des liens ----------
  var arrowAxis = { arrow_forward: 'x', south: 'y', north_east: 'xy' };
  $$('a .material-symbols-outlined').forEach(function (icon) {
    var axis = arrowAxis[icon.textContent.trim()];
    if (axis) icon.setAttribute('data-arrow', axis);
  });

  // ---------- Curseur clignotant des « >_ RUN » ----------
  $$('main .font-mono').forEach(function (el) {
    if (el.textContent.trim() !== '>_ RUN') return;
    var caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);
  });

  // ---------- Header, progression de lecture, retour en haut ----------
  var header = document.querySelector('header');
  var menuToggle = document.getElementById('menu-toggle');
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  header.classList.add('site-header');
  header.appendChild(bar);

  var toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Revenir en haut de la page');
  toTop.innerHTML = '<span class="material-symbols-outlined text-[20px]" aria-hidden="true">north</span>';
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.body.appendChild(toTop);

  var lastY = window.scrollY;
  var pending = false;
  function onScroll() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;
    bar.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1) : 0);
    header.classList.toggle('is-scrolled', y > 8);
    if (Math.abs(y - lastY) > 4) {
      var menuOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      header.classList.toggle('is-hidden', !menuOpen && y > 400 && y > lastY);
      lastY = y;
    }
    toTop.classList.toggle('is-visible', y > 900);
    pending = false;
  }
  window.addEventListener('scroll', function () {
    if (!pending) { pending = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Tout ce qui suit est du mouvement pur : on respecte « réduire les animations ».
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  root.classList.add('motion');

  // ---------- Apparition au scroll ----------
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add('is-visible');
      revealObserver.unobserve(el);
      // Le délai d'apparition ne doit pas ralentir les survols ensuite.
      setTimeout(function () { el.style.removeProperty('--delay'); }, 900 + (parseInt(el.style.getPropertyValue('--delay'), 10) || 0));
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  function reveal(el, delay) {
    el.setAttribute('data-reveal', '');
    if (delay) el.style.setProperty('--delay', delay + 'ms');
    revealObserver.observe(el);
  }

  $$('#accueil > .max-w-7xl > .flex-col > *').forEach(function (el, i) { reveal(el, i * 90); });
  $$('main section:not(#accueil) > div > *').forEach(function (block) {
    if (!block.querySelector('.card')) { reveal(block, 0); return; }
    Array.prototype.forEach.call(block.children, function (child) {
      if (!child.classList.contains('card') && !child.querySelector('.card')) reveal(child, 0);
    });
  });
  cards.forEach(function (card) {
    if (card.closest('#accueil')) return;
    var index = Array.prototype.indexOf.call(card.parentNode.children, card);
    reveal(card, Math.min(index, 5) * 80);
  });

  // ---------- Compteurs des résultats clients ----------
  function countUp(el, parts) {
    var target = +parts[2];
    var start = null;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / 1400, 1);
      el.textContent = parts[1] + Math.round(target * (1 - Math.pow(1 - p, 4))) + parts[3];
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      countUp(entry.target, entry.target._parts);
    });
  }, { threshold: .6 });
  $$('#realisations .text-\\[24px\\]').forEach(function (el) {
    var parts = el.textContent.match(/^(\D*)(\d+)(.*)$/);
    if (!parts) return;
    el._parts = parts;
    el.style.fontVariantNumeric = 'tabular-nums';
    el.textContent = parts[1] + '0' + parts[3];
    counterObserver.observe(el);
  });

  // ---------- Télémétrie « live » du hero ----------
  var ticks = [];
  $$('#accueil .font-mono').forEach(function (el) {
    if (el.textContent.trim() === '1.2 GB/s') {
      el.innerHTML = '<span data-tick>1.2</span> GB/s';
      ticks.push({ el: el.firstChild, next: function () { return (1.1 + Math.random() * .25).toFixed(1); } });
    }
  });
  $$('#accueil .text-outline').forEach(function (el) {
    if (el.children.length || el.textContent.indexOf('LATENCY P99: 184ms') === -1) return;
    el.innerHTML = el.innerHTML.replace('184ms', '<span data-tick>184</span>ms');
    ticks.push({ el: el.querySelector('[data-tick]'), next: function () { return 176 + Math.round(Math.random() * 16); } });
  });
  if (ticks.length) {
    setInterval(function () {
      if (document.hidden) return;
      var t = ticks[Math.floor(Math.random() * ticks.length)];
      var value = String(t.next());
      if (value === t.el.textContent) return;
      t.el.textContent = value;
      t.el.classList.remove('tick-flash');
      void t.el.offsetWidth; // relance l'animation
      t.el.classList.add('tick-flash');
    }, 1600);
  }

  // ---------- Flux de données dans les schémas ----------
  $$('#expertises svg path').forEach(function (path, i) {
    if (path.hasAttribute('stroke-dasharray')) { path.classList.add('flow'); return; }
    if (!/stroke-(primary|secondary)/.test(path.getAttribute('class') || '') || !path.animate) return;
    var len = path.getTotalLength();
    var packet = path.cloneNode();
    packet.classList.add('packet');
    packet.style.strokeDasharray = '8 ' + (len + 8);
    path.parentNode.insertBefore(packet, path.nextSibling);
    packet.animate(
      [{ strokeDashoffset: 8 }, { strokeDashoffset: -len }],
      { duration: 1800, delay: i * 250, iterations: Infinity, easing: 'ease-in-out' }
    );
  });

  // ---------- Halos du bloc contact ----------
  var cta = document.querySelector('#contact .overflow-hidden');
  if (cta && canHover) {
    var blobs = $$('.blur-3xl', cta);
    cta.addEventListener('pointermove', function (e) {
      var r = cta.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      blobs.forEach(function (blob, i) {
        var k = i ? -60 : 60;
        blob.style.translate = (x * k) + 'px ' + (y * k) + 'px';
      });
    });
  }
})();
