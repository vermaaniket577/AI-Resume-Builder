import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { FullScreenLoader } from './components/Loader';

// Screens
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Wizard from './screens/Wizard';
import Preview from './screens/Preview';
import TemplateSelection from './screens/TemplateSelection';
import Analysis from './screens/Analysis';
import Settings from './screens/Settings';
import Score from './screens/Score';

// Components
import Layout from './components/Layout';

const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
} | null>(null);

export const useAuth = () => useContext(AuthContext)!;

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDoc = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot to listen for real-time updates to the profile
        unsubscribeProfile = onSnapshot(userDoc, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setLoading(false);
          } else {
            // If profile doesn't exist, create it
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              isPremium: false,
              resumeCount: 0,
              createdAt: serverTimestamp(),
              role: firebaseUser.email === 'vermaaniket577@gmail.com' ? 'admin' : 'user'
            };
            try {
              await setDoc(userDoc, newProfile);
              // onSnapshot will trigger again after setDoc
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
              setLoading(false);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader message="Starting up..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/wizard" element={
              <PrivateRoute>
                <Wizard />
              </PrivateRoute>
            } />

            <Route path="/wizard/:id" element={
              <PrivateRoute>
                <Wizard />
              </PrivateRoute>
            } />

            <Route path="/preview/:id" element={
              <PrivateRoute>
                <Preview />
              </PrivateRoute>
            } />

            <Route path="/templates/:id" element={
              <PrivateRoute>
                <TemplateSelection />
              </PrivateRoute>
            } />

            <Route path="/analysis/:id" element={
              <PrivateRoute>
                <Layout>
                  <Analysis />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/score" element={
              <PrivateRoute>
                <Layout>
                  <Score />
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/settings" element={
              <PrivateRoute>
                <Layout>
                  <Settings />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
