import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  addDoc,
  CollectionReference,
  DocumentData,
} from "firebase/firestore";
import { db } from "./config";

// Generic function to add a document
export const addDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

// Generic function to get a document by ID
export const getDocument = async <T = DocumentData>(
  collectionName: string,
  documentId: string
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() } as T, error: null };
    } else {
      return { data: null, error: "Document not found" };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Generic function to get all documents from a collection
export const getDocuments = async <T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    
    return { data: documents, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Generic function to update a document
export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Generic function to delete a document
export const deleteDocument = async (
  collectionName: string,
  documentId: string
) => {
  try {
    await deleteDoc(doc(db, collectionName, documentId));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Helper function to create a document with a specific ID
export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Export commonly used query helpers
export { where, orderBy, limit, query, Timestamp };


