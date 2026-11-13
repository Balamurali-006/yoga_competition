// firebase/auth.js
import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

// Subscribe to auth state changes
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    try {
      const profile = await getDoc(doc(db, "users", firebaseUser.uid));
      callback({ ...firebaseUser, role: profile.exists() ? profile.data().role : null });
    } catch (error) {
      console.error("Could not load the signed-in user's role:", error);
      callback({ ...firebaseUser, role: null });
    }
  });
};
