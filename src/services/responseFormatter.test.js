import { describe, it, expect, vi } from 'vitest';
import { formatForWhatsApp } from './responseFormatter';

// Mock the formatAmount and formatDate helpers
vi.mock('../utils/formatAmount', () => ({
  formatAmount: (num) => num.toString()
}));
vi.mock('../utils/formatDate', () => ({
  formatDate: (date) => date
}));

describe('Response Formatter', () => {
  it('should format PARTY_TRANSACTIONS correctly', () => {
    const data = {
      type: 'PARTY_TRANSACTIONS',
      party: { name: 'Ravi', id: '123' },
      summary: { totalDeals: 2, totalBusiness: 5000, totalPaid: 2000, totalPending: 3000 },
      deals: [
        { deal_id: 1, deal_date: '2026-05-01', deal_type: 'purchase', total_amount: 3000, pending_amount: 3000 },
        { deal_id: 2, deal_date: '2026-05-02', deal_type: 'sale', total_amount: 2000, pending_amount: 0 }
      ]
    };
    
    const res = formatForWhatsApp(data);
    expect(res).toContain('*Ravi — Transactions*');
    expect(res).toContain('Pending: *₹3000*');
    expect(res).toContain('1. 2026-05-01 — 🛒 purchase');
    expect(res).toContain('2. 2026-05-02 — 💰 sale');
    expect(res).toContain('https://vyaparbook.vercel.app/parties/123');
  });

  it('should format PARTY_PENDING correctly', () => {
    const data = {
      type: 'PARTY_PENDING',
      party: { name: 'Kumar', id: '456' },
      summary: { total_business: 10000, total_paid: 2000, pending_amount: 8000 },
      openDeals: [
        { deal_date: '2026-05-05', pending_amount: 8000 }
      ]
    };

    const res = formatForWhatsApp(data);
    expect(res).toContain('*Kumar — Pending*');
    expect(res).toContain('🔴 *Pending: ₹8000*');
    expect(res).toContain('*₹8000* pending');
  });

  it('should handle missing data gracefully in LAST_PAYMENT', () => {
    const data = {
      type: 'LAST_PAYMENT',
      party: { name: 'Siva', id: '789' },
      payment: null
    };

    const res = formatForWhatsApp(data);
    expect(res).toBe('❌ Siva ki inka payment cheyaledu.');
  });
  
  it('should format TODAY_BUSINESS correctly with empty deals', () => {
    const data = {
      type: 'TODAY_BUSINESS',
      deals: [],
      payments: [],
      totalDeals: 0,
      totalPayments: 0
    };
    
    const res = formatForWhatsApp(data);
    expect(res).toContain("*Today's Business*");
    expect(res).toContain('• No deals today');
    expect(res).toContain('• No payments today');
    expect(res).toContain('Total Business: *₹0*');
  });
});
