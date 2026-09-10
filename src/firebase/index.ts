'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called with firebaseConfig or via Firebase App Hosting env
    let firebaseApp;
    try {
      if (firebaseConfig && (firebaseConfig as any).apiKey) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = initializeApp();
      }
    } catch (e) {
      if (firebaseConfig) {
        try {
          firebaseApp = initializeApp(firebaseConfig);
        } catch (fallbackErr) {
          console.warn('Firebase initialization fallback failed:', fallbackErr);
        }
      }
    }

    return getSdks(firebaseApp || getApp());
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId || '(default)'),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
