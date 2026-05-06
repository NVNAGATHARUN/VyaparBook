import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

/**
 * useRealtime — Subscribes to Supabase Realtime changes for all 
 * VyaparBook tables filtered by userId. Any change from WhatsApp 
 * or another PWA session instantly triggers the callbacks.
 *
 * @param {object} params
 * @param {string} params.userId        — Current user ID (filter)
 * @param {function} params.onDealChange    — Called on deals INSERT/UPDATE/DELETE
 * @param {function} params.onPaymentChange — Called on payments INSERT/UPDATE/DELETE
 * @param {function} params.onPartyChange   — Called on parties INSERT/UPDATE/DELETE
 * @param {function} params.onStockChange   — Called on stock INSERT/UPDATE/DELETE
 */
export const useRealtime = ({
  userId,
  onDealChange,
  onPaymentChange,
  onPartyChange,
  onStockChange,
}) => {
  // Keep stable refs so we never re-subscribe on render
  const onDealRef    = useRef(onDealChange);
  const onPaymentRef = useRef(onPaymentChange);
  const onPartyRef   = useRef(onPartyChange);
  const onStockRef   = useRef(onStockChange);

  useEffect(() => {
    onDealRef.current    = onDealChange;
    onPaymentRef.current = onPaymentChange;
    onPartyRef.current   = onPartyChange;
    onStockRef.current   = onStockChange;
  });

  useEffect(() => {
    if (!userId) return;

    const channelName = `vyaparbook-${userId}`;

    const channel = supabase
      .channel(channelName)

      // ── Deals ────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Realtime] Deal change:', payload.eventType, payload.new || payload.old);
          onDealRef.current && onDealRef.current(payload);
        }
      )

      // ── Payments ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Realtime] Payment change:', payload.eventType, payload.new || payload.old);
          onPaymentRef.current && onPaymentRef.current(payload);
        }
      )

      // ── Parties ──────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parties', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Realtime] Party change:', payload.eventType, payload.new || payload.old);
          onPartyRef.current && onPartyRef.current(payload);
        }
      )

      // ── Stock ────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Realtime] Stock change:', payload.eventType, payload.new || payload.old);
          onStockRef.current && onStockRef.current(payload);
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Connected for user:', userId);
        } else if (status === 'CLOSED') {
          console.log('[Realtime] ❌ Connection closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error — check Supabase Realtime settings');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing...');
      supabase.removeChannel(channel);
    };
  }, [userId]); // Only re-subscribe if userId changes
};
