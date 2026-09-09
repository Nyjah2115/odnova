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

/* ————————————————— PLYNNE PRZEWIJANIE —————————————————
   Lenis interpoluje pozycje scrolla. Bez tego na nagraniu widac kazdy zab
   kolka myszy; z nim strona dojezdza do pozycji zamiast do niej przeskakiwac.
   Gdyby biblioteka sie nie wczytala, zostaje natywne przewijanie. */
let lenis = null;
if (window.Lenis && !reduced) {
  try { lenis = new Lenis({ duration: 1.15, wheelMultiplier: 0.9, touchMultiplier: 1.6 }); }
  catch (e) { lenis = null; }
}

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

if (!reduced) {
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
const tick = t => {
  if (lenis) { try { lenis.raf(t); } catch (e) {} }
  target = clamp((scrollY - heroTop) / heroRange, 0, 1);
  smooth += (target - smooth) * (reduced ? 1 : 0.14);
  if (Math.abs(target - smooth) < 0.0004) smooth = target;
  apply(false);
  // tasma i pasek postepu sa ozdoba — gdyby ktorakolwiek rzucila bledem,
  // nie moze zabic petli, ktora obsluguje przewijanie hero
  try { strip(); scenesTick(); pageProgress(); } catch (e) {}
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

const remeasure = () => { measure(); measureStrips(); setNav(); };
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
  const words = h.textContent.trim().split(/\s+/);
  h.textContent = '';
  words.forEach((w, i) => {
    const inner = document.createElement('i');
    inner.textContent = w;
    inner.style.setProperty('--w', i);
    const mask = document.createElement('span');
    mask.className = 'mask';
    mask.appendChild(inner);
    h.appendChild(mask);
    if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
  });
});

const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
$$('.rise').forEach(el => io.observe(el));

/* ————————————————— KOTWICE ————————————————— */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ————————————————— FAQ ————————————————— */
$$('.faq-i').forEach(item => {
  const q = $('.faq-q', item), a = $('.faq-a', item);
  q.addEventListener('click', () => {
    const open = item.classList.contains('open');
    $$('.faq-i.open').forEach(o => { o.classList.remove('open'); $('.faq-a', o).style.maxHeight = 0; });
    if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});

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

/* ————————————————— KADRY W TLE —————————————————
   Zdjecie otwiera sie od srodka (clip-path) i jedzie leniwa paralaksa,
   gdy sekcja przechodzi przez ekran. Tekst wjezdza zwyklym mechanizmem .rise. */
const scenes = $$('.scene').map(el => ({ el, media: $('.scene-media', el), img: $('.scene-media img', el) }));

function scenesTick() {
  for (const s of scenes) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) continue;
    const p    = clamp(-r.top / Math.max(1, s.el.offsetHeight - vh), 0, 1);
    const open = clamp(p / 0.28, 0, 1);
    s.media.style.setProperty('--c', ((1 - open) * 4.5).toFixed(2) + 'vh');
    s.img.style.setProperty('--py', ((p - 0.5) * -7).toFixed(2) + '%');
  }
}

/* ————————————————— PRZEJAZDY W BOK —————————————————
   Kamera idzie raz w dol, raz w prawo: sekcja jest przypieta, a pionowy scroll
   po niej przekladamy na przesuniecie tasmy. Takich przejazdow jest kilka,
   wiec kazdy trzyma wlasne pomiary. */
const strips = $$('.strip').map(el => ({
  el,
  track: $('.strip-track', el),
  now:   $('.strip-count b', el),
  cards: $$('.shot, .shot-end', el),
  top: 0, range: 1, max: 0, x: 0, cur: -1
}));

function measureStrips() {
  if (!strips.length) return;
  // Najpierw dlugosci przejazdow i wysokosci sekcji — wysokosc dobieramy do tego,
  // ile jest do przejechania, zeby tempo bylo takie samo w kazdym przejezdzie
  // niezaleznie od liczby zdjec.
  for (const s of strips) {
    const pad = parseFloat(getComputedStyle(s.track).paddingLeft) || 0;
    s.max = Math.max(0, s.track.scrollWidth - innerWidth + pad);
    s.el.style.height = Math.round(innerHeight + s.max * 0.85) + 'px';
  }
  // Dopiero teraz pozycje — zmiana wysokosci przesuwa wszystko, co jest nizej.
  for (const s of strips) {
    const r = s.el.getBoundingClientRect();
    s.top   = r.top + scrollY;
    s.range = Math.max(1, s.el.offsetHeight - innerHeight);
  }
}
measureStrips();

function strip() {
  for (const s of strips) {
    if (!s.max) continue;
    const p  = clamp((scrollY - s.top) / s.range, 0, 1);
    const to = -p * s.max;
    s.x += (to - s.x) * (reduced ? 1 : 0.12);
    s.track.style.transform = 'translate3d(' + s.x.toFixed(1) + 'px,0,0)';

    if (!s.now) continue;
    const n = s.cards.length - 1;                 // panel domykajacy sie nie liczy
    const idx = Math.min(n - 1, Math.max(0, Math.round(p * n)));
    if (idx !== s.cur) {
      s.cur = idx;
      s.now.textContent = String(idx + 1).padStart(2, '0');
    }
  }
}

/* ————————————————— LIGHTBOX ————————————————— */
const lb = $('#lb'), lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbMeta = $('#lbMeta');
const shots = $$('.shot');
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

  if (lenis) lenis.stop();
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    clearTimeout(guard);
    if (lenis) lenis.start();
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
