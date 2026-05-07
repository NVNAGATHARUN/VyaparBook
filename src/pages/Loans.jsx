
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Landmark, DollarSign, Wallet, 
  Trash2, Calendar, Bell, ChevronRight, AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { formatAmount } from '../utils/formatAmount';
import { formatDateShort } from '../utils/formatDate';

const Loans = ({ user }) => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setLoans(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLoans();
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this loan record?')) return;
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (!error) loadLoans();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'bank': return Landmark;
      case 'gold': return DollarSign;
      default: return Wallet;
    }
  };

  const totalTaken = loans.filter(l => l.direction === 'taken' && l.status === 'active').reduce((s, l) => s + Number(l.principal), 0);
  const totalGiven = loans.filter(l => l.direction === 'given' && l.status === 'active').reduce((s, l) => s + Number(l.principal), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-green-700 to-green-500 px-4 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-green-100 text-sm mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-white text-2xl font-black">My Loans</h1>
        <p className="text-green-100 text-sm">Active Bank, Gold & Hand loans</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Taken</p>
            <p className="text-lg font-black text-red-500">₹{formatAmount(totalTaken)}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Given</p>
            <p className="text-lg font-black text-green-600">₹{formatAmount(totalGiven)}</p>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loans.map((loan) => {
            const Icon = getIcon(loan.loan_type);
            const isTaken = loan.direction === 'taken';
            
            return (
              <div key={loan.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative group">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    loan.loan_type === 'bank' ? 'bg-blue-100 text-blue-600' : 
                    loan.loan_type === 'gold' ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-indigo-100 text-indigo-600'
                  }`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-black text-gray-900 text-base truncate">{loan.party_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isTaken ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                      }`}>
                        {loan.direction}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-black text-gray-900">₹{formatAmount(loan.principal)}</p>
                        <p className="text-xs text-gray-400 font-medium">
                          {loan.interest_rate} {loan.rate_mode === 'percentage' ? '%' : 'Rupees'} • {loan.interest_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 justify-end">
                          <Calendar size={10} /> {formatDateShort(loan.start_date)}
                        </p>
                        {loan.next_installment_date && (
                          <p className="text-[10px] text-orange-500 font-bold uppercase mt-1 flex items-center gap-1 justify-end">
                            <Bell size={10} /> Next: {formatDateShort(loan.next_installment_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete button on hover */}
                <button 
                  onClick={() => handleDelete(loan.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          {loans.length === 0 && !loading && (
            <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-gray-200" />
              </div>
              <p className="text-gray-400 font-bold mb-4">No saved loans found</p>
              <button 
                onClick={() => navigate('/tools')}
                className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold text-sm"
              >
                Go to Calculator
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Loans;
