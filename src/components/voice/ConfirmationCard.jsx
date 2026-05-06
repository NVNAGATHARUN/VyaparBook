import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, Lock, AlertCircle } from 'lucide-react';
import { formatAmount } from '../../utils/formatAmount';

const unitOptions = ['bags', 'lorry', 'quintal', 'ton', 'kg'];

/**
 * ConfirmationCard — Fully editable confirmation card with live calculations,
 * inline field validation, and REDO confirmation dialog.
 */
const ConfirmationCard = ({
  transcript,
  data,
  onConfirm,
  onRedo,
  isConfirming = false,
}) => {
  // State for all editable fields
  const [partyName, setPartyName] = useState(data?.party_name || '');
  const [type, setType] = useState(data?.type || 'purchase');
  const [commodity, setCommodity] = useState(data?.commodity || '');
  const [quantity, setQuantity] = useState(data?.quantity || '');
  const [unit, setUnit] = useState(data?.unit || 'bags');
  const [rate, setRate] = useState(data?.rate || '');
  const [totalAmount, setTotalAmount] = useState(data?.total_amount || 0);
  const [advancePaid, setAdvancePaid] = useState(data?.advance_paid || 0);
  const [pendingAmount, setPendingAmount] = useState(data?.pending_amount || 0);
  const [notes, setNotes] = useState(data?.notes || '');

  // Payment Proof States
  const [paymentMode, setPaymentMode] = useState(data?.payment_mode || 'cash');
  const [transactionId, setTransactionId] = useState(data?.transaction_id || '');
  const [proofFile, setProofFile] = useState(null);

  // Validation errors
  const [errors, setErrors] = useState({});

  // REDO dialog state
  const [showRedoDialog, setShowRedoDialog] = useState(false);

  // Live calculations
  useEffect(() => {
    const q = Number(quantity);
    const r = Number(rate);
    if (q > 0 && r > 0) {
      setTotalAmount(q * r);
    }
  }, [quantity, rate]);

  useEffect(() => {
    const t = Number(totalAmount);
    const a = Number(advancePaid);
    setPendingAmount(Math.max(0, t - a));
  }, [totalAmount, advancePaid]);

  // Clear error when field is fixed
  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!partyName || partyName.trim() === '')
      newErrors.partyName = 'Party name required';

    if (!isPayment) {
      if (!commodity || commodity.trim() === '')
        newErrors.commodity = 'Commodity required';
      if (!quantity || Number(quantity) <= 0)
        newErrors.quantity = 'Quantity must be more than 0';
      if (!rate || Number(rate) <= 0)
        newErrors.rate = 'Rate must be more than 0';
    }

    if (!totalAmount || Number(totalAmount) <= 0)
      newErrors.totalAmount = 'Total amount cannot be zero';

    if (Number(advancePaid) > Number(totalAmount))
      newErrors.advancePaid = 'Advance cannot exceed total';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm({
      party_name: partyName,
      type,
      commodity,
      quantity: Number(quantity),
      unit,
      rate: Number(rate),
      total_amount: Number(totalAmount),
      advance_paid: Number(advancePaid),
      pending_amount: Number(pendingAmount),
      notes,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      proof_file: proofFile,
    });
  };

  const handleRedoClick = () => setShowRedoDialog(true);
  const handleRedoConfirm = () => { setShowRedoDialog(false); onRedo(); };
  const handleRedoCancel = () => setShowRedoDialog(false);

  const isPayment = type === 'payment';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto animate-slide-up">

      {/* REDO Confirmation Dialog */}
      {showRedoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-slide-up">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎤</span>
              </div>
              <h3 className="font-black text-gray-800 text-lg">Voice meruppu chesara?</h3>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Ee details anni clear avutayi and fresh ga record cheyali.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRedoCancel}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRedoConfirm}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
              >
                Yes, Redo 🎤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center justify-between">
        <h3 className="text-base font-bold text-green-700 flex items-center gap-2">
          ✅ Confirm Cheyali?
        </h3>
        {/* Type Toggles */}
        <div className="flex bg-white rounded-lg p-0.5 border border-green-200">
          <button
            onClick={() => setType('purchase')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
              type === 'purchase' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            🛒 Purchase
          </button>
          <button
            onClick={() => setType('sale')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
              type === 'sale' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            💰 Sale
          </button>
          <button
            onClick={() => setType('payment')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
              type === 'payment' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            💸 Payment
          </button>
        </div>
      </div>

      {/* Transcript strip */}
      {transcript && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-[11px] text-gray-400 italic">🎤 "{transcript}"</p>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Party */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">👤 Party</label>
          <div className="relative">
            <input
              type="text"
              value={partyName}
              onChange={(e) => { setPartyName(e.target.value); clearError('partyName'); }}
              className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors ${
                errors.partyName ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'
              }`}
              placeholder="Party name..."
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          {errors.partyName && (
            <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
              <AlertCircle size={11} /> {errors.partyName}
            </p>
          )}
        </div>

        {!isPayment && (
          <>
            {/* Commodity */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">🌾 Commodity</label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => { setCommodity(e.target.value); clearError('commodity'); }}
                className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors capitalize ${
                  errors.commodity ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'
                }`}
                placeholder="paddy, rice, wheat..."
              />
              {errors.commodity && (
                <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
                  <AlertCircle size={11} /> {errors.commodity}
                </p>
              )}
            </div>

            {/* Quantity & Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 block">🔢 Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); clearError('quantity'); }}
                  className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors ${
                    errors.quantity ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'
                  }`}
                />
                {errors.quantity && (
                  <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
                    <AlertCircle size={11} /> {errors.quantity}
                  </p>
                )}
              </div>
              <div className="w-1/3">
                <label className="text-xs font-bold text-gray-500 mb-1 block">📐 Unit</label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-green-500 transition-colors appearance-none bg-white"
                  >
                    {unitOptions.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                </div>
              </div>
            </div>

            {/* Rate */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">💰 Rate per {unit}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => { setRate(e.target.value); clearError('rate'); }}
                  className={`w-full border-2 rounded-xl pl-8 pr-3 py-2.5 text-sm font-semibold outline-none transition-colors ${
                    errors.rate ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'
                  }`}
                  placeholder="0"
                />
              </div>
              {errors.rate && (
                <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
                  <AlertCircle size={11} /> {errors.rate}
                </p>
              )}
            </div>
          </>
        )}

        {/* Total Amount */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            📊 Total Amount {!isPayment && <span className="text-gray-300 font-normal">(Auto: {quantity || '?'} × ₹{rate || '?'})</span>}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₹</span>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => { setTotalAmount(e.target.value); clearError('totalAmount'); }}
              readOnly={!isPayment}
              className={`w-full border-2 rounded-xl pl-8 pr-10 py-2.5 text-sm font-bold outline-none transition-colors ${
                errors.totalAmount
                  ? 'border-red-400 bg-red-50'
                  : !isPayment
                  ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                  : 'bg-white border-gray-200 focus:border-green-500'
              }`}
            />
            {!isPayment && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />}
          </div>
          {errors.totalAmount && (
            <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
              <AlertCircle size={11} /> {errors.totalAmount}
            </p>
          )}
        </div>

        {/* Advance Paid */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">💵 Advance Paid</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
            <input
              type="number"
              value={advancePaid}
              onChange={(e) => { setAdvancePaid(e.target.value); clearError('advancePaid'); }}
              className={`w-full border-2 rounded-xl pl-8 pr-3 py-2.5 text-sm font-semibold outline-none transition-colors ${
                errors.advancePaid ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'
              }`}
            />
          </div>
          {errors.advancePaid && (
            <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 pl-1">
              <AlertCircle size={11} /> {errors.advancePaid}
            </p>
          )}
        </div>

        {/* Pending Amount (Auto) */}
        {!isPayment && (
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">⏳ Pending Amount <span className="text-gray-300 font-normal">(Auto)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold">₹</span>
              <input
                type="number"
                value={pendingAmount}
                readOnly
                className="w-full border-2 border-orange-100 bg-orange-50 rounded-xl pl-8 pr-10 py-2.5 text-sm font-bold text-orange-700 outline-none cursor-default"
              />
              <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-300" />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">📝 Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 transition-colors"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Payment Proof Section */}
        {(isPayment || Number(advancePaid) > 0) && (
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
            <h4 className="text-xs font-bold text-blue-800">💳 Payment Details</h4>
            
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="cash">💵 Hand Cash</option>
                <option value="phonepe">📱 PhonePe / GPay</option>
                <option value="bank">🏦 Bank Transfer / NEFT</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>

            {paymentMode !== 'cash' && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">
                    {paymentMode === 'cheque' ? 'Cheque Number (Optional)' : 'Transaction ID (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={paymentMode === 'cheque' ? 'Enter Cheque No.' : 'Enter Txn ID'}
                    className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors bg-white"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Upload Receipt / Proof (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
                  />
                  {proofFile && <p className="text-[10px] text-green-600 mt-1 font-semibold">✅ Selected: {proofFile.name}</p>}
                </div>
              </>
            )}
          </div>
        )}

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertCircle size={13} /> Please fix the errors above before confirming.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <button
          onClick={handleRedoClick}
          disabled={isConfirming}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors active:scale-98"
        >
          <XCircle size={18} />
          REDO
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-98 disabled:opacity-70"
        >
          {isConfirming ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <>
              <CheckCircle2 size={18} />
              CONFIRM
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationCard;
