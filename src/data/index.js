// Alege sursa de date: Firebase (real) sau demo (local, în browser).
// Ambele module exportă exact aceleași funcții, deci restul aplicației nu știe care rulează.
export const isDemo = import.meta.env.VITE_DEMO === '1' || !import.meta.env.VITE_FIREBASE_API_KEY

const backend = isDemo ? await import('./demoBackend.js') : await import('./firebaseBackend.js')

export const DEMO_USERS = backend.DEMO_USERS ?? []
export const {
  onUser, signIn, signOut, watchAccess, setWriteErrorHandler,
  watchLists, createList, renameList, setListAisles, deleteList, invite, removeMember, leaveList,
  watchItems, addItem, updateItem, setItemAisle, deleteItem, setStatus, finishTrip,
  watchProducts, watchHistory,
  watchMessages, sendMessage, toggleReaction, deleteMessage,
  watchAllLists, watchAllowed, revokeAccess,
  pushStatus, enablePush, disablePush, announce,
} = backend
