import { useState, useEffect, useCallback } from 'react';
import { supabase, getDetailedReports } from '../services/supabase';
import { exportReportPDF, exportTransactionsExcel } from '../services/exportService';
import BusinessChart from '../components/charts/BusinessChart';
import ProfitChart from '../components/charts/ProfitChart';
import BulkReminderSheet from '../components/reminders/BulkReminderSheet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatAmount } from '../utils/formatAmount';
import { FileText, Download, MessageCircle, ChevronDown, TrendingUp, DollarSign, Wallet, Package } from 'lucide-react';

const periods = [
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all' },
];

const Reports = ({ user }) => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [deals, setDeals] = useState([]);
  const [parties, setParties] = useState([]);
  const [loans, setLoans] = useState([]);
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

      // Parallel Data Fetching
      const [
        { data: fetchedDeals },
        { data: fetchedExpenses },
        { data: fetchedLoans },
        detailedChartData
      ] = await Promise.all([
        supabase.from('deals').select('id, party_id, type, total_amount, commodity, deal_date, parties(name, phone), payments(amount)').eq('user_id', user.id).gte('deal_date', fromDate || '2000-01-01').order('deal_date'),
        supabase.from('expenses').select('amount, expense_date').eq('user_id', user.id).gte('expense_date', fromDate || '2000-01-01'),
        supabase.from('loans').select('*').eq('user_id', user.id).eq('status', 'active').order('next_installment_date'),
        getDetailedReports(user.id)
      ]);

      setDeals(fetchedDeals || []);
      setLoans(fetchedLoans || []);
      setDetailedData(detailedChartData || []);

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

      const commodityStats = {};
      (fetchedDeals || []).forEach((d) => {
        const comm = (d.commodity || 'other').toLowerCase();
        if (!commodityStats[comm]) {
          commodityStats[comm] = { name: comm, purchase: 0, sale: 0, volume: 0, unit: d.unit };
        }
        if (d.type === 'purchase') {
          commodityStats[comm].purchase += Number(d.total_amount);
          commodityStats[comm].volume += Number(d.quantity);
        } else {
          commodityStats[comm].sale += Number(d.total_amount);
          commodityStats[comm].volume -= Number(d.quantity);
        }
      });

      const commodityProfit = Object.values(commodityStats).map(c => ({
        ...c,
        profit: c.sale - c.purchase
      })).sort((a, b) => b.profit - a.profit);

      setParties(allPendingParties);
      setData({ 
        totalPurchase, 
        totalSale, 
        totalExpense, 
        net: totalSale - totalPurchase - totalExpense, 
        chartData, 
        toPay, 
        toReceive,
        commodityProfit
      });
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    // Use a small delay or microtask to avoid cascading render warning
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
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
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 relative overflow-hidden">
              <DollarSign className="absolute -right-2 -bottom-2 w-16 h-16 text-orange-200/50" />
              <p className="text-xs text-orange-500 font-bold uppercase mb-1">Purchase</p>
              <p className="text-xl font-black text-orange-700 font-mono-amount leading-tight">{formatAmount(data?.totalPurchase)}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 relative overflow-hidden">
              <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-200/50" />
              <p className="text-xs text-blue-500 font-bold uppercase mb-1">Sales</p>
              <p className="text-xl font-black text-blue-700 font-mono-amount leading-tight">{formatAmount(data?.totalSale)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100 relative overflow-hidden">
              <Wallet className="absolute -right-2 -bottom-2 w-16 h-16 text-red-200/50" />
              <p className="text-xs text-red-500 font-bold uppercase mb-1">Expenses</p>
              <p className="text-xl font-black text-red-600 font-mono-amount leading-tight">{formatAmount(data?.totalExpense)}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm relative overflow-hidden ${data?.net >= 0 ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
              <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-white/20" />
              <p className="text-xs font-bold uppercase mb-1 text-white opacity-80">Net Profit</p>
              <p className="text-xl font-black font-mono-amount leading-tight text-white">{formatAmount(data?.net)}</p>
            </div>
          </div>

          {/* Charts */}
          <ProfitChart data={detailedData} title="Profit Trends" />
          
          {/* Commodity Profitability */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900 flex items-center gap-2 text-lg">
                <Package className="text-orange-500" size={20} /> Crop Profitability
              </h3>
            </div>
            <div className="space-y-3">
              {(data?.commodityProfit || []).map((cp) => (
                <div key={cp.name} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-black text-gray-900 capitalize">{cp.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Net Volume: {cp.volume} {cp.unit}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      cp.profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cp.profit >= 0 ? 'Profit' : 'Loss'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-lg font-black font-mono-amount ${
                      cp.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatAmount(cp.profit)}
                    </p>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Bought</p>
                        <p className="text-xs font-bold text-gray-600">{formatAmount(cp.purchase)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Sold</p>
                        <p className="text-xs font-bold text-gray-600">{formatAmount(cp.sale)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <BusinessChart data={data?.chartData} title="Purchase vs Sales Breakdown" />

          {/* Total pending banner */}
          {totalPending > 0 && (
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl px-4 py-4 flex items-center justify-between cursor-pointer shadow-lg shadow-orange-100"
              onClick={() => setShowReminders(true)}
            >
              <div>
                <p className="text-white text-[10px] font-bold uppercase opacity-80 tracking-wider">Total Outstanding</p>
                <p className="text-white text-2xl font-black">₹{formatAmount(totalPending)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-white text-xs font-black bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 backdrop-blur-sm border border-white/10">
                  <MessageCircle size={14} /> Remind All
                </div>
              </div>
            </div>
          )}

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
