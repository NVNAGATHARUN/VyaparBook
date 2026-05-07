import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { exportReportPDF, exportTransactionsExcel } from '../services/exportService';
import BusinessChart from '../components/charts/BusinessChart';
import BulkReminderSheet from '../components/reminders/BulkReminderSheet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatAmount } from '../utils/formatAmount';
import { FileText, Download, MessageCircle, ChevronDown } from 'lucide-react';

const periods = [
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all' },
];

const Reports = ({ user }) => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [parties, setParties] = useState([]); // for reminder sheet
  const [loans, setLoans] = useState([]); // for loan installments
  const [loading, setLoading] = useState(true);

  // UI state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      let fromDate = null;
      if (period === 'month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const y = fromDate.getFullYear();
        const m = String(fromDate.getMonth() + 1).padStart(2, '0');
        const d = String(fromDate.getDate()).padStart(2, '0');
        fromDate = `${y}-${m}-${d}`;
      } else if (period === 'week') {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        const y = d7.getFullYear();
        const m = String(d7.getMonth() + 1).padStart(2, '0');
        const d = String(d7.getDate()).padStart(2, '0');
        fromDate = `${y}-${m}-${d}`;
      }

      // Fetch Deals
      let query = supabase
        .from('deals')
        .select('id, party_id, type, total_amount, commodity, deal_date, parties(name, phone), payments(amount)')
        .eq('user_id', user.id);

      if (fromDate) query = query.gte('deal_date', fromDate);
      const { data: fetchedDeals } = await query.order('deal_date');

      // Fetch Expenses
      let expQuery = supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('user_id', user.id);
      if (fromDate) expQuery = expQuery.gte('expense_date', fromDate);
      const { data: fetchedExpenses } = await expQuery;

      // Fetch Loans
      const { data: fetchedLoans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('next_installment_date');

      setDeals(fetchedDeals || []);
      setLoans(fetchedLoans || []);

      let totalPurchase = 0;
      let totalSale = 0;
      let totalExpense = 0;
      const monthlyMap = {};
      const partyPending = {};

      (fetchedDeals || []).forEach((d) => {
        const month = d.deal_date?.slice(0, 7) || 'Unknown';
        if (!monthlyMap[month]) monthlyMap[month] = { purchases: 0, sales: 0, expenses: 0 };
        
        if (d.type === 'purchase') {
          totalPurchase += Number(d.total_amount || 0);
          monthlyMap[month].purchases += Number(d.total_amount || 0);
        } else if (d.type === 'sale') {
          totalSale += Number(d.total_amount || 0);
          monthlyMap[month].sales += Number(d.total_amount || 0);
        }

        const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const pending = Math.max(0, Number(d.total_amount || 0) - paid);

        if (pending > 0) {
          if (!partyPending[d.party_id]) {
            partyPending[d.party_id] = {
              party_id: d.party_id,
              party_name: d.parties?.name || 'Unknown',
              phone: d.parties?.phone || null,
              purchase: 0,
              sale: 0,
            };
          }
          if (d.type === 'purchase') partyPending[d.party_id].purchase += pending;
          if (d.type === 'sale') partyPending[d.party_id].sale += pending;
        }
      });

      (fetchedExpenses || []).forEach((ex) => {
        totalExpense += Number(ex.amount || 0);
        const month = ex.expense_date?.slice(0, 7) || 'Unknown';
        if (!monthlyMap[month]) monthlyMap[month] = { purchases: 0, sales: 0, expenses: 0 };
        monthlyMap[month].expenses = (monthlyMap[month].expenses || 0) + Number(ex.amount || 0);
      });

      const chartData = Object.entries(monthlyMap).map(([month, vals]) => ({
        name: month,
        purchases: vals.purchases,
        sales: vals.sales,
      }));

      const toPay = [];
      const toReceive = [];
      const allPendingParties = [];

      Object.values(partyPending).forEach((p) => {
        if (p.purchase > 0) toPay.push({ party_id: p.party_id, party_name: p.party_name, phone: p.phone, total_pending: p.purchase });
        if (p.sale > 0) toReceive.push({ party_id: p.party_id, party_name: p.party_name, phone: p.phone, total_pending: p.sale });
        const totalP = p.purchase + p.sale;
        if (totalP > 0) allPendingParties.push({ party_id: p.party_id, party_name: p.party_name, phone: p.phone, total_pending: totalP });
      });

      setParties(allPendingParties);
      setData({ 
        totalPurchase, 
        totalSale, 
        totalExpense, 
        net: totalSale - totalPurchase - totalExpense, 
        chartData, 
        toPay, 
        toReceive 
      });
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportPDF = () => {
    exportReportPDF(data, period, user?.business_name || user?.name);
    setShowExportMenu(false);
    showToast('📄 PDF downloaded!');
  };

  const handleExportExcel = () => {
    exportTransactionsExcel(deals, period);
    setShowExportMenu(false);
    showToast('📊 Excel downloaded!');
  };

  const totalPending = (data?.toPay?.reduce((s, p) => s + p.total_pending, 0) || 0) +
    (data?.toReceive?.reduce((s, p) => s + p.total_pending, 0) || 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">Reports 📊</h1>
          <div className="flex items-center gap-2">
            {/* Bulk Reminder */}
            {parties.length > 0 && (
              <button
                onClick={() => setShowReminders(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <MessageCircle size={13} /> Remind
              </button>
            )}

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl"
              >
                <Download size={13} /> Export <ChevronDown size={12} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-9 bg-white rounded-2xl shadow-xl border border-gray-100 min-w-[150px] z-20 overflow-hidden">
                  <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2">
                    <FileText size={14} className="text-red-500" /> PDF Report
                  </button>
                  <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2 border-t border-gray-50">
                    <Download size={14} className="text-green-600" /> Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                period === p.value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading reports..." />
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <p className="text-xs text-orange-500 font-bold uppercase mb-1">Purchase</p>
              <p className="text-xl font-black text-orange-700 font-mono-amount leading-tight">{formatAmount(data?.totalPurchase)}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-xs text-blue-500 font-bold uppercase mb-1">Sales</p>
              <p className="text-xl font-black text-blue-700 font-mono-amount leading-tight">{formatAmount(data?.totalSale)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-xs text-red-500 font-bold uppercase mb-1">Expenses</p>
              <p className="text-xl font-black text-red-600 font-mono-amount leading-tight">{formatAmount(data?.totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${data?.net >= 0 ? 'bg-green-600 border-green-500' : 'bg-red-600 border-red-500'}`}>
              <p className="text-xs font-bold uppercase mb-1 text-white opacity-80">Net Profit</p>
              <p className="text-xl font-black font-mono-amount leading-tight text-white">{formatAmount(data?.net)}</p>
            </div>
          </div>

          {/* Total pending banner */}
          {totalPending > 0 && (
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => setShowReminders(true)}
            >
              <div>
                <p className="text-white text-xs font-semibold opacity-90">Total Outstanding</p>
                <p className="text-white text-xl font-black">₹{formatAmount(totalPending)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-white text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <MessageCircle size={12} /> Send Reminders
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <BusinessChart data={data?.chartData} title="Purchase vs Sales" />

          {/* To Pay */}
          {data?.toPay?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span>🔴</span> Pending to Pay</h3>
              <div className="space-y-2">
                {data.toPay.map((p) => (
                  <div key={p.party_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{p.party_name}</p>
                      {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                    </div>
                    <p className="text-sm font-bold text-red-500 font-mono-amount">{formatAmount(p.total_pending)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* To Receive */}
          {data?.toReceive?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span>🟢</span> Pending to Receive</h3>
              <div className="space-y-2">
                {data.toReceive.map((p) => (
                  <div key={p.party_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{p.party_name}</p>
                      {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                    </div>
                    <p className="text-sm font-bold text-green-600 font-mono-amount">{formatAmount(p.total_pending)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loan Installments */}
          {loans.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span>🏦</span> Loan Installments</h3>
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-semibold text-gray-700 truncate">{loan.party_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {loan.loan_type} • {loan.direction}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <p className="text-sm font-black text-gray-900">₹{formatAmount(loan.principal)}</p>
                      <p className={`text-[10px] font-bold uppercase mb-1 ${
                        new Date(loan.next_installment_date) < new Date() ? 'text-red-500' : 'text-orange-500'
                      }`}>
                        {loan.next_installment_date ? `Next: ${new Date(loan.next_installment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'No Date'}
                      </p>
                      {loan.direction === 'given' && (
                        <a
                          href={`https://wa.me/${(loan.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Namaste ${loan.party_name} ji! 🙏\n\nVyaparBook Reminder: Aapka loan installment ₹${formatAmount(loan.principal)} ki date ${new Date(loan.next_installment_date).toLocaleDateString('en-IN')} hai. Please settle cheyyandi.\n\nDhanyawaad! 🙏`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <MessageCircle size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!data?.toPay?.length && !data?.toReceive?.length && loans.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-gray-500 font-medium">All clear!</p>
              <p className="text-gray-400 text-sm">No pending items for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Bulk Reminder Sheet */}
      {showReminders && (
        <BulkReminderSheet
          parties={parties}
          businessName={user?.business_name || user?.name || 'VyaparBook'}
          onClose={() => setShowReminders(false)}
          onUpdate={loadData}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 max-w-sm mx-auto px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold text-center z-50 animate-slide-up ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Reports;
