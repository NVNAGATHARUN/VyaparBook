import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { getParties, createDealAtomic } from '../../services/supabase';
import { formatAmount } from '../../utils/formatAmount';

const UNITS = ['bags', 'lorry', 'quintal', 'ton', 'kg'];
const COMMODITIES = ['paddy', 'rice', 'wheat', 'maize', 'jowar'];

/**
 * QuickAddDeal — compact inline deal entry for the Home tab bar.
 * Keyboard-driven: Tab cycles between fields. Auto-calc total from qty×rate.
 */
const QuickAddDeal = ({ user, onSaved }) => {
  const [parties, setParties] = useState([]);
  const [partySearch, setPartySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({
    party_id: '',
    party_name: '',
    type: 'purchase',
    commodity: 'paddy',
    quantity: '',
    unit: 'bags',
    rate: '',
    total_amount: '',
    advance_paid: '',
    deal_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const partyRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getParties(user.id).then(({ data }) => setParties(data || []));
  }, [user]);

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  const handleChange = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? value : form.quantity;
      const r = field === 'rate' ? value : form.rate;
      if (q && r) next.total_amount = String(Math.round(Number(q) * Number(r)));
    }
    setError('');
    setForm(next);
  };

  const pending = Math.max(0, Number(form.total_amount || 0) - Number(form.advance_paid || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_id) { setError('Select a party'); return; }
    if (!form.total_amount || Number(form.total_amount) <= 0) { setError('Enter total amount'); return; }

    setSaving(true);
    setError('');
    try {
      const { error: dErr } = await createDealAtomic({
        party_id: form.party_id,
        type: form.type,
        commodity: form.commodity,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        rate: Number(form.rate) || 0,
        total_amount: Number(form.total_amount),
        advance_paid: Number(form.advance_paid) || 0,
        deal_date: form.deal_date,
        source: 'pwa',
        payment_mode: 'cash',
      });
      
      if (dErr) throw new Error(dErr.message);

      // Flash success, reset form
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setForm({
          party_id: '', party_name: '', type: 'purchase',
          commodity: 'paddy', quantity: '', unit: 'bags',
          rate: '', total_amount: '', advance_paid: '',
          deal_date: new Date().toISOString().split('T')[0],
        });
        setPartySearch('');
        partyRef.current?.focus();
        onSaved?.();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce-once">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <p className="text-green-700 font-bold text-lg">Deal Saved! ✅</p>
        <p className="text-gray-400 text-sm">Refreshing dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Deal Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        {['purchase', 'sale'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleChange('type', t)}
            className={`py-2.5 rounded-2xl font-bold text-sm transition-all ${
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

      {/* Party search */}
      <div className="relative">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Party *</label>
        <input
          ref={partyRef}
          type="text"
          value={partySearch}
          onChange={(e) => {
            setPartySearch(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) handleChange('party_id', '');
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search party..."
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-green-500 transition-colors"
        />
        {showDropdown && partySearch && filteredParties.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-36 overflow-y-auto">
            {filteredParties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  handleChange('party_id', p.id);
                  setPartySearch(p.name);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0"
              >
                <span className="font-semibold text-gray-800">{p.name}</span>
                <span className="text-gray-400 text-xs ml-2">{p.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Commodity chips */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Commodity</label>
        <div className="flex flex-wrap gap-1.5">
          {COMMODITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleChange('commodity', c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                form.commodity === c ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Qty + Unit + Rate + Total (2×2 grid) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Qty</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            placeholder="0"
            min="0"
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Unit</label>
          <select
            value={form.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Rate (₹/unit)</label>
          <input
            type="number"
            value={form.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            placeholder="0"
            min="0"
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Total (₹)</label>
          <input
            type="number"
            value={form.total_amount}
            onChange={(e) => handleChange('total_amount', e.target.value)}
            placeholder="Auto"
            min="0"
            className="w-full border-2 border-green-300 bg-green-50 rounded-2xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Advance + Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Advance (₹)</label>
          <input
            type="number"
            value={form.advance_paid}
            onChange={(e) => handleChange('advance_paid', e.target.value)}
            placeholder="0"
            min="0"
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Date</label>
          <input
            type="date"
            value={form.deal_date}
            onChange={(e) => handleChange('deal_date', e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Pending preview */}
      {pending > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-red-500 font-semibold">🔴 Will be pending:</span>
          <span className="text-sm font-black text-red-600">{formatAmount(pending)}</span>
        </div>
      )}

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60 mt-1"
      >
        {saving
          ? <><Loader2 size={16} className="animate-spin" />Saving...</>
          : '💾 Save Deal'
        }
      </button>
    </form>
  );
};

export default QuickAddDeal;
