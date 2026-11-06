# Backlog

Idei și probleme notate pentru mai târziu.

## Următorul patch (înainte de invitarea primelor familii)

### Actualizare automată a aplicației

Acum, versiunea nouă se descarcă în fundal la deschidere, dar pornește abia la următoarea deschidere de la zero. Dacă aplicația rămâne în memoria telefonului, poate sta zile întregi pe versiunea veche (datele sunt oricum la zi, doar funcțiile și corecturile întârzie).

- Verificare de versiune nouă la fiecare revenire în aplicație (`registration.update()` la `visibilitychange`), nu doar la pornire.
- Când există o versiune nouă, reîncărcare automată în momentul revenirii în aplicație, dar nu cât timp utilizatorul scrie (câmp de text activ sau text nesalvat).
- De ce înainte de invitații: mecanismul ajunge pe un telefon tot printr-o actualizare. Cine instalează după ce e publicat îl are de la început; cine a instalat înainte trebuie să mai prindă o dată actualizarea pe calea veche.

### Accesul adminului la listele altor familii și informarea corectă

Acum regulile Firebase îi permit adminului să citească și conținutul listelor în care nu e membru (ca să le poată șterge complet), deși interfața îi arată doar numele, membrii și numărul de produse. Pentru prieteni, regula și textul trebuie să spună același lucru.

- Restrânge regulile: adminul vede doar documentul listei (nume, membri, număr de produse), nu produsele, mesajele și pozele.
- Ștergerea completă a unei liste străine: printr-o funcție pe server (Cloud Function), nu prin citire din telefonul adminului.
- Text clar, vizibil pentru utilizatori (Setări sau la prima intrare), despre ce vede administratorul și ce nu.

### Setări păstrate în cont (opțional)

Tema, fontul, ordinea listelor, gruparea pe raioane și sugestiile se pierd la reinstalare, fiindcă stau doar pe telefon. Le-am putea salva în cont, ca să revină automat. Iconița de pe ecran rămâne oricum fixată la adăugare.

## Mai târziu

### Adăugare cu vocea

Recunoașterea vorbirii o face telefonul, gratuit, prin browser (Web Speech API): pe Android serviciul Google, pe iPhone dictarea Apple. Textul rezultat („lapte, ouă, două pâini”) se împarte apoi în produse cu reguli simple (virgulă, „și”, numere ca cantitate). Nu e nevoie de Claude sau de alt serviciu plătit.
