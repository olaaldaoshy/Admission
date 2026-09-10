
'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';

/**
 * Type for optional error callback
 */
type ErrorCallback = (error: any) => void;

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth, onError?: ErrorCallback): void {
  signInAnonymously(authInstance).catch(error => {
    console.error("Anonymous sign-in error:", error);
    if (onError) onError(error);
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth, 
  email: string, 
  password: string, 
  onSuccess?: (user: User) => void,
  onError?: ErrorCallback
): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .then((userCredential) => {
      if (onSuccess) onSuccess(userCredential.user);
    })
    .catch(error => {
      console.error("Email sign-up error:", error);
      if (onError) onError(error);
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string, onError?: ErrorCallback): void {
  signInWithEmailAndPassword(authInstance, email, password).catch(error => {
    console.error("Email sign-in error:", error);
    if (onError) onError(error);
  });
}

/** Initiate Google sign-in (non-blocking). */
export function initiateGoogleSignIn(authInstance: Auth, onSuccess?: (user: User) => void, onError?: ErrorCallback): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(authInstance, provider)
    .then((userCredential) => {
      if (onSuccess) onSuccess(userCredential.user);
    })
    .catch(error => {
      console.error("Google sign-in error:", error);
      if (onError) onError(error);
    });
}
