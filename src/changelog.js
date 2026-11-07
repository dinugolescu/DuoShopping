// Noutățile pe versiuni, pe limba oricui (nu tehnic). Se văd din Setări, atingând versiunea.
// Prima intrare e versiunea curentă: la fiecare release adaugă una nouă deasupra, în ambele limbi.
import { lang } from './i18n.jsx'

export const CHANGELOG = [
  {
    v: '2.2', date: '2026-11-08',
    ro: [
      'Notificările ajung pe telefonul cu aplicația de pe adresa nouă, iar atingerea lor deschide aplicația, nu browserul.',
      'Telefonul își reverifică singur notificările la fiecare pornire, ca să nu se piardă (mai ales pe iPhone).',
    ],
    en: [
      'Notifications reach the phone with the app from the new address, and tapping them opens the app, not the browser.',
      'The phone re-checks its notifications on every start so they don’t get lost (especially on iPhone).',
    ],
  },
  {
    v: '2.1', date: '2026-11-08',
    ro: [
      'Raioane noi, mai generale: Aprozar, Vicii, Drogerie, Electronice și bricolaj, Papetărie și rechizite, Haine și încălțăminte, Cadouri și flori. Țigările, becurile sau caietele nu mai ajung la „Altele”.',
      'Produsele deja pe listă trec singure în raioanele noi. Listele cu raioane modificate de voi au butonul „Treci pe raioanele noi”.',
      'Pluralele își găsesc raionul („Pâini” ajunge la pâine).',
    ],
    en: [
      'New, more general aisles: Fruit and veg, Treats and vices, Household and toiletries, Electronics and DIY, Stationery and school, Clothes and shoes, Gifts and flowers. Cigarettes, light bulbs or notebooks no longer end up in “Other”.',
      'Items already on the list move to the new aisles on their own. Lists with aisles you changed get a “Switch to new aisles” button.',
      'Romanian plurals find their aisle too.',
    ],
  },
  {
    v: '2.0', date: '2026-11-07',
    ro: [
      'Liste de cadouri: unii își scriu dorințele, alții le cumpără pe ascuns. Cine primește cadouri nu vede ce s-a luat; cei care cumpără au „Iau eu”, idei ascunse și o discuție doar a lor.',
      'Același produs poate apărea de două ori pe listă, cu altă cantitate sau marcă, sau cu „Adaugă totuși”.',
      'Pagina asta, cu ce s-a schimbat de la o versiune la alta.',
      'Cine mai deschide aplicația de pe adresa veche ajunge singur pe cea nouă.',
    ],
    en: [
      'Gift lists: some write their wishes, others buy them in secret. Whoever receives gifts can’t see what was bought; buyers get “I’ll get it”, hidden ideas and a chat of their own.',
      'The same item can be on the list twice, with a different amount or brand, or with “Add anyway”.',
      'This page, showing what changed from one version to the next.',
      'Anyone still opening the app from the old address is taken to the new one.',
    ],
  },
  {
    v: '1.9', date: '2026-11-07',
    ro: [
      'Atingerea unei notificări deschide direct lista din care vine.',
      'Clopoțelul arată câte lucruri ai făcut și n-ai anunțat încă.',
      'La „Gata, anunță” alegi ce intră în anunț sau marchezi lucrurile ca anunțate, fără să trimiți notificare.',
      'După ce dictezi, vezi ce a înțeles aplicația și poți corecta sau scoate produse înainte să ajungă pe listă.',
    ],
    en: [
      'Tapping a notification opens the list it came from.',
      'The bell shows how many things you did and haven’t announced yet.',
      'In “Done, announce” you choose what goes in, or mark things as announced without sending a notification.',
      'After dictating, you see what the app understood and can fix or remove items before they reach the list.',
    ],
  },
  {
    v: '1.8', date: '2026-11-07',
    ro: ['Aplicația vorbește și engleză: limba se alege din Setări. Dictarea și raioanele merg în ambele limbi.'],
    en: ['The app speaks English too: pick the language in Settings. Dictation and aisles work in both languages.'],
  },
  {
    v: '1.7', date: '2026-11-07',
    ro: [
      'Dictarea merge și pe iPhone, iar pe Android nu mai repetă cuvintele.',
      'Pe Android, dacă ai deschis aplicația în alt browser, te trimitem în Chrome ca s-o poți instala.',
      'Când doar tu vezi o listă, aplicația îți amintește să inviți pe cineva (sau să spui că e personală).',
    ],
    en: [
      'Dictation works on iPhone too, and no longer repeats words on Android.',
      'On Android, if you opened the app in another browser, we send you to Chrome so you can install it.',
      'When only you can see a list, the app reminds you to invite someone (or mark it as personal).',
    ],
  },
  {
    v: '1.6', date: '2026-11-07',
    ro: [
      'Poți adăuga produse cu vocea sau mai multe deodată, despărțite prin virgulă.',
      'Aplicația se actualizează singură când revii în ea.',
      'Un ecran de bun venit înainte de prima intrare, și setările păstrate în cont, pe orice telefon.',
      'Mai multă intimitate: nimeni din afara unei liste nu-i poate vedea conținutul.',
    ],
    en: [
      'You can add items by voice, or several at once separated by commas.',
      'The app updates itself when you come back to it.',
      'A welcome screen before you first sign in, and your settings kept in your account, on any phone.',
      'More privacy: nobody outside a list can see what’s on it.',
    ],
  },
  {
    v: '1.5', date: '2026-11-07',
    ro: [
      'Intrarea în cont merge și din aplicația instalată pe iPhone.',
      'Iconița se alege înainte de instalare, iar aplicația te îndeamnă să pornești notificările.',
    ],
    en: [
      'Signing in works from the app installed on iPhone too.',
      'You pick the icon before installing, and the app nudges you to turn on notifications.',
    ],
  },
  {
    v: '1.4', date: '2026-11-06',
    ro: [
      'Poți invita o familie nouă, cu un mesaj gata de trimis pe WhatsApp.',
      'Ghid de instalare pentru Android și iPhone, și câteva sfaturi la început.',
    ],
    en: [
      'You can invite a new family, with a message ready to send on WhatsApp.',
      'An install guide for Android and iPhone, and a few tips to get started.',
    ],
  },
  {
    v: '1.3', date: '2026-11-06',
    ro: [
      'Raioanele fiecărei liste se pot reordona, redenumi și completa.',
      'Modul magazin ține ecranul aprins cât cumperi.',
      'Istoricul cumpărăturilor, de unde poți readăuga ce ai luat altă dată.',
      'Butonul Înapoi de pe Android închide fereastra deschisă, nu aplicația.',
    ],
    en: [
      'Each list’s aisles can be reordered, renamed and extended.',
      'Shop mode keeps the screen on while you shop.',
      'Shopping history, where you can re-add things you bought before.',
      'The Android Back button closes the open window, not the app.',
    ],
  },
  {
    v: '1.2', date: '2026-11-06',
    ro: ['„Gata, anunță”: cu o atingere, ceilalți primesc o notificare cu ce ai făcut pe listă.'],
    en: ['“Done, announce”: with one tap, the others get a notification with what you did on the list.'],
  },
  {
    v: '1.1', date: '2026-11-06',
    ro: ['Aplicația se numește DuoShopping și are iconiță la alegere, cu inițialele D și M ascunse în desen.'],
    en: ['The app is called DuoShopping and has a choice of icons, with the initials D and M hidden in each.'],
  },
  {
    v: '1.0', date: '2026-11-06',
    ro: [
      'Prima versiune: o listă de cumpărături comună, la zi pe toate telefoanele, care merge și fără semnal.',
      'Bifezi ce ai luat sau spui de ce n-ai luat; produsele se grupează singure pe raioane.',
      'Discuție pe fiecare produs, cu poze și reacții.',
    ],
    en: [
      'The first version: a shared shopping list, up to date on every phone, that works without signal too.',
      'Tick what you bought or say why you didn’t; items group themselves by aisle.',
      'A chat on each item, with photos and reactions.',
    ],
  },
]

export const VERSION = CHANGELOG[0].v
export const changes = (entry) => entry[lang()] ?? entry.ro
