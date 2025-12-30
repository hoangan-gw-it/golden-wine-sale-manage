import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  StorageReference,
} from "firebase/storage";
import { storage } from "./config";

// Upload a file to Firebase Storage
export const uploadFile = async (
  path: string,
  file: File,
  metadata?: { [key: string]: string }
) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, { customMetadata: metadata });
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { url: downloadURL, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { url: null, error: error.message };
  }
};

// Get download URL for a file
export const getFileURL = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return { url: downloadURL, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { url: null, error: error.message };
  }
};

// Delete a file from Firebase Storage
export const deleteFile = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { error: error.message };
  }
};

// List all files in a folder
export const listFiles = async (path: string) => {
  try {
    const folderRef = ref(storage, path);
    const result = await listAll(folderRef);
    return { items: result.items, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { items: [], error: error.message };
  }
};

// Get file metadata
export const getFileMetadata = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    const metadata = await getMetadata(storageRef);
    return { metadata, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { metadata: null, error: error.message };
  }
};


