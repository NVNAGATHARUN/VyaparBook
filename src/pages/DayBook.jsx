
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, ChevronRight
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { formatAmount } from '../utils/formatAmount';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DayBook = ({ user }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0 });
  const [loading, setLoading] = useState(true);

  const loadDayData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch everything for this day
      const [
        { data: deals },
        { data: payments },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('deals').select('*, parties(name)').eq('user_id', user.id).eq('deal_date', selectedDate),
        supabase.from('payments').select('*, parties(name)').eq('user_id', user.id).eq('payment_date', selectedDate),
        supabase.from('expenses').select('*').eq('user_id', user.id).eq('expense_date', selectedDate)
      ]);

      // Normalize into unified chronological entries
      const allEntries = [
        ...(deals || []).map(d => ({
          id: d.id,
          time: d.created_at,
          type: d.type, // 'purchase' or 'sale'
          category: 'DEAL',
          title: d.parties?.name || 'Unknown Party',
          subtitle: `${d.quantity} ${d.unit} ${d.commodity}`,
          amount: Number(d.total_amount),
          isPositive: d.type === 'sale', // Sales bring money (accrual)
          raw: d
        })),
        ...(payments || []).map(p => ({
          id: p.id,
          time: p.created_at,
          type: p.type, // 'in' or 'out'
          category: 'PAYMENT',
          title: p.parties?.name || 'Cash Payment',
          subtitle: `via ${p.payment_mode}`,
          amount: Number(p.amount),
          isPositive: p.type === 'in',
          raw: p
        })),
        ...(expenses || []).map(e => ({
          id: e.id,
          time: e.created_at,
          type: 'expense',
          category: 'EXPENSE',
          title: e.category || 'General Expense',
          subtitle: e.notes || 'Operating cost',
          amount: Number(e.amount),
          isPositive: false,
          raw: e
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time));

      // Calculate Cash Flow (simplified: payments in vs payments out + expenses)
      const totalIn = (payments || []).filter(p => p.type === 'in').reduce((s, p) => s + Number(p.amount), 0);
      const totalOut = (payments || []).filter(p => p.type === 'out').reduce((s, p) => s + Number(p.amount), 0) + 
                       (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

      setEntries(allEntries);
      setSummary({ totalIn, totalOut });
    } catch (err) {
      console.error('DayBook error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadDayData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadDayData]);

  const getStatusColor = (entry) => {
    if (entry.category === 'EXPENSE') return 'text-red-500';
    return entry.isPositive ? 'text-green-600' : 'text-orange-600';
  };

  const getIcon = (entry) => {
    if (entry.category === 'DEAL') return entry.type === 'purchase' ? '🛒' : '💰';
    if (entry.category === 'PAYMENT') return '💸';
    return '🏢';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-6 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black text-gray-900">Day Book</h1>
          </div>
          <div className="relative">
            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-green-50 border-none rounded-xl pl-10 pr-3 py-2 text-sm font-bold text-green-700 outline-none focus:ring-2 ring-green-200"
            />
          </div>
        </div>

        {/* Day Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Cash In</p>
            <p className="text-lg font-black text-emerald-700">₹{formatAmount(summary.totalIn)}</p>
          </div>
          <div className="bg-rose-50 rounded-2xl p-3 border border-rose-100">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Total Outflow</p>
            <p className="text-lg font-black text-rose-700">₹{formatAmount(summary.totalOut)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Reading logs..." />
      ) : (
        <div className="px-4 py-4">
          {entries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
              <p className="text-4xl mb-4">📝</p>
              <p className="text-gray-400 font-bold">No entries for this date.</p>
              <p className="text-gray-300 text-xs mt-1">Transactions recorded today will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={`${entry.category}-${entry.id}`}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl shrink-0">
                    {getIcon(entry)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-800 text-sm truncate">{entry.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(entry.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.subtitle}</p>
                    <p className={`text-base font-black mt-1 ${getStatusColor(entry)}`}>
                      {entry.isPositive ? '+' : '-'} ₹{formatAmount(entry.amount)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DayBook;
