# Backlog

Idei și probleme notate pentru mai târziu.

Versiunea 2.5.1 (15 noiembrie 2026) a adus adresele cunoscute propuse la invitare (din celelalte liste
ale tale) și refuzul adreselor cu două puncte la rând, după ce Moni a fost invitată cu adresa tastată greșit
și lista nu i-a apărut.

Versiunea 2.5 (14 noiembrie 2026) a adus magazinul pe produs (cu alegerea magazinului în care ești),
semnul de urgent, seturile de produse și mai multe forme de plural recunoscute la raioane.

Versiunea 2.1 (noiembrie 2026) a adus raioane implicite mai generale (inclusiv țigări, electronice,
rechizite, haine, cadouri) și pluralele care își găsesc raionul. Versiunea 2.0 a adus lista de cadouri (cine primește își scrie dorințele, cine cumpără
le ia pe ascuns), produsele duplicate permise, pagina de noutăți, mulțumirile din Setări și mutarea
adresei vechi pe cea nouă.

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

## De verificat după 2.5

- pe telefoane reale: alegerea magazinului deasupra listei, „lapte!” ca urgent, seturile;
- regulile Firestore noi (`shops` și `sets` pe listă) nu sunt testate în emulator (nu avem Java).

## De făcut

Făcut în 2.6 (20 noiembrie 2026, de verificat pe telefoane reale; regulile Firestore noi — `lastAt`/`lastBy` pe listă — nu sunt testate în emulator; încă nedeployat la momentul scrierii):

- Notificare către persoane alese (bife la „Gata, anunță”, implicit toți); mesajul din discuție rămâne vizibil
  tuturor, cu „către Moni” în text. Funcția `announce` primește `to` opțional.
- Poză pe rândul produsului (făcută/aleasă de tine, sau luată din linkul lipit; „caută pe site-ul magazinului”
  ca buton care deschide căutarea, fără API de imagini).
- Bulină pe listele cu noutăți de la ultima vizită, plus o bulină generală (la fel ca `discutie-lista-vazuta`,
  stare pe telefon).
- @ în mesaje, cu alias-uri (@Moni în loc de adresă), ca la primitorii de cadouri.
- Notificări mai relevante: azi un mesaj nu e „eveniment” (doar added/bought/skipped în `eventsSummary`), deci
  un comentariu scris pe un produs de cadou pleacă drept „X a modificat lista”. De pus textul mesajului și
  produsul, iar atingerea să ducă la produsul/mesajul acela.

## Idei amânate

- Totalul cumpărăturii (suma de pe bon, la „Golește rezolvatele”, cu cheltuieli pe lună și pe magazin).
  Amânat pe 14 noiembrie 2026: lista e încă departe de ce se cumpără de fapt; revenim când seamănă mai mult.
- Dată și buget pe lista de cadouri (buget pe destinatar, preț pe cadou, bara de cheltuit; vizibil doar
  cumpărătorilor). Păstrat pe 20 noiembrie 2026, probabil 2.7.
- Ordinea raioanelor învățată pe fiecare magazin (de întrebat toți testerii; împărțirea pe raioane place,
  ordinea nu deranjează), „Iau eu asta” când sunteți amândoi în magazin, preseturi de destinatari (nu încă).
- Reamintire cu locația: respinsă.
