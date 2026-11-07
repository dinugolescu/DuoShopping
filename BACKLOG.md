# Backlog

Idei și probleme notate pentru mai târziu.

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

## De făcut

### Lista nouă: „Nu ai voie să faci asta” și „Se încarcă...” fără sfârșit

La crearea unei liste apare eroarea „Nu ai voie să faci asta”, iar lista nouă rămâne pe „Se încarcă...”.
Cauza probabilă: o cursă. Lista apare imediat pe ecran (scrisă întâi pe telefon), iar aplicația cere
produsele ei înainte ca serverul să fi primit lista. Regulile verifică dacă ești membru citind lista, care
pe server încă nu există, deci refuză, iar ascultarea produselor rămâne oprită. Lista se creează de fapt;
la repornirea aplicației ar trebui să meargă.
De făcut: lista nouă se afișează abia după ce serverul o confirmă (`hasPendingWrites`), cu „Se creează
lista...” până atunci; în plus, ascultarea produselor reîncearcă singură după o eroare de acces.

### „Șterge lista” pe lista altcuiva

Pe o listă creată de Moni, Dinu vede „Șterge lista” (pentru că e admin), dar după confirmare lista nu se
șterge și nu apare niciun mesaj. De făcut: în meniul listei, „Șterge lista” apare doar pentru cel care a
creat-o; adminul șterge listele altora din panoul de admin. Dacă ștergerea nu reușește, apare un mesaj
clar. De aflat și de ce nu merge ștergerea ca admin membru (regulile o permit; probabil o eroare
neafișată din ștergerea în bucăți).
