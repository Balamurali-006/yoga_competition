// firebase/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9LeUglvLt_wDsFxmwahXoEnPSa_nuiKY",
  authDomain: "lenin-2e9d2.firebaseapp.com",
  projectId: "lenin-2e9d2",
  storageBucket: "lenin-2e9d2.firebasestorage.app",
  messagingSenderId: "257308325965",
  appId: "1:257308325965:web:58af76c962d6145b1d4404",
  measurementId: "G-DHH6CD1R7N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
