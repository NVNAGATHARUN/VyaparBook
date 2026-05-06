/**
 * WhatsApp Message Templates for VyaparBook
 * Use these EXACTLY for consistent formatting across all bot replies.
 */

const formatAmount = (amount) => {
  const num = Number(amount) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const typeIcon = (type) => {
  if (type === 'purchase') return '🛒';
  if (type === 'sale') return '💰';
  if (type === 'payment') return '💸';
  return '📋';
};

const paymentModeLabel = (mode) => {
  const modes = {
    cash: '💵 Hand Cash',
    phonepe: '📱 PhonePe/GPay',
    bank: '🏦 Bank Transfer',
    cheque: '📝 Cheque',
  };
  return modes[mode] || mode;
};

export const templates = {
  // Transaction confirmation request
  transactionConfirm: (data) =>
    `✅ *Confirm Cheyali?*

${typeIcon(data.type)} *${(data.type || '').toUpperCase()}*
👤 Party: *${data.party_name}*
🌾 ${data.quantity} ${data.unit} ${data.commodity}
💰 Rate: *${formatAmount(data.rate)}/${data.unit}*
📊 Total: *${formatAmount(data.total_amount)}*
💵 Advance: ${formatAmount(data.advance_paid)}
⏳ Pending: *${formatAmount(data.pending_amount)}*

1️⃣ Confirm ✅
2️⃣ Redo ❌`,

  // Payment-only confirmation
  paymentConfirm: (data) =>
    `💸 *Payment Confirm?*

👤 Party: *${data.party_name}*
💰 Amount: *${formatAmount(data.total_amount)}*
📱 Mode: ${paymentModeLabel(data.payment_mode)}
${data.transaction_id ? `🔑 Txn ID: ${data.transaction_id}` : ''}

1️⃣ Yes ✅
2️⃣ No ❌`,

  // Pending query reply
  pendingQuery: (partyName, summary) =>
    `👤 *${partyName} Summary*

📊 Total Business: ${formatAmount(summary.total_business)}
✅ Total Paid: ${formatAmount(summary.total_paid)}
🔴 *Pending: ${formatAmount(summary.pending_amount)}*

${
  summary.deals && summary.deals.length > 0
    ? `📋 *Open Deals:*\n${summary.deals
        .map((d) => `• ${d.date}: *${formatAmount(d.pending)}* pending`)
        .join('\n')}`
    : '✅ No open deals!'
}

🔗 Full details: vyaparbook.com`,

  // Daily morning summary
  dailySummary: (data) =>
    `🌅 *Good Morning!*

📊 *VyaparBook Summary*

🔴 *Meeru pay cheyali:*
${
  data.owe && data.owe.length > 0
    ? data.owe.map((p) => `• ${p.name}: *${formatAmount(p.pending)}*`).join('\n')
    : '• Emi ledu ✅'
}

🟢 *Meeku pay cheyali:*
${
  data.receive && data.receive.length > 0
    ? data.receive.map((p) => `• ${p.name}: *${formatAmount(p.pending)}*`).join('\n')
    : '• Emi ledu ✅'
}

📦 *Stock:*
${
  data.stock && data.stock.length > 0
    ? data.stock.map((s) => `• ${s.commodity}: ${s.current_stock} ${s.unit}`).join('\n')
    : '• Stock ledu'
}

🔗 vyaparbook.com`,

  // Stock query reply
  stockQuery: (stockItems) =>
    `📦 *Current Stock*

${
  stockItems && stockItems.length > 0
    ? stockItems.map((s) => `• *${s.commodity}*: ${s.current_stock} ${s.unit}`).join('\n')
    : 'Stock information not available. Please check the app.'
}

🔗 vyaparbook.com`,

  // Success after save
  success: (data) =>
    `✅ *Saved Successfully!*

👤 ${data.party_name}
📊 ${formatAmount(data.total_amount)}
⏳ Pending: ${formatAmount(data.pending_amount)}

🔗 View: vyaparbook.com`,

  // Error message
  error: (reason) =>
    `❌ *Samajhaledu!*

${reason}

Please try again or open:
🔗 vyaparbook.com`,

  // Missing rate — ask user
  askRate: (data) =>
    `🤔 *Kodhiga cheppandi!*

Nenu idi artham chesukunnanu:
${typeIcon(data.type)} *${data.type}*
👤 ${data.party_name}
📦 ${data.quantity} ${data.unit}

⚠️ *Rate cheppaledu!*
Oka ${data.unit} ki enta rate?

(Sirf rate number type cheyyandi)
Example: *2350*`,

  // Missing commodity — ask user
  askCommodity: (data) =>
    `🤔 *Emi konanu/ammanu?*

👤 ${data.party_name} — *${data.type}*

Commodity cheppandi:
Reply with: *paddy*, *rice*, *wheat*, or any name`,

  // User not registered
  notRegistered: (phone) =>
    `👋 *VyaparBook lo register avvandi!*

Your number (${phone}) is not registered.

Download the app and sign up:
🔗 vyaparbook.com`,

  // Session expired
  sessionExpired: () =>
    `⏰ *Session expire aindi!*

Please record your transaction again.
🎤 Voice note pammpandi or 💬 type cheyyandi.`,

  // Redo instruction
  redoInstruction: () =>
    `🎤 *Ok! Meruppu cheseyandi malli.*

New voice note send cheyyandi or
transaction text lo type cheyyandi.`,

  // Payment reminder
  paymentReminder: (partyName, amount, dealDate) =>
    `⚠️ *Payment Reminder!*

👤 *${partyName}* ki *${formatAmount(amount)}* pending
📅 Deal date: ${dealDate}

Payment tiskunnara?
1️⃣ Yes - amount cheppandi
2️⃣ Remind tomorrow
3️⃣ Ignore`,

  // Confirm add pending to existing session
  confirmPendingRate: (data, rate) =>
    `✅ *Updated!*

📊 ${data.quantity} ${data.unit} × ₹${rate} = *${formatAmount(data.quantity * rate)}*

Confirm chesedama?
1️⃣ Yes ✅
2️⃣ No ❌`,
};

export { formatAmount };
