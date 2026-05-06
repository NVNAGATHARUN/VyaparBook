import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronRight, Users } from 'lucide-react';
import { useParties } from '../hooks/useParties';
import { createParty } from '../services/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatAmount } from '../utils/formatAmount';

const typeEmoji = {
  farmer: '🌾',
  mill: '🏭',
  transport: '🚛',
  dealer: '🤝',
  other: '👤',
};

const typeLabels = {
  farmer: 'Farmer',
  mill: 'Mill',
  transport: 'Transport',
  dealer: 'Dealer',
  other: 'Other',
};

const Parties = ({ user }) => {
  const navigate = useNavigate();
  const { parties, partySummary, loading, refetch } = useParties(user?.id);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParty, setNewParty] = useState({ name: '', phone: '', type: 'other' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = parties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  );

  const handleAddParty = async (e) => {
    e.preventDefault();
    if (!newParty.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: err } = await createParty({
        user_id: user.id,
        name: newParty.name.trim(),
        phone: newParty.phone.trim() || null,
        type: newParty.type,
      });
      if (err) throw new Error(err.message);
      setShowAddModal(false);
      setNewParty({ name: '', phone: '', type: 'other' });
      await refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getPendingInfo = (partyId) => {
    const s = partySummary[partyId];
    if (!s) return null;
    const pending = Number(s.total_pending || 0);
    if (pending === 0) return null;
    return { amount: pending, isWeOwe: s.deal_type === 'purchase' };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">Parties 👥</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-md shadow-green-200"
          >
            <Plus size={20} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parties..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <LoadingSpinner text="Loading parties..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {search ? 'No parties found' : 'No parties yet'}
            </p>
            {!search && (
              <p className="text-gray-400 text-sm mt-1">
                Add parties manually or use voice to auto-create them
              </p>
            )}
            {!search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-green-200"
              >
                + Add First Party
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((party) => {
              const pending = getPendingInfo(party.id);
              return (
                <div
                  key={party.id}
                  onClick={() => navigate(`/parties/${party.id}`)}
                  className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center text-xl">
                    {typeEmoji[party.type] || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base truncate">{party.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                        {typeLabels[party.type] || 'Other'}
                      </span>
                      {party.phone && (
                        <span className="text-xs text-gray-400">{party.phone}</span>
                      )}
                    </div>
                    {pending && (
                      <p
                        className={`text-sm font-bold mt-1 ${
                          pending.isWeOwe ? 'text-red-500' : 'text-green-600'
                        }`}
                      >
                        {pending.isWeOwe ? '🔴 You owe: ' : '🟢 They owe: '}
                        {formatAmount(pending.amount)}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Party</h3>

            <form onSubmit={handleAddParty} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={newParty.name}
                  onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                  placeholder="Ravi Kumar"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone (optional)</label>
                <input
                  type="tel"
                  value={newParty.phone}
                  onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(typeLabels).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewParty({ ...newParty, type: val })}
                      className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                        newParty.type === val
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {typeEmoji[val]} {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm">⚠️ {error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-gray-600 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-semibold text-sm shadow-md shadow-green-200 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;
