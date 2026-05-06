import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import BusinessChart from '../components/charts/BusinessChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatAmount } from '../utils/formatAmount';

const periods = [
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all' },
];

const Reports = ({ user }) => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Date range
        const now = new Date();
        let fromDate = null;
        if (period === 'month') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
        } else if (period === 'week') {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          fromDate = d.toISOString().split('T')[0];
        }

        let query = supabase
          .from('deals')
          .select('type, total_amount, commodity, deal_date, parties(name)')
          .eq('user_id', user.id);

        if (fromDate) {
          query = query.gte('deal_date', fromDate);
        }

        const { data: deals } = await query.order('deal_date');

        let totalPurchase = 0;
        let totalSale = 0;
        const monthlyMap = {};

        (deals || []).forEach((d) => {
          const month = d.deal_date?.slice(0, 7) || 'Unknown';
          if (!monthlyMap[month]) monthlyMap[month] = { purchases: 0, sales: 0 };
          if (d.type === 'purchase') {
            totalPurchase += Number(d.total_amount || 0);
            monthlyMap[month].purchases += Number(d.total_amount || 0);
          } else if (d.type === 'sale') {
            totalSale += Number(d.total_amount || 0);
            monthlyMap[month].sales += Number(d.total_amount || 0);
          }
        });

        const chartData = Object.entries(monthlyMap).map(([month, vals]) => ({
          name: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          purchases: vals.purchases,
          sales: vals.sales,
        }));

        // Pending by party
        const { data: partySummaryData } = await supabase
          .from('party_summary')
          .select('*')
          .eq('user_id', user.id);

        const toPay = (partySummaryData || [])
          .filter((p) => p.deal_type === 'purchase' && Number(p.total_pending) > 0)
          .sort((a, b) => Number(b.total_pending) - Number(a.total_pending));

        const toReceive = (partySummaryData || [])
          .filter((p) => p.deal_type === 'sale' && Number(p.total_pending) > 0)
          .sort((a, b) => Number(b.total_pending) - Number(a.total_pending));

        setData({
          totalPurchase,
          totalSale,
          net: totalSale - totalPurchase,
          chartData,
          toPay,
          toReceive,
        });
      } catch (err) {
        console.error('Reports error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, period]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">Reports 📊</h1>
        </div>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                period === p.value
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500'
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
              <p className="text-xs text-orange-500 font-semibold mb-1">Purchase</p>
              <p className="text-base font-black text-orange-700 font-mono-amount leading-tight">
                {formatAmount(data?.totalPurchase)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-100">
              <p className="text-xs text-blue-500 font-semibold mb-1">Sales</p>
              <p className="text-base font-black text-blue-700 font-mono-amount leading-tight">
                {formatAmount(data?.totalSale)}
              </p>
            </div>
            <div className={`rounded-2xl p-3 text-center border ${data?.net >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold mb-1 ${data?.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>Net</p>
              <p className={`text-base font-black font-mono-amount leading-tight ${data?.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatAmount(Math.abs(data?.net || 0))}
              </p>
            </div>
          </div>

          {/* Chart */}
          <BusinessChart data={data?.chartData} title="Purchase vs Sales" />

          {/* To Pay */}
          {data?.toPay?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🔴</span> Pending to Pay
              </h3>
              <div className="space-y-2">
                {data.toPay.map((p) => (
                  <div key={p.party_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-semibold text-gray-700">{p.party_name}</p>
                    <p className="text-sm font-bold text-red-500 font-mono-amount">
                      {formatAmount(p.total_pending)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* To Receive */}
          {data?.toReceive?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>🟢</span> Pending to Receive
              </h3>
              <div className="space-y-2">
                {data.toReceive.map((p) => (
                  <div key={p.party_id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-semibold text-gray-700">{p.party_name}</p>
                    <p className="text-sm font-bold text-green-600 font-mono-amount">
                      {formatAmount(p.total_pending)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!data?.toPay?.length && !data?.toReceive?.length && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-gray-500 font-medium">All clear!</p>
              <p className="text-gray-400 text-sm">No pending amounts for this period</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
