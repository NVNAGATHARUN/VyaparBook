import { useState, useEffect, useCallback } from 'react';
import { getDeals, getDealsByParty } from '../services/supabase';

/**
 * Hook for managing deals data
 */
export const useDeals = (userId, partyId = null) => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeals = useCallback(async () => {
    if (!userId) return;
    await Promise.resolve();
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = partyId
        ? await getDealsByParty(partyId)
        : await getDeals(userId);

      if (fetchError) throw new Error(fetchError.message);
      setDeals(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, partyId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDeals(), 0);
    return () => clearTimeout(timer);
  }, [fetchDeals]);

  return { deals, loading, error, refetch: fetchDeals };
};
