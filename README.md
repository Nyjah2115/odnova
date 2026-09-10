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
- kafelki unoszą się pod kursorem, przyciski przesuwają strzałkę, plus w FAQ obraca się w krzyżyk.

Typografia idzie za dwiema stronami, które klient podesłał jako punkt odniesienia —
[filmbot.com](https://filmbot.com) i [era-residence.com](https://www.era-residence.com).
Obie robią to samo: **wielkie nagłówki wersalikami przy interlinii poniżej 0,9**
i całą drobnicę na monospace. Tutaj nagłówki sekcji są w Fraunces wersalikami,
`clamp(34px, 6.4vw, 94px)`, interlinia `.9`, światło `-.024em`, a etykiety, podpisy,
metki i numery — w IBM Plex Mono.

Ważniejsze od samej skali okazało się jednak **skrócenie nagłówków**. Przy 94 px
zdanie „Robimy całość albo dokładnie ten kawałek, którego potrzebujesz" robi się ścianą
na pięć linii. Referencje mają nagłówki dwuwyrazowe — i dopiero wtedy wielka skala
działa. Stąd „Całość albo kawałek", „Pięć kroków", „Częste pytania", a wyrzucona treść
przeniosła się do akapitów obok.

Promienie zeszły z 26 px na 8, cienie spłaszczyły się, pigułki zrobiły się prostokątne.
Doszła też jedna scena z jedną wielką liczbą — „47 DNI" — bo obie referencje trzymają
pojedynczy fakt na osobnym ekranie zamiast rządka kafelków.

Do tego rzeczy, które robią różnicę dopiero w ruchu — strona jest pomyślana tak,
żeby dobrze wyglądała na nagraniu ekranu:

- **preloader** — znak firmowy, kreska dobijająca do 100% i licznik, a potem kurtyna
  odsłaniająca hero od dołu; pasek czeka na klatki i klipy hero, ale nie dłużej niż
  ~5 s, a niezależny `setTimeout` zdejmuje kurtynę nawet gdyby skrypt padł,
- **płynne przewijanie** na [Lenis](https://github.com/darkroomengineering/lenis) —
  strona dojeżdża do pozycji zamiast do niej przeskakiwać; obie referencje robią to samo
  i to jest największa różnica na nagraniu. Lenis jest pompowany z tej samej pętli
  `requestAnimationFrame`, co hero, a gdyby biblioteka się nie wczytała, zostaje
  natywne przewijanie,
- **nagłówki wjeżdżają słowo po słowie** — każde słowo dostaje własną maskę i startuje
  55 ms po poprzednim (odpowiednik GSAP SplitText, którego używa ERA),
- **pasek postępu strony** przy górnej krawędzi,
- **taśma haseł reaguje na scroll** — jedzie sama z siebie, ale rozpędza się od
  przewijania, przechyla w jego stronę i zawraca, gdy scrollujesz w górę. Prowadzi ją JS,
  bo animacja CSS nie wie nic o prędkości scrolla,
- **sekcja wjeżdża na przypięty kadr** — sekcja pod każdą sceną jest podciągnięta
  ujemnym marginesem na jej koniec (`-58vh`), więc zamiast po prostu nastąpić po zdjęciu,
  wsuwa się na nie **łukiem**: górna krawędź ma promień poziomy równy połowie szerokości
  i pionowy rzędu 70 px, co daje kopułę przez cały ekran (tak samo robi to ERA).
  Pasek haseł przeniósł się przed scenę, bo przy stu pikselach wysokości nie udźwignąłby łuku
  — teraz wjeżdżają wysokie sekcje: proces, opinie i kontakt.
  Zakładka bywa wyższa niż pierwszy element, który po scenie jedzie (pasek haseł ma raptem
  100 px), więc **każda zwykła sekcja ma własne kryjące tło i `z-index: 2`** — inaczej
  przypięte zdjęcie przebija spod przezroczystej sekcji. Tekst sceny
  odjeżdża w górę i gaśnie, **zanim** panel dosięgnie jego dolnej krawędzi — próg liczony
  jest z rzeczywistej pozycji panelu i zmierzonej wysokości bloku tekstu, nie ze zgadywanego
  progu postępu. Pierwsze podejście używało progu „60% sekcji" i panel wjeżdżał w tekst,
  kiedy ten miał jeszcze 55% krycia. To samo dotyczy podpisu w kadrze krokowym,
- **przesłona schodzi z kadru** — każde zdjęcie w przejeździe jest zasłonięte panelem,
  który zjeżdża w miarę, jak kadr wjeżdża w ekran od prawej,
- **nagłówki scen wjeżdżają literami** — w zwykłych sekcjach słowo po słowie (55 ms),
  w scenach na pełnym ekranie litera po literze (24 ms), bo jest na to miejsce i czas,
- **kadr krokowy** — przypięta sekcja, w której scroll przełącza trzy kroki: zmienia się
  zdjęcie, podświetla pozycja na liście po prawej (reszta zostaje przygaszona, przy aktywnej
  wyjeżdża pionowa kreska) i przenika podpis w lewym dolnym rogu. Wzorowane na
  [era-residence.com](https://www.era-residence.com), którą klient podesłał jako punkt odniesienia,
- **kadry w tle** — dwie pełnoekranowe sceny (za zakresem prac, za pakietami i przed
  kontaktem). Zdjęcie i tekst to rodzeństwo, ale oba są `sticky`, a drugie podciągnięte
  o `-100vh` — dzięki temu trzymają się razem bez dodatkowego opakowania. Kadr otwiera się
  od środka (`clip-path` schodzi z 4,5vh do zera) i jedzie leniwą paralaksą, a tekst wjeżdża
  zwykłym mechanizmem masek. W pionie przesłona po skosie kładła się źle, więc poniżej
  760 px zmienia się na pionową, a tekst siada przy dolnej krawędzi,
- **warianty wejść** — żeby cała strona nie powtarzała jednego gestu, każda sekcja
  wchodzi inaczej: kafle usług odsłaniają się przesłoną od dołu (`clip-path`), kroki procesu
  wjeżdżają z lewej, pakiety wyostrzają się z rozmycia, opinie prostują się z lekkiego
  przechyłu, a pytania w FAQ wjeżdżają z prawej,
- **kamera raz w dół, raz w prawo** — w realizacjach jest przypięty przejazd w bok.
  Kadr zajmuje
  **86% szerokości i 78% wysokości ekranu**, a następne zdjęcie wystaje zza krawędzi,
  więc kamera przesuwa się z kadru na kadr zamiast pokazywać rząd kafelków. Podpis siedzi
  w środku kadru, żeby zdjęcie mogło wziąć całą wysokość. Gdy zdjęcia się skończą,
  sticky puszcza i strona znowu jedzie w dół. Każdy przejazd kończy się panelem
  z odnośnikiem do wyceny.
  Wysokość sekcji ustawia JS proporcjonalnie do długości przejazdu (`0.85 × droga`),
  więc taśma jedzie odrobinę szybciej niż scroll i tempo jest takie samo niezależnie
  od liczby zdjęć i szerokości okna.
  Obsługa jest napisana na listę przejazdów, więc kolejne można dołożyć bez zmian w kodzie.
  Zdjęcia otwierają się w lightboksie (strzałki, Escape, zawijanie),
- **magnetyczne przyciski** — lekko uciekają za kursorem,

Wszystko wyłącza się przy `prefers-reduced-motion`.

## Czego nie ma

Był tu suwak przed/po, ale pokazywał `k1` i `k5` — dokładnie pierwszą i ostatnią klatkę
hero. Ten sam salon wracał więc drugi raz, kilka ekranów po tym, jak widz obejrzał jego
remont w dwudziestosekundowym ujęciu. Hero opowiada to lepiej, więc suwak wypadł.

## Reszta strony

Po hero strona wchodzi od razu w zakres prac — sekcja ze statystykami („240 mieszkań",
„12 lat") wypadła, bo na stronie pokazowej i tak były to liczby wzięte z sufitu.

- **Zakres prac** — sześć kart z ikonami i listami konkretów.
- **Proces** — pięć kroków z numerem w kółku i tygodniem, w którym się dzieją.
- **Realizacje** — przypięty przejazd w bok przez sześć wnętrz.
- **Pakiety** — trzy karty cenowe, środkowa ciemna jako wyróżniona.
- **Opinie** z inicjałami, **FAQ** (akordeon), **formularz wyceny** (waliduje się, ale nic nie wysyła).

## Zdjęcia w realizacjach

To **darmowe zdjęcia stockowe z Unsplash**, nie prace żadnej firmy — na stronie
pokazowej nie mogą uchodzić za portfolio, więc jest o tym notka w stopce.
Licencja Unsplash pozwala na użycie komercyjne i niekomercyjne bez pytania o zgodę.
Pliki leżą w `media/realizacje/` przeskalowane do 1400 px.

## Struktura

```
index.html
css/style.css
js/main.js
media/frames/k1–k5.jpg     klatki kluczowe (JPEG na stronę)
media/video/etap-1…4.mp4   cztery klipy po 5 s
media/realizacje/r*.jpg    sześć zdjęć stockowych do przejazdu
media/realizacje/bg1–3.jpg trzy kadry na pełny ekran
```

## Uwagi

- Formularz jest wyłącznie po stronie przeglądarki — na prawdziwej stronie trzeba
  podpiąć backend albo usługę typu Formspree.
- Numer telefonu, adres i e-mail w stopce są wymyślone; domena `odnova.example`
  jest celowo z puli zarezerwowanej na przykłady.
- Ceny w pakietach i statystyki (240 mieszkań, 12 lat, 47 dni) to dane demonstracyjne.
