import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Phone, User, Building2, ArrowRight, Loader2,
  Mail, Lock, Eye, EyeOff, ChevronLeft, CheckCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────
const ensureUserProfile = async (authUser) => {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('users').insert([{
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Trader',
      email: authUser.email?.includes('@vyaparbook.com') ? null : authUser.email,
      phone: authUser.user_metadata?.phone || null,
      business_name: authUser.user_metadata?.business_name || null,
    }]);
  }
};

// Removed getPhoneEmail as we now ask the user for their real email.


const InputRow = ({ icon: Icon, children }) => (
  <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors bg-white shadow-sm">
    <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
      <Icon size={16} className="text-gray-400" />
    </div>
    {children}
  </div>
);

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  // View state: 'login' | 'signup' | 'forgot' | 'verify'
  const [mode, setMode] = useState('login');
  // Tab: 'email' | 'phone'
  const [tab, setTab] = useState('email');
  
  // Auth state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [otp, setOtp] = useState('');

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    let loginEmail = email.trim();
    
    if (tab === 'phone') {
      if (!phone) return setError('Phone number is required');
      setLoading(true);
      try {
        const { data: foundEmail, error: rpcErr } = await supabase.rpc('get_email_by_phone', { 
          p_phone: phone.replace(/\D/g, '').slice(-10) 
        });
        if (rpcErr || !foundEmail) {
          throw new Error('Account not found with this phone number');
        }
        loginEmail = foundEmail;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    if (!loginEmail || !password) {
      setLoading(false);
      return setError('Email/Phone and Password are required');
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authErr) throw authErr;

      const authUser = data.user;
      await ensureUserProfile(authUser);
      
      const userData = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || 'Trader',
        phone: authUser.user_metadata?.phone || '',
        business_name: authUser.user_metadata?.business_name || '',
      };
      
      onLogin(userData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'demo@vyaparbook.com',
        password: 'demo123',
      });

      if (authErr) throw authErr;

      const authUser = data.user;
      await ensureUserProfile(authUser);
      
      const userData = {
        id: authUser.id,
        email: authUser.email,
        name: 'Demo Evaluator',
        phone: '+910000000000',
        business_name: 'Demo Vyapar',
      };
      
      onLogin(userData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (tab === 'email' && (!email || !password || !name)) return setError('All fields are required');
    if (tab === 'phone' && (!phone || !password || !name)) return setError('All fields are required');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    setError('');
    try {
      const loginIdentifier = email.trim();
      const displayPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`;

      const { data, error: authErr } = await supabase.auth.signUp({
        email: loginIdentifier,
        password: password,
        options: {
          data: {
            name: name.trim(),
            business_name: businessName.trim() || name.trim(),
            phone: displayPhone,
          },
        },
      });

      if (authErr) throw authErr;

      if (data.session) {
        // Logged in immediately (email verification disabled)
        await ensureUserProfile(data.user);
        onLogin({
          id: data.user.id,
          name: name.trim(),
          email: data.user.email,
          phone: displayPhone
        });
        navigate('/');
      } else {
        setSuccess(tab === 'email' ? '✅ Verification link sent to your email!' : '✅ Account created! Please login.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const identifier = tab === 'email' ? email.trim() : phone.trim();
    if (!identifier) return setError('Please enter your ' + tab);

    setLoading(true);
    setError('');
    try {
      if (tab === 'email') {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(identifier, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetErr) throw resetErr;
        setSuccess('✅ Password reset link sent to your email!');
        setMode('login');
      } else {
        // For Phone, use OTP as a bridge
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          phone: `+91${phone.replace(/\D/g, '').slice(-10)}`,
        });
        if (otpErr) throw otpErr;
        setMode('verify');
        setSuccess('✅ OTP sent to your phone!');
      }
    } catch (err) {
      setError(err.message || 'Error sending recovery info');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError('Enter 6-digit OTP');
    
    setLoading(true);
    setError('');
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: `+91${phone.replace(/\D/g, '').slice(-10)}`,
        token: otp,
        type: 'sms',
      });

      if (verifyErr) throw verifyErr;

      // If verified, we are logged in. Now redirect to reset password.
      navigate('/reset-password');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Render Parts ─────────────────────────────────────────────────────────

  const renderHeader = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 mb-3 shadow-lg">
        <Leaf size={32} className="text-white" strokeWidth={2.5} />
      </div>
      <h1 className="text-3xl font-black text-white tracking-tight">VyaparBook</h1>
      <p className="text-green-100 text-sm font-medium opacity-90">Aapka Digital Khata 📒</p>
    </div>
  );

  const renderTabs = () => (
    <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
      {[['email', '✉️ Email'], ['phone', '📱 Phone']].map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => { setTab(val); setError(''); setSuccess(''); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === val ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-500 flex flex-col">
      {renderHeader()}

      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 flex-1">
        
        {/* State Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-500 shrink-0" size={18} />
            <p className="text-green-700 text-xs font-bold uppercase">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-6">
            <p className="text-red-500 text-xs font-bold uppercase">⚠️ {error}</p>
          </div>
        )}

        {/* ── FORGOT MODE ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setMode('login')} className="flex items-center gap-1 text-xs font-bold text-green-600 mb-6 uppercase tracking-wider">
              <ChevronLeft size={14} /> Back to Login
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Forgot Password? 🔑</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your {tab} to receive recovery instructions.</p>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Login Email</label>
              <InputRow icon={Mail}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="flex-1 px-4 py-3.5 text-base outline-none" />
              </InputRow>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Code'}
            </button>
          </form>
        )}

        {/* ── VERIFY OTP MODE ── */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-black text-gray-900 mb-1">Verify Phone 📱</h2>
            <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code sent to +91{phone}</p>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">OTP Code</label>
              <InputRow icon={Lock}>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="flex-1 px-4 py-3.5 text-base font-black tracking-[1em] outline-none" />
              </InputRow>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Verify & Continue'}
            </button>
          </form>
        )}

        {/* ── LOGIN / SIGNUP MODES ── */}
        {(mode === 'login' || mode === 'signup') && (
          <>
            {renderTabs()}

            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
              <h2 className="text-2xl font-black text-gray-900 mb-1">
                {mode === 'login' ? 'Welcome Back! 👋' : 'Create Account ✨'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {mode === 'login' ? 'Sign in to access your digital khata' : 'Start your digital grain business today'}
              </p>

              {/* Extra Signup Fields */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Full Name</label>
                    <InputRow icon={User}>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar" className="flex-1 px-4 py-3.5 text-base outline-none" />
                    </InputRow>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Business Name</label>
                    <InputRow icon={Building2}>
                      <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ravi Rice Mills" className="flex-1 px-4 py-3.5 text-base outline-none" />
                    </InputRow>
                  </div>
                  {/* Always ask for Phone in Email tab and Email in Phone tab during signup */}
                  {tab === 'email' ? (
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Mobile Number (For WhatsApp)</label>
                      <InputRow icon={Phone}>
                        <span className="pl-4 text-gray-400 font-bold text-sm">+91</span>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" maxLength={10} className="flex-1 px-4 py-3.5 text-base outline-none" />
                      </InputRow>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Login Email</label>
                      <InputRow icon={Mail}>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="flex-1 px-4 py-3.5 text-base outline-none" />
                      </InputRow>
                    </div>
                  )}
                </>
              )}

              {/* Identifier Field */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">{tab}</label>
                {tab === 'email' ? (
                  <InputRow icon={Mail}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="flex-1 px-4 py-3.5 text-base outline-none" />
                  </InputRow>
                ) : (
                  <InputRow icon={Phone}>
                    <span className="pl-4 text-gray-400 font-bold text-sm">+91</span>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" maxLength={10} className="flex-1 px-4 py-3.5 text-base outline-none" />
                  </InputRow>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-green-600 uppercase">Forgot?</button>
                  )}
                </div>
                <InputRow icon={Lock}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 px-4 py-3.5 text-base outline-none" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="pr-4">
                    {showPass ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                  </button>
                </InputRow>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 mt-4 transition-transform active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : <>{mode === 'login' ? 'Login' : 'Create Account'} <ArrowRight size={18} /></>}
              </button>

              {mode === 'login' && (
                <button 
                  type="button" 
                  onClick={handleDemoLogin} 
                  disabled={loading} 
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 mt-2 hover:bg-gray-200 transition-colors active:scale-95 border border-gray-200"
                >
                  🚀 Try Demo Account
                </button>
              )}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
                  className="text-sm font-bold text-gray-500 uppercase tracking-wider"
                >
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <span className="text-green-600 font-black">{mode === 'login' ? 'Register' : 'Login'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
