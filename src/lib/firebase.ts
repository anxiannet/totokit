// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check for missing Firebase configuration keys
if (!firebaseConfig.apiKey) {
  console.warn(
    "🔴 Firebase Warning: NEXT_PUBLIC_FIREBASE_API_KEY is not defined. Firebase features might not work. Ensure it is set in your .env.local (for local dev) or as an environment variable in your deployment environment."
  );
}
if (!firebaseConfig.projectId) {
  console.warn(
    "🔴 Firebase Warning: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined. Firebase features might not work. Ensure it is set."
  );
}
// Add similar checks for other essential keys if needed, e.g., authDomain

let app: FirebaseApp;
let db: Firestore;
let authInstance: Auth;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  authInstance = getAuth(app);
} catch (error) {
  console.error("🔴 Firebase Initialization Error:", error);
  // Fallback or rethrow, depending on how critical Firebase is at this stage
  // For now, we'll let it throw if initialization fails due to bad config,
  // as the build error already indicates this.
  // In a client-only scenario, you might provide mock instances or disable features.
  throw new Error(`Firebase Initialization Failed: ${error instanceof Error ? error.message : String(error)}. Check your Firebase configuration and environment variables.`);
}


export { app, db, authInstance as auth }; // Export authInstance as auth
