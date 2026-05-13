import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, Leaf, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, they might have just landed here from a link
        // Supabase handles the hash fragment automatically to create a session
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user?.phone) {
        // Phone recovery: update the dummy email password via RPC
        const { error: rpcErr } = await supabase.rpc('reset_phone_password', { 
          p_new_password: password 
        });
        if (rpcErr) throw rpcErr;
      } else {
        // Email recovery: use native updateUser
        const { error: updateErr } = await supabase.auth.updateUser({
          password: password
        });
        if (updateErr) throw updateErr;
      }

      // Important: Sign out of the recovery session (especially the Phone OTP one)
      // so that they can log in cleanly with their actual credentials.
      await supabase.auth.signOut();

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2 text-center">Password Updated!</h1>
        <p className="text-gray-500 text-center mb-8">Your password has been reset successfully. Redirecting you to login...</p>
        <button onClick={() => navigate('/login')} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-green-600 px-6 pt-16 pb-12 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 mb-4">
          <Leaf size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Reset Password</h1>
        <p className="text-green-100 text-sm">Create a new secure password</p>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-10 shadow-xl">
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">New Password</label>
            <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors bg-white">
              <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 px-4 py-3.5 text-base font-medium outline-none"
                autoFocus
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="pr-4">
                {showPass ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Confirm Password</label>
            <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-green-500 transition-colors bg-white">
              <div className="px-4 py-3.5 bg-gray-50 border-r-2 border-gray-200">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 px-4 py-3.5 text-base font-medium outline-none"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">⚠️ {error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 mt-4 disabled:opacity-60"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
