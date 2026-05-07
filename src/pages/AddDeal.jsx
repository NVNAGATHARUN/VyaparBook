import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getParties, createDeal, createPayment, upsertStock } from '../services/supabase';
import { todayISO } from '../utils/formatDate';

const units = ['bags', 'lorry', 'quintal', 'ton', 'kg'];
const commodities = ['paddy', 'rice', 'wheat', 'maize', 'jowar', 'other'];

const AddDeal = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPartyId = searchParams.get('party');

  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({
    party_id: defaultPartyId || '',
    type: 'purchase',
    commodity: 'paddy',
    quantity: '',
    unit: 'bags',
    rate: '',
    total_amount: '',
    advance_paid: '',
    deal_date: todayISO(),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await getParties(user.id);
      setParties(data || []);
      if (defaultPartyId && data) {
        const p = data.find((p) => p.id === defaultPartyId);
        if (p) setPartySearch(p.name);
      }
    };
    load();
  }, [user, defaultPartyId]);

  // Auto-calculate total
  const handleFieldChange = (field, value) => {
    const newForm = { ...form, [field]: value };

    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? value : form.quantity;
      const r = field === 'rate' ? value : form.rate;
      if (q && r) {
        newForm.total_amount = String(Math.round(Number(q) * Number(r)));
      }
    }

    if (field === 'total_amount' || field === 'advance_paid') {
      // Just update
    }

    setForm(newForm);
  };

  const pending = Math.max(
    0,
    Number(form.total_amount || 0) - Number(form.advance_paid || 0)
  );

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.party_id) { setError('Please select a party'); return; }
    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setError('Please enter total amount');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: deal, error: dealErr } = await createDeal({
        user_id: user.id,
        party_id: form.party_id,
        type: form.type,
        commodity: form.commodity,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        rate: Number(form.rate) || 0,
        total_amount: Number(form.total_amount),
        deal_date: form.deal_date,
      });

      if (dealErr) throw new Error(dealErr.message);

      if (Number(form.advance_paid) > 0) {
        await createPayment({
          deal_id: deal.id,
          user_id: user.id,
          amount: Number(form.advance_paid),
          payment_mode: 'cash',
          payment_date: form.deal_date,
        });
      }

      if (form.commodity && Number(form.quantity) > 0) {
        await upsertStock(
          user.id,
          form.commodity,
          form.unit,
          Number(form.quantity),
          form.type
        );
      }

      navigate(-1);
    } catch (err) {
      setError(err.message || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Add Deal 📝</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-4">
        {/* Deal Type */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Deal Type</label>
          <div className="grid grid-cols-2 gap-3">
            {['purchase', 'sale'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`py-3 rounded-2xl font-bold text-sm transition-all ${
                  form.type === t
                    ? t === 'purchase'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'bg-blue-500 text-white shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t === 'purchase' ? '🛒 Purchase' : '💰 Sale'}
              </button>
            ))}
          </div>
        </div>

        {/* Party */}
        <div className="relative">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Party *</label>
          <input
            type="text"
            value={partySearch}
            onChange={(e) => {
              setPartySearch(e.target.value);
              setShowPartyDropdown(true);
              if (!e.target.value) setForm({ ...form, party_id: '' });
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
                    setForm({ ...form, party_id: p.id });
                    setPartySearch(p.name);
                    setShowPartyDropdown(false);
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

        {/* Commodity */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Commodity</label>
          <div className="flex flex-wrap gap-2">
            {commodities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, commodity: c })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                  form.commodity === c
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={commodities.includes(form.commodity) ? '' : form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
            placeholder="Or type custom..."
            className="mt-2 w-full border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Quantity</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => handleFieldChange('quantity', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors bg-white"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rate & Total */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Rate (₹ per unit)</label>
            <input
              type="number"
              value={form.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Total Amount (₹)</label>
            <input
              type="number"
              value={form.total_amount}
              onChange={(e) => handleFieldChange('total_amount', e.target.value)}
              placeholder="Auto-calculated"
              min="0"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors font-bold"
            />
          </div>
        </div>

        {/* Advance & Pending */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Advance Paid (₹)</label>
          <input
            type="number"
            value={form.advance_paid}
            onChange={(e) => handleFieldChange('advance_paid', e.target.value)}
            placeholder="0"
            min="0"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
          />
          {pending > 0 && (
            <p className="text-red-500 text-sm mt-1.5 font-semibold">
              🔴 Pending: ₹{pending.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="text-sm font-bold text-gray-700 mb-2 block">Date</label>
          <input
            type="date"
            value={form.deal_date}
            onChange={(e) => setForm({ ...form, deal_date: e.target.value })}
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
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving Deal...
            </>
          ) : (
            '💾 Save Deal'
          )}
        </button>
      </form>
    </div>
  );
};

export default AddDeal;
