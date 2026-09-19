
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const supabase: any = {
  auth: {
    signInWithOAuth: async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return { data: { user: auth.currentUser }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    getSession: async () => {
      await auth.authStateReady();
      return { data: { session: auth.currentUser ? { user: auth.currentUser } : null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },
    signOut: async () => {
      await signOut(auth);
      return { error: null };
    },
    updateUser: async () => ({ error: null }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    verifyOtp: async () => ({ data: { user: null }, error: null }),
    resend: async () => ({ data: null, error: null })
  },
  from: () => new Proxy({}, {
    get: () => function() {
      return new Proxy({}, {
        get: () => function() {
          return Promise.resolve({ data: [], error: null });
        }
      });
    }
  }),
  storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
};

