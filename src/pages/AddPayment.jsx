import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getParties, getDealsByParty, createPayment } from '../services/supabase';
import { todayISO } from '../utils/formatDate';
import { formatAmount } from '../utils/formatAmount';

const paymentModes = ['cash', 'upi', 'bank', 'cheque', 'credit'];
const modeEmoji = { cash: '💵', upi: '📱', bank: '🏦', cheque: '📄', credit: '💳' };

const AddPayment = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPartyId = searchParams.get('party');

  const [parties, setParties] = useState([]);
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState({
    party_id: defaultPartyId || '',
    deal_id: '',
    amount: '',
    payment_mode: 'cash',
    reference_id: '',
    payment_date: todayISO(),
  });
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDeals = useCallback(async (partyId) => {
    const { data } = await getDealsByParty(partyId);
    // Filter deals with pending amounts
    const openDeals = (data || []).filter((d) => {
      const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      return Number(d.total_amount) - paid > 0;
    });
    setDeals(openDeals);
    if (openDeals.length > 0 && !form.deal_id) {
      setForm(prev => ({ ...prev, deal_id: openDeals[0].id }));
    }
  }, [form.deal_id]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await getParties(user.id);
      setParties(data || []);
      if (defaultPartyId && data) {
        const p = data.find((p) => p.id === defaultPartyId);
        if (p) {
          setPartySearch(p.name);
          loadDeals(defaultPartyId);
        }
      }
    };
    load();
  }, [user, defaultPartyId, loadDeals]);

  const getDealPending = (deal) => {
    const paid = (deal.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    return Math.max(0, Number(deal.total_amount) - paid);
  };

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_id) { setError('Please select a party'); return; }
    if (!form.deal_id) { setError('Please select a pending deal for this payment'); return; }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: payErr } = await createPayment({
        user_id: user.id,
        deal_id: form.deal_id || null,
        amount: Number(form.amount),
        payment_mode: form.payment_mode,
        reference_id: form.reference_id || null,
        payment_date: form.payment_date,
      });

      if (payErr) throw new Error(payErr.message);
      navigate('/', { state: { refresh: true } });
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Add Payment 💳</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        {/* Party */}
        <div className="relative">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Party *</label>
          <input
            type="text"
            value={partySearch}
            onChange={(e) => {
              setPartySearch(e.target.value);
              setShowPartyDropdown(true);
              if (!e.target.value) {
                setForm({ ...form, party_id: '', deal_id: '' });
                setDeals([]);
              }
            }}
            onFocus={() => setShowPartyDropdown(true)}
            placeholder="Search party..."
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
          />
          {showPartyDropdown && partySearch && filteredParties.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-40 overflow-y-auto">
              {filteredParties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, party_id: p.id, deal_id: '' });
                    setPartySearch(p.name);
                    setShowPartyDropdown(false);
                    loadDeals(p.id);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0"
                >
                  <span className="font-semibold text-gray-800">{p.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{p.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Deal selection */}
        {deals.length > 0 && (
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Select Deal *</label>
            <div className="space-y-2">
              {deals.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setForm({ ...form, deal_id: d.id === form.deal_id ? '' : d.id })}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-colors ${
                    form.deal_id === d.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 capitalize">
                        {d.commodity} • {d.quantity} {d.unit}
                      </p>
                      <p className="text-xs text-gray-400">Total: {formatAmount(d.total_amount)}</p>
                    </div>
                    <p className="text-sm font-bold text-red-500">
                      Pending: {formatAmount(getDealPending(d))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!deals.length && partySearch && form.party_id && (
          <p className="text-sm font-semibold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-200">
            ⚠️ No pending deals found for this party. Please create a deal first.
          </p>
        )}

        {/* Amount */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Amount (₹) *</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Enter amount"
            min="1"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Payment Mode */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Payment Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {paymentModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm({ ...form, payment_mode: mode })}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                  form.payment_mode === mode
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {modeEmoji[mode]} {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        {['upi', 'bank', 'cheque'].includes(form.payment_mode) && (
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Reference ID (optional)
            </label>
            <input
              type="text"
              value={form.reference_id}
              onChange={(e) => setForm({ ...form, reference_id: e.target.value })}
              placeholder="UPI ID / Cheque No / Transaction ID"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Date</label>
          <input
            type="date"
            value={form.payment_date}
            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">⚠️ {error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving...</>
          ) : (
            '💾 Save Payment'
          )}
        </button>
      </form>
    </div>
  );
};

export default AddPayment;
