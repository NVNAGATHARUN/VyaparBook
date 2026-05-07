import { formatAmount } from '../utils/formatAmount'
import { formatDate } from '../utils/formatDate'

const APP_URL = 'https://vyaparbook.vercel.app'

// ─────────────────────────────────────
// WHATSAPP FORMATTERS
// ─────────────────────────────────────

export const formatForWhatsApp = (data) => {
  if (data.type === 'ERROR') {
    return formatError(data)
  }

  switch (data.type) {
    case 'PARTY_TRANSACTIONS':
      return whatsappPartyTransactions(data)
    case 'PARTY_PENDING':
      return whatsappPartyPending(data)
    case 'PARTY_PAYMENTS':
      return whatsappPartyPayments(data)
    case 'ALL_PENDING':
      return whatsappAllPending(data)
    case 'PENDING_TO_PAY':
      return whatsappPendingToPay(data)
    case 'PENDING_TO_RECEIVE':
      return whatsappPendingToReceive(data)
    case 'ALL_TRANSACTIONS':
      return whatsappAllTransactions(data)
    case 'TOP_PENDING':
      return whatsappTopPending(data)
    case 'TODAY_BUSINESS':
      return whatsappToday(data)
    case 'MONTHLY_BUSINESS':
      return whatsappMonthly(data)
    case 'STOCK_SUMMARY':
      return whatsappStock(data)
    case 'LAST_PAYMENT':
      return whatsappLastPayment(data)
    case 'FEATURES':
      return whatsappFeatures()
    default:
      return '❌ Query samajhaledu. Malli try cheyyandi.'
  }
}

const whatsappPartyTransactions = (data) => {
  const top5 = data.deals.slice(0, 5)
  const more = data.deals.length - 5

  return `
📋 *${data.party.name} — Transactions*

📊 *Summary:*
• Total Deals: ${data.summary.totalDeals}
• Business: ₹${formatAmount(data.summary.totalBusiness)}
• Paid: ₹${formatAmount(data.summary.totalPaid)}
• 🔴 Pending: *₹${formatAmount(data.summary.totalPending)}*

📝 *Recent Deals:*
${top5.map((d, i) =>
  `${i + 1}. ${formatDate(d.deal_date)} — ${d.deal_type === 'purchase' ? '🛒' : '💰'} ${d.deal_type}
   Total: ₹${formatAmount(d.total_amount)} | Pending: ₹${formatAmount(d.pending_amount)}`
).join('\n')}
${more > 0 ? `\n_...and ${more} more deals_` : ''}

🔗 *Full details:*
${APP_URL}/parties/${data.party.id}`.trim()
}

const whatsappPartyPending = (data) => {
  const openDeals = (data.openDeals || []).slice(0, 5)
  const totalPending = (data.summary?.pending_to_pay || 0) +
    (data.summary?.pending_to_receive || 0) ||
    data.summary?.total_pending || 0

  return `
👤 *${data.party?.name || 'Party'} — Pending*

🔴 *Pending to Pay: ₹${formatAmount(data.summary?.pending_to_pay || 0)}*
🟢 *Pending to Receive: ₹${formatAmount(data.summary?.pending_to_receive || 0)}*
📊 Total: ₹${formatAmount(totalPending)}

📋 *Open Deals:*
${openDeals.length > 0
  ? openDeals.map((d, i) =>
      `${i + 1}. ${formatDate(d.deal_date)}: *₹${formatAmount(d.pending_amount)}* pending`
    ).join('\n')
  : '✅ No pending deals!'
}

🔗 ${APP_URL}/parties/${data.party?.id}`.trim()
}

const whatsappPartyPayments = (data) => {
  const top5 = data.payments.slice(0, 5)
  const more = data.payments.length - 5

  return `
💵 *${data.party.name} — Payments*

✅ Total Paid: *₹${formatAmount(data.totalPaid)}*

*Recent Payments:*
${top5.length > 0
  ? top5.map((p, i) =>
      `${i + 1}. ${formatDate(p.payment_date)}
   ₹${formatAmount(p.amount)} — ${p.payment_mode}`
    ).join('\n')
  : 'No payments yet'
}
${more > 0 ? `\n_...and ${more} more_` : ''}

🔗 ${APP_URL}/parties/${data.party.id}`.trim()
}

const whatsappAllPending = (data) => {
  const top = data.parties.slice(0, 8)
  const more = data.parties.length - 8

  return `
📊 *All Pending Summary*

🔴 *Total: ₹${formatAmount(data.totalPending)}*

*Party-wise:*
${top.map((p, i) =>
  `${i + 1}. ${p.party_name}: *₹${formatAmount(p.pending_amount)}*`
).join('\n')}
${more > 0 ? `\n_...and ${more} more_` : ''}

🔗 ${APP_URL}/reports`.trim()
}

const whatsappTopPending = (data) => {
  return `
🏆 *Top Pending Parties*

${data.parties.map((p, i) =>
  `${i + 1}. *${p.party_name}*
   🔴 ₹${formatAmount(p.pending_amount)}`
).join('\n')}

🔗 ${APP_URL}/reports`.trim()
}

const whatsappToday = (data) => {
  return `
📅 *Today's Business*

🛒 *Deals (${data.deals.length}):*
${data.deals.length > 0
  ? data.deals.map(d =>
      `• ${d.parties?.name} — ₹${formatAmount(d.total_amount)}`
    ).join('\n')
  : '• No deals today'
}

💵 *Payments (${data.payments.length}):*
${data.payments.length > 0
  ? data.payments.map(p =>
      `• ₹${formatAmount(p.amount)}`
    ).join('\n')
  : '• No payments today'
}

📊 Total Business: *₹${formatAmount(data.totalDeals)}*

🔗 ${APP_URL}`.trim()
}

const whatsappMonthly = (data) => {
  const net = data.sales.total - data.purchases.total
  return `
📅 *${data.month} ${data.year} Summary*

🛒 Purchases: ${data.purchases.count} deals
   *₹${formatAmount(data.purchases.total)}*

💰 Sales: ${data.sales.count} deals
   *₹${formatAmount(data.sales.total)}*

📊 Net: *₹${formatAmount(Math.abs(net))}*
   ${net >= 0 ? '✅ Profit' : '📉 Invested'}

🔗 ${APP_URL}/reports`.trim()
}

const whatsappStock = (data) => {
  return `
📦 *Current Stock*

${data.items.length > 0
  ? data.items.map(s =>
      `🌾 *${s.commodity}*: ${s.current_stock} ${s.unit}
   Bought: ${s.total_purchased} | Sold: ${s.total_sold}`
    ).join('\n\n')
  : '• No stock available'
}

🔗 ${APP_URL}/stock`.trim()
}

const whatsappLastPayment = (data) => {
  if (!data.payment) {
    return `❌ ${data.party.name} ki inka payment cheyaledu.`
  }
  return `
💵 *${data.party.name} — Last Payment*

Amount: *₹${formatAmount(data.payment.amount)}*
Date: ${formatDate(data.payment.payment_date)}
Mode: ${data.payment.payment_mode}

🔗 ${APP_URL}/parties/${data.party.id}`.trim()
}

const whatsappPendingToPay = (data) => {
  const top = (data.parties || []).slice(0, 8)
  const more = (data.parties || []).length - 8

  return `
💸 *Aapko Kitna Pay Karna Hai?*

🔴 *Total: ₹${formatAmount(data.totalPending)}*

*Party-wise:*
${top.length > 0
  ? top.map((p, i) =>
      `${i + 1}. ${p.party_name}: *₹${formatAmount(p.pending_amount)}*`
    ).join('\n')
  : '✅ Kisi ko pay nahi karna!'
}
${more > 0 ? `\n_...aur ${more} aur_` : ''}

🔗 ${APP_URL}/reports`.trim()
}

const whatsappPendingToReceive = (data) => {
  const top = (data.deals || []).slice(0, 8)
  const more = (data.deals || []).length - 8

  return `
💰 *Aapko Kitna Receive Karna Hai?*

🟢 *Total: ₹${formatAmount(data.totalPending)}*

*Party-wise:*
${top.length > 0
  ? top.map((d, i) =>
      `${i + 1}. ${d.parties?.name || 'Unknown'}: *₹${formatAmount(d.pending_amount)}*`
    ).join('\n')
  : '✅ Kisi se receive nahi karna!'
}
${more > 0 ? `\n_...aur ${more} aur_` : ''}

🔗 ${APP_URL}/reports`.trim()
}

const whatsappAllTransactions = (data) => {
  const top = (data.deals || []).slice(0, 8)
  const more = (data.deals || []).length - 8

  return `
📋 *Saari Transactions*

📊 Total Deals: *${data.totalDeals}*
💼 Total Business: *₹${formatAmount(data.totalBusiness)}*
🔴 Total Pending: *₹${formatAmount(data.totalPending)}*

*Recent Deals:*
${top.map((d, i) =>
  `${i + 1}. ${d.parties?.name || 'Unknown'} — ${d.type === 'purchase' ? '🛒' : '💰'} ₹${formatAmount(d.total_amount)}
   ${formatDate(d.deal_date)} | Pending: ₹${formatAmount(d.pending_amount)}`
).join('\n')}
${more > 0 ? `\n_...aur ${more} aur deals — App mein dekho_` : ''}

🔗 ${APP_URL}`.trim()
}

const whatsappFeatures = () => {
  return `
🚀 *VyaparBook Features*

🎤 *Voice Entry*
   Telugu/English mein bolo, auto save!

💸 *Deal Tracking*
   Purchase aur Sale track karo

💰 *Payment Tracking*
   Partial payments supported

📊 *Pending Amounts*
   Party-wise pending instantly

📋 *Transaction History*
   Complete deal history

📦 *Stock Tracking*
   Godown inventory auto-updated

📱 *WhatsApp Integration*
   Voice notes se entry karo

🔄 *Real-time Sync*
   WhatsApp entry = instant app update

🔗 ${APP_URL}`.trim()
}

const formatError = (data) => {
  if (data.error === 'party_not_found') {
    return `❌ *"${data.partyName}"* meeru party list lo ledu.\n\nParty name correct ga cheppandi.`
  }
  return '❌ Emi jarigindo ardam kaledu. Malli try cheyyandi.'
}

// ─────────────────────────────────────
// PWA FORMATTER (returns data for UI)
// ─────────────────────────────────────

export const formatForPWA = (data) => {
  // PWA components render this directly
  // Just return the data as-is
  // QueryResult.jsx handles the display
  return data
}
