# Backlog

Idei și probleme notate pentru mai târziu.

Release-ul cu notificări (noiembrie 2026) a adus: atingerea notificării deschide lista ei, numărul de
noutăți neanunțate pe clopoțel, alegerea evenimentelor care intră în anunț, „Marchează bifatele ca
anunțate, fără notificare” și previzualizarea produselor după dictare (sau după mai multe scrise cu
virgulă), cu corectare și ✕ înainte de adăugare. Engleza se alege din Setări.

Patch-ul din 7 noiembrie 2026 a rezolvat: dictarea pe Android (textul vine doar la sfârșit, fără
repetări), instalarea pe Android din alt browser decât Chrome (trimitem în Chrome), mesajul de invitație
care merge și pentru cine are deja aplicația, atenționarea când doar tu vezi o listă și cele două liste
„Cumpărături” (prima listă nu se mai face automat). Înainte: actualizarea automată, accesul restrâns al
adminului, ecranul de bun venit, sfaturile ca fereastră, setările în cont și adăugarea cu vocea.

## De verificat după patch-ul din 7 noiembrie

- dictarea pe un Android real (Moni) și pe iPhone, că merge la fel ca înainte. Pe Android ascultăm acum
  o singură frază: de încercat și cu o pauză între produse („lapte… și carne”). Dacă se oprește după
  primul produs, varianta e ascultare continuă tot fără text parțial, cu repetările scoase la final;
- butonul „Deschide în Chrome” din Samsung Internet; de confirmat cu Moni ce telefon și ce browser a folosit.

## De făcut

### Lista de cadouri (următorul release)

Pentru Crăciun: o listă de dorințe pentru Andreea și Ștefan, la care Moni și prietenii cumpără pe ascuns.
Un tip nou de listă cu două roluri:
- **cei care primesc** (Andreea, Ștefan): adaugă ce își doresc și văd lista simplă, cu toate dorințele,
  fără să afle ce s-a luat; fără bife, comentarii, poze sau chat;
- **cei care cumpără** (Moni, prietenii): văd lista ca acum, cu ce s-a luat, comentarii, poze și chat.

Hotărât până acum: copiii nu cumpără și nu-și fac cadouri unul altuia (de văzut mai târziu, doar dacă
chiar e nevoie). De gândit înainte de cod, ca să nu reproiectăm ulterior:
- unde stă ce trebuie ascuns copiilor. Aplicația descarcă pe telefon tot documentul unui produs, deci
  ce s-a luat, de cine, comentariile și chatul trebuie ținute separat, într-un loc pe care regulile
  Firebase nu-l dau copiilor, nu doar ascunse în ecran;
- rolul se ține pe listă, pe fiecare membru (cine primește, cine cumpără), și se alege la invitare;
- „Iau eu”: rezervarea unui cadou, ca doi prieteni să nu cumpere același lucru;
- gruparea pe copil în loc de raioane;
- anunțurile nu ajung la copii;
- produsele luate nu trec în istoric până după Crăciun;
- prietenii invitați intră în aplicație doar pentru lista asta.

Tot în release-ul ăsta: adresa veche, https://duoshopping-9d75f.web.app, trimite spre
https://duoshopping.web.app (Moni a reinstalat de pe adresa nouă), iar deploy-ul nu mai publică pe
amândouă (vezi `firebase.json`).

Tot în release-ul ăsta, cele două de mai jos.

### Noutăți pe versiuni (changelog ascuns)

O pagină cu ce s-a schimbat la fiecare versiune, în limbaj de zi cu zi, nu tehnic („Atingerea unei
notificări deschide direct lista ei”). Să cuprindă și versiunile de dinainte; istoria e toată în git,
cam 8 versiuni din 6 și 7 noiembrie 2026 (prima listă, notificările, invitațiile, vocea, engleza,
anunțurile cu bife...). Ascunsă: se deschide din numărul versiunii din josul Setărilor. În ambele
limbi, ca restul aplicației. Versiunile primesc un număr (ex. 1.0 ... 1.8), de ținut la fiecare release.

### Mulțumiri discrete

Un rând mic în josul Setărilor, lângă versiune, nu în față. Variante de ales:
- „Făcut cu ♥ de Dinu și Claude”;
- „Gândit de Dinu, scris împreună cu Claude”;
- „Dinu & Claude · SoftexCo”;
- forma de la început: „Made by Claude and Dinu@SoftexCo”.
Rândul ar fi, de exemplu: „DuoShopping 1.9 · Noutăți · Făcut cu ♥ de Dinu și Claude”.

### Raioanele implicite, comasate și reorganizate (mai încolo)

O iterație peste raioanele cu care pornește o listă nouă: care merită comasate, ce ordine au în magazin,
ce produse nimeresc greșit. Tot aici: pluralele („Pâini”) care nu-și găsesc raionul.
