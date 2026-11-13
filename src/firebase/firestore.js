// firebase/firestore.js
import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  doc,
  query,
  where,
} from "firebase/firestore";

export const subscribeToCollection = (collectionName, callback, onError) => {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
};

export const createCollectionDocument = async (collectionName, data) => {
  return addDoc(collection(db, collectionName), data);
};

export const updateCollectionDocument = async (collectionName, id, data) => {
  return updateDoc(doc(db, collectionName, id), data);
};

export const deleteCollectionDocument = async (collectionName, id) => {
  return deleteDoc(doc(db, collectionName, id));
};

// Add new document
export const createDocument = async (collectionName, data) => {
  return await addDoc(collection(db, collectionName), data);
};

// Set document (with custom ID)
export const setDocument = async (collectionName, id, data) => {
  return await setDoc(doc(db, collectionName, id), data);
};

// Update existing document
export const updateDocument = async (collectionName, id, data) => {
  return await updateDoc(doc(db, collectionName, id), data);
};

// Read document
export const getDocument = async (collectionName, id) => {
  return await getDoc(doc(db, collectionName, id));
};

// Get all documents from collection
export const getAllDocuments = async (collectionName) => {
  return await getDocs(collection(db, collectionName));
};

// Get documents with condition
export const getDocumentsWhere = async (collectionName, field, op, value) => {
  const q = query(collection(db, collectionName), where(field, op, value));
  return await getDocs(q);
};

// Delete document
export const deleteDocument = async (collectionName, id) => {
  return await deleteDoc(doc(db, collectionName, id));
};
