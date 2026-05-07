import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Plus, Banknote, FileText, Download,
  MoreVertical, Edit3, Trash2, MessageCircle, Share2,
} from 'lucide-react';
import { getPartyById, getDealsByParty, softDeleteDeal } from '../services/supabase';
import { exportPartyLedgerPDF, exportPartyLedgerExcel } from '../services/exportService';
import DealEditModal from '../components/deals/DealEditModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AmountCard from '../components/common/AmountCard';
import { formatAmount } from '../utils/formatAmount';
import { formatDateLong, formatRelative } from '../utils/formatDate';

const typeEmoji = { purchase: '🛒', sale: '💰', payment: '💸' };
const typeColor = { purchase: 'bg-orange-100 text-orange-700', sale: 'bg-blue-100 text-blue-700' };

const PartyDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit / Delete state
  const [editingDeal, setEditingDeal] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Export menu
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: d }] = await Promise.all([
        getPartyById(id),
        getDealsByParty(id),
      ]);
      setParty(p);
      // Filter soft-deleted deals
      setDeals((d || []).filter(deal => !deal.is_deleted));
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
    const paid = (deal.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return Math.max(0, Number(deal.total_amount || 0) - paid);
  };

  const totalBusiness = deals.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const totalPaid = deals.reduce((s, d) => s + (d.payments || []).reduce((ps, p) => ps + Number(p.amount || 0), 0), 0);
  const totalPending = deals.reduce((s, d) => s + calcDealPending(d), 0);
  const isPurchase = deals[0]?.type === 'purchase';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = async (dealId) => {
    if (!window.confirm('Delete this deal? This cannot be undone.')) return;
    setDeletingId(dealId);
    const { error } = await softDeleteDeal(dealId, user?.id);
    setDeletingId(null);
    setOpenMenuId(null);
    if (error) {
      showToast('❌ Delete failed: ' + error.message, 'error');
    } else {
      showToast('🗑️ Deal deleted');
      loadData();
    }
  };

  const handleSendReminder = () => {
    if (!party?.phone) {
      showToast('⚠️ No phone number for this party', 'error');
      return;
    }
    const cleanPhone = party.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Namaste ${party.name} ji! 🙏\n\n` +
      `VyaparBook se ek reminder:\n` +
      `💰 Outstanding balance: ₹${formatAmount(totalPending)}\n\n` +
      `Kindly settle karo jaldi se. Dhanyawaad! 🙏\n\n` +
      `— ${user?.business_name || user?.name || 'VyaparBook'}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleExportPDF = () => {
    exportPartyLedgerPDF(party, deals, user?.business_name || user?.name);
    setShowExportMenu(false);
    showToast('📄 PDF downloaded!');
  };

  const handleExportExcel = () => {
    exportPartyLedgerExcel(party, deals);
    setShowExportMenu(false);
    showToast('📊 Excel downloaded!');
  };

  const handleShare = async () => {
    const text =
      `*${party?.name} — VyaparBook Ledger*\n\n` +
      `📊 Total Business: ₹${formatAmount(totalBusiness)}\n` +
      `✅ Total Paid: ₹${formatAmount(totalPaid)}\n` +
      `🔴 Pending: ₹${formatAmount(totalPending)}\n\n` +
      `_Powered by VyaparBook_`;

    if (navigator.share) {
      await navigator.share({ title: `${party?.name} Ledger`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (loading) return <LoadingSpinner fullScreen text="Loading party..." />;

  return (
    <div className="min-h-screen bg-gray-50 pb-24" onClick={() => setOpenMenuId(null)}>

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-green-600 to-green-500 px-4 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-green-100 text-sm mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm border border-white/20 shrink-0">
              {party?.type === 'farmer' ? '🌾' : party?.type === 'mill' ? '🏭' : party?.type === 'transport' ? '🚛' : '👤'}
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-xl font-black truncate">{party?.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full capitalize">{party?.type}</span>
                {party?.phone && (
                  <a href={`tel:${party.phone}`} className="flex items-center gap-1 text-green-100 text-xs">
                    <Phone size={11} /> {party.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center relative"
              title="Export"
            >
              <Download size={16} className="text-white" />
              {showExportMenu && (
                <div className="absolute top-11 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 min-w-[160px] z-20 overflow-hidden">
                  <button onClick={handleExportPDF} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2">
                    <FileText size={15} className="text-red-500" /> Export PDF
                  </button>
                  <button onClick={handleExportExcel} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2 border-t border-gray-50">
                    <Download size={15} className="text-green-600" /> Export Excel
                  </button>
                  <button onClick={handleShare} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2 border-t border-gray-50">
                    <Share2 size={15} className="text-blue-500" /> Share Summary
                  </button>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
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

      {/* ── Action Buttons ── */}
      <div className="px-4 mt-4 flex gap-2">
        <button
          onClick={() => navigate(`/deals/add?party=${id}`)}
          className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200"
        >
          <Plus size={16} /> Add Deal
        </button>
        <button
          onClick={() => navigate(`/payments/add?party=${id}`)}
          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Banknote size={16} /> Payment
        </button>
        {party?.phone && totalPending > 0 && (
          <button
            onClick={handleSendReminder}
            className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
          >
            <MessageCircle size={16} /> Remind
          </button>
        )}
      </div>

      {/* ── Deals List ── */}
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
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor[deal.type] || 'bg-gray-100 text-gray-600'}`}>
                          {typeEmoji[deal.type]} {deal.type}
                        </span>
                        <span className="text-xs text-gray-400">{formatRelative(deal.deal_date)}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-base capitalize">{deal.commodity}</p>
                      <p className="text-gray-500 text-sm">
                        {deal.quantity} {deal.unit}
                        {deal.rate > 0 && ` @ ₹${Number(deal.rate).toLocaleString('en-IN')}`}
                      </p>
                      {deal.notes && (
                        <p className="text-gray-400 text-xs mt-1 italic">📝 {deal.notes}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2 ml-2">
                      <div className="text-right">
                        <p className="font-black text-gray-900 text-base font-mono-amount">{formatAmount(deal.total_amount)}</p>
                        {isPaid ? (
                          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">✅ Paid</span>
                        ) : (
                          <p className="text-red-500 text-xs font-semibold">Pending: {formatAmount(pending)}</p>
                        )}
                      </div>
                      {/* 3-dot menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === deal.id ? null : deal.id);
                          }}
                          className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100"
                        >
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                        {openMenuId === deal.id && (
                          <div className="absolute right-0 top-9 bg-white rounded-2xl shadow-xl border border-gray-100 min-w-[130px] z-20 overflow-hidden">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingDeal(deal); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                            >
                              <Edit3 size={14} className="text-blue-500" /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                              disabled={deletingId === deal.id}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50 disabled:opacity-50"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payments */}
                  {deal.payments && deal.payments.length > 0 && (
                    <div className="border-t border-gray-50 pt-2 mt-2 space-y-1">
                      {deal.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">💳 {p.payment_mode} • {formatDateLong(p.payment_date)}</p>
                          <p className="text-xs text-green-600 font-semibold">+{formatAmount(p.amount)}</p>
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

      {/* ── Edit Modal ── */}
      {editingDeal && (
        <DealEditModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSaved={() => {
            setEditingDeal(null);
            showToast('✅ Deal updated!');
            loadData();
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 max-w-sm mx-auto px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold text-center z-50 animate-slide-up ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PartyDetail;
