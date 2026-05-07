import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { getDeals } from '../services/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatAmount } from '../utils/formatAmount';
import { formatRelative } from '../utils/formatDate';

const typeEmoji = { purchase: '🛒', sale: '💰' };
const typeColor = {
  purchase: 'bg-orange-100 text-orange-700',
  sale: 'bg-blue-100 text-blue-700',
};

const Deals = ({ user }) => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | purchase | sale

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await getDeals(user.id);
      setDeals(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = deals.filter((d) => {
    const matchSearch =
      d.parties?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.commodity?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || d.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">Deals 📋</h1>
          <button
            onClick={() => navigate('/deals/add')}
            className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-green-200"
          >
            + Add
          </button>
        </div>

        <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 mb-3">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'purchase', 'sale'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f === 'all' ? 'All' : f === 'purchase' ? '🛒 Purchase' : '💰 Sale'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <LoadingSpinner text="Loading deals..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 font-medium">No deals found</p>
            <button
              onClick={() => navigate('/deals/add')}
              className="mt-4 bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-green-200"
            >
              + Add First Deal
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((deal) => (
              <div
                key={deal.id}
                onClick={() => navigate(`/parties/${deal.party_id}`)}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                  {typeEmoji[deal.type] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {deal.parties?.name}
                    </p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${typeColor[deal.type]}`}>
                      {deal.type}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {deal.quantity} {deal.unit} {deal.commodity} • {formatRelative(deal.deal_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm font-mono-amount">
                    {formatAmount(deal.total_amount)}
                  </p>
                  <ChevronRight size={14} className="text-gray-300 ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Deals;
