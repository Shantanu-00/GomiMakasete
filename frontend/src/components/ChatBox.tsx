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
  HelpCircle
} from 'lucide-react';

interface ChatBoxProps {
  activeProfile: UserProfile;
}

export default function ChatBox({ activeProfile }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!query || isTyping) return;

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

  const quickPrompts = [
    '🍕 Oily pizza box?',
    '🌂 Vinyl umbrella?',
    '🔋 Lithium battery?',
    '⏰ Missed 8 AM pickup?'
  ];

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
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about sorting, rules, days..."
              disabled={isTyping}
              style={{
                flex: 1,
                border: '1.5px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
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
