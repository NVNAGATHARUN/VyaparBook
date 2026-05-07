import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { updateDeal } from '../../services/supabase';

const units = ['bags', 'lorry', 'quintal', 'ton', 'kg'];
const commodities = ['paddy', 'rice', 'wheat', 'maize', 'jowar', 'other'];

const DealEditModal = ({ deal, onClose, onSaved }) => {
  const [form, setForm] = useState({
    commodity: deal.commodity || '',
    quantity: deal.quantity || '',
    unit: deal.unit || 'bags',
    rate: deal.rate || '',
    total_amount: deal.total_amount || '',
    deal_date: deal.deal_date || new Date().toISOString().split('T')[0],
    notes: deal.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? value : form.quantity;
      const r = field === 'rate' ? value : form.rate;
      if (q && r) next.total_amount = String(Math.round(Number(q) * Number(r)));
    }
    setForm(next);
  };

  const handleSave = async () => {
    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setError('Total amount is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: err } = await updateDeal(deal.id, {
        commodity: form.commodity,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        rate: Number(form.rate) || 0,
        total_amount: Number(form.total_amount),
        deal_date: form.deal_date,
        notes: form.notes || null,
      });
      if (err) throw new Error(err.message);
      onSaved();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">Edit Deal ✏️</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {deal.type?.toUpperCase()} • {deal.parties?.name || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Commodity chips */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">
              Commodity
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {commodities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleChange('commodity', c)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                    form.commodity === c
                      ? 'bg-green-500 text-white shadow-sm'
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
              onChange={(e) => handleChange('commodity', e.target.value)}
              placeholder="Or type custom..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>

          {/* Qty & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 bg-white"
              >
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Rate & Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Rate (₹/unit)</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                placeholder="0"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Total (₹)</label>
              <input
                type="number"
                value={form.total_amount}
                onChange={(e) => handleChange('total_amount', e.target.value)}
                className="w-full border-2 border-green-300 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-green-500 bg-green-50"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Deal Date</label>
            <input
              type="date"
              value={form.deal_date}
              onChange={(e) => handleChange('deal_date', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" />Saving...</>
              : <><Save size={16} />Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealEditModal;
