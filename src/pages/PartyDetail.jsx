import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Plus, Banknote } from 'lucide-react';
import { getPartyById, getDealsByParty } from '../services/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AmountCard from '../components/common/AmountCard';
import { formatAmount } from '../utils/formatAmount';
import { formatDateLong, formatRelative } from '../utils/formatDate';

const typeEmoji = { purchase: '🛒', sale: '💰', payment: '💸' };
const typeColor = { purchase: 'bg-orange-100 text-orange-700', sale: 'bg-blue-100 text-blue-700' };

const PartyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: d }] = await Promise.all([
        getPartyById(id),
        getDealsByParty(id),
      ]);
      setParty(p);
      setDeals(d || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadData]);

  const calcDealPending = (deal) => {
    const paid = (deal.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    return Math.max(0, Number(deal.total_amount || 0) - paid);
  };

  const totalBusiness = deals.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const totalPaid = deals.reduce((s, d) => s + (d.payments || []).reduce((ps, p) => ps + Number(p.amount || 0), 0), 0);
  const totalPending = deals.reduce((s, d) => s + calcDealPending(d), 0);
  const isPurchase = deals[0]?.type === 'purchase';

  if (loading) return <LoadingSpinner fullScreen text="Loading party..." />;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-500 px-4 pt-12 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-green-100 text-sm mb-4"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm border border-white/20">
            {party?.type === 'farmer' ? '🌾' : party?.type === 'mill' ? '🏭' : party?.type === 'transport' ? '🚛' : '👤'}
          </div>
          <div>
            <h1 className="text-white text-xl font-black">{party?.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full capitalize">
                {party?.type}
              </span>
              {party?.phone && (
                <a
                  href={`tel:${party.phone}`}
                  className="flex items-center gap-1 text-green-100 text-xs"
                >
                  <Phone size={11} />
                  {party.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <AmountCard label="📊 Total Business" amount={totalBusiness} variant="neutral" size="sm" />
            <AmountCard label="✅ Total Paid" amount={totalPaid} variant="success" size="sm" />
          </div>
          {totalPending > 0 && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${isPurchase ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div>
                <p className={`text-xs font-semibold ${isPurchase ? 'text-red-500' : 'text-green-600'}`}>
                  {isPurchase ? '🔴 You owe them' : '🟢 They owe you'}
                </p>
                <p className={`text-2xl font-black font-mono-amount ${isPurchase ? 'text-red-600' : 'text-green-700'}`}>
                  {formatAmount(totalPending)}
                </p>
              </div>
              <div className="text-3xl">{isPurchase ? '💸' : '💰'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-4 flex gap-3">
        <button
          onClick={() => navigate(`/deals/add?party=${id}`)}
          className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200"
        >
          <Plus size={16} />
          Add Deal
        </button>
        <button
          onClick={() => navigate(`/payments/add?party=${id}`)}
          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Banknote size={16} />
          Add Payment
        </button>
      </div>

      {/* Deals List */}
      <div className="px-4 mt-5">
        <h2 className="text-base font-bold text-gray-800 mb-3">Deals ({deals.length})</h2>
        {deals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No deals yet for this party</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => {
              const pending = calcDealPending(deal);
              const isPaid = pending <= 0;

              return (
                <div
                  key={deal.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor[deal.type] || 'bg-gray-100 text-gray-600'}`}>
                          {typeEmoji[deal.type]} {deal.type}
                        </span>
                        <span className="text-xs text-gray-400">{formatRelative(deal.deal_date)}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-base capitalize">
                        {deal.commodity}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {deal.quantity} {deal.unit}
                        {deal.rate > 0 && ` @ ₹${Number(deal.rate).toLocaleString('en-IN')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-base font-mono-amount">
                        {formatAmount(deal.total_amount)}
                      </p>
                      {isPaid ? (
                        <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                          ✅ Paid
                        </span>
                      ) : (
                        <p className="text-red-500 text-xs font-semibold">
                          Pending: {formatAmount(pending)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payments */}
                  {deal.payments && deal.payments.length > 0 && (
                    <div className="border-t border-gray-50 pt-2 mt-2 space-y-1">
                      {deal.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            💳 {p.payment_mode} • {formatDateLong(p.payment_date)}
                          </p>
                          <p className="text-xs text-green-600 font-semibold">
                            +{formatAmount(p.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyDetail;
