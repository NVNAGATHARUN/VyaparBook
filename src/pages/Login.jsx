import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Phone, User, Building2, ArrowRight, Loader2, Mail, Lock } from 'lucide-react';
import { getUserByPhone, createUser, supabase } from '../services/supabase';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('email'); // 'email' | 'phone'
  const [step, setStep] = useState('phone'); // 'phone' | 'register'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authErr) throw new Error(authErr.message);
      const authUser = data.user;
      // Build a user object compatible with the app
      const userData = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        phone: authUser.user_metadata?.phone || '',
        business_name: authUser.user_metadata?.business_name || '',
      };
      localStorage.setItem('vyapar_user', JSON.stringify(userData));
      onLogin(userData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = `+91${cleanPhone.slice(-10)}`;
      const { data: user } = await getUserByPhone(fullPhone);

      if (user) {
        // Existing user — log in
        localStorage.setItem('vyapar_user', JSON.stringify(user));
        onLogin(user);
        navigate('/');
      } else {
        // New user — show registration
        setStep('register');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = `+91${cleanPhone.slice(-10)}`;
      const { data: user, error: createError } = await createUser({
        phone: fullPhone,
        name: name.trim(),
        business_name: businessName.trim() || name.trim(),
      });

      if (createError) throw new Error(createError.message);

      localStorage.setItem('vyapar_user', JSON.stringify(user));
      onLogin(user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 flex flex-col">
      {/* Top decoration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <Leaf size={32} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">VyaparBook</h1>
        <p className="text-green-100 text-base mt-1 font-medium">Aapka Digital Khata 📒</p>

        <div className="mt-2 flex gap-2 text-green-100 text-sm">
          <span>🌾 Rice</span>
          <span>•</span>
          <span>🌿 Paddy</span>
          <span>•</span>
          <span>🌾 Wheat</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 min-h-[400px]">

        {/* Tab Switcher */}
        {step === 'phone' && (
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab('email'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'email' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              ✉️ Email Login
            </button>
            <button
              type="button"
              onClick={() => { setTab('phone'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'phone' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              📱 Phone Login
            </button>
          </div>
        )}

        {/* Email Login Form */}
        {tab === 'email' && step === 'phone' ? (
          <form onSubmit={handleEmailLogin}>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back! 👋</h2>
            <p className="text-gray-500 text-sm mb-6">Login with your email and password</p>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors">
                <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@email.com"
                  className="flex-1 px-4 py-3.5 text-base font-medium outline-none bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Password</label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors">
                <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="flex-1 px-4 py-3.5 text-base font-medium outline-none bg-white"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:from-green-400 hover:to-green-500 transition-all active:scale-98 disabled:opacity-60"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Login</span><ArrowRight size={20} /></>}
            </button>
          </form>

        ) : step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit}>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Welcome! 👋
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter your phone number to continue
            </p>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Phone Number
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors">
                <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-600 font-semibold text-sm">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className="flex-1 px-4 py-3.5 text-base font-medium outline-none bg-white"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:from-green-400 hover:to-green-500 transition-all active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <p className="text-center text-gray-400 text-xs mt-4">
              No OTP needed. Just your phone number.
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <button
              type="button"
              onClick={() => { setStep('phone'); setError(''); }}
              className="text-sm text-green-600 font-medium mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Create Account ✨
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              New user — tell us about yourself
            </p>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Your Name *
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors">
                <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                  <User size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="Ravi Kumar"
                  className="flex-1 px-4 py-3.5 text-base font-medium outline-none bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Business Name (optional)
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors">
                <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                  <Building2 size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ravi Rice Mills"
                  className="flex-1 px-4 py-3.5 text-base font-medium outline-none bg-white"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:from-green-400 hover:to-green-500 transition-all active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Start Using VyaparBook
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
