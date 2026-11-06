# Backlog

Idei și probleme notate pentru mai târziu. Nimic de aici nu e început.

## 1. Butonul Back pe Android închide aplicația când e deschisă o poză (bug)

**Ce se întâmplă:** în discuție, cu o poză mărită, butonul/gestul Back de pe Android închide aplicația în loc să închidă poza.

**De ce:** poza mărită (`lightbox` din `src/Chat.jsx`) e doar o stare în React, nu o intrare în istoricul browserului, așa că Back iese din aplicație.

**Idee de rezolvare:** la deschiderea pozei se adaugă o intrare în istoric (`history.pushState`), iar Back (`popstate`) închide poza. Același tratament merită și pentru meniurile care se deschid de jos (meniu, cine vede lista, setări, admin).

## 2. Notificări la cerere, după o sesiune de lucru cu lista

**Ce vrem:** nu o notificare la fiecare produs, ci un buton de tipul „Gata, anunță” apăsat când termini de modificat lista. Ceilalți membri primesc o singură notificare cu rezumatul, de exemplu „Dinu a adăugat 5 produse în Lista de cumpărături”.

**Decis (2026-11-06):** notificări push adevărate. Dinu trece proiectul pe planul Blaze.

**Context:**
- Notificările push adevărate (cu aplicația închisă) au nevoie de un server care să le trimită, adică de Cloud Functions, deci de planul Blaze. Pentru două persoane costul ar fi practic zero, dar trebuie card și trecerea de pe Spark.
- Pe iPhone, notificările merg doar dacă aplicația e adăugată pe ecranul de pornire (iOS 16.4+), iar utilizatorul trebuie să le accepte din aplicație.
- Varianta fără Blaze: doar un anunț în aplicație (bulină sau mesaj „Ce s-a schimbat de la ultima vizită”), vizibil când deschizi aplicația, fără notificare pe telefon.

## 3. Raioane editabile pe fiecare listă

Propunere, încă neconfirmată:
- Listele noi pornesc de la cele 14 raioane implicite.
- Adaugi, redenumești, schimbi emoji-ul, reordonezi. Dacă ștergi un raion, produsele lui trec la „Altele”.
- Opțional, cuvinte-cheie pentru fiecare raion adăugat de mână.
- Orice membru al listei poate face modificări.
