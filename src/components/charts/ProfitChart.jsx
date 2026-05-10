
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatAmount } from '../../utils/formatAmount';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
        <p className={`text-lg font-black ${payload[0].value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {formatAmount(payload[0].value)}
        </p>
        <p className="text-[10px] text-gray-500 font-medium">Monthly Net Profit</p>
      </div>
    );
  }
  return null;
};

const ProfitChart = ({ data = [], title = 'Profit Trends' }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden relative group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-800">{title}</h3>
          <p className="text-xs text-gray-400 font-medium">Last 6 months performance</p>
        </div>
        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl">
          📈
        </div>
      </div>
      
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#10b981" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorProfit)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfitChart;
