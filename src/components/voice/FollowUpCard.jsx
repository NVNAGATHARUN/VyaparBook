import { useState } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';

/**
 * FollowUpCard displays missing fields one by one to gather necessary data
 */
const FollowUpCard = ({ parsedData, missingFields, onComplete, onRedo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  const [localData, setLocalData] = useState({ ...parsedData });

  const currentField = missingFields[currentIndex];

  // Auto-calculation logic specifically for rate -> total
  const rate = currentField.field === 'rate' ? Number(currentValue) : Number(localData.rate);
  const quantity = Number(localData.quantity) || 0;
  
  let liveTotal = Number(localData.total_amount) || 0;
  if (rate > 0 && quantity > 0) {
    liveTotal = rate * quantity;
  }

  const handleNext = () => {
    if (!currentValue) return;

    const updatedData = { ...localData, [currentField.field]: currentField.type === 'number' ? Number(currentValue) : currentValue };
    
    // Auto-fill total amount if rate was just filled
    if (currentField.field === 'rate' && liveTotal > 0) {
      updatedData.total_amount = liveTotal;
    }

    setLocalData(updatedData);
    setCurrentValue('');

    if (currentIndex < missingFields.length - 1) {
      // If the next field is total_amount but we just calculated it, skip it
      if (missingFields[currentIndex + 1].field === 'total_amount' && liveTotal > 0) {
        if (currentIndex + 2 < missingFields.length) {
          setCurrentIndex(currentIndex + 2);
        } else {
          onComplete(updatedData);
        }
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    } else {
      onComplete(updatedData);
    }
  };

  const isNextDisabled = !currentValue;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto animate-slide-up">
      {/* Header */}
      <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
        <h3 className="text-base font-bold text-orange-700 flex items-center gap-2">
          <span>🤔</span> Kodhiga Details Kavali
        </h3>
      </div>

      {/* Summary of what is known */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">Nenu idi artham chesukunnanu:</p>
        <div className="flex flex-col gap-1 text-sm font-medium text-gray-800">
          <p>
            {localData.type === 'purchase' ? '🛒 Purchase' : localData.type === 'sale' ? '💰 Sale' : '💸 Payment'} 
            <span className="mx-2 text-gray-300">|</span> 
            👤 {localData.party_name}
          </p>
          {localData.quantity > 0 && (
            <p>📦 {localData.quantity} {localData.unit}</p>
          )}
        </div>
      </div>

      {/* Question Area */}
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2 text-orange-600 mb-1">
          <span className="text-lg">⚠️</span>
          <p className="font-semibold text-sm pt-1">{currentField.question}</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            {currentField.type === 'number' && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
            )}
            <input
              type={currentField.type}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isNextDisabled && handleNext()}
              placeholder={currentField.placeholder}
              className={`w-full border-2 border-gray-200 rounded-xl py-3 outline-none focus:border-green-500 transition-colors ${
                currentField.type === 'number' ? 'pl-8 pr-4' : 'px-4'
              }`}
              autoFocus
            />
          </div>

          {/* Live Calculation display if rate is being asked and we know quantity */}
          {currentField.field === 'rate' && quantity > 0 && currentValue && (
            <div className="bg-[#f0fdf4] rounded-xl p-3 border border-green-100">
              <p className="text-xs text-green-600 font-semibold mb-1">Total: {quantity} × ₹{currentValue} =</p>
              <p className="text-lg font-black text-green-700 font-mono-amount">₹{liveTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-green-500 mt-0.5">AUTO CALCULATED — LIVE</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 pt-2 flex gap-3">
        <button
          onClick={onRedo}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors active:scale-98"
        >
          <XCircle size={16} />
          REDO
        </button>
        <button
          onClick={handleNext}
          disabled={isNextDisabled}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700 transition-colors active:scale-98"
        >
          NEXT
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default FollowUpCard;
