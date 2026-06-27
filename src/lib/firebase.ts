/**
 * SIGAL V2 Enterprise ERP - Firebase Configuration & SDK Initialization
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID from the platform environment
export const db = getFirestore(app, "ai-studio-sigalv2enterpris-89a9e5e2-894b-42d0-afab-e992aa916acb");

// Configure Google OAuth Provider with Workspace scopes
export const googleProvider = new GoogleAuthProvider();

// Scopes required for SIGAL V2 (Drive, Sheets, Docs, Gmail, Calendar)
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar'
];

REQUIRED_SCOPES.forEach(scope => googleProvider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize Auth listener to sync logged-in state and cache tokens
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If there's no cached token but we have a user (e.g. reload),
        // we might need to re-login to capture the access token from credentials
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Handle Google Sign-In with popup and return user profile and access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Workspace.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Auth / Google Sign-In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Return current active Google API Access Token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and clear in-memory token cache
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Aliases for App.tsx compatibility
export const signInWithGoogle = googleSignIn;
export const logoutUser = logout;
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
