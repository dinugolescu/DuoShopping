# DuoShopping

O listă de cumpărături comună pentru familie, pe telefon. Doi sau mai mulți oameni adaugă produse în aceeași listă, văd imediat ce a bifat celălalt în magazin și pot discuta despre un produs („De care cafea?”), inclusiv cu poze.

Este o aplicație web instalabilă (PWA): se deschide în browser și se adaugă pe ecranul principal, pe iPhone și pe Android, fără App Store sau Play Store.

## Ce știe să facă

- **Login cu Google.** Intră doar persoanele invitate de cineva care are deja acces.
- **Liste partajate.** Se sincronizează în timp real și pot fi folosite și fără semnal; modificările se trimit când revine rețeaua.
- **Cumpărat sau nu.** Bifezi „cumpărat” sau „nu iau”, cu un motiv: prea scump, nu era pe stoc, mai avem acasă, nu mai e nevoie, amânat sau un motiv scris de tine. Orice bifare se poate anula câteva secunde.
- **Amânate.** La golirea listei, ce s-a cumpărat dispare, iar produsele amânate rămân pentru data viitoare.
- **Raioane.** Produsele se grupează automat pe raioane după nume (merge și fără diacritice). Dacă muți un produs la alt raion, lista ține minte alegerea.
- **Sugestii.** În timp ce scrii, aplicația propune produse adăugate anterior pe aceeași listă.
- **Discuție pe produs.** Fiecare produs are mesaje text, poze comprimate pe telefon și reacții cu emoji.
- **Cine și când.** La fiecare produs se vede cine l-a adăugat și când („azi la 14:30”, „marți la 18:00”, „acum 2 săptămâni”).
- **Aspect.** Temă luminoasă, întunecată sau după telefon, și 4 fonturi.
- **Administrare.** Adminul vede toate listele (nume, membri, număr de produse), le poate șterge și poate retrage accesul cuiva.

## Tehnologie

- [React](https://react.dev) + [Vite](https://vite.dev), cu [vite-plugin-pwa](https://vite-pwa-org.netlify.app) pentru instalare și funcționare offline
- [Firebase](https://firebase.google.com): Authentication (Google), Cloud Firestore (date, cache offline) și Hosting
- Fără server propriu. Accesul e controlat de regulile din [`firestore.rules`](firestore.rules).
- Totul încape în planul gratuit Firebase (Spark), inclusiv pozele, care se salvează comprimate în Firestore.

## Încearcă local, fără Firebase

```bash
npm install
npm run demo
```

Deschide http://localhost:5173. În modul demo datele stau doar în browser și poți intra ca unul din trei utilizatori de test. Deschide mai multe taburi ca să vezi sincronizarea.

## Instalare proprie

Pașii pentru proiectul Firebase, contul de admin, login-ul pe iPhone și publicare sunt în [SETUP.md](SETUP.md), în română.

## Structură

```
src/
  App.jsx                login, verificarea accesului, ecranul principal
  ListView.jsx           lista de produse, adăugare, sugestii, raioane
  Chat.jsx               discuția despre un produs
  sheets.jsx             meniu, partajare, setări, administrare
  aisles.js              raioanele și dicționarul după care se ghicesc
  config.js              motivele pentru „nu iau”
  data/
    firebaseBackend.js   legătura cu Firebase
    demoBackend.js       aceeași interfață, cu date în browser
firestore.rules          cine ce poate citi și scrie
```
