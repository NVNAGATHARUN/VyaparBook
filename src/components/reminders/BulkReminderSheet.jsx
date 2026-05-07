import { useState } from 'react';
import { X, MessageCircle, CheckSquare, Square, Send, AlertCircle, Edit2 } from 'lucide-react';
import { formatAmount } from '../../utils/formatAmount';
import { updateParty } from '../../services/supabase';

/**
 * BulkReminderSheet
 * Shows a bottom sheet with all parties that have pending amounts.
 * User selects parties and sends WhatsApp reminders one-by-one via wa.me deep links.
 */
const BulkReminderSheet = ({ parties, onClose, onUpdate, businessName = 'VyaparBook' }) => {
  // parties: [{ party_id, party_name, total_pending, phone? }]
  const [selected, setSelected] = useState(new Set());
  const [sent, setSent] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Editing phone state
  const [editingId, setEditingId] = useState(null);
  const [newPhone, setNewPhone] = useState('');
  const [updating, setUpdating] = useState(false);

  const withPhone = parties.filter((p) => p.phone);
  const withoutPhone = parties.filter((p) => !p.phone);

  const toggleAll = () => {
    if (selected.size === withPhone.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(withPhone.map((p) => p.party_id)));
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const buildMessage = (party) => {
    return (
      `Namaste ${party.party_name} ji! 🙏\n\n` +
      `VyaparBook se ek friendly reminder:\n` +
      `💰 Outstanding balance: *₹${formatAmount(party.total_pending)}*\n\n` +
      `Aapka payment jaldi settle karna request hai.\n` +
      `Dhanyawaad! 🙏\n\n` +
      `— ${businessName}`
    );
  };

  const handleSendAll = async () => {
    const selectedParties = withPhone.filter((p) => selected.has(p.party_id));
    if (selectedParties.length === 0) return;

    setSending(true);
    setCurrentIdx(0);

    // Open WhatsApp for each party with 800ms gap
    for (let i = 0; i < selectedParties.length; i++) {
      const party = selectedParties[i];
      setCurrentIdx(i);

      const clean = (party.phone || '').replace(/\D/g, '');
      const url = `https://wa.me/${clean}?text=${encodeURIComponent(buildMessage(party))}`;

      // Slight delay so browser doesn't block multiple popups
      await new Promise((res) => setTimeout(res, i === 0 ? 0 : 1200));
      window.open(url, '_blank');

      setSent((prev) => new Set([...prev, party.party_id]));
    }

    setSending(false);
  };

  const handleUpdatePhone = async (partyId) => {
    if (!newPhone || newPhone.length < 10) return;
    setUpdating(true);
    try {
      const { error } = await updateParty(partyId, { phone: newPhone });
      if (error) throw error;
      setEditingId(null);
      setNewPhone('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error updating phone: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const selectedList = withPhone.filter((p) => selected.has(p.party_id));
  const totalSelected = selectedList.reduce((s, p) => s + p.total_pending, 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col max-h-[85vh] relative z-[101]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <MessageCircle size={20} className="text-emerald-500" />
              Send Reminders
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selected.size} selected — ₹{formatAmount(totalSelected)} total
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Select All */}
        {withPhone.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-50 shrink-0">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-semibold text-green-600"
            >
              {selected.size === withPhone.length
                ? <CheckSquare size={18} className="text-green-500" />
                : <Square size={18} className="text-gray-400" />
              }
              {selected.size === withPhone.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        )}

        {/* Party List */}
        <div className="overflow-y-auto flex-1 px-5 py-2">

          {withPhone.length === 0 && withoutPhone.length === 0 && (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-gray-400 text-sm">No pending parties!</p>
            </div>
          )}

          {withPhone.map((party) => {
            const isSelected = selected.has(party.party_id);
            const isSent = sent.has(party.party_id);
            return (
              <button
                key={party.party_id}
                onClick={() => !isSent && toggle(party.party_id)}
                disabled={isSent}
                className={`w-full flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-0 transition-colors text-left ${
                  isSent ? 'opacity-60' : 'hover:bg-green-50 rounded-xl px-2'
                }`}
              >
                {isSent ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : isSelected ? (
                  <CheckSquare size={20} className="text-green-500 shrink-0" />
                ) : (
                  <Square size={20} className="text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{party.party_name}</p>
                  <p className="text-xs text-gray-400">{party.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-500">
                    ₹{formatAmount(party.total_pending)}
                  </p>
                  {isSent && <p className="text-xs text-green-600 font-semibold">Sent ✓</p>}
                </div>
              </button>
            );
          })}

          {/* Parties without phone */}
          {withoutPhone.length > 0 && (
            <div className="mt-3 mb-6">
              <div className="flex items-center gap-2 mb-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
                <AlertCircle size={14} className="text-orange-500" />
                <p className="text-xs text-orange-600 font-semibold">
                  {withoutPhone.length} parties without phone — add their number to send reminders
                </p>
              </div>
              {withoutPhone.map((party) => (
                <div key={party.party_id} className="flex flex-col gap-2 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Square size={20} className="text-gray-300 shrink-0 opacity-40" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-700 text-sm truncate">{party.party_name}</p>
                      <p className="text-xs text-gray-400">No phone number</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">₹{formatAmount(party.total_pending)}</p>
                      {editingId !== party.party_id && (
                        <button
                          onClick={() => {
                            setEditingId(party.party_id);
                            setNewPhone('');
                          }}
                          className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-lg font-bold mt-1"
                        >
                          + Add Number
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {editingId === party.party_id && (
                    <div className="flex items-center gap-2 mt-1 animate-in slide-in-from-top-2">
                      <input
                        type="tel"
                        autoFocus
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500"
                      />
                      <button
                        onClick={() => handleUpdatePhone(party.party_id)}
                        disabled={updating || !newPhone}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        {updating ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 text-xs font-bold px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {sending && (
            <p className="text-center text-sm text-gray-500 mb-2">
              Sending {currentIdx + 1} of {selected.size}... WhatsApp will open for each 📱
            </p>
          )}
          <button
            onClick={handleSendAll}
            disabled={selected.size === 0 || sending}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {sending
              ? `Opening WhatsApp...`
              : `Send ${selected.size} Reminder${selected.size !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkReminderSheet;
