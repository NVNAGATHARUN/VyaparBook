import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Parties from './pages/Parties';
import PartyDetail from './pages/PartyDetail';
import Deals from './pages/Deals';
import AddDeal from './pages/AddDeal';
import AddPayment from './pages/AddPayment';
import Stock from './pages/Stock';
import Reports from './pages/Reports';

// Components
import BottomNav from './components/common/BottomNav';
import { supabase } from './services/supabase';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ── Auth: Supabase session + legacy localStorage fallback ──────────────────
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // First try Supabase Auth session (email/password users)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const authUser = session.user;
          const userData = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trader',
            phone: authUser.user_metadata?.phone || '',
            business_name: authUser.user_metadata?.business_name || '',
          };
          setUser(userData);
          // Keep localStorage in sync for offline / phone-login legacy users
          localStorage.setItem('vyapar_user', JSON.stringify(userData));
          setLoading(false);
          return;
        }
      } catch (_) { /* ignore */ }

      // Fallback: legacy phone-login users stored in localStorage
      const stored = localStorage.getItem('vyapar_user');
      if (stored && mounted) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.removeItem('vyapar_user');
        }
      }
      if (mounted) setLoading(false);
    };

    initAuth();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          const authUser = session.user;
          const userData = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trader',
            phone: authUser.user_metadata?.phone || '',
            business_name: authUser.user_metadata?.business_name || '',
          };
          setUser(userData);
          localStorage.setItem('vyapar_user', JSON.stringify(userData));
        } else {
          // Session ended — but only clear if they were email-auth user
          // (phone-login users don't have a Supabase session)
          const stored = localStorage.getItem('vyapar_user');
          if (stored) {
            try {
              const u = JSON.parse(stored);
              // If user has an email that looks like a real auth user, clear it
              if (u.email && u.email.includes('@')) {
                localStorage.removeItem('vyapar_user');
                setUser(null);
              }
            } catch {
              localStorage.removeItem('vyapar_user');
              setUser(null);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    // Sign out from Supabase Auth (for email users)
    try {
      await supabase.auth.signOut();
    } catch (_) { /* ignore if no session */ }
    localStorage.removeItem('vyapar_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌿</div>
          <p className="text-green-600 font-bold text-xl">VyaparBook</p>
          <p className="text-gray-400 text-sm mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-2 text-sm font-semibold">
          📡 You&apos;re offline — Viewing cached data
        </div>
      )}

      <div className="max-w-md mx-auto min-h-screen relative">
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* Protected Routes */}
          {!user ? (
            <Route path="*" element={<Navigate to="/login" replace />} />
          ) : (
            <>
              <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
              <Route path="/parties" element={<Parties user={user} />} />
              <Route path="/parties/:id" element={<PartyDetail user={user} />} />
              <Route path="/deals" element={<Deals user={user} />} />
              <Route path="/deals/add" element={<AddDeal user={user} />} />
              <Route path="/payments/add" element={<AddPayment user={user} />} />
              <Route path="/stock" element={<Stock user={user} />} />
              <Route path="/reports" element={<Reports user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>

        {/* Bottom Nav — only shown when logged in */}
        {user && <BottomNav />}
      </div>
    </Router>
  );
};

export default App;
