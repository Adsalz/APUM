// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDesXYDyPsrG5HxkkPbj9XuqFQV91j2ixY",
  authDomain: "apum-8cfa4.firebaseapp.com",
  databaseURL: "https://apum-8cfa4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "apum-8cfa4",
  storageBucket: "apum-8cfa4.appspot.com",
  messagingSenderId: "965430779165",
  appId: "1:965430779165:web:2b1d142cc5937744d5d5f4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };