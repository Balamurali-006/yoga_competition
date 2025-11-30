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
  doc,
  query,
  where,
} from "firebase/firestore";

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
