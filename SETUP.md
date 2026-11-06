# DuoShopping: punere în funcțiune

Aplicația e o PWA (aplicație web instalabilă) cu React + Vite, cu Firebase pentru login Google și baza de date.
Planul gratuit Firebase (Spark) e mai mult decât suficient pentru o familie.

## Rulare locală fără Firebase (mod demo)

```bash
npm install
npm run demo
```

Deschide http://localhost:5173. Datele stau doar în browser. Două taburi cu utilizatori demo diferiți simulează doi oameni care folosesc aceeași listă. Dinu e admin, iar Moni, Andreea și Ștefan intră doar după ce îi invită cineva.

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

   **`NUME-PROIECT` înseamnă ID-ul proiectului, nu numele afișat.** ID-ul e mereu cu litere mici și uneori are un sufix adăugat de Firebase (ex. `duoshopping-4f2a1`). Îl găsești în ⚙️ (lângă „Project Overview”, sus în stânga) → **Project settings** → **General** → **Project ID**. Este și valoarea `projectId` din `firebaseConfig`.

## 2. Pornește login-ul cu Google

1. În bara din stânga a consolei Firebase deschide **Authentication**. E de obicei în grupul **Build** (în versiunile mai noi ale consolei, poate fi în grupul **Security**). Dacă nu-l găsești, caută „Authentication” în bara de căutare de sus.
2. Apasă **Get started** (doar prima dată).
3. Tabul **Sign-in method** → în lista de furnizori alege **Google**.
4. Activează comutatorul **Enable**, alege la „Project support email” adresa ta și apasă **Save**.

`localhost`, `NUME-PROIECT.web.app` și `NUME-PROIECT.firebaseapp.com` sunt deja autorizate implicit (tabul Settings → Authorized domains).

## 3. Creează baza de date

**Build → Firestore Database → Create database.**
- Locație: o regiune din Europa, de exemplu `europe-central2` (Varșovia). Nu se mai poate schimba ulterior.
- Mod: **production**. Regulile de securitate vin din proiect, la pasul următor.

## 4. Instalează Firebase CLI și publică regulile

> **Pe Windows, dacă apare „running scripts is disabled on this system”:** PowerShell blochează scripturile `.ps1` prin care pornesc `npm` și `firebase`. Folosește variantele `.cmd`, care nu sunt blocate: `npm.cmd` în loc de `npm` și `firebase.cmd` în loc de `firebase`. Dacă `firebase.cmd` nu e găsit imediat după instalare, deschide un terminal nou sau folosește calea completă: `& "$env:APPDATA\npm\firebase.cmd"`.

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

Dacă publici aplicația și pe o a doua adresă (de exemplu `duoshopping.web.app`, ca site în plus în `firebase.json`), aplicația folosește automat adresa curentă pentru login. Pentru fiecare adresă nouă adaugă aici `https://ADRESA/__/auth/handler` și, în Firebase, adresa la Authentication → Settings → Authorized domains.

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
