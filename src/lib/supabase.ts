
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { data: { session: null }, error: null };
      }
      
      // Look up phone from localStorage or Firestore
      let userPhone = localStorage.getItem(`user_phone_${currentUser.uid}`) || '';
      if (!userPhone) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            userPhone = userDoc.data()?.phone || '';
            if (userPhone) {
              localStorage.setItem(`user_phone_${currentUser.uid}`, userPhone);
            }
          }
        } catch {
          // ignore error if offline or permissions
        }
      }

      const enrichedUser: any = {
        ...currentUser,
        id: currentUser.uid,
        email: currentUser.email,
        phone: userPhone || currentUser.phoneNumber || '',
        user_metadata: {
          full_name: currentUser.displayName,
          avatar_url: currentUser.photoURL,
          phone: userPhone || currentUser.phoneNumber || ''
        }
      };

      return { data: { session: { user: enrichedUser } }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          callback('SIGNED_OUT', null);
          return;
        }

        let userPhone = localStorage.getItem(`user_phone_${firebaseUser.uid}`) || '';
        if (!userPhone) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              userPhone = userDoc.data()?.phone || '';
              if (userPhone) {
                localStorage.setItem(`user_phone_${firebaseUser.uid}`, userPhone);
              }
            }
          } catch {
            // fallback
          }
        }

        const enrichedUser: any = {
          ...firebaseUser,
          id: firebaseUser.uid,
          email: firebaseUser.email,
          phone: userPhone || firebaseUser.phoneNumber || '',
          user_metadata: {
            full_name: firebaseUser.displayName,
            avatar_url: firebaseUser.photoURL,
            phone: userPhone || firebaseUser.phoneNumber || ''
          }
        };

        callback('SIGNED_IN', { user: enrichedUser });
      });
      return { data: { subscription: { unsubscribe } } };
    },
    signOut: async () => {
      await signOut(auth);
      return { error: null };
    },
    updateUser: async (params: { data?: { phone?: string; [key: string]: any } }) => {
      const currentUser = auth.currentUser;
      const phone = params?.data?.phone;
      if (currentUser && phone) {
        localStorage.setItem(`user_phone_${currentUser.uid}`, phone);
        try {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              id: currentUser.uid,
              name: currentUser.displayName || 'Cliente',
              email: currentUser.email || '',
              phone: phone,
              avatar_url: currentUser.photoURL || '',
              updated_at: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (e) {
          console.error('Erro ao persistir telefone no Firestore:', e);
        }
      }
      return { error: null };
    },
    refreshSession: async () => {
      return supabase.auth.getSession();
    },
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

