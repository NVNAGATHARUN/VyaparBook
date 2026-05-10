
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, Receipt, ArrowLeft, 
  ChevronRight, Landmark, Package,
  User, LogOut
} from 'lucide-react';
import InterestCalculator from '../components/tools/InterestCalculator';
import { supabase } from '../services/supabase';

const Tools = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showCalc, setShowCalc] = useState(false);

  const handleSaveLoan = async (loanData) => {
    const partyName = window.prompt('Enter Lender/Borrower name to save this loan:');
    if (!partyName) return;

    const { error } = await supabase
      .from('loans')
      .insert([{
        ...loanData,
        user_id: user.id,
        party_name: partyName
      }]);

    if (error) {
      alert('Error saving loan: ' + error.message);
    } else {
      alert('✅ Loan saved successfully!');
      navigate('/loans');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-500 px-4 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-100 text-sm mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-white text-2xl font-black">Business Tools</h1>
        <p className="text-indigo-100 text-sm">Calculators and financial management</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Main Menu */}
        {!showCalc && (
          <div className="space-y-3">
            <button
              onClick={() => setShowCalc(true)}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Calculator size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-lg">Interest Calculator</p>
                <p className="text-gray-400 text-xs">Simple & Compound interest calculations</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-indigo-500" />
            </button>

            <button
              onClick={() => navigate('/loans')}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                <Landmark size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-lg">My Loans</p>
                <p className="text-gray-400 text-xs">Track Bank, Gold, and Hand loans</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-green-500" />
            </button>

            <button
              onClick={() => navigate('/expenses')}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                <Receipt size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-lg">Expenses</p>
                <p className="text-gray-400 text-xs">Track business overheads & costs</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-red-500" />
            </button>

            <button
              onClick={() => navigate('/stock')}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                <Package size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-lg">Stock Management</p>
                <p className="text-gray-400 text-xs">View inventory levels</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-orange-500" />
            </button>

            <div className="pt-4 pb-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Account & Support</p>
            </div>

            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center shrink-0">
                <User size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-lg">Settings</p>
                <p className="text-gray-400 text-xs">Business profile & preferences</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-gray-500" />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  onLogout();
                }
              }}
              className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                <LogOut size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-rose-600 text-lg">Logout</p>
                <p className="text-rose-400 text-xs">Sign out of VyaparBook</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-rose-500" />
            </button>
          </div>
        )}

        {/* Inline Calculator */}
        {showCalc && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowCalc(false)}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to Tools
              </button>
            </div>
            <InterestCalculator user={user} onSaveLoan={handleSaveLoan} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;
