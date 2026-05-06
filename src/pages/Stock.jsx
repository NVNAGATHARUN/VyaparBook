import React, { useState, useEffect } from 'react';
import { getStock } from '../services/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';

const commodityEmoji = {
  paddy: '🌾',
  rice: '🍚',
  wheat: '🌿',
  maize: '🌽',
  jowar: '🌾',
  other: '📦',
};

const getStockStatus = (current, total) => {
  if (total === 0) return { color: 'text-gray-400', bg: 'bg-gray-50', badge: 'text-gray-400', label: 'No Stock' };
  const pct = current / total;
  if (pct > 0.5) return { color: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', label: 'Good' };
  if (pct > 0.2) return { color: 'text-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', label: 'Low' };
  return { color: 'text-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', label: 'Critical' };
};

const Stock = ({ user }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await getStock(user.id);
      setStocks(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <LoadingSpinner fullScreen text="Loading stock..." />;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-500 px-4 pt-12 pb-8">
        <h1 className="text-2xl font-black text-white">Stock Tracker 📦</h1>
        <p className="text-green-100 text-sm mt-1">Real-time inventory from your deals</p>
      </div>

      {/* Total Summary */}
      {stocks.length > 0 && (
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 mb-3">TOTAL COMMODITIES: {stocks.length}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-orange-500 font-semibold">Purchased</p>
                <p className="text-base font-black text-orange-600">
                  {stocks.reduce((s, st) => s + Number(st.total_purchased || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500 font-semibold">Sold</p>
                <p className="text-base font-black text-blue-600">
                  {stocks.reduce((s, st) => s + Number(st.total_sold || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-600 font-semibold">In Stock</p>
                <p className="text-base font-black text-green-700">
                  {stocks.reduce((s, st) => s + Number(st.current_stock || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Items */}
      <div className="px-4 mt-5 space-y-3">
        {stocks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500 font-medium">No stock data yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Stock is auto-tracked when you add deals
            </p>
          </div>
        ) : (
          stocks.map((stock) => {
            const status = getStockStatus(
              Number(stock.current_stock),
              Number(stock.total_purchased)
            );
            const pct = stock.total_purchased > 0
              ? Math.min(100, Math.max(0, (stock.current_stock / stock.total_purchased) * 100))
              : 0;

            return (
              <div
                key={stock.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-2xl">
                      {commodityEmoji[stock.commodity?.toLowerCase()] || '📦'}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 capitalize text-base">
                        {stock.commodity}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black font-mono-amount ${status.color}`}>
                      {Number(stock.current_stock).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">{stock.unit} in stock</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-orange-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-orange-50 rounded-xl py-2">
                    <p className="text-xs text-orange-500 font-semibold">Purchased</p>
                    <p className="text-sm font-bold text-orange-700">
                      {Number(stock.total_purchased).toLocaleString('en-IN')} {stock.unit}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl py-2">
                    <p className="text-xs text-blue-500 font-semibold">Sold</p>
                    <p className="text-sm font-bold text-blue-700">
                      {Number(stock.total_sold).toLocaleString('en-IN')} {stock.unit}
                    </p>
                  </div>
                  <div className={`${status.bg} rounded-xl py-2`}>
                    <p className={`text-xs font-semibold ${status.color}`}>In Stock</p>
                    <p className={`text-sm font-bold ${status.color}`}>
                      {Number(stock.current_stock).toLocaleString('en-IN')} {stock.unit}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Stock;
