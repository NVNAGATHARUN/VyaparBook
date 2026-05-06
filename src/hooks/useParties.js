import { useState, useEffect, useCallback } from 'react';
import { getParties, getPartySummary } from '../services/supabase';

/**
 * Hook for managing parties data with summary (pending amounts)
 */
export const useParties = (userId) => {
  const [parties, setParties] = useState([]);
  const [partySummary, setPartySummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchParties = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const [{ data: partiesData }, { data: summaryData }] = await Promise.all([
        getParties(userId),
        getPartySummary(userId),
      ]);

      setParties(partiesData || []);

      // Build a map: party_id → summary
      const summaryMap = {};
      (summaryData || []).forEach((s) => {
        summaryMap[s.party_id] = s;
      });
      setPartySummary(summaryMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  return { parties, partySummary, loading, error, refetch: fetchParties };
};
