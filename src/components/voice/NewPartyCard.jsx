import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const partyTypes = [
  { id: 'farmer', label: '🌾 Farmer' },
  { id: 'mill', label: '🏭 Mill' },
  { id: 'transport', label: '🚛 Transport' },
  { id: 'dealer', label: '💼 Dealer' },
  { id: 'other', label: '👤 Other' },
];

/**
 * NewPartyCard prompts the user to verify and create a new party
 */
const NewPartyCard = ({ partyName, onBack, onAdd }) => {
  const [selectedType, setSelectedType] = useState('farmer');
  const [phone, setPhone] = useState('');

  const handleAdd = () => {
    onAdd({
      name: partyName,
      type: selectedType,
      phone: phone || null,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md mx-auto animate-slide-up">
      {/* Header */}
      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
        <h3 className="text-base font-bold text-blue-700 flex items-center gap-2">
          <span>👤</span> New Party Detected!
        </h3>
      </div>

      <div className="p-4 space-y-5">
        <div className="text-center bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-sm text-gray-600 font-medium leading-relaxed">
            "<span className="font-bold text-gray-900">{partyName}</span>" mee list lo ledu.
            <br />
            Idi new party aa?
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
            Party Type Select Cheyyandi:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {partyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`py-2 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  selectedType === type.id
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
            Phone (optional):
          </label>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 text-gray-500 font-semibold px-3 py-3 rounded-xl border-2 border-gray-100">
              +91
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10 digit number"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 pt-2 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors active:scale-98"
        >
          <ArrowLeft size={16} />
          BACK
        </button>
        <button
          onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors active:scale-98"
        >
          <CheckCircle2 size={16} />
          ADD PARTY
        </button>
      </div>
    </div>
  );
};

export default NewPartyCard;
