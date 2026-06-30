import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initStore, loginUser, getUserById } from '../firebase/firestoreService';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  currentUser: UserProfile | null;
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  clinicId: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile | null>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  userProfile: null,
  userRole: null,
  clinicId: '',
  loading: true,
  signIn: async () => null,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initStore();
        const sessionUid = localStorage.getItem('dc_session');
        if (sessionUid) {
          const user = await getUserById(sessionUid);
          if (user) {
            setCurrentUser(user);
          } else {
            // إذا لم يجد المستخدم في قاعدة البيانات، نحذف الجلسة الوهمية لعدم التعليق مستقبلاً
            localStorage.removeItem('dc_session');
          }
        }
      } catch (error) {
        console.error("Error during authentication init:", error);
        // في حال حدوث خطأ، نقوم بتصفير المستخدم لتأمين مسار الدخول
        setCurrentUser(null);
      } finally {
        // يتم تنفيذ هذا السطر دائماً مهما حدث، لمنع تعليق شاشة التحميل للأبد
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const user = await loginUser(email, password);
      if (user) {
        localStorage.setItem('dc_session', user.uid);
        setCurrentUser(user);
      }
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      return null;
    }
  };

  const signOut = () => {
    localStorage.removeItem('dc_session');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile: currentUser,
        userRole: currentUser?.role ?? null,
        clinicId: currentUser?.clinicId ?? '',
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
