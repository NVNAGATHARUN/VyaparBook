import React, { useState, useEffect } from 'react';
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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check persisted user on mount
  useEffect(() => {
    const stored = localStorage.getItem('vyapar_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('vyapar_user');
      }
    }
    setLoading(false);
  }, []);

  // Online/offline detection
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

  const handleLogout = () => {
    localStorage.removeItem('vyapar_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🌿</div>
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
          📡 You're offline — Viewing cached data
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
              <Route path="/" element={<Home user={user} />} />
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

        {/* Bottom Nav — only shown when logged in and not on login page */}
        {user && <BottomNav />}
      </div>
    </Router>
  );
};

export default App;
