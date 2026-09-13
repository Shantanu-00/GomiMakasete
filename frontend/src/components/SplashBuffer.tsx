'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Recycle, 
  ShieldCheck,
  Flame,
  Layers,
  ChevronRight
} from 'lucide-react';

interface SplashBufferProps {
  onComplete: () => void;
  municipalityName?: string;
}

export default function SplashBuffer({ 
  onComplete, 
  municipalityName = 'Shinjuku City (新宿区)' 
}: SplashBufferProps) {
  const totalDurationMs = 5000; // 5 seconds: comfortable reading pace for judges
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDurationMs) * 100, 100);
      setProgress(pct);
      setSecondsLeft(Math.max(0, Math.ceil((totalDurationMs - elapsed) / 1000)));

      if (elapsed >= totalDurationMs) {
        clearInterval(interval);
        setTimeout(onComplete, 100);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 50% 30%, #FFFFFF 0%, #F4F7F4 60%, #E8F2EB 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      {/* Subtle Background Decorative Grid & Watermark */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
        backgroundSize: '24px 24px',
        opacity: 0.6,
        pointerEvents: 'none'
      }} />

      {/* Main Free-Flowing Hero Card */}
      <div style={{
        position: 'relative',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        background: '#FFFFFF',
        border: '3px solid #0F172A',
        borderRadius: '24px',
        boxShadow: '6px 6px 0 #0F172A, 0 20px 40px -15px rgba(15, 23, 42, 0.12)',
        padding: 'clamp(16px, 3.5vw, 32px)',
        textAlign: 'center',
        margin: 'auto'
      }}>
        {/* Top Active Region Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#00A86B',
          color: '#FFFFFF',
          border: '2px solid #0F172A',
          borderRadius: '9999px',
          padding: '4px 14px',
          fontSize: 'clamp(0.7rem, 2vw, 0.78rem)',
          fontWeight: 800,
          letterSpacing: '0.03em',
          boxShadow: '2px 2px 0 #0F172A',
          marginBottom: '14px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="jp-nowrap">{municipalityName} RULES LOADED</span>
        </div>

        {/* Mascot & Welcome Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            position: 'relative',
            width: 'clamp(70px, 15vw, 95px)',
            height: 'clamp(70px, 15vw, 95px)',
            borderRadius: '18px',
            border: '2.5px solid #0F172A',
            boxShadow: '3px 3px 0 #0F172A',
            overflow: 'hidden',
            background: '#F0FDF4',
            flexShrink: 0
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.jpg"
              alt="Gomi-chan Tanuki Mascot"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ textAlign: 'left', maxWidth: '380px' }}>
            <div style={{
              display: 'inline-block',
              background: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: '8px',
              padding: '2px 8px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#92400E',
              marginBottom: '4px'
            }}>
              <span className="jp-nowrap">MEET GOMI-CHAN (ゴミちゃん) 🐾</span>
            </div>
            <p style={{
              fontSize: 'clamp(0.8rem, 2.5vw, 0.88rem)',
              color: '#334155',
              fontWeight: 600,
              lineHeight: 1.35
            }}>
              &ldquo;Separating trash in Japan can be confusing with 10+ streams. Don&apos;t worry—our AI agent has your back!&rdquo;
            </p>
          </div>
        </div>

        {/* --- CORE EDUCATIONAL HIGHLIGHT: THE MEANING OF "GOMI MAKASETE" --- */}
        <div style={{
          margin: '16px 0',
          background: '#F8FAFC',
          border: '2px solid #0F172A',
          borderRadius: '18px',
          padding: 'clamp(12px, 2.5vw, 18px)',
          boxShadow: '3px 3px 0 #0F172A'
        }}>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#64748B',
            marginBottom: '10px'
          }}>
            <span className="jp-nowrap">📖 What does &ldquo;Gomi Makasete&rdquo; mean? (ゴミの意味と由来)</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
            gap: '10px'
          }}>
            {/* Left Card: GOMI */}
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #E2E8F0',
              borderRadius: '14px',
              padding: '12px 14px',
              textAlign: 'left',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px', flexWrap: 'nowrap' }}>
                <span className="jp-nowrap" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.75rem)', fontWeight: 900, color: '#DC2626' }}>
                  ゴミ？
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
                  [ Go-mi ]
                </span>
              </div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                marginBottom: '4px'
              }}>
                Trash? / Waste?
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                Refers to household refuse, burnables, plastics, bottles, cans, and bulky items.
              </p>
            </div>

            {/* Right Card: MAKASETE */}
            <div style={{
              background: '#FFFFFF',
              border: '2px solid #E2E8F0',
              borderRadius: '14px',
              padding: '12px 14px',
              textAlign: 'left',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px', flexWrap: 'nowrap' }}>
                <span className="jp-nowrap" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.75rem)', fontWeight: 900, color: '#00A86B' }}>
                  まかせて！
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
                  [ Ma-ka-se-te ]
                </span>
              </div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                marginBottom: '4px'
              }}>
                Leave it to us!
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                A reassuring Japanese phrase meaning &ldquo;Relax, we&apos;ll take full care of it!&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: '#F0FDF4',
            color: '#166534',
            border: '1px solid #BBF7D0',
            padding: '4px 10px',
            borderRadius: '9999px'
          }}>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            Ward-Accurate Calendars
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
            padding: '4px 10px',
            borderRadius: '9999px'
          }}>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Accidental Non-Waste Guard
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: '#FAF5FF',
            color: '#6B21A8',
            border: '1px solid #E9D5FF',
            padding: '4px 10px',
            borderRadius: '9999px'
          }}>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            AWS Bedrock Dual-Tier Vision
          </span>
        </div>

        {/* Progress Bar with Countdown */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748B'
          }}>
            <span>Initializing municipal rules knowledge base...</span>
            <span style={{ color: '#00A86B' }}>{secondsLeft}s</span>
          </div>

          <div style={{
            width: '100%',
            height: '10px',
            background: '#E2E8F0',
            borderRadius: '9999px',
            border: '1.5px solid #0F172A',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00A86B, #10B981)',
              borderRadius: '9999px',
              transition: 'width 0.05s linear'
            }} />
          </div>
        </div>

        {/* Tactile "Enter App Now" CTA Button */}
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            maxWidth: '320px',
            background: '#0F172A',
            color: '#FFFFFF',
            border: '2px solid #0F172A',
            borderRadius: '14px',
            padding: '12px 24px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '4px 4px 0 #00A86B',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)';
            e.currentTarget.style.boxShadow = '5px 5px 0 #00A86B';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = '4px 4px 0 #00A86B';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = '2px 2px 0 #00A86B';
          }}
        >
          <span>Enter App Now / すぐに始める</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
