import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, CircleAlert as AlertCircle, WifiOff, LogOut } from 'lucide-react';
import VoiceButton from '../components/voice/VoiceButton';
import ConfirmationCard from '../components/voice/ConfirmationCard';
import FollowUpCard from '../components/voice/FollowUpCard';
import NewPartyCard from '../components/voice/NewPartyCard';
import AmountCard from '../components/common/AmountCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import QueryBar from '../components/query/QueryBar';
import QueryResult from '../components/query/QueryResult';

import { detectIntent, isQueryIntent } from '../services/agentBrain';
import { executeQuery } from '../services/queryEngine';
import { formatForPWA } from '../services/responseFormatter';

import { useVoice, VOICE_STATES } from '../hooks/useVoice';
import { useRealtime } from '../hooks/useRealtime';
import { supabase } from '../services/supabase';
import {
  getDashboardSummary,
  getRecentTransactions,
  createParty,
  createDealAtomic,
  createPayment,
  saveVoiceLog,
  getDealsByParty,
} from '../services/supabase';
import { formatAmount } from '../utils/formatAmount';
import { formatRelative } from '../utils/formatDate';

const typeEmoji = { purchase: '🛒', sale: '💰', payment: '💸' };
const typeColor = { purchase: 'text-orange-600', sale: 'text-blue-600', payment: 'text-purple-600' };

const getMissingFields = (parsed) => {
  const missing = [];
  
  if (parsed.type === 'payment') {
    if (!parsed.total_amount || parsed.total_amount === 0) {
      missing.push({
        field: 'total_amount', 
        question: 'Mొత్తం amount enta?',
        placeholder: '₹ Total amount',
        type: 'number'
      });
    }
    return missing;
  }

  if (!parsed.commodity || parsed.commodity === null) {
    missing.push({
      field: 'commodity',
      question: 'Emi konanu/ammanu?',
      placeholder: 'paddy, rice, wheat...',
      type: 'text'
    });
  }
    
  if (!parsed.rate || parsed.rate === 0) {
    missing.push({
      field: 'rate',
      question: `Oka ${parsed.unit || 'unit'} ki enta rate?`,
      placeholder: '₹ Rate enter cheyyandi',
      type: 'number'
    });
  }
    
  if (!parsed.total_amount || parsed.total_amount === 0) {
    missing.push({
      field: 'total_amount', 
      question: 'Mొత్తం amount enta?',
      placeholder: '₹ Total amount',
      type: 'number'
    });
  }
    
  return missing;
};

const Home = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState({ toPay: 0, toReceive: 0, todayTotal: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingDeal, setSavingDeal] = useState(false);
  const [toast, setToast] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveBanner, setLiveBanner] = useState(null);

  // New Party Detection State
  const [showNewParty, setShowNewParty] = useState(false);
  const [pendingDealData, setPendingDealData] = useState(null);

  // Missing Fields State
  const [missingFields, setMissingFields] = useState([]);
  const [enrichedData, setEnrichedData] = useState(null);

  // AI Query State
  const [queryResult, setQueryResult] = useState(null);

  const {
    voiceState,
    transcript,
    parsedData,
    error: voiceError,
    startRecording,
    stopRecording,
    reset,
  } = useVoice();

  // Override reset to also clear local state
  const resetVoice = useCallback(() => {
    reset();
    setEnrichedData(null);
    setMissingFields([]);
  }, [reset]);

  useEffect(() => {
    const processVoiceInput = async () => {
      if (voiceState === VOICE_STATES.CONFIRMING && parsedData && !enrichedData) {
        try {
          const intent = await detectIntent(transcript);
          
          // If query intent → show query result
          if (isQueryIntent(intent)) {
          const result = await executeQuery(intent, user?.id, null);
            setQueryResult(formatForPWA(result));
            resetVoice();
            return;
          }
        } catch (err) {
          console.error('Intent detection error:', err);
        }

        // If action intent → existing transaction flow
        const missing = getMissingFields(parsedData);
        setMissingFields(missing);
        setEnrichedData(parsedData);
      }
    };
    
    processVoiceInput();
  }, [voiceState, parsedData, enrichedData, transcript, user?.id, resetVoice]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const showLiveBanner = (msg) => {
    setLiveBanner(msg);
    setTimeout(() => setLiveBanner(null), 3000);
  };

  const triggerBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDbError(null);
    try {
      const [sum, { data: txs, error: txErr }] = await Promise.all([
        getDashboardSummary(user.id),
        getRecentTransactions(user.id, 8),
      ]);
      if (txErr && txErr.code === '42501') {
        setDbError('rls');
      }
      setSummary(sum);
      setRecentTx(txs || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [loadData]);

  // Reload when navigated back from AddPayment / AddDeal with refresh flag
  useEffect(() => {
    if (location.state?.refresh) {
      loadData(); // eslint-disable-line react-hooks/set-state-in-effect
      window.history.replaceState({}, '');
      setTimeout(() => showToast('✅ Payment saved!'), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.refresh]);

  // ── Realtime Sync ────────────────────────────────────────────────────────
  useRealtime({
    userId: user?.id,
    onDealChange: (payload) => {
      const isWhatsApp = payload.new?.source === 'whatsapp';
      if (isWhatsApp) {
        const name = payload.new?.party_name || 'Someone';
        showLiveBanner(`📱 WhatsApp: New deal from ${name}!`);
        triggerBrowserNotification('VyaparBook — WhatsApp Entry', `New deal added via WhatsApp`);
      } else {
        showLiveBanner('🔄 Deal updated!');
      }
      // Removed automatic loadData() to prevent API hammering. User can tap refresh.
    },
    onPaymentChange: (payload) => {
      const isWhatsApp = payload.new?.source === 'whatsapp';
      showLiveBanner(isWhatsApp ? '📱 WhatsApp: Payment recorded!' : '🔄 Payment updated!');
    },
    onPartyChange: (payload) => {
      if (payload.eventType === 'INSERT') {
        showLiveBanner(`👤 New party added: ${payload.new?.name || ''}`);
      }
    },
    onStockChange: () => {
      // Background sync handled
    },
  });

  // Step 1: Handle initial confirm from ConfirmationCard
  const handleInitialConfirm = async (finalData) => {
    if (!finalData || !user) return;
    
    // Step 1 validation
    if (!finalData.party_name || 
        (finalData.type !== 'payment' && (!finalData.commodity || !finalData.quantity || !finalData.rate)) || 
        !finalData.total_amount) {
      showToast("Anni fields fill cheyyandi", "error");
      return;
    }

    setSavingDeal(true);
    try {
      // Step 2: Check if party exists
      const { data: existingParties, error: searchErr } = await supabase
        .from('parties')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', finalData.party_name.trim());
        
      if (searchErr) throw new Error('Error searching party: ' + searchErr.message);

      if (existingParties && existingParties.length > 0) {
        // Party exists -> Save immediately
        await executeSave(finalData, existingParties[0]);
      } else {
        // Party doesn't exist -> Show NewPartyCard
        setPendingDealData(finalData);
        setShowNewParty(true);
        setSavingDeal(false);
      }
    } catch (err) {
      console.error('Validation error:', err);
      showToast('❌ Error: ' + err.message, 'error');
      setSavingDeal(false);
    }
  };

  // Step 3: Handle new party creation
  const handleAddNewParty = async (partyInfo) => {
    setShowNewParty(false);
    setSavingDeal(true);
    try {
      const { data: newParty, error: partyErr } = await createParty({
        user_id: user.id,
        name: partyInfo.name,
        type: partyInfo.type,
        phone: partyInfo.phone || null
      });
      
      if (partyErr) throw new Error('Could not create party: ' + partyErr.message);
      
      await executeSave(pendingDealData, newParty);
    } catch (err) {
      console.error('Create party error:', err);
      showToast('❌ Save failed: ' + err.message, 'error');
      setSavingDeal(false);
      setPendingDealData(null);
    }
  };

  const handleCancelNewParty = () => {
    setShowNewParty(false);
    setPendingDealData(null);
    // User can go back to editing the confirmation card
  };

  // Step 4 to 9: Execute final save logic
  const executeSave = async (finalData, partyRecord) => {
    try {
      const today = new Date().toISOString().split('T')[0];


      if (finalData.type === 'payment') {
        // Pure payment — find the most recent open deal for this party
        const { data: openDeals } = await getDealsByParty(partyRecord.id);

        if (!openDeals || openDeals.length === 0) {
          throw new Error("No deals found for this party. Please create a deal first.");
        }

        // Only target deals that have a genuine outstanding balance
        const openDealsSorted = (openDeals || [])
          .filter(d => {
            const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
            return Math.max(0, Number(d.total_amount) - paid) > 0;
          })
          .sort((a, b) => new Date(a.deal_date) - new Date(b.deal_date));

        if (openDealsSorted.length === 0) {
          throw new Error(`All deals for ${partyRecord.name} are fully paid. Please create a new deal first.`);
        }
        
        const openDeal = openDealsSorted[0];

        const { error: payErr } = await createPayment({
          deal_id: openDeal.id,
          user_id: user.id,
          amount: finalData.total_amount,
          payment_mode: finalData.payment_mode || 'cash',
          transaction_id: finalData.transaction_id || null,
          payment_date: today,
        });
        if (payErr) throw new Error('Payment save failed: ' + payErr.message);
      } else {
        // Atomic Deal Save (Deal + Advance Payment + Stock all in one transaction)
        const { error: dealErr } = await createDealAtomic({
          party_id: partyRecord.id,
          type: finalData.type,
          commodity: finalData.commodity,
          quantity: Number(finalData.quantity) || 0,
          unit: finalData.unit,
          rate: Number(finalData.rate) || 0,
          total_amount: Number(finalData.total_amount),
          advance_paid: Number(finalData.advance_paid) || 0,
          deal_date: today,
          source: 'pwa',
          payment_mode: finalData.payment_mode || 'cash',
        });
        
        if (dealErr) throw new Error('Deal save failed: ' + dealErr.message);
      }

      // Step 7: Save voice log
      await saveVoiceLog({
        user_id: user.id,
        raw_text: transcript,
        parsed_data: finalData,
        status: 'confirmed',
        source: 'pwa',
      });

      // Step 8: Show success
      resetVoice();
      setPendingDealData(null);
      showToast(`✅ Saved! ${partyRecord.name} - ₹${formatAmount(finalData.total_amount)}`);
      
      // Step 9: Refresh dashboard
      await loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Save error:', err);
      showToast('❌ Save failed: ' + err.message, 'error');
    } finally {
      setSavingDeal(false);
    }
  };

  // ── Handle AI Queries ─────────────────────────────────────────────────────────
  const handleQueryResult = (result) => {
    setQueryResult(formatForPWA(result));
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Subah ki namaste';
    if (h < 17) return 'Namaste';
    return 'Shubh sandhya';
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Live Update Banner */}
      {liveBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white text-center py-2.5 text-sm font-semibold shadow-lg animate-slide-down">
          {liveBanner}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-500 px-4 pt-12 pb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-green-100 text-sm font-medium">{greeting()},</p>
            <h1 className="text-white text-2xl font-black leading-tight">
              {user?.name || 'Trader'} 👋
            </h1>
            <p className="text-green-200 text-xs mt-0.5">{todayStr}</p>
            {lastUpdated && (
              <p className="text-green-300 text-[10px] mt-0.5">
                🔄 Synced {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20"
              aria-label="Refresh"
            >
              <RefreshCw size={16} className="text-white" />
            </button>
            <button
              onClick={onLogout}
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* DB Error Banner */}
      {dbError === 'rls' && (
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <WifiOff size={20} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-700 font-bold text-sm">Database Setup Required</p>
              <p className="text-orange-600 text-xs mt-1 leading-relaxed">
                Please run the SQL in <code className="bg-orange-100 px-1 rounded">supabase_setup.sql</code> in your Supabase dashboard to complete setup.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Summary Cards */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          {loadingData ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <AmountCard label="💸 To Pay" amount={summary.toPay} variant="danger" size="sm" />
                <AmountCard label="💰 To Receive" amount={summary.toReceive} variant="success" size="sm" />
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between border border-blue-100">
                <div>
                  <p className="text-blue-500 text-xs font-semibold">Today's Business</p>
                  <p className="text-blue-800 text-lg font-black font-mono-amount">
                    {formatAmount(summary.todayTotal)}
                  </p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Voice Section */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {showNewParty ? (
            <NewPartyCard 
              partyName={pendingDealData?.party_name}
              onAdd={handleAddNewParty}
              onBack={handleCancelNewParty}
            />
          ) : voiceState === VOICE_STATES.CONFIRMING ? (
            missingFields.length > 0 ? (
              <FollowUpCard 
                parsedData={enrichedData || parsedData} 
                missingFields={missingFields} 
                onComplete={(data) => {
                  setEnrichedData(data);
                  setMissingFields([]);
                }}
                onRedo={resetVoice}
              />
            ) : (
              <ConfirmationCard
                transcript={transcript}
                data={enrichedData || parsedData}
                onConfirm={handleInitialConfirm}
                onRedo={resetVoice}
                isConfirming={savingDeal}
              />
            )
          ) : voiceState === VOICE_STATES.ERROR ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-red-500 text-sm text-center font-medium">{voiceError}</p>
              <button
                onClick={resetVoice}
                className="text-green-600 text-sm font-semibold border-2 border-green-200 rounded-xl px-5 py-2 hover:bg-green-50"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full items-center">
              <VoiceButton
                voiceState={voiceState}
                onStart={startRecording}
                onStop={stopRecording}
              />
              <div className="w-full mt-8">
                <QueryBar
                  userId={user?.id}
                  onResult={handleQueryResult}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/deals/add')}
          className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">📝</div>
          <p className="text-xs font-semibold text-gray-600">Add Deal</p>
        </button>
        <button
          onClick={() => navigate('/parties')}
          className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">👥</div>
          <p className="text-xs font-semibold text-gray-600">Parties</p>
        </button>
        <button
          onClick={() => navigate('/payments/add')}
          className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">💳</div>
          <p className="text-xs font-semibold text-gray-600">Payment</p>
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 mt-5">
        <h2 className="text-base font-bold text-gray-800 mb-3">Recent Transactions</h2>
        {loadingData ? (
          <LoadingSpinner size="sm" />
        ) : recentTx.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <p className="text-gray-300 text-xs mt-1">
              Tap the mic above to add your first deal!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                onClick={() => navigate(`/parties/${tx.party_id}`)}
                className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 active:scale-98 transition-transform cursor-pointer"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
                  {typeEmoji[tx.type] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {tx.parties?.name || 'Unknown'}
                    </p>
                    {tx.source === 'whatsapp' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">📱 WA</span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">🌐 App</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs capitalize">
                    {tx.type} • {tx.commodity} • {formatRelative(tx.deal_date)}
                  </p>
                </div>
                <p className={`font-bold text-sm font-mono-amount ${typeColor[tx.type] || 'text-gray-700'}`}>
                  {formatAmount(tx.total_amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 max-w-sm mx-auto px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-semibold text-center animate-slide-up z-50 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* AI Query Result Bottom Sheet */}
      <QueryResult data={queryResult} onClose={() => setQueryResult(null)} />
    </div>
  );
};

export default Home;
