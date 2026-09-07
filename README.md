# ODNOVA — remonty i wykończenia mieszkań

Koncepcyjny landing page firmy remontowej. Projekt do portfolio.
**Marka jest fikcyjna**, dane teleadresowe, ceny, opinie i statystyki są wymyślone.

## O co chodzi

Cały pomysł siedzi w sekcji głównej. Zamiast zdjęcia albo pętli wideo w tle jest
**jedno ujęcie remontu sterowane przewijaniem strony**: kamera stoi w miejscu, a
mieszkanie przechodzi na oczach użytkownika przez cztery etapy — od stanu surowego
do urządzonego salonu. Przewijasz w dół, remont idzie do przodu; przewijasz w górę,
cofa się. Razem 20 sekund materiału podzielonych po 5 sekund na etap.

Podpis pod kadrem i pasek postępu zmieniają się razem z obrazem, więc widać nie tylko
efekt, ale i to, na którym etapie prac się jest oraz który to dzień remontu.

## Jak to zrobione

Klatki i wideo wygenerowałem w Higgsfield.

1. **Pięć klatek kluczowych** (`media/frames/k1–k5`) — model `nano_banana_pro`.
   Pierwsza to pusty pokój w stanie surowym, każda kolejna powstała z poprzedniej
   jako obrazu referencyjnego, z instrukcją „ten sam pokój, ta sama kamera, zmień
   wyłącznie stan remontu". Dzięki temu geometria wnętrza, okna, drzwi i proporcje
   nie uciekają między etapami.
2. **Cztery klipy po 5 s** (`media/video/etap-1…4.mp4`) — model `kling3_0`, tryb
   `std`, bez dźwięku. Każdy klip dostał klatkę początkową i końcową z pary sąsiednich
   obrazów: klip 1 to `k1 → k2`, klip 2 to `k2 → k3` i tak dalej. Klip N kończy się
   dokładnie tą klatką, którą zaczyna klip N+1, więc podmiana pliku w trakcie
   przewijania jest niewidoczna i nie trzeba było sklejać ich w jeden materiał.

Na tej maszynie nie ma `ffmpeg`, więc klipy zostały tak, jak przyszły z generatora,
a klatki przekonwertowałem do JPEG-a systemowym `sips` (2000 px, jakość 78).
Oryginalne PNG-i z generatora (po 5–7 MB) zostały poza repozytorium.

## Jak działa scrollowanie

`js/main.js`, sekcja HERO:

- kontener `.hero` ma wysokość 460vh, a `.hero-sticky` jest przyklejony (`position: sticky`),
- postęp przewijania po tym kontenerze normalizuję do zakresu 0–1 i wygładzam lerpem
  w pętli `requestAnimationFrame` (bez tego scrub jest szarpany na trackpadzie),
- `g = postęp × 4` daje numer etapu (część całkowita) i pozycję w klipie (część ułamkowa),
- aktywny `<video>` dostaje `currentTime = pozycja × długość klipu`, pozostałe są ukryte,
- `currentTime` ustawiam tylko przy zmianie większej niż 0,03 s, żeby nie zarzynać dekodera.

**Zabezpieczenia:** jeżeli któryś plik wideo się nie wczyta (albo użytkownik ma
włączone `prefers-reduced-motion`, albo ekran węższy niż 760 px), strona przełącza się
na przenikanie pięciu statycznych klatek. Ten sam efekt, zero kosztu dekodowania wideo —
i strona wygląda poprawnie także wtedy, gdy repozytorium sklonuje ktoś bez plików mp4.

## Warstwa wizualna

Jasna i spokojna: ciepła biel `#fbf8f4`, treść na białych kafelkach z miękkim cieniem
i promieniem 26 px, jeden akcent (glina `#b4693f`) i para krojów — Fraunces na
nagłówki, Inter na resztę. Zamiast kreskowych ramek i siatek wszystko siedzi
na kartach, więc strona czyta się lekko mimo dużej ilości treści.

Hero zostaje ciemne (bo takie jest zdjęcie), ale dolny gradient wygasza je do koloru
tła, więc przejście do jasnej części nie ma szwu. Cała nawigacja po etapach mieści się
w jednej pigułce z rozmytym tłem (`backdrop-filter`) przy dolnej krawędzi.

Animacje:

- kafelki wjeżdżają od dołu, a kolejne w tej samej siatce startują 75 ms po sobie
  (JS ustawia `--i`, CSS przelicza to na `transition-delay`),
- nagłówki sekcji wyjeżdżają zza maski — JS pakuje tekst w dodatkowy `<i>`,
  który startuje przesunięty o własną wysokość,
- liczby w sekcji z wskaźnikami odliczają od zera, gdy wejdą w kadr,
- zdjęcia realizacji mają delikatną paralaksę (±14 px) liczoną w tej samej pętli
  `requestAnimationFrame`, co hero — przez zmienną CSS, żeby nie kasować skali z `:hover`,
- kafelki unoszą się pod kursorem, przyciski przesuwają strzałkę, plus w FAQ obraca się w krzyżyk.

Wszystko wyłącza się przy `prefers-reduced-motion`.

## Reszta strony

- **Liczby** — cztery kafelki z licznikami.
- **Zakres prac** — sześć kart z ikonami i listami konkretów.
- **Proces** — pięć kroków z numerem w kółku i tygodniem, w którym się dzieją.
- **Realizacje** — suwak przed/po (te same `k1` i `k5`, co w hero) plus trzy kadry z etapów.
- **Pakiety** — trzy karty cenowe, środkowa ciemna jako wyróżniona.
- **Opinie** z inicjałami, **FAQ** (akordeon), **formularz wyceny** (waliduje się, ale nic nie wysyła).

## Struktura

```
index.html
css/style.css
js/main.js
media/frames/k1–k5.jpg     klatki kluczowe (JPEG na stronę)
media/video/etap-1…4.mp4   cztery klipy po 5 s
```

## Uwagi

- Formularz jest wyłącznie po stronie przeglądarki — na prawdziwej stronie trzeba
  podpiąć backend albo usługę typu Formspree.
- Numer telefonu, adres i e-mail w stopce są wymyślone; domena `odnova.example`
  jest celowo z puli zarezerwowanej na przykłady.
- Ceny w pakietach i statystyki (240 mieszkań, 12 lat, 47 dni) to dane demonstracyjne.
