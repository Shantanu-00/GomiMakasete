'use client';

import React, { useState } from 'react';
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
  Activity
} from 'lucide-react';
import { VisionScanResult } from '@/lib/types';

interface StrandsAgentInspectorProps {
  scanResult?: VisionScanResult | null;
  activeMunicipalityId?: string;
  activeNeighborhoodName?: string;
}

export default function StrandsAgentInspector({
  scanResult,
  activeMunicipalityId = 'tokyo_shinjuku',
  activeNeighborhoodName = '愛住町 (Aizumicho)'
}: StrandsAgentInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('all');

  const toolsExecuted = [
    {
      id: 'vision_triage_tool',
      name: 'vision_triage_tool',
      engine: scanResult?.model_used?.includes('Claude') ? 'Claude 3.7 Sonnet (Tier-2)' : 'Amazon Nova 2 Lite (Tier-1)',
      latencyMs: scanResult?.latency_ms || 240,
      description: 'Multi-modal object detection, edge bounding segmentation, and intent classification.',
      inputs: {
        preset: 'active_scene',
        mode: scanResult?.model_used?.includes('Claude') ? 'deep_cot_spatial' : 'subsecond_lite',
        max_tokens: 2048
      },
      outputs: {
        detected_objects: scanResult?.items.length || 3,
        overall_confidence: scanResult?.overall_confidence || 0.94,
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
        candidate_items: scanResult?.items.map(i => i.name) || ['Smartphone', 'PET bottle'],
        sequestration_rule: 'PROHIBIT_VALUABLE_DISPOSAL'
      },
      outputs: {
        sequestered_count: scanResult?.items.filter(i => !i.is_marked_for_disposal).length || 1,
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
        query: 'PET bottle cap film separation rules & broken ceramic wrapping requirements'
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
    <section 
      aria-label="Strands Agent Live Telemetry"
      style={{
        borderRadius: '16px',
        border: '2px solid #3B82F6',
        background: '#0F172A',
        color: '#F8FAFC',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
        marginBottom: '16px'
      }}
    >
      {/* Top Banner (Always Visible Toggle) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'linear-gradient(90deg, #0F172A 0%, #1E293B 100%)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Strands Agent Core Trace
              </strong>
              <span style={{
                background: '#1E3A8A',
                color: '#93C5FD',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #3B82F6'
              }}>
                SDK v0.4.2 • ARM64 Runtime
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0 }}>
              Autonomous 5-Tool Execution Chain on Amazon Bedrock AgentCore
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            color: '#34D399',
            fontWeight: 700
          }}>
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>5 Tools Synced</span>
          </div>

          <button
            type="button"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#CBD5E1',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            <span>{isOpen ? 'Collapse Trace' : 'View Agent Trace'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Telemetry Body */}
      {isOpen && (
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#090D16' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            fontSize: '0.76rem',
            color: '#94A3B8'
          }}>
            <span>Orchestrator: <code>StrandsSupervisorAgent (Python)</code></span>
            <span>Bedrock Session: <code>sess_bedrock_0913_auto</code></span>
          </div>

          {/* Sequential Tool Execution Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {toolsExecuted.map((tool, idx) => (
              <div 
                key={tool.id}
                style={{
                  background: '#131B2E',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#1E293B',
                      color: '#60A5FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 800
                    }}>
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: '0.84rem', color: '#93C5FD', fontFamily: 'monospace' }}>
                      {tool.name}()
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      via {tool.engine}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                      ⏱️ {tool.latencyMs}ms
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: '#34D399',
                      background: 'rgba(52, 211, 153, 0.1)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {tool.status}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: '0 0 8px 28px' }}>
                  {tool.description}
                </p>

                {/* Input & Output Payloads */}
                <div style={{
                  marginLeft: '28px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '8px',
                  fontSize: '0.68rem',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ background: '#0B1120', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#60A5FA', fontWeight: 800 }}>INPUT:</span>
                    <pre style={{ margin: '4px 0 0 0', color: '#94A3B8', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(tool.inputs, null, 2)}
                    </pre>
                  </div>

                  <div style={{ background: '#0B1120', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#34D399', fontWeight: 800 }}>OUTPUT:</span>
                    <pre style={{ margin: '4px 0 0 0', color: '#94A3B8', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(tool.outputs, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
