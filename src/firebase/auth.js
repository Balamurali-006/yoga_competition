// firebase/auth.js
import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const getCustomAuthUser = () => {
  try {
    const data = sessionStorage.getItem("customAuthUser");
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCustomAuthUser = (user) => {
  if (user) {
    sessionStorage.setItem("customAuthUser", JSON.stringify(user));
  } else {
    sessionStorage.removeItem("customAuthUser");
  }
  window.dispatchEvent(new Event("custom-auth-changed"));
};

export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  setCustomAuthUser(null);
  try {
    return await signOut(auth);
  } catch (e) {
    return null;
  }
};

// Subscribe to auth state changes
export const subscribeToAuth = (callback) => {
  const customUser = getCustomAuthUser();
  if (customUser) {
    callback(customUser);
  }

  const handleCustomAuth = () => {
    const user = getCustomAuthUser();
    if (user) {
      callback(user);
    } else if (!auth.currentUser) {
      callback(null);
    }
  };

  window.addEventListener("custom-auth-changed", handleCustomAuth);

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    const activeCustom = getCustomAuthUser();
    if (activeCustom) {
      callback(activeCustom);
      return;
    }

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

  return () => {
    window.removeEventListener("custom-auth-changed", handleCustomAuth);
    unsubscribe();
  };
};
