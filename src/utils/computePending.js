/**
 * Single source of truth for calculating the pending amount of a deal.
 * A deal's pending amount is the total amount minus the sum of all its payments.
 * 
 * @param {Object} deal - Deal object, must include total_amount and payments array
 * @returns {Object} { total_amount, paid_amount, pending_amount }
 */
export const computePending = (deal) => {
  if (!deal) return { total_amount: 0, paid_amount: 0, pending_amount: 0 };
  
  const total = Number(deal.total_amount || 0);
  const paid = (deal.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pending = Math.max(0, total - paid);
  
  return {
    total_amount: total,
    paid_amount: paid,
    pending_amount: pending
  };
};
