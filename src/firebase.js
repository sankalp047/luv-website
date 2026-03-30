import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5__RYxpFZSjYz7e7RkdrvfD0Gjl-5Cd0",
  authDomain: "luv107.firebaseapp.com",
  projectId: "luv107",
  storageBucket: "luv107.firebasestorage.app",
  messagingSenderId: "82430690373",
  appId: "1:82430690373:web:0d20969cab9e30ed864f2c",
  measurementId: "G-11656KPECN",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);