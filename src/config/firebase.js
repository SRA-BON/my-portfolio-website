import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBlJGdTFxOJGI8zeVP5oNWiKUoMFT6DuXI",
  authDomain: "srabon-portfolio-49b34.firebaseapp.com",
  projectId: "srabon-portfolio-49b34",
  storageBucket: "srabon-portfolio-49b34.firebasestorage.app",
  messagingSenderId: "211208201050",
  appId: "1:211208201050:web:14fb39c98d20d00e048963",
  measurementId: "G-35M3J1LC6W"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
