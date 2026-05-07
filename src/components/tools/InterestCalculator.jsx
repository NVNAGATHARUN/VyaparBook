
import { useState, useEffect } from 'react';
import { 
  Calculator, Calendar, Info, RefreshCw, Save, Trash2, 
  ChevronRight, TrendingUp, Landmark, DollarSign, Wallet,
  ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { formatAmount } from '../../utils/formatAmount';

const InterestCalculator = ({ user, onSaveLoan }) => {
  const [loanType, setLoanType] = useState('hand'); // hand, bank, gold
  const [direction, setDirection] = useState('taken'); // taken, given
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState('simple'); // simple, compound, emi
  const [rateMode, setRateMode] = useState('rupees_per_hundred'); // percentage, rupees_per_hundred
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState('');
  const [inputMode, setInputMode] = useState('dates'); // dates, duration

  const [result, setResult] = useState(null);

  const calculateInterest = () => {
    const P = parseFloat(principal);
    const R_val = parseFloat(interestRate);
    if (isNaN(P) || isNaN(R_val)) return;

    let T_months = 0;
    if (inputMode === 'dates') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      T_months = diffDays / 30; // Approx months
    } else {
      T_months = parseFloat(durationMonths) || 0;
    }

    // Monthly Rate
    let monthlyRate = 0;
    if (rateMode === 'percentage') {
      monthlyRate = (R_val / 12) / 100;
    } else {
      // Rupees per 100 per month
      monthlyRate = R_val / 100;
    }

    let interest = 0;
    let emi = 0;

    if (interestType === 'simple') {
      interest = P * monthlyRate * T_months;
    } else if (interestType === 'compound') {
      // Compound Monthly
      interest = P * (Math.pow(1 + monthlyRate, T_months)) - P;
    } else if (interestType === 'emi') {
      // EMI Formula: [P x R x (1+R)^N]/[(1+R)^N-1]
      const R = monthlyRate;
      const N = T_months;
      if (R > 0) {
        emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
        interest = (emi * N) - P;
      } else {
        emi = P / N;
        interest = 0;
      }
    }

    setResult({
      principal: P,
      interest: interest,
      total: P + interest,
      emi: emi,
      duration: T_months.toFixed(1),
      monthlyRate: (monthlyRate * 100).toFixed(2)
    });
  };

  useEffect(() => {
    if (principal && interestRate) {
      calculateInterest();
    } else {
      setResult(null);
    }
  }, [principal, interestRate, interestType, rateMode, startDate, endDate, durationMonths, inputMode]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-6 text-white">
        <h2 className="text-xl font-black flex items-center gap-2 mb-1">
          <Calculator size={24} /> Interest Calculator
        </h2>
        <p className="text-indigo-100 text-xs">Calculate Bank, Gold, or Hand loans easily</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Loan Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'bank', label: 'Bank', icon: Landmark },
            { id: 'gold', label: 'Gold', icon: DollarSign },
            { id: 'hand', label: 'Hand', icon: Wallet },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setLoanType(type.id)}
              className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                loanType === type.id 
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
              }`}
            >
              <type.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Direction Selection */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setDirection('taken')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              direction === 'taken' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <ArrowDownLeft size={16} /> Taken
          </button>
          <button
            onClick={() => setDirection('given')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              direction === 'given' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <ArrowUpRight size={16} /> Given
          </button>
        </div>

        {/* Principal Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Principal Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-8 pr-4 py-4 text-lg font-black text-gray-900 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Interest Type & Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Type</label>
            <select
              value={interestType}
              onChange={(e) => setInterestType(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-500 outline-none"
            >
              <option value="simple">Simple</option>
              <option value="compound">Compound</option>
              <option value="emi">EMI (Monthly)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Rate Mode</label>
            <select
              value={rateMode}
              onChange={(e) => setRateMode(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-indigo-500 outline-none"
            >
              <option value="rupees_per_hundred">₹ / 100 (Monthly)</option>
              <option value="percentage">% (Yearly)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
            Interest Rate {rateMode === 'rupees_per_hundred' ? '(₹ per 100/mo)' : '(%)'}
          </label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="e.g. 2"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-base font-bold text-gray-900 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Period Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Period</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="period_mode" 
                  checked={inputMode === 'dates'} 
                  onChange={() => setInputMode('dates')}
                  className="w-3 h-3 accent-indigo-600"
                />
                <span className="text-[10px] font-bold text-gray-600 uppercase">Dates</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="period_mode" 
                  checked={inputMode === 'duration'} 
                  onChange={() => setInputMode('duration')}
                  className="w-3 h-3 accent-indigo-600"
                />
                <span className="text-[10px] font-bold text-gray-600 uppercase">Duration</span>
              </label>
            </div>
          </div>

          {inputMode === 'dates' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-gray-700"
                />
                <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-bold text-gray-400 uppercase">From</span>
              </div>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-gray-700"
                />
                <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-bold text-gray-400 uppercase">To</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="Number of months"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-base font-bold text-gray-900 focus:border-indigo-500 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Months</span>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-indigo-50 rounded-3xl p-5 space-y-4 border border-indigo-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Interest</p>
                <p className="text-lg font-black text-indigo-700">₹{formatAmount(result.interest)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-lg font-black text-indigo-700">{result.duration} Mo</p>
              </div>
            </div>
            <div className="pt-4 border-t border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 text-center">
                {interestType === 'emi' ? 'Monthly EMI' : 'Total Amount (P + I)'}
              </p>
              <p className="text-3xl font-black text-indigo-600 text-center">
                ₹{formatAmount(interestType === 'emi' ? result.emi : result.total)}
              </p>
              {interestType === 'emi' && (
                <p className="text-[10px] text-indigo-400 font-bold text-center mt-1">
                  Total Repayment: ₹{formatAmount(result.total)}
                </p>
              )}
            </div>
            
            <button
              onClick={() => onSaveLoan && onSaveLoan({
                loan_type: loanType,
                direction,
                principal: result.principal,
                interest_rate: parseFloat(interestRate),
                interest_type: interestType,
                rate_mode: rateMode,
                start_date: startDate,
                total_amount: result.total
              })}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
            >
              <Save size={18} /> Save this Loan
            </button>
          </div>
        )}

        {/* Footer Actions */}
        {!result && (
          <button
            onClick={() => {
              setPrincipal('');
              setInterestRate('');
              setResult(null);
            }}
            className="w-full py-3.5 rounded-2xl bg-gray-50 text-gray-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} /> Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default InterestCalculator;
