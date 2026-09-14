'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage } from '@/lib/types';
import { getChatMessages, saveChatMessages } from '@/lib/profile-store';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RotateCcw, 
  ShieldAlert, 
  Clock, 
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  onOpenChat?: () => void;
}

const VOICE_MAX_REQUESTS = 15;
const VOICE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_SECONDS = 3;

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  activeProfile,
  onOpenChat
}: VoiceAssistantModalProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [reply, setReply] = useState<string | null>(null);
  const [replySource, setReplySource] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Rate Limiting State
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
  const [cooldown, setCooldown] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check speech recognition capability on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [cooldown]);

  // Clean up request timestamps older than 5 minutes
  const getActiveRequestsCount = (): number => {
    const now = Date.now();
    const active = requestTimestamps.filter(t => now - t < VOICE_WINDOW_MS);
    return active.length;
  };

  const remainingQueries = Math.max(0, VOICE_MAX_REQUESTS - getActiveRequestsCount());

  // Start listening when modal opens if supported and ready
  useEffect(() => {
    if (isOpen && isSupported && !isListening && !reply && !isAnalyzing && cooldown === 0) {
      startListening();
    }
    return () => {
      stopListening();
      stopAudio();
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMsg(null);
    setTranscript('');
    setInterimTranscript('');
    setReply(null);
    stopAudio();

    // Check rate limit: cooldown guard
    if (cooldown > 0) {
      setErrorMsg(`Rate limit cooldown active. Please wait ${cooldown}s before next query.`);
      return;
    }

    // Check rate limit: 15 calls / 5 mins
    if (remainingQueries <= 0) {
      setErrorMsg('Voice rate limit reached (15 queries / 5 minutes). Please wait or type in the Chatbox.');
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = activeProfile.language === 'ja' ? 'ja-JP' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }
        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          handleProcessVoiceQuery(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        } else if (event.error !== 'no-speech') {
          setErrorMsg(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setErrorMsg(`Failed to start microphone: ${err?.message || 'Unknown error'}`);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    stopAudio();

    // Clean text for speech (strip markdown headers, emojis, asterisks)
    const cleanSpoken = text
      .replace(/[#*•_`~]/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/\n+/g, '. ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpoken);
    utterance.lang = activeProfile.language === 'ja' ? 'ja-JP' : 'en-US';
    utterance.rate = 1.05;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    audioUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleProcessVoiceQuery = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    stopListening();
    setIsAnalyzing(true);
    setErrorMsg(null);

    // Record rate limit timestamp
    setRequestTimestamps(prev => [...prev, Date.now()]);
    setCooldown(COOLDOWN_SECONDS);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanQuery,
          municipalityId: activeProfile.municipality_id,
          neighborhood: activeProfile.neighborhood,
          profileName: activeProfile.name,
          isVoice: true
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const assistantReply = data.reply;
        setReply(assistantReply);
        setReplySource(data.source || 'Amazon Nova Sonic');

        // Automatically announce reply via hands-free voice audio
        speakResponse(assistantReply);

        // Save turns into resident chat history
        const savedHistory = getChatMessages(activeProfile.id);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg: ChatMessage = {
          id: `msg_voice_user_${Date.now()}`,
          role: 'user',
          content: `🎙️ "${cleanQuery}"`,
          timestamp: timeStr
        };
        const assistantMsg: ChatMessage = {
          id: `msg_voice_assistant_${Date.now() + 1}`,
          role: 'assistant',
          content: assistantReply,
          timestamp: timeStr
        };
        saveChatMessages(activeProfile.id, [...savedHistory, userMsg, assistantMsg]);
      } else if (resp.status === 429) {
        setErrorMsg('Too many requests. Server rate limit triggered. Please wait a moment.');
      } else {
        setErrorMsg('Failed to process voice request. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(`Network error: ${err?.message || 'Check server connection'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAudio();
          stopListening();
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '2px solid #0F172A',
          boxShadow: '6px 6px 0 #0F172A',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 18px',
            background: '#F8FAFC',
            borderBottom: '2px solid #0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#00A86B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #0F172A'
              }}
            >
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                Amazon Nova Sonic Voice
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>
                Hands-Free Ambient Audio Assistant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Rate Limit Guard Badge */}
            <div
              style={{
                fontSize: '0.70rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                background: remainingQueries > 3 ? '#F1F5F9' : '#FEF3C7',
                color: remainingQueries > 3 ? '#475569' : '#B45309',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Sliding window rate limit: max 15 voice queries per 5 minutes"
            >
              <Clock className="w-3 h-3" />
              <span>{remainingQueries}/15 Left</span>
            </div>

            <button
              onClick={() => {
                stopAudio();
                stopListening();
                onClose();
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1.5px solid #0F172A',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '1px 1px 0 #0F172A'
              }}
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
          {!isSupported ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: '#FFF1F2',
                border: '1.5px solid #F43F5E',
                textAlign: 'center'
              }}
            >
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#9F1239', marginBottom: '6px' }}>
                Speech Recognition Not Supported
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#881337', marginBottom: '12px' }}>
                Your browser does not support the Web Speech Recognition API. Please use Google Chrome, Microsoft Edge, or Safari for voice interaction.
              </p>
              {onOpenChat && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenChat();
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.80rem', padding: '6px 14px' }}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Open Resident Chatbox
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Central Audio / Mic Visualization Sphere */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                {isListening && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-12px',
                      borderRadius: '50%',
                      background: 'rgba(0, 168, 107, 0.2)',
                      animation: 'pulse 1.5s infinite ease-in-out'
                    }}
                  />
                )}
                {isSpeaking && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-12px',
                      borderRadius: '50%',
                      background: 'rgba(2, 132, 199, 0.25)',
                      animation: 'pulse 1.2s infinite ease-in-out'
                    }}
                  />
                )}

                <button
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  disabled={cooldown > 0 || isAnalyzing}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: isListening 
                      ? '#EF4444' 
                      : isSpeaking 
                        ? '#0284C7' 
                        : isAnalyzing 
                          ? '#F59E0B' 
                          : '#00A86B',
                    color: '#FFFFFF',
                    border: '2.5px solid #0F172A',
                    boxShadow: '3px 3px 0 #0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: cooldown > 0 || isAnalyzing ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                  title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
                >
                  {isListening ? (
                    <Mic className="w-8 h-8 animate-pulse" />
                  ) : isSpeaking ? (
                    <Volume2 className="w-8 h-8 animate-bounce" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status Message & Dynamic Soundwave */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                {isListening && (
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '6px' }}>
                      <span className="soundwave-bar" style={{ height: '6px', background: '#00A86B' }} />
                      <span className="soundwave-bar" style={{ height: '18px', background: '#00A86B' }} />
                      <span className="soundwave-bar" style={{ height: '10px', background: '#00A86B' }} />
                      <span className="soundwave-bar" style={{ height: '22px', background: '#00A86B' }} />
                      <span className="soundwave-bar" style={{ height: '8px', background: '#00A86B' }} />
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                      Listening to your voice...
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Speak naturally in English or Japanese
                    </div>
                  </div>
                )}

                {isAnalyzing && (
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#D97706', marginBottom: '4px' }}>
                      Nova Sonic reasoning...
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Querying municipal sorting bylaws & schedule rules
                    </div>
                  </div>
                )}

                {isSpeaking && (
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '6px' }}>
                      <span className="soundwave-bar" style={{ height: '8px', background: '#0284C7' }} />
                      <span className="soundwave-bar" style={{ height: '16px', background: '#0284C7' }} />
                      <span className="soundwave-bar" style={{ height: '24px', background: '#0284C7' }} />
                      <span className="soundwave-bar" style={{ height: '14px', background: '#0284C7' }} />
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284C7' }}>
                      Speaking audio response...
                    </div>
                  </div>
                )}

                {!isListening && !isAnalyzing && !isSpeaking && !reply && (
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                      {cooldown > 0 ? `Cooldown (${cooldown}s)` : 'Tap the microphone to speak'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '340px', margin: '0 auto' }}>
                      Ask: "How do I throw away a frying pan?", "When is burnable trash?", or "How much is a mattress?"
                    </div>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {errorMsg && (
                <div
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    border: '1.5px solid #F87171',
                    fontSize: '0.78rem',
                    color: '#991B1B',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Real-time Transcription Stream */}
              {(transcript || interimTranscript) && (
                <div
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                    You Said:
                  </div>
                  <div style={{ fontWeight: 600, lineHeight: 1.4 }}>
                    "{transcript || interimTranscript}"
                  </div>
                </div>
              )}

              {/* Assistant AI Answer Card */}
              {reply && (
                <div
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: '#F0FDF4',
                    border: '1.5px solid #00A86B',
                    boxShadow: '2px 2px 0 #00A86B',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46' }}>
                        Gomi-chan Voice Response
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stopAudio();
                        } else {
                          speakResponse(reply);
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #065F46',
                        background: '#FFFFFF',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#065F46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3 h-3 text-red-500" /> Stop Audio
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-emerald-600" /> Replay Audio
                        </>
                      )}
                    </button>
                  </div>

                  <div 
                    style={{ 
                      fontSize: '0.80rem', 
                      color: '#0F172A', 
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}
                  >
                    {reply}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={startListening}
                  disabled={cooldown > 0 || isListening || isAnalyzing}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.80rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: '1.5px solid #0F172A',
                    boxShadow: '2px 2px 0 #0F172A'
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{cooldown > 0 ? `Wait ${cooldown}s...` : 'Ask Another Question'}</span>
                </button>

                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      stopAudio();
                      stopListening();
                      onClose();
                      onOpenChat();
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.80rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      border: '1.5px solid #0F172A',
                      boxShadow: '2px 2px 0 #0F172A'
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>View in Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div
          style={{
            padding: '8px 18px',
            background: '#F8FAFC',
            borderTop: '1.5px solid #E2E8F0',
            fontSize: '0.68rem',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>City: {activeProfile.municipality_name}</span>
          <span>Amazon Nova Sonic Speech Engine</span>
        </div>
      </div>
    </div>
  );
}
