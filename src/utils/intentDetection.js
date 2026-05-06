/**
 * Intent Detection for VyaparBook WhatsApp Bot
 * Classifies incoming WhatsApp messages into actionable intents.
 */

export const INTENTS = {
  CONFIRM_YES: 'CONFIRM_YES',
  CONFIRM_NO: 'CONFIRM_NO',
  QUERY_PENDING: 'QUERY_PENDING',
  QUERY_STOCK: 'QUERY_STOCK',
  QUERY_SUMMARY: 'QUERY_SUMMARY',
  PAYMENT: 'PAYMENT',
  TRANSACTION: 'TRANSACTION',
  PROVIDE_RATE: 'PROVIDE_RATE',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Detect the intent from a WhatsApp text message.
 * @param {string} text — Raw incoming message text
 * @param {string|null} pendingIntent — Last bot question context (e.g., 'ASK_RATE')
 * @returns {string} — One of INTENTS constants
 */
export const detectIntent = (text, pendingIntent = null) => {
  const t = text.toLowerCase().trim();

  // Confirmation replies (highest priority)
  if (t === '1' || t === 'yes' || t === 'confirm' || t === 'ok' || t === 'sare' || t === 'sari')
    return INTENTS.CONFIRM_YES;

  if (t === '2' || t === 'no' || t === 'cancel' || t === 'vaddu' || t === 'ledu')
    return INTENTS.CONFIRM_NO;

  // If bot asked for rate and user types a number → it's a rate reply
  if (pendingIntent === 'ASK_RATE' && /^\d+(\.\d+)?$/.test(t))
    return INTENTS.PROVIDE_RATE;

  // If bot asked for commodity and user types one word → commodity reply
  if (pendingIntent === 'ASK_COMMODITY') {
    const commodities = ['paddy', 'rice', 'wheat', 'maize', 'corn', 'soya', 'cotton', 'sugarcane'];
    if (commodities.some(c => t.includes(c)) || t.split(' ').length <= 2)
      return INTENTS.TRANSACTION; // Will be merged with existing session
  }

  // Pending / balance queries
  if (
    t.includes('pending') ||
    t.includes('ela undi') ||
    t.includes('enta undi') ||
    t.includes('balance') ||
    t.includes('baaki') ||
    t.includes('baki') ||
    t.includes('cheyali') ||
    t.includes('ivvali') ||
    t.includes('how much') ||
    t.includes('how many')
  )
    return INTENTS.QUERY_PENDING;

  // Stock queries
  if (
    t.includes('stock') ||
    t.includes('godown') ||
    t.includes('maal') ||
    t.includes('inventory') ||
    t.includes('bags') ||
    t.includes('lorry undi') ||
    t.includes('inka undi')
  )
    return INTENTS.QUERY_STOCK;

  // Summary / report queries
  if (
    t.includes('summary') ||
    t.includes('report') ||
    t.includes('today') ||
    t.includes('ivvaalu') ||
    t.includes('roju') ||
    t.includes('overall') ||
    t.includes('total')
  )
    return INTENTS.QUERY_SUMMARY;

  // Payment entries
  if (
    t.includes('pay chesanu') ||
    t.includes('payment chesanu') ||
    t.includes('tiskunnanu') ||
    t.includes('icchanu') ||
    t.includes('received') ||
    t.includes('paid') ||
    t.includes('send chesanu') ||
    t.includes('transfer chesanu') ||
    (t.includes('rupee') || t.includes('rs') || t.includes('₹')) &&
      (t.includes('pay') || t.includes('give') || t.includes('receive'))
  )
    return INTENTS.PAYMENT;

  // Default: assume it's a new transaction entry (voice or text)
  return INTENTS.TRANSACTION;
};

/**
 * Extract a party name from a pending query.
 * e.g., "Ravi pending?" → "Ravi"
 * e.g., "Ravi ki enta baaki?" → "Ravi"
 * @param {string} text
 * @returns {string|null}
 */
export const extractPartyFromQuery = (text) => {
  const t = text.trim();

  // Patterns like "Ravi pending?" or "Ravi baaki?"
  const patterns = [
    /^(\w+)\s+pending/i,
    /^(\w+)\s+ki\s+enta/i,
    /^(\w+)\s+ela\s+undi/i,
    /^(\w+)\s+baaki/i,
    /^(\w+)\s+balance/i,
  ];

  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Check if a message is just a plain number (rate reply context)
 * @param {string} text
 * @returns {number|null}
 */
export const extractPlainNumber = (text) => {
  const cleaned = text.trim().replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return !isNaN(num) && num > 0 ? num : null;
};
