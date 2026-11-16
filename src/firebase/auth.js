// firebase/auth.js
import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const login = async (email, password) => {
  try {
    // Enforce session persistence so closing the browser/tab clears the session
    await setPersistence(auth, browserSessionPersistence);
  } catch (e) {
    console.warn("Could not set browserSessionPersistence:", e);
  }
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  try {
    return await signOut(auth);
  } catch (e) {
    return null;
  }
};

// Subscribe to auth state changes and fetch the user's role from Firestore users/{uid}
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    try {
      const profile = await getDoc(doc(db, "users", firebaseUser.uid));
      const role = profile.exists() ? profile.data().role : null;
      callback({
        ...firebaseUser,
        role: role || null,
        displayName: profile.exists() ? profile.data().name || firebaseUser.displayName : firebaseUser.displayName,
      });
    } catch (error) {
      console.error("Could not load the signed-in user's role from Firestore:", error);
      callback({ ...firebaseUser, role: null });
    }
  });
};
