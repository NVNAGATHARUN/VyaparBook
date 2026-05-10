
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Trash2, Fuel, Home, Lightbulb, User, Truck, MoreHorizontal, Calendar } from 'lucide-react';
import { formatAmount } from '../../utils/formatAmount';
import { formatDateShort } from '../../utils/formatDate';

const categoryIcons = {
  rent: { icon: Home, color: 'bg-blue-100 text-blue-600' },
  electricity: { icon: Lightbulb, color: 'bg-yellow-100 text-yellow-600' },
  labor: { icon: User, color: 'bg-purple-100 text-purple-600' },
  transport: { icon: Truck, color: 'bg-orange-100 text-orange-600' },
  fuel: { icon: Fuel, color: 'bg-red-100 text-red-600' },
  other: { icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' }
};

const ExpenseList = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'other',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });
    
    if (data) setExpenses(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpenses();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newExpense.amount) return;

    const { error } = await supabase
      .from('expenses')
      .insert([{
        ...newExpense,
        user_id: user.id,
        amount: parseFloat(newExpense.amount)
      }]);

    if (!error) {
      setShowAdd(false);
      setNewExpense({ category: 'other', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
      loadExpenses();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) loadExpenses();
  };

  const totalExpense = expenses.reduce((sum, ex) => sum + Number(ex.amount), 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total Expenses</p>
        <h2 className="text-3xl font-black">₹{formatAmount(totalExpense)}</h2>
      </div>

      {/* Add Button */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-400 font-bold hover:border-red-300 hover:text-red-500 transition-all"
        >
          <Plus size={20} /> Add New Expense
        </button>
      )}

      {/* Add Form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">New Expense</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Category</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-red-500"
              >
                {Object.keys(categoryIcons).map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Date</label>
              <input
                type="date"
                value={newExpense.expense_date}
                onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Amount</label>
            <input
              type="number"
              required
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              placeholder="₹ Enter amount"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-black outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Description</label>
            <input
              type="text"
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              placeholder="What was this for?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-500"
            />
          </div>

          <button type="submit" className="w-full bg-red-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-100">
            Save Expense
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {expenses.map((ex) => {
          const Config = categoryIcons[ex.category] || categoryIcons.other;
          return (
            <div key={ex.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-50 group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${Config.color}`}>
                <Config.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-sm capitalize">{ex.category}</p>
                  <p className="font-black text-red-600 text-sm">₹{formatAmount(ex.amount)}</p>
                </div>
                <p className="text-gray-400 text-xs truncate">{ex.description || 'No description'}</p>
                <p className="text-[10px] text-gray-300 font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                  <Calendar size={10} /> {formatDateShort(ex.expense_date)}
                </p>
              </div>
              <button 
                onClick={() => handleDelete(ex.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        {expenses.length === 0 && !loading && (
          <div className="py-20 text-center text-gray-300">
            <p className="text-sm">No expenses logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
