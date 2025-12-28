import { getDocument, setDocument, getDocuments, where, updateDocument } from "./firestore";
import { User, UserRole } from "../types";

const USERS_COLLECTION = "users";

// Get user by email
export const getUserByEmail = async (email: string) => {
  const { data, error } = await getDocuments<User>(USERS_COLLECTION, [
    where("email", "==", email),
  ]);
  
  if (error || !data || data.length === 0) {
    return { user: null, error: error || "User not found" };
  }
  
  return { user: data[0], error: null };
};

// Get user by ID
export const getUserById = async (userId: string) => {
  const { data, error } = await getDocument<User>(USERS_COLLECTION, userId);
  return { user: data, error };
};

// Create or update user in users collection
export const createOrUpdateUser = async (
  userId: string,
  email: string,
  displayName: string | null,
  role: UserRole = "sale",
  isActive: boolean = true
) => {
  try {
    const userData: User = {
      id: userId,
      email,
      displayName: displayName || undefined,
      role,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const { error } = await setDocument(USERS_COLLECTION, userId, userData);
    
    if (error) {
      return { user: null, error };
    }
    
    return { user: userData, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Check if user is whitelisted (exists in users collection)
export const isUserWhitelisted = async (email: string) => {
  const { user, error } = await getUserByEmail(email);
  if (error || !user) {
    return { isWhitelisted: false, user: null };
  }
  
  return { isWhitelisted: user.isActive, user };
};

// Get all users
export const getAllUsers = async () => {
  return await getDocuments<User>(USERS_COLLECTION);
};

// Update user role
export const updateUserRole = async (userId: string, role: UserRole) => {
  return await updateDocument(USERS_COLLECTION, userId, { role, updatedAt: new Date() });
};

// Deactivate user
export const deactivateUser = async (userId: string) => {
  return await updateDocument(USERS_COLLECTION, userId, { isActive: false, updatedAt: new Date() });
};


