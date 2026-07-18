// Firebase initialization layer.
// The config is embedded directly per project requirements (no process.env).
// NOTE: A Firebase web `apiKey` is NOT a secret — it is a public client
// identifier. Real security is enforced by Firestore Security Rules (see
// firestore.rules in the project root). Make sure those rules are deployed.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB3SFEW8C28S19SRamYxwNCHdt0Qopa2Yg",
  authDomain: "sunkissed-ab591.firebaseapp.com",
  projectId: "sunkissed-ab591",
  storageBucket: "sunkissed-ab591.firebasestorage.app",
  messagingSenderId: "899863613577",
  appId: "1:899863613577:web:fde5b75c89e354c2097658",
  measurementId: "G-4XHM8FGD15",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// This project uses a NAMED Firestore database ("sun-kissed-web"), not the
// implicit "(default)" database, so the id must be passed explicitly here —
// otherwise the client connects to a database that doesn't exist.
export const db: Firestore = getFirestore(app, "sun-kissed-web");
export const auth: Auth = getAuth(app);
export default app;
