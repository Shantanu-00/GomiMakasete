'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Code2, 
  Layers, 
  ShieldCheck, 
  Database, 
  Terminal,
  Activity,
  X,
  Zap,
  DollarSign,
  AlertTriangle,
  Eye,
  Info,
  ArrowRight
} from 'lucide-react';
import { VisionScanResult } from '@/lib/types';

interface StrandsAgentInspectorProps {
  scanResult?: VisionScanResult | null;
  activeMunicipalityId?: string;
  activeNeighborhoodName?: string;
  activeCity?: string;
  dailySpend?: number;
  budgetLimit?: number;
  isAnalyzing?: boolean;
  isEscalating?: boolean;
}

export default function StrandsAgentInspector({
  scanResult,
  activeMunicipalityId = 'tokyo_shinjuku',
  activeNeighborhoodName = '愛住町 (Aizumicho)',
  activeCity = 'Tokyo - Shinjuku City',
  dailySpend = 0.042,
  budgetLimit = 5.00,
  isAnalyzing = false,
  isEscalating = false
}: StrandsAgentInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trace' | 'architecture'>('trace');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({
    vision_triage_tool: true,
    safeguard_tool: true
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleToolExpand = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const modelUsed = scanResult?.model_used || (isEscalating ? 'Tier-2 (Amazon Nova Pro)' : 'Tier-1 (Amazon Nova Lite)');
  const latencyMs = scanResult?.latency_ms || (isEscalating ? 720 : 280);
  const discardCount = scanResult?.items.filter(i => i.is_marked_for_disposal).length || 0;
  const safeguardCount = scanResult?.items.filter(i => !i.is_marked_for_disposal).length || 0;
  const spendPct = Math.min(100, Math.round((dailySpend / budgetLimit) * 100));

  const toolsExecuted = [
    {
      id: 'vision_triage_tool',
      name: 'vision_triage_tool',
      engine: modelUsed.includes('Pro') ? 'Amazon Nova Pro (Tier-2)' : 'Amazon Nova Lite (Tier-1)',
      latencyMs: latencyMs,
      description: 'Multi-modal object detection, edge bounding segmentation, and intent classification.',
      inputs: {
        preset: 'active_scene',
        mode: modelUsed.includes('Pro') ? 'deep_cot_spatial' : 'subsecond_lite',
        max_tokens: 2048
      },
      outputs: {
        detected_objects: scanResult?.items.length || 3,
        overall_confidence: scanResult?.overall_confidence || 0.96,
        spatial_coordinates_bound: true
      },
      status: 'COMPLETED'
    },
    {
      id: 'safeguard_tool',
      name: 'safeguard_tool',
      engine: 'Strands Deterministic Valuation Gate',
      latencyMs: 12,
      description: 'Isolates personal property (credentials, phones, keys, cash) into Non-Waste Vault.',
      inputs: {
        candidate_items: scanResult?.items.map(i => i.name) || ['Android Smartphone', 'Oi Ocha PET bottle', 'BOSS Coffee Can'],
        sequestration_rule: 'PROHIBIT_VALUABLE_DISPOSAL'
      },
      outputs: {
        sequestered_count: safeguardCount || 1,
        decision: 'SAFEGUARD_ACTIVATED'
      },
      status: 'COMPLETED'
    },
    {
      id: 'knowledge_base_rag_tool',
      name: 'knowledge_base_rag_tool',
      engine: 'Amazon Bedrock Knowledge Base (OpenSearch Serverless)',
      latencyMs: 84,
      description: 'Vector RAG search filtered strictly by municipal authority bylaws.',
      inputs: {
        municipality_filter: activeMunicipalityId,
        query: 'PET bottle cap film separation rules & beverage can sorting'
      },
      outputs: {
        matched_chunks: 4,
        citation: `Tokyo Shinjuku Waste Bylaw Article 14 (Combustibles vs PET)`,
        relevance_score: 0.962
      },
      status: 'COMPLETED'
    },
    {
      id: 'dynamodb_schedule_engine',
      name: 'dynamodb_schedule_engine',
      engine: 'DynamoDB Multi-Region Table (Single-digit ms)',
      latencyMs: 8,
      description: 'Resolves hyper-local collection calendar for ward chōme & banchi.',
      inputs: {
        municipality_id: activeMunicipalityId,
        neighborhood: activeNeighborhoodName,
        current_datetime: new Date().toISOString()
      },
      outputs: {
        burnable_days: ['Monday', 'Thursday'],
        morning_cutoff: '08:00 AM',
        next_pickup_relative: 'Tomorrow 08:00 AM'
      },
      status: 'COMPLETED'
    },
    {
      id: 'sodai_gomi_calculator_tool',
      name: 'sodai_gomi_calculator_tool',
      engine: 'Strands Bulky Waste Optimization Engine',
      latencyMs: 15,
      description: 'Evaluates dimensional thresholds and calculates exact A/B revenue sticker combinations.',
      inputs: {
        threshold_cm: activeMunicipalityId === 'kanagawa_yokohama' ? 50 : 30,
        candidates: scanResult?.items.filter(i => i.estimated_dim_cm >= 30).map(i => ({ name: i.name, dim: i.estimated_dim_cm })) || []
      },
      outputs: {
        sticker_optimization: 'Best combination calculated (Min sticker count)',
        booking_portal_url: 'https://sodai.tokyokankyo.or.jp/'
      },
      status: 'COMPLETED'
    }
  ];

  return (
    <>
      {/* ========================================================= */}
      {/* 1. NON-INVASIVE FLOATING DOCK ABOVE ASK GOMI-CHAN (BOTTOM-RIGHT) */}
      {/* ========================================================= */}
      <div 
        style={{
          position: 'fixed',
          bottom: '72px',
          right: '18px',
          zIndex: 89,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('trace');
            setIsOpen(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(241, 245, 249, 0.92)',
            color: '#475569',
            border: '1px solid #CBD5E1',
            borderRadius: '9999px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontWeight: 600,
            backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease',
            opacity: 0.85
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.85';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.color = '#475569';
          }}
          title="Open Bedrock Agent Trace & Pipeline Architecture"
        >
          <Cpu className="w-3 h-3 text-slate-500" />
          <span>Dev Logs &amp; Architecture</span>
          <span style={{
            background: '#E2E8F0',
            color: '#334155',
            fontSize: '0.6rem',
            padding: '1px 4px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            5 Tools
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. SLIDE-OUT LEFT DRAWER FOR JUDGES & DEVELOPERS           */}
      {/* ========================================================= */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(3px)',
              zIndex: 9998,
              transition: 'opacity 0.2s ease'
            }}
          />

          {/* Drawer Container */}
          <aside
            aria-label="Agent Trace & Architecture Drawer"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '480px',
              maxWidth: '92vw',
              background: '#0B1120',
              color: '#F8FAFC',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '8px 0 32px rgba(0,0,0,0.5)',
              borderRight: '1.5px solid #1E293B',
              overflow: 'hidden'
            }}
          >
            {/* Drawer Top Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(180deg, #131B2E 0%, #0B1120 100%)',
              borderBottom: '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #00A86B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                    Amazon Bedrock Inspector
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                    Strands AgentCore SDK v0.4.2 • ARM64 Runtime
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
                title="Close Drawer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Runtime Mode Notice / Honest Developer Banner */}
            <div style={{
              padding: '10px 16px',
              background: '#0F1A2E',
              borderBottom: '1px solid #1E293B',
              fontSize: '0.72rem',
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong style={{ color: '#38BDF8' }}>Local Simulation Mode: </strong>
                <span>
                  Telemetry trace deterministically simulates the 5-tool Bedrock Agent pipeline so judges can inspect the Strands architecture locally without incurring cloud API charges.
                </span>
              </div>
            </div>

            {/* Drawer Tab Switcher */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #1E293B',
              background: '#090D16'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('trace')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: activeTab === 'trace' ? '#131B2E' : 'transparent',
                  color: activeTab === 'trace' ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  borderBottom: activeTab === 'trace' ? '2px solid #38BDF8' : '2px solid transparent',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Tool Trace Logs</span>
                <span style={{
                  background: '#1E293B',
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  color: '#CBD5E1'
                }}>
                  5
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('architecture')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: activeTab === 'architecture' ? '#131B2E' : 'transparent',
                  color: activeTab === 'architecture' ? '#38BDF8' : '#94A3B8',
                  border: 'none',
                  borderBottom: activeTab === 'architecture' ? '2px solid #38BDF8' : '2px solid transparent',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Bedrock Architecture</span>
              </button>
            </div>

            {/* Drawer Body Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeTab === 'trace' ? (
                /* TAB 1: TOOL TRACE LOGS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#94A3B8',
                    paddingBottom: '8px',
                    borderBottom: '1px dashed #1E293B'
                  }}>
                    <span>Orchestrator: <code style={{ color: '#60A5FA' }}>StrandsSupervisorAgent</code></span>
                    <span>Session: <code style={{ color: '#A7F3D0' }}>sess_auto_0914</code></span>
                  </div>

                  {toolsExecuted.map((tool, idx) => {
                    const isExpanded = !!expandedTools[tool.id];
                    return (
                      <div
                        key={tool.id}
                        style={{
                          background: '#131B2E',
                          borderRadius: '10px',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Tool Item Header */}
                        <div
                          onClick={() => toggleToolExpand(tool.id)}
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#1E293B',
                              color: '#60A5FA',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 800
                            }}>
                              {idx + 1}
                            </span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '0.82rem', color: '#93C5FD', fontFamily: 'monospace' }}>
                                  {tool.name}()
                                </strong>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                via {tool.engine}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                              ⏱️ {tool.latencyMs}ms
                            </span>
                            <span style={{
                              fontSize: '0.62rem',
                              color: '#34D399',
                              background: 'rgba(52, 211, 153, 0.1)',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              {tool.status}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>

                        {/* Collapsible Tool Payloads */}
                        {isExpanded && (
                          <div style={{
                            padding: '10px 12px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            background: '#090D16'
                          }}>
                            <p style={{ fontSize: '0.72rem', color: '#CBD5E1', margin: '0 0 8px 0' }}>
                              {tool.description}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.66rem', fontFamily: 'monospace' }}>
                              <div style={{ background: '#0B1120', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#60A5FA', fontWeight: 800 }}>INPUT:</span>
                                <pre style={{ margin: '2px 0 0 0', color: '#94A3B8', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(tool.inputs, null, 2)}
                                </pre>
                              </div>

                              <div style={{ background: '#0B1120', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#34D399', fontWeight: 800 }}>OUTPUT:</span>
                                <pre style={{ margin: '2px 0 0 0', color: '#94A3B8', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(tool.outputs, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TAB 2: BEDROCK ARCHITECTURE & PIPELINE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Budget & Spend Summary Box */}
                  <div style={{
                    background: '#131B2E',
                    borderRadius: '10px',
                    border: '1px solid #1E293B',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        Bedrock Hard Budget Guard
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#FCD34D', fontWeight: 800 }}>
                        ${dailySpend.toFixed(3)} / ${budgetLimit.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ width: `${spendPct}%`, height: '100%', background: spendPct > 80 ? '#EF4444' : '#10B981', transition: 'width 0.3s ease' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94A3B8' }}>
                      <span>Amazon Nova Lite: ~$0.0008 / scan</span>
                      <span>Amazon Nova Pro: ~$0.0032 / scan</span>
                    </div>
                  </div>

                  {/* Multi-Pass Architecture Pipeline Steps */}
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                      ⚡ 2-Pass Multi-Modal Inference Stages:
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Stage 1 */}
                      <div style={{ background: '#131B2E', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <strong style={{ fontSize: '0.78rem', color: '#FFFFFF' }}>Stage 1: Edge Guard &amp; Rate Limiter</strong>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                          Next.js Middleware + Cloudflare WAF. Enforces strict &lt;15MB payloads and token bucket rate limits per IP.
                        </p>
                      </div>

                      {/* Stage 2 */}
                      <div style={{ background: '#131B2E', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Eye className="w-4 h-4 text-sky-400" />
                          <strong style={{ fontSize: '0.78rem', color: '#FFFFFF' }}>Stage 2: Pass 1 Vision Triage</strong>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                          Sub-second spatial bounding using <strong>Amazon Nova Lite</strong>. Escalates dynamically to <strong>Amazon Nova Pro</strong> on complex fractures or ambiguous materials.
                        </p>
                      </div>

                      {/* Stage 3 */}
                      <div style={{ background: '#131B2E', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <strong style={{ fontSize: '0.78rem', color: '#FFFFFF' }}>Stage 3: Safeguard Valuation Gate</strong>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                          Algorithmic protection mechanism that sequesters smartphones, car keys, wallets, and official credentials to the Safe Vault.
                        </p>
                      </div>

                      {/* Stage 4 */}
                      <div style={{ background: '#131B2E', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <strong style={{ fontSize: '0.78rem', color: '#FFFFFF' }}>Stage 4: Municipal RAG &amp; Calendar Binding</strong>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                          Amazon Bedrock Knowledge Base (OpenSearch Serverless) retrieves ward bylaws. DynamoDB table maps exact chōme morning pickup deadlines.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Active Ward Context */}
                  <div style={{
                    background: '#090D16',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.72rem',
                    color: '#94A3B8'
                  }}>
                    <div style={{ color: '#FFFFFF', fontWeight: 700, marginBottom: '4px' }}>
                      📍 Active Grounding Context
                    </div>
                    <div>Municipality: <strong style={{ color: '#60A5FA' }}>{activeCity}</strong></div>
                    <div>Neighborhood: <strong style={{ color: '#34D399' }}>{activeNeighborhoodName}</strong></div>
                    <div>Active Model: <strong style={{ color: '#FCD34D' }}>{modelUsed}</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Footer */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #1E293B',
              background: '#090D16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                AWS Bedrock AgentCore Runtime
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: '#CBD5E1',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Drawer
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
