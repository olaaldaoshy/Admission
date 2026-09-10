
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, collection, query, where, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

/**
 * Hook to access the current user's employee record and permissions.
 */
export const useEmployee = () => {
  const { user, firestore, isUserLoading: isAuthLoading } = useFirebase();
  
  // Try to find by UID first (most secure and direct)
  const uidRef = useMemoFirebase(() => {
    if (!user || user.isAnonymous) return null;
    return doc(firestore, "employees", user.uid);
  }, [firestore, user]);
  const { data: uidEmployee, isLoading: isUidLoading } = useDoc(uidRef);

  // Fallback: Query by email to find the employee record (for first-time login)
  const employeeQuery = useMemoFirebase(() => {
    if (uidEmployee || !user || !user.email) return null;
    return query(collection(firestore, "employees"), where("email", "==", user.email.toLowerCase()));
  }, [firestore, user, uidEmployee]);

  const { data: employees, isLoading: isDocLoading } = useCollection(employeeQuery);
  const employee = uidEmployee || employees?.[0] || null;

  const isSuperAdmin = user?.email?.toLowerCase().trim() === 'omnia.taalab@nis-egypt.com';

  // Automatically ensure the employee's document exists at employees/{user.uid}
  useEffect(() => {
    if (!user || user.isAnonymous || !firestore || uidEmployee) return;
    if (employees && employees.length > 0) {
      const empData = employees[0];
      const targetDoc = doc(firestore, "employees", user.uid);
      setDoc(targetDoc, {
        ...empData,
        uid: user.uid,
        email: (empData.email || user.email || "").toLowerCase().trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn("Auto-linking employee UID:", err);
      });
    } else if (isSuperAdmin) {
      const targetDoc = doc(firestore, "employees", user.uid);
      setDoc(targetDoc, {
        uid: user.uid,
        name: user.displayName || "Omnia Taalab",
        email: user.email?.toLowerCase().trim(),
        role: "Director",
        status: "Active",
        isActive: true,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn("Auto-creating superadmin doc:", err);
      });
    }
  }, [user, firestore, uidEmployee, employees, isSuperAdmin]);
  
  // Total loading state
  const isLoading = isAuthLoading || (!!user && !user.isAnonymous && (isUidLoading || isDocLoading));
  
  const isAuthorized = !!employee || isSuperAdmin;
  const role = employee?.role || (isSuperAdmin ? 'Director' : 'Staff');
  
  return { 
    employee: employee || (isSuperAdmin ? { id: user?.uid, name: user?.displayName || "Omnia Taalab", email: user?.email, role: "Director" } : null), 
    isLoading, 
    isAuthorized,
    isDirector: role === 'Director' || isSuperAdmin,
    isManager: role === 'Manager',
    isSales: role === 'Sales',
    isSalesManager: role === 'Sales Manager',
    campus: employee?.campus
  };
};
