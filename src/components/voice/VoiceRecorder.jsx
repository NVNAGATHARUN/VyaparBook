import { useState, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { useVoice, VOICE_STATES } from '../../hooks/useVoice';
import ConfirmationCard from './ConfirmationCard';
import FollowUpCard from './FollowUpCard';
import LoadingSpinner from '../common/LoadingSpinner';

const getMissingFields = (parsed) => {
  const missing = [];
  
  // Payment type doesn't need commodity or rate
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

/**
 * Full voice recorder panel — records, transcribes, parses, asks follow-up, and confirms
 */
const VoiceRecorder = ({ onConfirmed }) => {
  const {
    voiceState,
    transcript,
    parsedData,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useVoice();

  const [enrichedData, setEnrichedData] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    if (voiceState === VOICE_STATES.CONFIRMING && parsedData) {
      const missing = getMissingFields(parsedData);
      setMissingFields(missing); // eslint-disable-line react-hooks/set-state-in-effect
      setEnrichedData(parsedData);
    }
  }, [voiceState, parsedData]);

  const handleConfirm = (finalData) => {
    if (onConfirmed) onConfirmed(finalData, transcript);
    reset();
    setEnrichedData(null);
  };

  const handleRedo = () => {
    reset();
    setEnrichedData(null);
    setMissingFields([]);
    // Returning to idle state as requested by user
  };

  const handleFollowUpComplete = (updatedData) => {
    setEnrichedData(updatedData);
    setMissingFields([]);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {voiceState === VOICE_STATES.IDLE && (
        <button
          onClick={startRecording}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl shadow-green-200 active:scale-95 transition-transform"
        >
          <Mic size={32} className="text-white" />
        </button>
      )}

      {voiceState === VOICE_STATES.RECORDING && (
        <>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
            <button
              onClick={stopRecording}
              className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-200"
            >
              <Square size={24} className="text-white fill-white" />
            </button>
          </div>
          <p className="text-red-500 text-sm font-semibold animate-pulse">
            🔴 Recording... tap to stop
          </p>
        </>
      )}

      {(voiceState === VOICE_STATES.TRANSCRIBING || voiceState === VOICE_STATES.PARSING) && (
        <LoadingSpinner
          text={voiceState === VOICE_STATES.TRANSCRIBING ? '🎯 Samajhne ki koshish...' : '🤖 AI se parse ho raha hai...'}
        />
      )}

      {voiceState === VOICE_STATES.CONFIRMING && enrichedData && (
        missingFields.length > 0 ? (
          <FollowUpCard 
            parsedData={enrichedData} 
            missingFields={missingFields} 
            onComplete={handleFollowUpComplete}
            onRedo={handleRedo}
          />
        ) : (
          <ConfirmationCard
            transcript={transcript}
            data={enrichedData}
            onConfirm={handleConfirm}
            onRedo={handleRedo}
          />
        )
      )}

      {voiceState === VOICE_STATES.ERROR && (
        <div className="text-center space-y-3">
          <p className="text-red-500 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="text-sm px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={startRecording} className="text-sm px-4 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
