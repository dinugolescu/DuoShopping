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

### Aflăm dacă persoana invitată are deja aplicația

Mesajul de invitație e acum neutru, dar ar fi mai scurt dacă am ști. Acum nu putem afla: lista de acces
(`allowed`) o poate citi doar persoana respectivă sau adminul.
- putem ghici că persoana are deja aplicația dacă e membră în altă listă de-a noastră;
- sau notăm prima intrare a fiecăruia în aplicație. Ca s-o folosească la invitație, telefonul celui care
  invită trebuie să poată întreba „adresa asta a intrat vreodată?”, deci orice utilizator ar putea afla,
  pentru orice adresă, dacă folosește aplicația. Între familie și prieteni riscul e mic; se poate limita
  făcând verificarea pe server, doar în momentul invitației.

### Unește două liste

Pentru cazul rar cu două liste care au deja produse (de exemplu soț și soție care și-au făcut fiecare
„Cumpărături” înainte să se invite): „Unește cu altă listă” în meniul listei mută produsele (cele
identice o singură dată), apoi șterge lista rămasă goală. De făcut doar dacă apare cazul în practică.

## Idei de explorat

### Ture cu mai multe opriri

O zi obișnuită (noiembrie 2026): copiii la ore, cumpărături la un magazin, cimitir, alt magazin,
farmacie, vizită la mama. Aplicația gândește acum „o listă, un magazin”. De urmărit în practică ce
lipsește: produse legate de un magazin anume, farmacia ca listă separată, lucruri de luat pentru o
vizită, ordinea opririlor. De adunat observațiile din turele reale înainte să decidem ceva.
