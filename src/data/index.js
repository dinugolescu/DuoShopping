// Alege sursa de date: Firebase (real) sau demo (local, în browser).
// Ambele module exportă exact aceleași funcții, deci restul aplicației nu știe care rulează.
export const isDemo = import.meta.env.VITE_DEMO === '1' || !import.meta.env.VITE_FIREBASE_API_KEY

const backend = isDemo ? await import('./demoBackend.js') : await import('./firebaseBackend.js')

export const DEMO_USERS = backend.DEMO_USERS ?? []
export const {
  onUser, signIn, signOut, watchAccess, setWriteErrorHandler,
  watchLists, createList, renameList, setListAisles, deleteList, adminDeleteList, invite, inviteToApp, removeMember, leaveList, setReceives,
  addNamedRecipient, setRecipientName, removeNamedRecipient,
  watchItems, watchWishes, addItem, updateItem, setItemAisle, deleteItem, setStatus, finishTrip,
  watchSecret, setGiftStatus,
  watchProducts, watchHistory,
  watchMessages, watchListChat, sendMessage, toggleReaction, deleteMessage, deleteMessagePhoto,
  watchAllLists, watchAllowed, revokeAccess,
  loadUserPrefs, saveUserPrefs,
  watchAnnounced, saveAnnounced,
  pushStatus, enablePush, disablePush, refreshPush, announce,
} = backend
