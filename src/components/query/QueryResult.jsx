import { formatAmount } from '../../utils/formatAmount'
import { formatDate } from '../../utils/formatDate'

export default function QueryResult({ data, onClose }) {
  if (!data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">

      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="
        relative bg-white rounded-t-3xl w-full
        max-h-[88vh] overflow-y-auto
        animate-slide-up
      ">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full"/>
        </div>

        {/* Header */}
        <div className="
          flex justify-between items-center
          px-4 py-3 border-b border-gray-100
        ">
          <h2 className="text-lg font-bold text-gray-800">
            {getTitle(data)}
          </h2>
          <button
            onClick={onClose}
            className="
              text-gray-400 bg-gray-100
              rounded-full w-8 h-8
              flex items-center justify-center
            "
          >✕</button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8">
          {data.type === 'ERROR' &&
            <ErrorView data={data} />}
          {data.type === 'PARTY_TRANSACTIONS' &&
            <PartyTransactionsView data={data} />}
          {data.type === 'PARTY_PENDING' &&
            <PartyPendingView data={data} />}
          {data.type === 'PARTY_PAYMENTS' &&
            <PartyPaymentsView data={data} />}
          {data.type === 'ALL_PENDING' &&
            <AllPendingView data={data} />}
          {data.type === 'PENDING_TO_PAY' &&
            <PendingToPayView data={data} />}
          {data.type === 'PENDING_TO_RECEIVE' &&
            <PendingToReceiveView data={data} />}
          {data.type === 'ALL_TRANSACTIONS' &&
            <AllTransactionsView data={data} />}
          {data.type === 'TOP_PENDING' &&
            <TopPendingView data={data} />}
          {data.type === 'TODAY_BUSINESS' &&
            <TodayView data={data} />}
          {data.type === 'MONTHLY_BUSINESS' &&
            <MonthlyView data={data} />}
          {data.type === 'STOCK_SUMMARY' &&
            <StockView data={data} />}
          {data.type === 'LAST_PAYMENT' &&
            <LastPaymentView data={data} />}
          {data.type === 'FEATURES' &&
            <FeaturesView />}
          {data.type === 'CLARIFY' &&
            <ClarifyView data={data} />}
          {data.type === 'CLARIFY_PARTY' &&
            <ClarifyPartyView data={data} />}
          {data.type === 'UNKNOWN' &&
            <UnknownView />}
        </div>
      </div>
    </div>
  )
}

// ── VIEWS ──────────────────────────

const StatCard = ({ label, amount, color }) => (
  <div className={`rounded-2xl p-3 text-center bg-${color}-50`}>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`font-bold text-${color}-600`}>
      ₹{formatAmount(amount)}
    </p>
  </div>
)

const DealCard = ({ deal }) => (
  <div className="
    bg-white border border-gray-100
    rounded-2xl p-4 mb-3 shadow-sm
  ">
    <div className="flex justify-between mb-2">
      <span className={`
        text-xs px-2 py-1 rounded-full font-medium
        ${(deal.deal_type || deal.type) === 'purchase'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-blue-100 text-blue-700'}
      `}>
        {(deal.deal_type || deal.type) === 'purchase'
          ? '🛒 Purchase' : '💰 Sale'}
      </span>
      <span className="text-xs text-gray-400">
        {formatDate(deal.deal_date)}
      </span>
    </div>
    <div className="flex justify-between">
      <div>
        <p className="font-bold text-gray-800">
          {deal.quantity} {deal.unit} {deal.commodity}
        </p>
        <p className="text-sm text-gray-500">
          Rate: ₹{formatAmount(deal.rate)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold">
          ₹{formatAmount(deal.total_amount)}
        </p>
        {(deal.pending_amount || 0) > 0
          ? <p className="text-sm text-red-500 font-medium">
              ₹{formatAmount(deal.pending_amount)} pending
            </p>
          : <p className="text-sm text-green-500">✅ Paid</p>
        }
      </div>
    </div>
  </div>
)

const PartyTransactionsView = ({ data }) => (
  <div>
    <div className="grid grid-cols-3 gap-2 mb-4">
      <StatCard
        label="Business"
        amount={data.summary.totalBusiness}
        color="blue"
      />
      <StatCard
        label="Paid"
        amount={data.summary.totalPaid}
        color="green"
      />
      <StatCard
        label="Pending"
        amount={data.summary.totalPending}
        color="red"
      />
    </div>
    <h3 className="font-bold text-gray-700 mb-3">
      All Deals ({data.deals.length})
    </h3>
    {data.deals.map(deal => (
      <DealCard key={deal.deal_id} deal={deal} />
    ))}
  </div>
)

const PartyPendingView = ({ data }) => (
  <div>
    <div className="
      bg-red-50 rounded-2xl p-6
      text-center mb-4
    ">
      <p className="text-gray-500 mb-1">
        {data.party.name} — Total Pending
      </p>
      <p className="text-4xl font-bold text-red-600">
        ₹{formatAmount(data.summary?.pending_amount || 0)}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <StatCard
        label="Total Business"
        amount={data.summary?.total_business || 0}
        color="gray"
      />
      <StatCard
        label="Total Paid"
        amount={data.summary?.total_paid || 0}
        color="green"
      />
    </div>
    <h3 className="font-bold mb-2">
      Open Deals ({data.openDeals.length})
    </h3>
    {data.openDeals.map((deal, i) => (
      <div key={i} className="
        border-l-4 border-red-400
        bg-red-50 rounded-r-xl p-3 mb-2
      ">
        <div className="flex justify-between">
          <p className="text-sm text-gray-600">
            {formatDate(deal.deal_date)}
          </p>
          <p className="font-bold text-red-600">
            ₹{formatAmount(deal.pending_amount)}
          </p>
        </div>
      </div>
    ))}
  </div>
)

const PartyPaymentsView = ({ data }) => (
  <div>
    <div className="bg-green-50 rounded-2xl p-4 text-center mb-4">
      <p className="text-gray-500">Total Paid</p>
      <p className="text-3xl font-bold text-green-600">
        ₹{formatAmount(data.totalPaid)}
      </p>
    </div>
    {data.payments.map((p, i) => (
      <div key={i} className="
        flex justify-between items-center
        bg-white border border-gray-100
        rounded-xl p-3 mb-2
      ">
        <div>
          <p className="font-bold">
            ₹{formatAmount(p.amount)}
          </p>
          <p className="text-sm text-gray-400">
            {p.payment_mode}
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {formatDate(p.payment_date)}
        </p>
      </div>
    ))}
  </div>
)

const AllPendingView = ({ data }) => (
  <div>
    <div className="bg-red-50 rounded-2xl p-4 text-center mb-4">
      <p className="text-gray-500">Total Pending</p>
      <p className="text-3xl font-bold text-red-600">
        ₹{formatAmount(data.totalPending)}
      </p>
    </div>
    {data.parties.map((p, i) => (
      <div key={i} className="
        flex justify-between items-center
        bg-white border border-gray-100
        rounded-xl p-4 mb-2 shadow-sm
      ">
        <div>
          <p className="font-bold">{p.party_name}</p>
          <p className="text-xs text-gray-400">
            {p.party_type}
          </p>
        </div>
        <p className="font-bold text-red-600">
          ₹{formatAmount(p.pending_amount)}
        </p>
      </div>
    ))}
  </div>
)

const TopPendingView = ({ data }) => (
  <div>
    {data.parties.map((p, i) => (
      <div key={i} className="
        flex items-center gap-3
        bg-white border border-gray-100
        rounded-2xl p-4 mb-3 shadow-sm
      ">
        <div className="
          w-8 h-8 rounded-full bg-green-100
          flex items-center justify-center
          font-bold text-green-700 text-sm
        ">
          {i + 1}
        </div>
        <div className="flex-1">
          <p className="font-bold">{p.party_name}</p>
          <p className="text-xs text-gray-400">
            {p.party_type}
          </p>
        </div>
        <p className="font-bold text-red-600">
          ₹{formatAmount(p.pending_amount)}
        </p>
      </div>
    ))}
  </div>
)

const TodayView = ({ data }) => (
  <div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <StatCard
        label={`🛒 Deals (${data.deals.length})`}
        amount={data.totalDeals}
        color="orange"
      />
      <StatCard
        label={`💵 Payments (${data.payments.length})`}
        amount={data.totalPayments}
        color="green"
      />
    </div>
    {data.deals.length === 0 && data.payments.length === 0
      ? <p className="text-center text-gray-400 py-8">
          Today emi ledu
        </p>
      : null
    }
    {data.deals.map((d, i) => (
      <div key={i} className="
        bg-white border border-gray-100
        rounded-xl p-3 mb-2
      ">
        <div className="flex justify-between">
          <p className="font-bold">
            {d.parties?.name}
          </p>
          <p className="font-bold">
            ₹{formatAmount(d.total_amount)}
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {d.type} • {d.quantity} {d.unit}
        </p>
      </div>
    ))}
  </div>
)

const MonthlyView = ({ data }) => {
  const net = data.sales.total - data.purchases.total
  return (
    <div>
      <h3 className="text-center font-bold text-lg mb-4">
        {data.month} {data.year}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-orange-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">
            🛒 Purchases
          </p>
          <p className="text-xs text-gray-400 mb-1">
            {data.purchases.count} deals
          </p>
          <p className="font-bold text-orange-600">
            ₹{formatAmount(data.purchases.total)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">
            💰 Sales
          </p>
          <p className="text-xs text-gray-400 mb-1">
            {data.sales.count} deals
          </p>
          <p className="font-bold text-blue-600">
            ₹{formatAmount(data.sales.total)}
          </p>
        </div>
      </div>
      <div className={`
        rounded-2xl p-4 text-center
        ${net >= 0 ? 'bg-green-50' : 'bg-red-50'}
      `}>
        <p className="text-gray-500 text-sm">Net</p>
        <p className={`text-2xl font-bold
          ${net >= 0 ? 'text-green-600' : 'text-red-600'}
        `}>
          ₹{formatAmount(Math.abs(net))}
        </p>
        <p className="text-sm text-gray-500">
          {net >= 0 ? '✅ Profit' : '📉 Invested'}
        </p>
      </div>
    </div>
  )
}

const StockView = ({ data }) => (
  <div>
    {data.items.length === 0
      ? <p className="text-center text-gray-400 py-8">
          Stock ledu
        </p>
      : data.items.map((s, i) => (
          <div key={i} className="
            bg-white border border-gray-100
            rounded-2xl p-4 mb-3
          ">
            <div className="flex justify-between mb-3">
              <p className="font-bold text-lg">
                🌾 {s.commodity}
              </p>
              <p className="font-bold text-orange-600">
                {s.current_stock} {s.unit}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-xl p-2 text-center">
                <p className="text-xs text-gray-500">Purchased</p>
                <p className="font-bold text-green-600">
                  {s.total_purchased}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-2 text-center">
                <p className="text-xs text-gray-500">Sold</p>
                <p className="font-bold text-red-600">
                  {s.total_sold}
                </p>
              </div>
            </div>
          </div>
        ))
    }
  </div>
)

const LastPaymentView = ({ data }) => (
  <div>
    {!data.payment
      ? <p className="text-center text-gray-400 py-8">
          {data.party.name} ki inka payment cheyaledu
        </p>
      : <div className="bg-green-50 rounded-2xl p-6 text-center">
          <p className="text-gray-500 mb-2">Last Payment</p>
          <p className="text-4xl font-bold text-green-600 mb-2">
            ₹{formatAmount(data.payment.amount)}
          </p>
          <p className="text-gray-600">
            {formatDate(data.payment.payment_date)}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            via {data.payment.payment_mode}
          </p>
        </div>
    }
  </div>
)

const ErrorView = ({ data }) => (
  <div className="text-center py-8">
    <p className="text-4xl mb-3">🔍</p>
    <p className="font-bold text-gray-700 mb-2">
      Party kanapadedu
    </p>
    <p className="text-gray-500">
      "{data.partyName}" meeru list lo ledu.
      Correct name try cheyyandi.
    </p>
  </div>
)

const UnknownView = () => (
  <div className="text-center py-8">
    <p className="text-4xl mb-3">🤖</p>
    <p className="font-bold text-gray-700 mb-2">
      Ardam Kaledu
    </p>
    <p className="text-gray-500">
      Meeru adigina vishayam naku sarigga ardam kaledu. Inko vidham ga try cheyyandi.
    </p>
  </div>
)

const ClarifyView = ({ data }) => (
  <div className="text-center py-8">
    <p className="text-4xl mb-3">❓</p>
    <p className="font-bold text-gray-700 mb-2">
      Konchem clarify cheyyandi
    </p>
    <p className="text-gray-500">
      {data.question || 'Mee question ki party peru/date range ivvandi.'}
    </p>
  </div>
)

const ClarifyPartyView = ({ data }) => (
  <div className="py-4">
    <p className="text-sm text-gray-600 mb-3">
      {data.question || 'Exact party select cheyyandi.'}
    </p>
    {(data.options || []).map((p, i) => (
      <div key={p.id || i} className="bg-white border border-gray-100 rounded-xl p-3 mb-2">
        <p className="font-bold text-gray-800">{i + 1}. {p.name}</p>
        <p className="text-xs text-gray-500">{p.type || 'other'}</p>
      </div>
    ))}
    <p className="text-xs text-gray-500 mt-2">
      Exact party name malli type cheyyandi.
    </p>
  </div>
)

// ── NEW VIEWS ──────────────────────────

const PendingToPayView = ({ data }) => (
  <div>
    <div className="bg-red-50 rounded-2xl p-4 text-center mb-4">
      <p className="text-gray-500">Total to Pay</p>
      <p className="text-3xl font-bold text-red-600">
        ₹{formatAmount(data.totalPending)}
      </p>
    </div>
    {(data.parties || []).length === 0
      ? <p className="text-center text-green-600 py-4 font-medium">
          ✅ Kisi ko pay nahi karna!
        </p>
      : (data.parties || []).map((p, i) => (
          <div key={i} className="
            flex justify-between items-center
            bg-white border border-gray-100
            rounded-xl p-4 mb-2 shadow-sm
          ">
            <div>
              <p className="font-bold">{p.party_name}</p>
              <p className="text-xs text-gray-400">{p.party_type}</p>
            </div>
            <p className="font-bold text-red-600">
              ₹{formatAmount(p.pending_amount)}
            </p>
          </div>
        ))
    }
  </div>
)

const PendingToReceiveView = ({ data }) => (
  <div>
    <div className="bg-green-50 rounded-2xl p-4 text-center mb-4">
      <p className="text-gray-500">Total to Receive</p>
      <p className="text-3xl font-bold text-green-600">
        ₹{formatAmount(data.totalPending)}
      </p>
    </div>
    {(data.deals || []).length === 0
      ? <p className="text-center text-gray-500 py-4">
          ✅ Kisi se receive nahi karna!
        </p>
      : (data.deals || []).map((d, i) => (
          <div key={i} className="
            flex justify-between items-center
            bg-white border border-gray-100
            rounded-xl p-4 mb-2 shadow-sm
          ">
            <div>
              <p className="font-bold">{d.parties?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-400">{formatDate(d.deal_date)}</p>
            </div>
            <p className="font-bold text-green-600">
              ₹{formatAmount(d.pending_amount)}
            </p>
          </div>
        ))
    }
  </div>
)

const AllTransactionsView = ({ data }) => (
  <div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-blue-50 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">Total Deals</p>
        <p className="font-bold text-blue-600 text-lg">{data.totalDeals}</p>
      </div>
      <div className="bg-green-50 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500">Business</p>
        <p className="font-bold text-green-600">₹{formatAmount(data.totalBusiness)}</p>
      </div>
    </div>
    {data.totalPending > 0 && (
      <div className="bg-red-50 rounded-xl p-3 text-center mb-4">
        <p className="text-xs text-gray-500">Total Pending</p>
        <p className="font-bold text-red-600">₹{formatAmount(data.totalPending)}</p>
      </div>
    )}
    <h3 className="font-bold text-gray-700 mb-3">
      All Deals ({data.totalDeals})
    </h3>
    {(data.deals || []).map((d, i) => (
      <div key={i} className="
        bg-white border border-gray-100
        rounded-xl p-3 mb-2 shadow-sm
      ">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-bold">{d.parties?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500">
              {d.type === 'purchase' ? '🛒' : '💰'} {d.type}
              {d.commodity ? ` • ${d.commodity}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold">₹{formatAmount(d.total_amount)}</p>
            {(d.pending_amount || 0) > 0
              ? <p className="text-xs text-red-500">₹{formatAmount(d.pending_amount)} due</p>
              : <p className="text-xs text-green-500">✅ Paid</p>
            }
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">{formatDate(d.deal_date)}</p>
      </div>
    ))}
  </div>
)

const FeaturesView = () => (
  <div className="space-y-3">
    {[
      { icon: '🎤', title: 'Voice Entry',
        desc: 'Telugu/English mein bolo, auto save!' },
      { icon: '💸', title: 'Deal Tracking',
        desc: 'Purchase aur Sale track karo' },
      { icon: '💰', title: 'Payment Tracking',
        desc: 'Partial payments supported' },
      { icon: '📊', title: 'Pending Amounts',
        desc: 'Party-wise pending instantly' },
      { icon: '📋', title: 'Transaction History',
        desc: 'Complete deal history' },
      { icon: '📦', title: 'Stock Tracking',
        desc: 'Godown inventory auto-updated' },
      { icon: '📱', title: 'WhatsApp Integration',
        desc: 'Voice notes se entry karo' },
      { icon: '🔄', title: 'Real-time Sync',
        desc: 'WhatsApp entry = instant PWA update' },
    ].map((f, i) => (
      <div key={i} className="
        flex items-start gap-3
        bg-gray-50 rounded-xl p-3
      ">
        <span className="text-2xl">{f.icon}</span>
        <div>
          <p className="font-bold text-gray-800">{f.title}</p>
          <p className="text-sm text-gray-500">{f.desc}</p>
        </div>
      </div>
    ))}
  </div>
)

const getTitle = (data) => {
  const titles = {
    PARTY_TRANSACTIONS: `${data.party?.name || ''} — Transactions`,
    PARTY_PENDING: `${data.party?.name || ''} — Pending`,
    PARTY_PAYMENTS: `${data.party?.name || ''} — Payments`,
    ALL_PENDING: 'All Pending',
    PENDING_TO_PAY: 'Mujhe Pay Karna Hai',
    PENDING_TO_RECEIVE: 'Mujhe Milna Hai',
    ALL_TRANSACTIONS: 'All Transactions',
    TOP_PENDING: 'Top Pending',
    TODAY_BUSINESS: "Today's Business",
    MONTHLY_BUSINESS: `${data.month || ''} Summary`,
    STOCK_SUMMARY: 'Current Stock',
    LAST_PAYMENT: `${data.party?.name || ''} — Last Payment`,
    FEATURES: 'VyaparBook Features',
    CLARIFY: 'Need More Details',
    CLARIFY_PARTY: 'Select Party',
    ERROR: 'Not Found',
    UNKNOWN: 'Not Understood'
  }
  return titles[data.type] || 'Results'
}
