import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Phone, User, Building2, ArrowRight, Loader2,
  Mail, Lock, Eye, EyeOff, ChevronLeft,
} from 'lucide-react';
import { getUserByPhone, supabase } from '../services/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────
const ensureUserProfile = async (authUser) => {
  // Create/sync a row in public.users for RLS-compatible queries
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('users').insert([{
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
      email: authUser.email,
      phone: authUser.user_metadata?.phone || null,
      business_name: authUser.user_metadata?.business_name || null,
    }]).select().single();
  }
};

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  // tab: 'email' | 'phone'
  const [tab, setTab] = useState('email');
  // emailMode: 'login' | 'signup'
  const [emailMode, setEmailMode] = useState('login');

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  // Signup extra fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  // Phone form
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState('enter'); // 'enter' | 'register'
  const [phoneName, setPhoneName] = useState('');
  const [phoneBusiness, setPhoneBusiness] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Email Login ─────────────────────────────────────────────────────────
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
      await ensureUserProfile(authUser);
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
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email Signup ────────────────────────────────────────────────────────
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('Name, email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim(),
            business_name: businessName.trim() || name.trim(),
            phone: signupPhone.trim() ? `+91${signupPhone.trim().slice(-10)}` : '',
          },
        },
      });
      if (authErr) throw new Error(authErr.message);

      // If email confirmation is disabled (dev mode), user is logged in immediately
      if (data.session) {
        const authUser = data.user;
        await ensureUserProfile(authUser);
        const userData = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || name.trim(),
          phone: authUser.user_metadata?.phone || '',
          business_name: authUser.user_metadata?.business_name || '',
        };
        localStorage.setItem('vyapar_user', JSON.stringify(userData));
        onLogin(userData);
        navigate('/');
      } else {
        // Email confirmation required
        setSuccessMsg('✅ Account created! Check your email to confirm, then login.');
        setEmailMode('login');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone Login (legacy, no-OTP) ────────────────────────────────────────
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
      const { data: existingUser } = await getUserByPhone(fullPhone);
      if (existingUser) {
        localStorage.setItem('vyapar_user', JSON.stringify(existingUser));
        onLogin(existingUser);
        navigate('/');
      } else {
        setPhoneStep('register');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRegister = async (e) => {
    e.preventDefault();
    if (!phoneName.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = `+91${cleanPhone.slice(-10)}`;
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          phone: fullPhone,
          name: phoneName.trim(),
          business_name: phoneBusiness.trim() || phoneName.trim(),
        }])
        .select()
        .single();
      if (createError) throw new Error(createError.message);
      localStorage.setItem('vyapar_user', JSON.stringify(newUser));
      onLogin(newUser);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Input component helper ──────────────────────────────────────────────
  const InputRow = ({ icon: Icon, children }) => (
    <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors bg-white">
      <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
        <Icon size={16} className="text-gray-400" />
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/30 mb-4 shadow-xl">
          <Leaf size={38} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">VyaparBook</h1>
        <p className="text-green-100 text-base mt-1 font-medium">Aapka Digital Khata 📒</p>
        <div className="mt-2 flex gap-2 text-green-100 text-sm">
          <span>🌾 Rice</span><span>•</span>
          <span>🌿 Paddy</span><span>•</span>
          <span>🌾 Wheat</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 min-h-[420px]">

        {/* Tab Switcher */}
        {phoneStep === 'enter' && (
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {[['email', '✉️ Email'], ['phone', '📱 Phone']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setTab(val); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === val ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── SUCCESS MESSAGE ── */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-green-700 text-sm font-semibold">{successMsg}</p>
          </div>
        )}

        {/* ── EMAIL FORMS ── */}
        {tab === 'email' && (
          <>
            {emailMode === 'login' ? (
              <form onSubmit={handleEmailLogin}>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back! 👋</h2>
                <p className="text-gray-500 text-sm mb-5">Sign in to your VyaparBook account</p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
                    <InputRow icon={Mail}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@email.com"
                        className="flex-1 px-4 py-3.5 text-base font-medium outline-none"
                        autoFocus
                      />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Password</label>
                    <InputRow icon={Lock}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                        className="flex-1 px-4 py-3.5 text-base font-medium outline-none"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="pr-4">
                        {showPass ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                      </button>
                    </InputRow>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:from-green-400 hover:to-green-500 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Login</span><ArrowRight size={20} /></>}
                </button>

                <button
                  type="button"
                  onClick={() => { setEmailMode('signup'); setError(''); setSuccessMsg(''); }}
                  className="w-full mt-3 text-sm text-gray-500 text-center py-2"
                >
                  New user? <span className="text-green-600 font-semibold">Create account →</span>
                </button>
              </form>

            ) : (
              <form onSubmit={handleEmailSignup}>
                <button
                  type="button"
                  onClick={() => { setEmailMode('login'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-green-600 font-medium mb-4"
                >
                  <ChevronLeft size={16} /> Back to Login
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account ✨</h2>
                <p className="text-gray-500 text-sm mb-5">Join VyaparBook — it&apos;s free!</p>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Your Name *</label>
                    <InputRow icon={User}>
                      <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
                        placeholder="Ravi Kumar" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" autoFocus />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Business Name</label>
                    <InputRow icon={Building2}>
                      <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Ravi Rice Mills" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email *</label>
                    <InputRow icon={Mail}>
                      <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@email.com" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Phone (for WhatsApp bot)</label>
                    <InputRow icon={Phone}>
                      <span className="pl-2 text-gray-500 font-semibold text-sm pr-1">+91</span>
                      <input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="9876543210" maxLength={10} className="flex-1 px-2 py-3.5 text-base font-medium outline-none" />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Password * (min 6 chars)</label>
                    <InputRow icon={Lock}>
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="••••••••" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="pr-4">
                        {showPass ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                      </button>
                    </InputRow>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Create Account</span><ArrowRight size={20} /></>}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── PHONE FORMS ── */}
        {tab === 'phone' && (
          <>
            {phoneStep === 'enter' ? (
              <form onSubmit={handlePhoneSubmit}>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome! 👋</h2>
                <p className="text-gray-500 text-sm mb-5">Enter your phone number to continue</p>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Phone Number</label>
                  <InputRow icon={Phone}>
                    <span className="pl-2 text-gray-600 font-semibold text-sm pr-1 border-r border-gray-200 mr-1">+91</span>
                    <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }}
                      placeholder="9876543210" maxLength={10}
                      className="flex-1 px-4 py-3.5 text-base font-medium outline-none" autoFocus />
                  </InputRow>
                </div>
                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Continue</span><ArrowRight size={20} /></>}
                </button>
                <p className="text-center text-gray-400 text-xs mt-4">
                  For security, we recommend <button type="button" onClick={() => setTab('email')} className="text-green-600 font-semibold">Email Login</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handlePhoneRegister}>
                <button type="button" onClick={() => { setPhoneStep('enter'); setError(''); }}
                  className="flex items-center gap-1 text-sm text-green-600 font-medium mb-4">
                  <ChevronLeft size={16} /> Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account ✨</h2>
                <p className="text-gray-500 text-sm mb-5">New user — tell us about yourself</p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Your Name *</label>
                    <InputRow icon={User}>
                      <input type="text" value={phoneName} onChange={(e) => { setPhoneName(e.target.value); setError(''); }}
                        placeholder="Ravi Kumar" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" autoFocus />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Business Name (optional)</label>
                    <InputRow icon={Building2}>
                      <input type="text" value={phoneBusiness} onChange={(e) => setPhoneBusiness(e.target.value)}
                        placeholder="Ravi Rice Mills" className="flex-1 px-4 py-3.5 text-base font-medium outline-none" />
                    </InputRow>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><span>Start Using VyaparBook</span><ArrowRight size={20} /></>}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
