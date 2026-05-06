import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { VOICE_STATES } from '../../hooks/useVoice';

/**
 * VoiceButton — The big mic button on the home screen
 */
const VoiceButton = ({
  voiceState,
  onStart,
  onStop,
  disabled = false,
}) => {
  const isRecording = voiceState === VOICE_STATES.RECORDING;
  const isProcessing =
    voiceState === VOICE_STATES.TRANSCRIBING ||
    voiceState === VOICE_STATES.PARSING;
  const isIdle =
    voiceState === VOICE_STATES.IDLE || voiceState === VOICE_STATES.ERROR;

  const handleClick = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      onStop();
    } else if (isIdle) {
      onStart();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic Button */}
      <div className="relative">
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
            <div
              className="absolute inset-0 rounded-full bg-red-400/20 animate-pulse-ring"
              style={{ transform: 'scale(1.3)' }}
            />
          </>
        )}

        <button
          onClick={handleClick}
          disabled={disabled || isProcessing}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
            isRecording
              ? 'bg-red-500 shadow-red-200'
              : isProcessing
              ? 'bg-gray-200 cursor-not-allowed'
              : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-green-200'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
        >
          {isProcessing ? (
            <Loader2 size={36} className="text-gray-400 animate-spin" />
          ) : isRecording ? (
            <div className="flex items-center gap-0.5 h-8">
              <span className="wave-bar h-4" />
              <span className="wave-bar h-8" />
              <span className="wave-bar h-6" />
              <span className="wave-bar h-8" />
              <span className="wave-bar h-4" />
            </div>
          ) : (
            <Mic size={36} className="text-white" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Status Label */}
      <div className="text-center">
        {isRecording ? (
          <p className="text-red-500 font-semibold text-sm animate-pulse">
            🔴 Recording... Tap to stop
          </p>
        ) : isProcessing ? (
          <p className="text-gray-500 text-sm">
            {voiceState === VOICE_STATES.TRANSCRIBING
              ? '🎯 Samajhne ki koshish kar raha hun...'
              : '🤖 AI se parse kar raha hun...'}
          </p>
        ) : (
          <p className="text-gray-400 text-sm font-medium">
            🎤 Tap to Speak
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceButton;
