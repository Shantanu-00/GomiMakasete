'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  Check
} from 'lucide-react';
import { AppLanguage } from '@/lib/translations';

interface AnalysisStepperProps {
  isAnalyzing: boolean;
  isEscalating: boolean;
  modelUsed?: string;
  latencyMs?: number;
  safeguardCount?: number;
  discardCount?: number;
  activeCity?: string;
  activeNeighborhood?: string;
  dailySpend?: number;
  budgetLimit?: number;
  language?: AppLanguage;
}

export default function AnalysisStepper({
  isAnalyzing,
  isEscalating,
  modelUsed = 'Tier-1 (Amazon Nova 2 Lite)',
  latencyMs = 280,
  safeguardCount = 1,
  discardCount = 2,
  activeCity = 'Shinjuku City, Tokyo',
  activeNeighborhood = '愛住町 (Aizumicho)',
  dailySpend = 0.042,
  budgetLimit = 5.00,
  language = 'mix'
}: AnalysisStepperProps) {
  const [currentStep, setCurrentStep] = useState<number>(4);

  // Animate steps during analysis
  useEffect(() => {
    if (isAnalyzing || isEscalating) {
      setCurrentStep(1);
      const t1 = setTimeout(() => setCurrentStep(2), 200);
      const t2 = setTimeout(() => setCurrentStep(3), 500);
      const t3 = setTimeout(() => setCurrentStep(4), 850);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setCurrentStep(4);
    }
  }, [isAnalyzing, isEscalating]);

  const steps = [
    {
      stepNumber: 1,
      title: 'Edge Guard & Budget Check',
      titleJp: 'エッジ防護・予算チェック',
      model: 'Cloudflare / Next.js Middleware',
      status: currentStep > 1 ? 'passed' : currentStep === 1 ? 'running' : 'waiting',
      detail: `Payload <5MB OK • IP Rate Limiter OK • Daily Spend $${dailySpend.toFixed(3)} / $${budgetLimit.toFixed(2)}`,
      icon: ShieldCheck,
      color: '#00A86B'
    },
    {
      stepNumber: 2,
      title: 'Pass 1: Vision Triage & Physical State',
      titleJp: '第1パス: 物体検知 & 破損・油分状態判定',
      model: isEscalating ? 'Claude 3.7 Sonnet (Sonnet 5)' : 'Amazon Nova 2 Lite',
      status: currentStep > 2 ? 'passed' : currentStep === 2 ? 'running' : 'waiting',
      detail: 'Detects discrete objects, materials, fracture lines (broken bowl), and grease/oil contamination',
      icon: Eye,
      color: '#2563EB'
    },
    {
      stepNumber: 3,
      title: 'Safeguard & Value Sequestration',
      titleJp: 'セーフガード隔離・貴重品保護',
      model: 'Deterministic Valuation Gate',
      status: currentStep > 3 ? 'passed' : currentStep === 3 ? 'running' : 'waiting',
      detail: `${safeguardCount} high-value asset(s) sequestered to Safe Vault (No accidental trashing)`,
      icon: AlertTriangle,
      color: '#F59E0B'
    },
    {
      stepNumber: 4,
      title: 'Pass 2: Municipal Rule & Schedule Binding',
      titleJp: '第2パス: 自治体分別 & 回収カレンダー照合',
      model: 'Strands SDK + Bedrock Knowledge Base',
      status: currentStep === 4 ? 'passed' : 'running',
      detail: `Bound to ${activeCity} (${activeNeighborhood}) • Next pickup computed • Sodai Gomi calculated`,
      icon: Sparkles,
      color: '#8B5CF6'
    }
  ];

  return (
    <div 
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '2px solid #0F172A',
        boxShadow: '4px 4px 0 #0F172A',
        padding: '18px 22px',
        marginBottom: '24px'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#E6F7F0', border: '1.5px solid #00A86B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00A86B' }}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              2-Pass Multi-Modal Inference Pipeline
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
              Autonomous Bedrock AgentCore Workflow with Hard Budget Guard
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Budget Limit Badge */}
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px', 
              background: '#F0FDF4', 
              border: '1.5px solid #00A86B', 
              borderRadius: '20px', 
              padding: '3px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#065F46'
            }}
            title="Strict $5.00 daily spend hard budget across Amazon Bedrock model invocations"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bedrock Daily Limit: <strong>${dailySpend.toFixed(3)}</strong> / ${budgetLimit.toFixed(2)}</span>
          </div>

          {/* Model Badge */}
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px', 
              background: '#EFF6FF', 
              border: '1.5px solid #3B82F6', 
              borderRadius: '20px', 
              padding: '3px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#1E40AF'
            }}
          >
            <Clock className="w-3 h-3 text-blue-600" />
            <span>{latencyMs}ms • {modelUsed}</span>
          </div>
        </div>
      </div>

      {/* 4 Pipeline Steps */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '12px' 
        }}
      >
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.status === 'passed';
          const isRunning = step.status === 'running';

          return (
            <div
              key={step.stepNumber}
              style={{
                borderRadius: '12px',
                padding: '12px',
                background: isRunning ? '#FEFCE8' : isDone ? '#F8FAFC' : '#FAFBFD',
                border: isRunning ? '2px solid #F59E0B' : isDone ? '1.5px solid #CBD5E1' : '1px dashed #CBD5E1',
                boxShadow: isRunning ? '2px 2px 0 #F59E0B' : 'none',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Step indicator header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span 
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#64748B',
                    letterSpacing: '0.04em'
                  }}
                >
                  Step 0{step.stepNumber}
                </span>

                {isDone ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#00A86B', fontSize: '0.68rem', fontWeight: 800 }}>
                    <Check className="w-3.5 h-3.5" /> Done
                  </span>
                ) : isRunning ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontSize: '0.68rem', fontWeight: 800 }}>
                    <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full" /> Running
                  </span>
                ) : (
                  <span style={{ color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700 }}>Queued</span>
                )}
              </div>

              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon className="w-4 h-4" style={{ color: step.color, flexShrink: 0 }} />
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                  {language === 'ja' ? step.titleJp : step.title}
                </h4>
              </div>

              {/* Model Tag */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: step.color, marginBottom: '6px' }}>
                ⚙️ {step.model}
              </div>

              {/* Detail */}
              <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0, lineHeight: 1.35 }}>
                {step.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
