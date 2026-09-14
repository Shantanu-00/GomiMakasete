'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage } from '@/lib/types';
import { getChatMessages, saveChatMessages } from '@/lib/profile-store';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Trash2, 
  CornerDownLeft,
  Bot,
  User,
  MinusCircle,
  HelpCircle,
  Mic,
  MicOff
} from 'lucide-react';

interface ChatBoxProps {
  activeProfile: UserProfile;
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ChatBox({ activeProfile, isOpenControlled, onOpenChange }: ChatBoxProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick starter questions
  const quickPrompts = [
    '🍳 Frying pan (<30cm)?',
    '🛋️ Mattress / Bulky fee?',
    '🍕 Greasy pizza box?',
    '🔋 Lithium power bank?',
    '🛢️ Used cooking oil?',
    '⏰ 8 AM collection deadline?',
    '🧴 PET bottle 3 steps?'
  ];

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Load messages whenever active profile changes
  useEffect(() => {
    const saved = getChatMessages(activeProfile.id);
    setMessages(saved);
  }, [activeProfile.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping || cooldown > 0) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveChatMessages(activeProfile.id, newMessages);
    if (!textToSend) setInput('');
    setIsTyping(true);
    setCooldown(3);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          municipalityId: activeProfile.municipality_id,
          neighborhood: activeProfile.neighborhood,
          profileName: activeProfile.name
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updated = [...newMessages, assistantMsg];
        setMessages(updated);
        saveChatMessages(activeProfile.id, updated);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    const resetMsg: ChatMessage[] = [
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: `Konnichiwa, ${activeProfile.name}! I am Gomi-chan (ゴミちゃん) 🐾. How can I assist you with ${activeProfile.municipality_name} waste sorting today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(resetMsg);
    saveChatMessages(activeProfile.id, resetMsg);
  };

  const handleToggleSpeechInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    if (cooldown > 0) {
      setSpeechError(`Rate limit: wait ${cooldown}s`);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech not supported in browser');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = activeProfile.language === 'ja' ? 'ja-JP' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      rec.onerror = (e: any) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setSpeechError('Mic access denied');
        } else if (e.error !== 'no-speech') {
          setSpeechError(`Speech: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechError('Mic failed to start');
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '18px',
            right: '16px',
            background: '#00A86B',
            color: '#FFFFFF',
            border: '2px solid #0F172A',
            borderRadius: '9999px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: '3px 3px 0 #0F172A',
            zIndex: 90,
            transition: 'all 0.15s ease',
            maxWidth: 'calc(100vw - 32px)'
          }}
          className="bounce-subtle"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot.jpg"
            alt="Mascot"
            style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid #0F172A', flexShrink: 0 }}
          />
          <span className="jp-nowrap">Ask Gomi-chan (ゴミ質問)</span>
        </button>
      )}

      {/* Docked Chatbox Window */}
      {isOpen && (
        <div 
          className="chatbox-window"
          style={{
            position: 'fixed',
            bottom: '18px',
            right: '16px',
            background: '#FFFFFF',
            border: '2.5px solid #0F172A',
            borderRadius: '18px',
            boxShadow: '5px 5px 0 #0F172A',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 95,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            background: '#F0FDF4',
            borderBottom: '2px solid #0F172A',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot.jpg"
                alt="Gomi-chan"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '2px solid #0F172A',
                  objectFit: 'cover'
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Gomi-chan AI</strong>
                  <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                    {activeProfile.municipality_id === 'tokyo_shinjuku' ? 'Shinjuku' : 'Yokohama'}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Answering for {activeProfile.name}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '4px'
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #0F172A',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X className="w-4 h-4 text-slate-800" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '8px 12px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            scrollbarWidth: 'none'
          }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isTyping}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  color: '#334155'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#FAFBFD'
          }}>
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAssistant ? 'flex-start' : 'flex-end'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: isAssistant ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                    background: isAssistant ? '#FFFFFF' : '#00A86B',
                    color: isAssistant ? '#0F172A' : '#FFFFFF',
                    border: isAssistant ? '1.5px solid #CBD5E1' : '1.5px solid #008756',
                    boxShadow: isAssistant ? '0 1px 3px rgba(0,0,0,0.05)' : '0 2px 4px rgba(0, 168, 107, 0.2)',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '3px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}>
                <span className="soundwave-bar" style={{ background: '#00A86B', height: '6px' }}></span>
                <span className="soundwave-bar" style={{ background: '#00A86B', height: '12px' }}></span>
                <span className="soundwave-bar" style={{ background: '#00A86B', height: '8px' }}></span>
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '4px' }}>Gomi-chan is consulting municipal rules...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '10px 14px',
              borderTop: '2px solid #0F172A',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {speechError && (
              <div style={{ position: 'absolute', bottom: '58px', left: '14px', right: '14px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', padding: '4px 8px', fontSize: '0.72rem', color: '#991B1B', zIndex: 10 }}>
                {speechError}
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening to your voice... speak now" : "Ask about sorting, rules, days..."}
              disabled={isTyping}
              style={{
                flex: 1,
                border: isListening ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit',
                background: isListening ? '#FFF5F5' : '#FFFFFF'
              }}
            />
            {/* Mic Dictation Button */}
            <button
              type="button"
              onClick={handleToggleSpeechInput}
              disabled={isTyping}
              style={{
                background: isListening ? '#EF4444' : '#F1F5F9',
                color: isListening ? '#FFFFFF' : '#475569',
                border: '1.5px solid #0F172A',
                borderRadius: '10px',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '1.5px 1.5px 0 #0F172A'
              }}
              title={isListening ? 'Click to stop listening' : 'Voice dictation (Mic)'}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              style={{
                background: '#00A86B',
                color: '#FFFFFF',
                border: '1.5px solid #0F172A',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '1.5px 1.5px 0 #0F172A'
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
