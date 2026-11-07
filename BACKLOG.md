# Backlog

Idei și probleme notate pentru mai târziu.

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

## Would have (nu e urgent)

### Aplicația în engleză

Pentru cumnatul meu. Acum totul e doar în română:
- textele sunt scrise direct în cod;
- datele și orele se afișează în format românesc (`ro-RO`);
- vocea ascultă doar română;
- pagina e marcată ca fiind în română (`lang="ro"`).

Ce ar trebui făcut:
- toate textele mutate într-un fișier de traduceri (română + engleză);
- alegerea limbii păstrată în setările contului, ca restul setărilor;
- data, ora și vocea să urmeze limba aleasă;
- de verificat și textele care vin de pe server (notificări, mesaje).
