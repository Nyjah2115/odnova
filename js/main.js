/* ============================================================
   ODNOVA — logika strony
   Sercem jest hero: 4 klipy po 5 s, przewijane scrollem.
   Klip N konczy sie dokladnie ta klatka, ktora zaczyna sie klip N+1,
   wiec przelaczenie miedzy nimi jest niewidoczne.
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ————————————————— NAV ————————————————— */
const nav = $('#nav');

const burger = $('#burger');
burger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
$$('#mobileMenu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

/* ————————————————— HERO ————————————————— */
const hero    = $('.hero');
const sticky  = $('#heroSticky');
const vids    = [0,1,2,3].map(i => $('#v' + i));
const frames  = [0,1,2,3,4].map(i => $('#frame' + i));
const items   = $$('.stage-item');
const segs    = $$('.rail-seg');
const fills   = segs.map(s => $('i', s));

const STAGES = 4;
const CLIP   = 5;               // dlugosc pojedynczego klipu w sekundach

let heroTop = 0, heroRange = 1, vh = innerHeight;
let smooth = 0, target = 0, curStage = -1, curFrame = -1;
let videoMode = false;          // wlaczamy dopiero, gdy wszystkie klipy sa gotowe

const measure = () => {
  vh = innerHeight;
  const r = hero.getBoundingClientRect();
  heroTop = r.top + scrollY;
  heroRange = Math.max(1, hero.offsetHeight - vh);
};
measure();

/* Pasek nawigacji bieleje dopiero po ostatnim etapie — dopoki trwa hero,
   nad ciemnym kadrem ma zostac przezroczysty. */
const setNav = () => nav.classList.toggle('solid', scrollY > heroTop + heroRange - 8);
setNav();

/* --- czy mozemy scrubowac wideo? --- */
const ready = v => new Promise(res => {
  if (v.readyState >= 2) return res(true);
  const ok   = () => { cleanup(); res(true); };
  const fail = () => { cleanup(); res(false); };
  const cleanup = () => {
    v.removeEventListener('loadeddata', ok);
    v.removeEventListener('error', fail);
    clearTimeout(t);
  };
  const t = setTimeout(fail, 9000);
  v.addEventListener('loadeddata', ok, { once: true });
  v.addEventListener('error', fail, { once: true });
});

if (!reduced && innerWidth >= 760) {
  Promise.all(vids.map(ready)).then(res => {
    if (!res.every(Boolean)) return;          // brak plikow -> zostajemy na klatkach
    videoMode = true;
    vids.forEach(v => { try { v.pause(); v.currentTime = 0; } catch (e) {} });
    frames.forEach(f => f.classList.remove('on'));
    apply(true);
  });
}

/* --- podpisy etapow i pasek postepu --- */
const paintStage = (idx, g) => {
  if (idx !== curStage) {
    items.forEach((el, i) => el.classList.toggle('on', i === idx));
    segs.forEach((el, i)  => el.classList.toggle('on', i === idx));
    curStage = idx;
  }
  fills.forEach((f, i) => { f.style.width = (clamp(g - i, 0, 1) * 100).toFixed(1) + '%'; });
};

/* --- glowna aktualizacja --- */
const apply = force => {
  const g    = smooth * STAGES;                 // 0..4
  const idx  = Math.min(STAGES - 1, Math.floor(g));
  const loc  = clamp(g - idx, 0, 1);

  if (videoMode) {
    vids.forEach((v, i) => v.classList.toggle('on', i === idx));
    const v = vids[idx];
    const dur = (isFinite(v.duration) && v.duration > 0) ? v.duration : CLIP;
    const t = clamp(loc * dur, 0, dur - 0.05);
    if (force || Math.abs(v.currentTime - t) > 0.03) {
      try { v.currentTime = t; } catch (e) {}
    }
    // sasiedni klip trzymamy na skrajnej klatce, zeby podmiana byla bezszwowa
    const nx = vids[idx + 1];
    if (nx && nx.currentTime > 0.05) { try { nx.currentTime = 0; } catch (e) {} }
  } else {
    const fi = Math.min(4, Math.round(g));
    if (fi !== curFrame) {
      frames.forEach((f, i) => f.classList.toggle('on', i === fi));
      curFrame = fi;
    }
  }

  paintStage(idx, g);
  sticky.classList.toggle('moved', smooth > 0.02);
};

/* --- petla rAF --- */
const tick = () => {
  target = clamp((scrollY - heroTop) / heroRange, 0, 1);
  smooth += (target - smooth) * (reduced ? 1 : 0.14);
  if (Math.abs(target - smooth) < 0.0004) smooth = target;
  apply(false);
  // paralaksa jest wylacznie ozdoba — gdyby kiedykolwiek rzucila bledem,
  // nie moze zabic petli, ktora obsluguje przewijanie hero
  if (!reduced) { try { parallax(); } catch (e) {} }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

const remeasure = () => { measure(); setNav(); };
addEventListener('scroll', setNav, { passive: true });
addEventListener('resize', remeasure);
addEventListener('load', remeasure);
addEventListener('orientationchange', () => setTimeout(remeasure, 250));
// wysokosc hero zalezy od vh, a ten potrafi sie zmienic pozniej
// (pasek adresu na mobile, zmiana okna, docelowo tez zaladowanie fontow)
if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(hero);

/* ————————————————— WEJSCIA SEKCJI ————————————————— */
/* Kolejnosc w obrebie jednej siatki robi schodek — kazdy kolejny kafelek
   startuje 75 ms po poprzednim (--i czyta transition-delay w CSS). */
$$('.stats, .svc, .proc, .plans, .revs, .faq, .gal, .sec-head, .contact-grid').forEach(group => {
  $$('.rise', group).forEach((el, i) => el.style.setProperty('--i', i));
});

/* Naglowki sekcji wjezdzaja zza maski — tekst chowamy w dodatkowym <i>,
   ktory startuje przesuniety o wlasna wysokosc w dol. */
$$('.sec-h2').forEach(h => {
  if (h.querySelector('.mask')) return;
  const inner = document.createElement('i');
  inner.textContent = h.textContent;
  const mask = document.createElement('span');
  mask.className = 'mask';
  mask.appendChild(inner);
  h.textContent = '';
  h.appendChild(mask);
});

const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
$$('.rise').forEach(el => io.observe(el));

/* ————————————————— LICZNIKI ————————————————— */
const counters = $$('.stat b');
const countIO = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const sup = e.target.querySelector('span');
    const to = parseInt(e.target.textContent, 10);
    if (!isFinite(to)) return;
    if (reduced) { e.target.firstChild.textContent = to; return; }
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      e.target.firstChild.textContent = Math.round(to * eased);
      if (p < 1) requestAnimationFrame(step);
      else if (sup) sup.hidden = false;
    };
    if (sup) sup.hidden = true;
    requestAnimationFrame(step);
  });
}, { threshold: .5 });
counters.forEach(el => countIO.observe(el));

/* ————————————————— DELIKATNA PARALAKSA W GALERII ————————————————— */
var paraImgs = $$('.gal img');
function parallax() {
  for (const img of paraImgs) {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const p = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1
    // tylko zmienna CSS, zeby nie nadpisac skali z :hover
    img.style.setProperty('--py', (p * -14).toFixed(2) + 'px');
  }
}

/* ————————————————— FAQ ————————————————— */
$$('.faq-i').forEach(item => {
  const q = $('.faq-q', item), a = $('.faq-a', item);
  q.addEventListener('click', () => {
    const open = item.classList.contains('open');
    $$('.faq-i.open').forEach(o => { o.classList.remove('open'); $('.faq-a', o).style.maxHeight = 0; });
    if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});

/* ————————————————— SUWAK PRZED / PO ————————————————— */
const ba = $('#ba');
if (ba) {
  const after = $('.after', ba), handle = $('#baHandle');
  let dragging = false;
  const set = x => {
    const r = ba.getBoundingClientRect();
    const p = clamp((x - r.left) / r.width, 0, 1) * 100;
    after.style.clipPath = `inset(0 0 0 ${p}%)`;
    handle.style.left = p + '%';
  };
  const start = e => { dragging = true; set((e.touches ? e.touches[0] : e).clientX); };
  const move  = e => { if (dragging) set((e.touches ? e.touches[0] : e).clientX); };
  const end   = () => { dragging = false; };
  ba.addEventListener('mousedown', start);
  ba.addEventListener('touchstart', start, { passive: true });
  addEventListener('mousemove', move);
  addEventListener('touchmove', move, { passive: true });
  addEventListener('mouseup', end);
  addEventListener('touchend', end);
  ba.addEventListener('mousemove', e => { if (!dragging) set(e.clientX); });
}

/* ————————————————— FORMULARZ (bez wysylki) ————————————————— */
const form = $('#form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#formMsg');
    const n = $('#n').value.trim(), t = $('#t').value.trim(), c = $('#c').checked;
    if (n.length < 3)              { msg.textContent = 'Podaj imię i nazwisko.'; return; }
    if (t.replace(/\D/g, '').length < 9) { msg.textContent = 'Podaj numer telefonu (9 cyfr).'; return; }
    if (!c)                        { msg.textContent = 'Zaznacz zgodę na kontakt.'; return; }
    msg.style.color = '#8fbf87';
    msg.textContent = 'To jest strona pokazowa — formularz nie wysyła danych. Na prawdziwej stronie zapytanie trafiłoby na skrzynkę firmy.';
    form.reset();
  });
}

})();
