# Lista de cumpărături: punere în funcțiune

Aplicația e o PWA (aplicație web instalabilă) cu React + Vite, cu Firebase pentru login Google și baza de date.
Planul gratuit Firebase (Spark) e mai mult decât suficient pentru o familie.

## Rulare locală fără Firebase (mod demo)

```bash
npm install
npm run demo
```

Deschide http://localhost:5173. Datele stau doar în browser. Două taburi cu utilizatori demo diferiți simulează doi oameni care folosesc aceeași listă. Dinu e admin, iar Ana și Mihai intră doar după ce îi invită cineva.

## 1. Creează proiectul Firebase

1. Intră pe https://console.firebase.google.com și apasă **Create a project**. Google Analytics nu e necesar.
2. În pagina proiectului apasă iconița **Web** (`</>`) ca să adaugi o aplicație web. Bifa „Firebase Hosting” o poți lăsa nebifată.
3. Copiază valorile din `firebaseConfig` în fișierul `.env.local` (pornește de la `.env.example`):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=NUME-PROIECT.web.app
   VITE_FIREBASE_PROJECT_ID=NUME-PROIECT
   VITE_FIREBASE_APP_ID=...
   ```

   La `AUTH_DOMAIN` pune `NUME-PROIECT.web.app`, nu `...firebaseapp.com` cum îți dă consola. Motivul e explicat la pasul 5.

## 2. Pornește login-ul cu Google

**Build → Authentication → Get started → Sign-in method → Google → Enable.** Alege adresa de suport și salvează.

`localhost`, `NUME-PROIECT.web.app` și `NUME-PROIECT.firebaseapp.com` sunt deja autorizate implicit (tabul Settings → Authorized domains).

## 3. Creează baza de date

**Build → Firestore Database → Create database.**
- Locație: o regiune din Europa, de exemplu `europe-central2` (Varșovia). Nu se mai poate schimba ulterior.
- Mod: **production**. Regulile de securitate vin din proiect, la pasul următor.

## 4. Instalează Firebase CLI și publică regulile

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

```bash
firebase use --add
```

Alege proiectul creat și dă-i aliasul `default`.

```bash
firebase deploy --only firestore:rules
```

Regulile din `firestore.rules` fac următoarele:
- În aplicație intră doar adminii și persoanele invitate de cineva care are deja acces.
- O listă o văd doar membrii ei. Orice membru poate invita alți oameni, adăuga și bifa produse și scrie în discuții.
- Oameni din listă poate scoate doar cine a creat lista sau adminul. Oricine poate ieși singur dintr-o listă.
- Adminul vede toate listele (nume, membri, număr de produse), le poate șterge și poate retrage accesul cuiva.

### Fă-te administrator

Fără acest pas nu poate intra nimeni, nici măcar tu, pentru că primul acces îl dă adminul.

1. **Firestore Database → Data → Start collection**.
2. Collection ID: `admins`.
3. Document ID: adresa ta de Gmail, cu litere mici (ex. `nume@gmail.com`).
4. Adaugă un câmp oarecare, de exemplu `rol` = `admin` (tip string), și salvează.

Apoi intri în aplicație, creezi lista și o inviți pe soția ta. Invitația îi dă automat și acces în aplicație.

## 5. Login pe iPhone (aplicația instalată)

Pe iPhone, aplicația instalată pe ecranul principal nu poate deschide popup-uri, așa că login-ul se face prin redirect. Safari blochează redirect-ul dacă pagina de login e pe alt domeniu decât aplicația. De aceea `AUTH_DOMAIN` trebuie să fie chiar domeniul aplicației (`NUME-PROIECT.web.app`).

Mai trebuie autorizată adresa de întoarcere:
1. Intră pe https://console.cloud.google.com, cu același proiect selectat.
2. **APIs & Services → Credentials → OAuth 2.0 Client IDs → „Web client (auto created by Google Service)”**.
3. La **Authorized redirect URIs** adaugă `https://NUME-PROIECT.web.app/__/auth/handler` și salvează. Poate dura câteva minute până se aplică.

## 6. Publică aplicația

```bash
npm run build
```

```bash
firebase deploy --only hosting
```

Aplicația e acum la `https://NUME-PROIECT.web.app`.

## 7. Instalează pe telefoane

- **iPhone:** deschide adresa în **Safari** → butonul Share → **Add to Home Screen**.
- **Android:** deschide adresa în **Chrome** → meniul ⋮ → **Install app** (sau „Adaugă pe ecranul de pornire”).

Apoi:
1. Intri cu Google și creezi lista.
2. Din iconița cu oameni o inviți pe soția ta, cu adresa ei de Gmail.
3. Ea intră în aplicație cu acel cont și vede lista automat.

## Dezvoltare cu Firebase real

```bash
npm run dev
```

Folosește `.env.local`. Pe `localhost` login-ul merge prin popup, fără configurări în plus.

## Actualizări

După orice modificare rulezi din nou `npm run build` și `firebase deploy --only hosting`. Telefoanele preiau automat versiunea nouă când redeschid aplicația, uneori abia a doua oară.
