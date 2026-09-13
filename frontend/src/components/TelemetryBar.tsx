'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Clock, 
  Shield, 
  DollarSign, 
  CheckCircle2, 
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface TelemetryBarProps {
  isAnalyzing: boolean;
  isEscalating: boolean;
  modelUsed: string;
  latencyMs: number;
  safeguardCount: number;
  discardCount: number;
  activeCity: string;
  activeNeighborhood: string;
  dailySpend: number;
  budgetLimit?: number;
  language?: AppLanguage;
}

export default function TelemetryBar({
  isAnalyzing,
  isEscalating,
  modelUsed,
  latencyMs,
  safeguardCount,
  discardCount,
  activeCity,
  activeNeighborhood,
  dailySpend,
  budgetLimit = 5.00,
  language = 'mix'
}: TelemetryBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = TRANSLATIONS[language];

  const spendPct = Math.min(100, Math.round((dailySpend / budgetLimit) * 100));

  return (
    <section 
      aria-label="Inference Telemetry"
      style={{
        margin: '0 0 16px 0',
        borderRadius: '12px',
        background: '#0F172A',
        color: '#F8FAFC',
        border: '1.5px solid #334155',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
        overflow: 'hidden',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Sleek Compact ~38px Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          minHeight: '38px',
          cursor: 'pointer',
          flexWrap: 'wrap',
          gap: '8px',
          userSelect: 'none'
        }}
      >
        {/* Left: Model & Pipeline Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap className={`w-4 h-4 ${isAnalyzing || isEscalating ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.02em', color: '#38BDF8' }}>
              BEDROCK PIPELINE:
            </span>
          </div>

          <span 
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: isEscalating ? '#581C87' : '#1E293B',
              color: isEscalating ? '#E9D5FF' : '#E2E8F0',
              border: `1px solid ${isEscalating ? '#A855F7' : '#475569'}`
            }}
          >
            {isEscalating ? 'Claude 3.7 Sonnet (Tier-2)' : modelUsed}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#94A3B8' }}>
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{isAnalyzing ? 'Inferring...' : `${latencyMs}ms`}</span>
          </div>
        </div>

        {/* Center: Live Counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem' }}>
          <span style={{ color: '#4ADE80', fontWeight: 700 }}>
            ● {discardCount} Discard
          </span>
          <span style={{ color: '#38BDF8', fontWeight: 700 }}>
            ● {safeguardCount} Safeguarded
          </span>
        </div>

        {/* Right: Spent & Collapsible Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#CBD5E1' }}>
            <span>Spent:</span>
            <strong style={{ color: '#FCD34D' }}>${dailySpend.toFixed(3)}</strong>
            <span style={{ color: '#64748B' }}>/ ${budgetLimit.toFixed(2)}</span>
            <div style={{ width: '36px', height: '5px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${spendPct}%`, height: '100%', background: spendPct > 80 ? '#EF4444' : '#10B981' }} />
            </div>
          </div>

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: '#1E293B',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '2px 8px',
              color: '#94A3B8',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span>{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded 4-Step Pipeline Drawer */}
      {isExpanded && (
        <div 
          style={{
            borderTop: '1px solid #334155',
            padding: '16px 20px',
            background: '#0B1120',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Amazon Bedrock 2-Pass Architecture Diagnostics</span>
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
              Grounding: {activeCity} • {activeNeighborhood}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {/* Step 1 */}
            <div style={{ background: '#1E293B', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontWeight: 700, marginBottom: '4px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#0284C7', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem' }}>1</span>
                <span>Fast Edge Perception</span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                Amazon Nova 2 Lite analyzes bounding boxes, multi-item visual segmentation, and preliminary materials.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: '#1E293B', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontWeight: 700, marginBottom: '4px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem' }}>2</span>
                <span>Safeguard & Value Guard</span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                Deterministic filter isolates credentials, electronics, and valuables, protecting them from accidental discard.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: '#1E293B', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FBBF24', fontWeight: 700, marginBottom: '4px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#D97706', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem' }}>3</span>
                <span>Municipal Knowledge Binding</span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                Grounds items against {activeCity} rules (30cm vs 50cm thresholds, mandatory bag types, and pickup cadence).
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ background: '#1E293B', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A78BFA', fontWeight: 700, marginBottom: '4px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#7C3AED', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem' }}>4</span>
                <span>Safety & Disassembly</span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                Prescribes aerosol degassing, broken glass containment in newspaper with 「キケン」, and PET bottle peeling.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
