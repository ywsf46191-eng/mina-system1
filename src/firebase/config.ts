// src/firebase/config.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyA6KJPk56fdA_5ompn_7oGQk3vrlMGTaKA",
  authDomain: "mina-system-23af8.firebaseapp.com",
  databaseURL: "https://mina-system-23af8-default-rtdb.firebaseio.com",
  projectId: "mina-system-23af8",
  storageBucket: "mina-system-23af8.firebasestorage.app",
  messagingSenderId: "857034977722",
  appId: "1:857034977722:web:67f5e44466f7c845562d83",
  measurementId: "G-KCNYEQLBN4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser');
  }
});

export default app;
