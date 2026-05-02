import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { firebaseAuth } from '~/config/firebase';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 监听认证状态变化
    const unsubscribe = firebaseAuth.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
      
      // 如果用户登录，同步到 localStorage
      if (user) {
        user.getIdToken().then(token => {
          localStorage.setItem('firebase_token', token);
          localStorage.setItem('access_token', token); // 兼容现有系统
        });
      } else {
        localStorage.removeItem('firebase_token');
        // 注意：不要移除 access_token，可能是其他登录方式
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await firebaseAuth.signInWithGoogle();
      setUser(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const result = await firebaseAuth.signInWithMicrosoft();
      setUser(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    try {
      const result = await firebaseAuth.signInWithFacebook();
      setUser(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const user = await firebaseAuth.signInWithEmail(email, password);
      setUser(user);
    } catch (error: any) {
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      const user = await firebaseAuth.registerWithEmail(email, password, displayName);
      setUser(user);
    } catch (error: any) {
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await firebaseAuth.sendPasswordReset(email);
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseAuth.signOut();
      setUser(null);
      localStorage.removeItem('firebase_token');
    } catch (error: any) {
      throw error;
    }
  };

  const getIdToken = async () => {
    return await firebaseAuth.getIdToken();
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithFacebook,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signOut,
    getIdToken
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {!loading && children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}
