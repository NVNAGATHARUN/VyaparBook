
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Building2, Phone, 
  ShieldCheck, LogOut, Save, Camera
} from 'lucide-react';
import { supabase } from '../services/supabase';

const Settings = ({ user, onUpdate, onLogout }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    business_name: user?.business_name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          business_name: formData.business_name,
          phone: formData.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...formData };
      onUpdate(updatedUser);
      localStorage.setItem('vyapar_user', JSON.stringify(updatedUser));
      showToast('✅ Profile updated successfully!');
    } catch (err) {
      showToast('❌ Update failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 px-4 pt-12 pb-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-300 text-sm mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-white text-2xl font-black">Settings</h1>
        <p className="text-gray-300 text-sm">Manage your business profile</p>
      </div>

      <div className="px-4 -mt-12 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-md">
                {user?.name?.[0] || 'T'}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white border-2 border-white">
                <Camera size={14} />
              </button>
            </div>
            <h2 className="mt-4 text-xl font-black text-gray-800">{user?.name}</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{user?.business_name || 'Individual Trader'}</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Owner Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-800 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Name</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-800 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-gray-800 focus:border-green-500 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-800">Privacy & Security</p>
                <p className="text-[10px] text-gray-400">Manage data & passwords</p>
              </div>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="w-full px-6 py-4 flex items-center justify-between border-t border-gray-50 hover:bg-rose-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <LogOut size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-rose-600">Logout</p>
                <p className="text-[10px] text-rose-400">Sign out of VyaparBook</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Version Tag */}
      <p className="text-center text-[10px] text-gray-300 font-bold uppercase mt-8 tracking-widest">
        VyaparBook v2.0.0 Stable
      </p>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 max-w-sm mx-auto px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold text-center z-50 animate-slide-up ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Settings;
