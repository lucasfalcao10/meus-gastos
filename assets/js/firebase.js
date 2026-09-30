importConfig();

function importConfig() {
  if (!window.MEUS_GASTOS_CONFIG?.firebase) {
    const error = new Error('Configuração do Firebase não encontrada.');
    document.querySelector('#login').hidden = false;
    document.querySelector('#btn-entrar').hidden = true;
    const el = document.querySelector('#login-erro');
    el.hidden = false;
    el.textContent = error.message;
    throw error;
  }
}

const FB = 'https://www.gstatic.com/firebasejs/12.19.0';
const firebaseConfig = window.MEUS_GASTOS_CONFIG.firebase;

const { initializeApp } = await import(`${FB}/firebase-app.js`);

const {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} = await import(`${FB}/firebase-auth.js`);

const {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} = await import(`${FB}/firebase-firestore.js`);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export {
  app,
  auth,
  db,
  firebaseConfig,
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
};
