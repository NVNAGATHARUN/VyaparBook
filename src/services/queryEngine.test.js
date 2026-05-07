import { describe, it, expect, vi } from 'vitest';
import { executeQuery } from './queryEngine';
import { supabase } from './supabase';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Query Engine', () => {
  it('should route QUERY_PARTY_TRANSACTIONS correctly', async () => {
    // Mock the chained Supabase response for findParty and getPartyTransactions
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIlike = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: [{ id: '123', name: 'Ravi' }] });
    const mockOrder = vi.fn().mockResolvedValue({ 
      data: [{ deal_id: 1, total_amount: 500, total_paid: 200, pending_amount: 300 }] 
    });

    supabase.from.mockImplementation((table) => {
      if (table === 'parties') {
        return { select: mockSelect, eq: mockEq, ilike: mockIlike, limit: mockLimit };
      }
      if (table === 'deal_summary') {
        return { select: mockSelect, eq: mockEq, order: mockOrder };
      }
    });

    const intent = {
      intent: 'QUERY_PARTY_TRANSACTIONS',
      entities: { party_name: 'Ravi' }
    };

    const result = await executeQuery(intent, 'user-1');

    expect(result.type).toBe('PARTY_TRANSACTIONS');
    expect(result.party.name).toBe('Ravi');
    expect(result.deals.length).toBe(1);
    expect(result.summary.totalPending).toBe(300);
  });

  it('should return ERROR if party is not found', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIlike = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: [] });

    supabase.from.mockImplementation(() => ({
      select: mockSelect, eq: mockEq, ilike: mockIlike, limit: mockLimit
    }));

    const intent = {
      intent: 'QUERY_PARTY_PENDING',
      entities: { party_name: 'Unknown' }
    };

    const result = await executeQuery(intent, 'user-1');

    expect(result.type).toBe('ERROR');
    expect(result.error).toBe('party_not_found');
  });

  it('should route QUERY_TODAY correctly', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ total_amount: 1000 }] });

    supabase.from.mockImplementation((table) => {
      if (table === 'deals') {
        return { select: mockSelect, eq: mockEq, order: mockOrder };
      }
      if (table === 'payments') {
        return { select: mockSelect, eq: mockEq }; // No order needed in queryEngine for payments
      }
    });
    
    // Quick mock override for the payments chain
    mockEq.mockImplementation(() => {
       return {
           eq: mockEq,
           order: mockOrder,
           then: Promise.resolve({data: [{amount: 500}]}).then.bind(Promise.resolve({data: [{amount: 500}]}))
       };
    });

    const intent = { intent: 'QUERY_TODAY', entities: {} };
    const result = await executeQuery(intent, 'user-1');

    expect(result.type).toBe('TODAY_BUSINESS');
    expect(result.deals.length).toBe(1);
    expect(result.totalDeals).toBe(1000);
    expect(result.totalPayments).toBe(500);
  });
});
