// firebase/auth.js
import { auth } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

// Subscribe to auth state changes
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};
