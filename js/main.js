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
  // tasma i pasek postepu sa ozdoba — gdyby ktorakolwiek rzucila bledem,
  // nie moze zabic petli, ktora obsluguje przewijanie hero
  try { strip(); pageProgress(); } catch (e) {}
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

const remeasure = () => { measure(); measureStrip(); setNav(); };
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
$$('.svc, .proc, .plans, .revs, .faq, .sec-head, .contact-grid').forEach(group => {
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




/* ————————————————— PASEK POSTEPU STRONY ————————————————— */
const bar = $('#progress');
function pageProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (max > 0 ? clamp(scrollY / max, 0, 1) * 100 : 0).toFixed(2) + '%';
}

/* ————————————————— TASMA REALIZACJI —————————————————
   Sekcja jest wysoka na kilka ekranow i przypieta; pionowy scroll po niej
   przekladamy na przesuniecie tasmy w bok. */
const stripEl    = $('#strip');
const stripTrack = $('#stripTrack');
const stripNow   = $('#stripNow');
const shots      = $$('.shot');
let stripTop = 0, stripRange = 1, stripMax = 0, stripX = 0, stripCur = -1;

function measureStrip() {
  if (!stripEl) return;
  const r = stripEl.getBoundingClientRect();
  stripTop   = r.top + scrollY;
  stripRange = Math.max(1, stripEl.offsetHeight - innerHeight);
  const pad  = parseFloat(getComputedStyle(stripTrack).paddingLeft) || 0;
  stripMax   = Math.max(0, stripTrack.scrollWidth - innerWidth + pad);
}
measureStrip();

function strip() {
  if (!stripEl || !stripMax) return;
  const p  = clamp((scrollY - stripTop) / stripRange, 0, 1);
  const to = -p * stripMax;
  stripX  += (to - stripX) * (reduced ? 1 : 0.12);
  stripTrack.style.transform = 'translate3d(' + stripX.toFixed(1) + 'px,0,0)';

  const idx = Math.min(shots.length - 1, Math.round(p * (shots.length - 1)));
  if (idx !== stripCur) {
    stripCur = idx;
    stripNow.textContent = String(idx + 1).padStart(2, '0');
  }
}

/* ————————————————— LIGHTBOX ————————————————— */
const lb = $('#lb'), lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbMeta = $('#lbMeta');
let lbAt = 0;

const lbShow = i => {
  lbAt = (i + shots.length) % shots.length;
  const fig = shots[lbAt], img = $('img', fig);
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbTitle.textContent = $('figcaption b', fig).textContent;
  lbMeta.textContent  = $('figcaption span', fig).textContent;
};
const lbOpen = i => { lbShow(i); document.body.classList.add('lb-open'); };
const lbClose = () => document.body.classList.remove('lb-open');

shots.forEach((fig, i) => fig.addEventListener('click', () => lbOpen(i)));
$('#lbX').addEventListener('click', lbClose);
$('#lbPrev').addEventListener('click', e => { e.stopPropagation(); lbShow(lbAt - 1); });
$('#lbNext').addEventListener('click', e => { e.stopPropagation(); lbShow(lbAt + 1); });
lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
addEventListener('keydown', e => {
  if (!document.body.classList.contains('lb-open')) return;
  if (e.key === 'Escape')     lbClose();
  if (e.key === 'ArrowLeft')  lbShow(lbAt - 1);
  if (e.key === 'ArrowRight') lbShow(lbAt + 1);
});

/* ————————————————— MAGNETYCZNE PRZYCISKI ————————————————— */
if (matchMedia('(pointer:fine)').matches && !reduced) {
  $$('.btn').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.transform = 'translate(' + (dx * 10).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
    });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });
}

/* ————————————————— PRELOADER —————————————————
   Pasek dobija do 100% dopiero, gdy krytyczne media sa gotowe, ale nie trzyma
   ekranu dluzej niz kilka sekund — nawet jesli cos sie nie doczyta. */
(() => {
  const preBar = $('#preBar'), preNum = $('#preNum');
  const assets = [...$$('.stage img'), ...$$('.stage video')];
  let done = 0;
  const total = Math.max(1, assets.length);

  const bump = () => { done++; };
  assets.forEach(a => {
    if (a.tagName === 'IMG') {
      if (a.complete) bump();
      else { a.addEventListener('load', bump, { once: true }); a.addEventListener('error', bump, { once: true }); }
    } else {
      if (a.readyState >= 2) bump();
      else { a.addEventListener('loadeddata', bump, { once: true }); a.addEventListener('error', bump, { once: true }); }
    }
  });

  const t0 = performance.now();
  const MIN = reduced ? 0 : 900, MAX = 5200;
  let shown = 0;

  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    clearTimeout(guard);
    document.body.classList.add('loaded');
    setTimeout(() => { const p = $('#pre'); if (p) p.remove(); }, 1500);
  };
  // rAF stoi w karcie w tle, a wtedy petla nizej nigdy nie dobije do konca —
  // timer chodzi zawsze, wiec kurtyna zejdzie tak czy inaczej
  const guard = setTimeout(finish, MAX + 1200);

  const step = () => {
    const el   = performance.now() - t0;
    const real = done / total;
    const time = clamp(el / MAX, 0, 1);
    // pokazujemy mniejsza z wartosci, zeby pasek nie skakal do 100 przed czasem
    const to   = Math.min(real, Math.max(time, real * 0.9));
    shown += (to - shown) * 0.12;

    const pct = Math.round(clamp(shown, 0, 1) * 100);
    preBar.style.width = pct + '%';
    preNum.textContent = pct;

    if ((real >= 1 && el > MIN && pct > 96) || el > MAX) {
      preBar.style.width = '100%';
      preNum.textContent = '100';
      setTimeout(finish, 260);
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();


})();
