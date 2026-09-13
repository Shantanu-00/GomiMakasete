'use client';

import React, { useState, useMemo } from 'react';
import { 
  DetectedItem, 
  VisionScanResult, 
  NeighborhoodOption,
  ClarificationQuestion,
  ClarificationOption,
  StickerBreakdown
} from '@/lib/types';
import { 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  Edit3, 
  PlusCircle, 
  Info,
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Calendar, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Download, 
  HelpCircle, 
  Scissors, 
  Flame, 
  Battery, 
  AlertOctagon,
  Store,
  Check,
  Package,
  Eye,
  ArrowRight,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';
import { 
  MUNICIPAL_RULES, 
  findAmbiguityQuestion, 
  evaluateItemSizeWithMunicipality 
} from '@/lib/knowledge-rules';
import { 
  buildGoogleCalendarUrl, 
  generateICSContent, 
  downloadICSFile,
  GarbageScheduleEvent 
} from '@/lib/calendar-sync';
import { calculateStickers, evaluateSodaiGomi } from '@/lib/waste-logic';
import CombiniCardModal from './CombiniCardModal';
import StrandsAgentInspector from './StrandsAgentInspector';

interface TriageDashboardProps {
  scanResult: VisionScanResult;
  activeNeighborhood?: NeighborhoodOption;
  activeMunicipalityId?: string;
  activeMunicipalityName?: string;
  language?: AppLanguage;
  onToggleDisposal: (id: string) => void;
  onUpdateItem: (id: string, newName: string, newDim: number) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (name: string, material: string, dim: number) => void;
  onEscalateTier2: () => void;
  isEscalating: boolean;
}

export default function TriageDashboard({
  scanResult,
  activeNeighborhood,
  activeMunicipalityId = 'tokyo_shinjuku',
  activeMunicipalityName = 'Tokyo - Shinjuku City',
  language = 'mix',
  onToggleDisposal,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onEscalateTier2,
  isEscalating
}: TriageDashboardProps) {
  const t = TRANSLATIONS[language];
  const municipalRule = MUNICIPAL_RULES[activeMunicipalityId] || MUNICIPAL_RULES.tokyo_shinjuku;

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDim, setEditDim] = useState(0);

  // Add Missing Item state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newDim, setNewDim] = useState(15);

  // Expandable item disassembly tracking: item.id -> boolean
  const [expandedPrep, setExpandedPrep] = useState<Record<string, boolean>>({});

  // Local clarification answers: item.id -> chosen_answer
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

  // Convenience Store Modal state
  const [combiniModalItem, setCombiniModalItem] = useState<{
    item: DetectedItem;
    stickers: StickerBreakdown;
  } | null>(null);

  // Filter day for schedule strip
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  const togglePrep = (id: string) => {
    setExpandedPrep(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (item: DetectedItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDim(item.estimated_dim_cm);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateItem(id, editName.trim(), editDim);
    }
    setEditingId(null);
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddItem(newName.trim(), newMaterial.trim() || 'General', newDim);
      setNewName('');
      setNewMaterial('');
      setIsAddingNew(false);
    }
  };

  // Filter items by disposal vs safeguard
  const disposalItems = scanResult.items.filter(i => i.is_marked_for_disposal);
  const safeguardItems = scanResult.items.filter(i => !i.is_marked_for_disposal);

  // Bulky waste candidates based on active municipality threshold
  const bulkyCandidates = useMemo(() => {
    return disposalItems.filter(item => {
      const sizeEval = evaluateItemSizeWithMunicipality(
        item.estimated_dim_cm, 
        item.material, 
        activeMunicipalityId
      );
      return sizeEval.is_over_threshold;
    });
  }, [disposalItems, activeMunicipalityId]);

  // Handle Clarification Question Answer selection
  const handleAnswerClarification = (itemId: string, chosenAnswer: string) => {
    setClarificationAnswers(prev => ({
      ...prev,
      [itemId]: chosenAnswer
    }));
  };

  // Handle Dimension Quick Confirm Buttons (<30cm or >=30cm)
  const handleQuickConfirmSize = (item: DetectedItem, isOver: boolean) => {
    const threshold = municipalRule.general_threshold_cm;
    const targetDim = isOver ? threshold + 5 : threshold - 5;
    onUpdateItem(item.id, item.name, targetDim);
  };

  // Check if there are active exceptions that warrant human friction
  const activeExceptions = useMemo(() => {
    const exceptions: Array<{
      type: 'safeguard' | 'size_boundary' | 'ambiguity';
      item: DetectedItem;
      data?: any;
    }> = [];

    // 1. Valuables / Safeguarded personal items
    safeguardItems.forEach(item => {
      exceptions.push({ type: 'safeguard', item });
    });

    // 2. Size boundary items
    disposalItems.forEach(item => {
      const evalSize = evaluateItemSizeWithMunicipality(
        item.estimated_dim_cm, 
        item.material, 
        activeMunicipalityId
      );
      if (evalSize.needs_size_confirmation) {
        exceptions.push({ type: 'size_boundary', item, data: evalSize });
      }
    });

    // 3. Ambiguity questions
    disposalItems.forEach(item => {
      const q = findAmbiguityQuestion(item.name, item.material);
      if (q && !clarificationAnswers[item.id]) {
        exceptions.push({ type: 'ambiguity', item, data: q });
      }
    });

    return exceptions;
  }, [safeguardItems, disposalItems, activeMunicipalityId, clarificationAnswers]);

  // Group disposal items into clear Municipal Stream Buckets
  const streamBuckets = useMemo(() => {
    const buckets: {
      combustible: DetectedItem[];
      plastics: DetectedItem[];
      cans_bottles_pet: DetectedItem[];
      incombustible: DetectedItem[];
      bulky: DetectedItem[];
    } = {
      combustible: [],
      plastics: [],
      cans_bottles_pet: [],
      incombustible: [],
      bulky: []
    };

    disposalItems.forEach(item => {
      const sizeEval = evaluateItemSizeWithMunicipality(
        item.estimated_dim_cm, 
        item.material, 
        activeMunicipalityId
      );

      if (sizeEval.is_over_threshold) {
        buckets.bulky.push(item);
        return;
      }

      const q = findAmbiguityQuestion(item.name, item.material);
      const chosen = clarificationAnswers[item.id];
      const opt = q?.options.find(o => o.chosen_answer === chosen);

      if (opt) {
        if (opt.target_schedule_key === 'combustible') buckets.combustible.push(item);
        else if (opt.target_schedule_key === 'cans_bottles_pet') buckets.cans_bottles_pet.push(item);
        else if (opt.target_schedule_key === 'metal_ceramics_glass') buckets.incombustible.push(item);
        else buckets.combustible.push(item);
        return;
      }

      const lowerMat = item.material.toLowerCase();
      const lowerName = item.name.toLowerCase();

      if (lowerName.includes('pet') || lowerMat.includes('pet') || lowerName.includes('can') || lowerMat.includes('can') || lowerMat.includes('bottle')) {
        buckets.cans_bottles_pet.push(item);
      } else if (lowerMat.includes('plastic') || lowerMat.includes('vinyl') || lowerMat.includes('poly')) {
        buckets.plastics.push(item);
      } else if (lowerMat.includes('metal') || lowerMat.includes('ceramic') || lowerMat.includes('glass') || lowerName.includes('pan') || lowerName.includes('bowl')) {
        buckets.incombustible.push(item);
      } else {
        buckets.combustible.push(item);
      }
    });

    return buckets;
  }, [disposalItems, activeMunicipalityId, clarificationAnswers]);

  // Identify Home Appliance Recycling Act (家電リサイクル法) items
  const restrictedApplianceItems = useMemo(() => {
    const APPLIANCE_KEYWORDS = [
      'refrigerator', 'fridge', 'freezer', '冷蔵庫',
      'washing machine', 'dryer', '洗濯機',
      'television', 'tv', 'テレビ',
      'air conditioner', 'エアコン',
      'personal computer', 'pc', 'laptop', 'パソコン'
    ];

    return disposalItems.filter(item => {
      const lower = item.name.toLowerCase();
      return APPLIANCE_KEYWORDS.some(kw => lower.includes(kw));
    });
  }, [disposalItems]);

  // 7-day schedule map from active neighborhood
  const scheduleEntries = useMemo(() => {
    if (!activeNeighborhood?.schedules) return [];
    return Object.entries(activeNeighborhood.schedules);
  }, [activeNeighborhood]);

  // Calendar sync handlers
  const handleSyncGoogleCalendar = (categoryKey: string, days: string[]) => {
    const event: GarbageScheduleEvent = {
      categoryKey,
      categoryLabel: categoryKey.replace('_', ' ').toUpperCase(),
      categoryLabelJp: 'ごみ収集日',
      emoji: categoryKey === 'combustible' ? '🔥' : '📦',
      days,
      cutoffTime: municipalRule.morning_deadline,
      municipalityName: activeMunicipalityName,
      neighborhoodName: activeNeighborhood?.name_en || 'Your Area'
    };
    const url = buildGoogleCalendarUrl(event);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const handleExportICS = () => {
    if (!activeNeighborhood?.schedules) return;
    const icsString = generateICSContent(
      activeMunicipalityName,
      activeNeighborhood.name_en,
      activeNeighborhood.schedules,
      municipalRule.morning_deadline
    );
    const filename = `GomiSchedule_${activeNeighborhood.name_en.replace(/\s+/g, '_')}.ics`;
    downloadICSFile(filename, icsString);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ========================================================= */}
      {/* STRANDS AGENT LIVE TELEMETRY TRACE (FOR VIDEO DEMO)       */}
      {/* ========================================================= */}
      <StrandsAgentInspector
        scanResult={scanResult}
        activeMunicipalityId={activeMunicipalityId}
        activeNeighborhoodName={activeNeighborhood?.name_en}
      />

      {/* ========================================================= */}
      {/* TOP CONTROL BAR: Ward Grounding, Confidence & SOTA Model  */}
      {/* ========================================================= */}
      <div className="utility-card" style={{ padding: '14px 18px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>
                {activeMunicipalityName}
              </strong>
              {activeNeighborhood && (
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  • {activeNeighborhood.name_en}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Confidence:</span>
              <span className={`badge ${scanResult.overall_confidence >= 0.85 ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                {Math.round(scanResult.overall_confidence * 100)}%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Sodai Limit:</span>
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                {municipalRule.general_threshold_cm} cm
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onEscalateTier2}
              disabled={isEscalating}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.76rem',
                border: '1.5px solid #7C3AED',
                color: '#6D28D9',
                background: '#FAF5FF',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Re-run deep spatial reasoning with Claude 3.7 Sonnet"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>{isEscalating ? 'Reasoning with Claude 3.7...' : '⚡ SOTA Claude 3.7 Reasoner'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Missing Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STAGE 1: PURE OBJECT IDENTIFICATION (Zero Clutter)        */}
      {/* ========================================================= */}
      <section aria-label="Pure Object Detection Layer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              1
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Vision Intake &amp; Pure Object Identification
            </h3>
            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
              ({scanResult.items.length} discrete objects identified)
            </span>
          </div>

          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Raw spatial extraction before municipal binding
          </span>
        </div>

        {/* Clean, Non-Overwhelming Item Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {scanResult.items.map((item) => {
            const isSafeguarded = !item.is_marked_for_disposal;
            return (
              <div
                key={item.id}
                className="utility-card"
                style={{
                  padding: '12px 14px',
                  background: isSafeguarded ? '#F0F9FF' : '#FFFFFF',
                  border: isSafeguarded ? '1.5px solid #BAE6FD' : '1.5px solid #CBD5E1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>{item.name}</strong>
                      {isSafeguarded && (
                        <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>
                          Protected Asset
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      {item.description}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: item.confidence >= 0.9 ? '#059669' : '#D97706',
                    background: item.confidence >= 0.9 ? '#ECFDF5' : '#FFFBEB',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.72rem',
                  color: '#475569',
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: '6px',
                  marginTop: '4px'
                }}>
                  <span>Material: <strong>{item.material}</strong></span>
                  <span>•</span>
                  <span>Size: <strong>~{item.estimated_dim_cm}cm</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* STAGE 2: SMART FRICTION GATE (Exceptions & Interventions)  */}
      {/* ========================================================= */}
      <section aria-label="Smart Friction Verification Gate">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: activeExceptions.length > 0 ? '#D97706' : '#00A86B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              2
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Smart Exception Gate (Human-in-the-Loop)
            </h3>
            {activeExceptions.length > 0 ? (
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                {activeExceptions.length} exception(s) require verification
              </span>
            ) : (
              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                ✓ Confirmed &amp; Grounded
              </span>
            )}
          </div>
        </div>

        {/* When NO exceptions remain -> Smooth Green Confirmation Banner */}
        {activeExceptions.length === 0 ? (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
            fontWeight: 700
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>All items verified. Autonomous municipal stream binding resolved below.</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600 }}>
              Zero manual clicking needed
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* EXCEPTION 1: ACTIVE SAFEGUARDED PERSONAL VALUABLES */}
            {safeguardItems.map((item) => (
              <div
                key={`sg_${item.id}`}
                className="utility-card"
                style={{
                  padding: '14px 18px',
                  border: '2px solid #0284C7',
                  background: '#F0F9FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0
                  }}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.94rem', color: '#0369A1' }}>
                        🛡️ High-Value Personal Asset: {item.name}
                      </strong>
                      <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>
                        Auto-Sequestered
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#0284C7', margin: '2px 0 0 0' }}>
                      The vision model protected your {item.name} from being thrown out. Did you intend to discard this?
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '2px solid #0284C7',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Keep Safe (Protected)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleDisposal(item.id)}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.76rem',
                      color: '#DC2626',
                      border: '1.5px solid #FECACA',
                      background: '#FFF5F5'
                    }}
                  >
                    Actually Throw Out
                  </button>
                </div>
              </div>
            ))}

            {/* EXCEPTION 2: SIZE BOUNDARY CHECK (Near 30cm or 50cm) */}
            {disposalItems.map((item) => {
              const sizeEval = evaluateItemSizeWithMunicipality(
                item.estimated_dim_cm, 
                item.material, 
                activeMunicipalityId
              );
              if (!sizeEval.needs_size_confirmation) return null;

              return (
                <div
                  key={`size_${item.id}`}
                  className="utility-card"
                  style={{
                    padding: '14px 18px',
                    border: '2px solid #F59E0B',
                    background: '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0
                    }}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.94rem', color: '#92400E' }}>
                        📏 Size Threshold Check: {item.name} (~{item.estimated_dim_cm}cm)
                      </strong>
                      <p style={{ fontSize: '0.78rem', color: '#78350F', margin: '2px 0 0 0' }}>
                        In {activeMunicipalityName}, items exceeding <strong>{sizeEval.threshold_cm}cm</strong> become bulky waste (Sodai Gomi).
                      </p>
                    </div>
                  </div>

                  {/* Quick Decision Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleQuickConfirmSize(item, false)}
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF'
                      }}
                    >
                      &lt; {sizeEval.threshold_cm}cm (Standard Trash)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickConfirmSize(item, true)}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        background: '#D97706',
                        border: 'none'
                      }}
                    >
                      ≥ {sizeEval.threshold_cm}cm (Sodai Gomi)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Enter exact cm
                    </button>
                  </div>
                </div>
              );
            })}

            {/* EXCEPTION 3: AMBIGUITY CLARIFICATION QUESTIONS */}
            {disposalItems.map((item) => {
              const question = findAmbiguityQuestion(item.name, item.material);
              if (!question || clarificationAnswers[item.id]) return null;

              return (
                <div
                  key={`amb_${item.id}`}
                  className="utility-card"
                  style={{
                    padding: '14px 18px',
                    border: '2px solid #F59E0B',
                    background: '#FFFBEB'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <strong style={{ fontSize: '0.94rem', color: '#92400E' }}>{item.name}:</strong>
                    <span style={{ fontSize: '0.86rem', color: '#78350F', fontWeight: 600 }}>{question.question}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginTop: '8px' }}>
                    {question.options.map((opt) => (
                      <button
                        key={opt.chosen_answer}
                        type="button"
                        onClick={() => handleAnswerClarification(item.id, opt.chosen_answer)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #FCD34D',
                          background: '#FFFFFF',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#0284C7', marginTop: '2px' }}>
                          → {opt.target_classification}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* STAGE 3: MUNICIPAL STREAM BUCKETS & APPLIANCE LAW ALERT   */}
      {/* ========================================================= */}
      <section aria-label="Municipal Stream Categorization">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              3
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Municipal Stream Buckets ({activeMunicipalityName})
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Tap any item to see physical disassembly micro-actions
          </span>
        </div>

        {/* 🚨 PROHIBITED HOME APPLIANCE RECYCLING ACT BANNER */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#FEF2F2',
          border: '2px solid #EF4444',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.9rem', color: '#B91C1C' }}>
                🚨 HOME APPLIANCE RECYCLING ACT NOTICE (家電リサイクル法規制品)
              </strong>
              <p style={{ fontSize: '0.76rem', color: '#991B1B', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                <strong>Refrigerators (冷蔵庫), Washing Machines/Dryers (洗濯機・乾燥機), TVs (テレビ), and Air Conditioners (エアコン)</strong> cannot be collected via municipal roadside or standard Sodai Gomi. Japanese federal law requires appliance trade-in or booking via certified RKC drop-off.
              </p>
              
              {restrictedApplianceItems.length > 0 && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #FECACA', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#DC2626', fontWeight: 800 }}>
                    Detected in your scan: {restrictedApplianceItems.map(i => i.name).join(', ')}
                  </span>
                  <a
                    href="https://www.rkc.aeha.or.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.72rem', color: '#0284C7', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    RKC Center Portal (0120-059-428) ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Crisp Stream Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          
          {/* BUCKET 1: COMBUSTIBLE WASTE */}
          <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #EF4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame className="w-4 h-4 text-red-500" />
                <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Combustible (燃やすごみ)</strong>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                {streamBuckets.combustible.length}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
              Bag: {municipalRule.bag_requirement_en}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {streamBuckets.combustible.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                  No combustible items
                </div>
              ) : (
                streamBuckets.combustible.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePrep(item.id)}
                    style={{
                      padding: '8px 10px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#0284C7' }}>
                        <span>{expandedPrep[item.id] ? 'Hide Recipe' : 'Disassembly'}</span>
                        {expandedPrep[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>

                    {/* Expandable Disassembly Recipe */}
                    {expandedPrep[item.id] && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '0.74rem' }}>
                        <div style={{ color: '#065F46', fontWeight: 700, marginBottom: '4px' }}>
                          Physical Preparation:
                        </div>
                        <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                          {item.preparation.steps.map((st, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BUCKET 2: RECYCLABLE PLASTICS */}
          <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #0284C7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package className="w-4 h-4 text-blue-500" />
                <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Plastics (容器包装プラ)</strong>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                {streamBuckets.plastics.length}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
              Clean containers, wrappers &amp; packaging films
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {streamBuckets.plastics.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                  No plastic containers
                </div>
              ) : (
                streamBuckets.plastics.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePrep(item.id)}
                    style={{
                      padding: '8px 10px',
                      background: '#F0F9FF',
                      borderRadius: '8px',
                      border: '1px solid #BAE6FD',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#0284C7' }}>
                        <span>{expandedPrep[item.id] ? 'Hide Recipe' : 'Disassembly'}</span>
                        {expandedPrep[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>

                    {expandedPrep[item.id] && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #93C5FD', fontSize: '0.74rem' }}>
                        <div style={{ color: '#0369A1', fontWeight: 700, marginBottom: '4px' }}>
                          Physical Preparation:
                        </div>
                        <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                          {item.preparation.steps.map((st, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BUCKET 3: CANS, BOTTLES & PET */}
          <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #00A86B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Cans &amp; PET (缶・ビン・PET)</strong>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                {streamBuckets.cans_bottles_pet.length}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
              Rinse clean • Peel PET labels &amp; remove caps
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {streamBuckets.cans_bottles_pet.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                  No cans or bottles
                </div>
              ) : (
                streamBuckets.cans_bottles_pet.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePrep(item.id)}
                    style={{
                      padding: '8px 10px',
                      background: '#ECFDF5',
                      borderRadius: '8px',
                      border: '1px solid #A7F3D0',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#047857' }}>
                        <span>{expandedPrep[item.id] ? 'Hide Recipe' : 'Disassembly'}</span>
                        {expandedPrep[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>

                    {expandedPrep[item.id] && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #6EE7B7', fontSize: '0.74rem' }}>
                        <div style={{ color: '#065F46', fontWeight: 700, marginBottom: '4px' }}>
                          Physical Separation Recipe:
                        </div>
                        <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                          {item.preparation.steps.map((st, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                          ))}
                        </ol>

                        {item.preparation.components && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {item.preparation.components.map((c, ci) => (
                              <span key={ci} style={{ background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.68rem' }}>
                                ✂️ {c.name} → {c.destination_stream}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BUCKET 4: INCOMBUSTIBLE / SMALL METAL */}
          <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #64748B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle className="w-4 h-4 text-slate-600" />
                <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Metal &amp; Glass (不燃ごみ)</strong>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                {streamBuckets.incombustible.length}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '8px' }}>
              Pans &lt;{municipalRule.general_threshold_cm}cm, ceramics, lightbulbs
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {streamBuckets.incombustible.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', textAlign: 'center', padding: '12px' }}>
                  No incombustible items
                </div>
              ) : (
                streamBuckets.incombustible.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePrep(item.id)}
                    style={{
                      padding: '8px 10px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#475569' }}>
                        <span>{expandedPrep[item.id] ? 'Hide Recipe' : 'Disassembly'}</span>
                        {expandedPrep[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>

                    {expandedPrep[item.id] && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #94A3B8', fontSize: '0.74rem' }}>
                        {item.preparation.safety_warning && (
                          <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: '4px' }}>
                            ⚠️ {item.preparation.safety_warning}
                          </div>
                        )}
                        <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                          {item.preparation.steps.map((st, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* STAGE 4: HYPER-LOCAL SCHEDULE & 1-TAP CALENDAR SYNC       */}
      {/* ========================================================= */}
      <section aria-label="Pickup Schedule & Calendar Sync">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              4
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Curbside Pickup Schedule &amp; 1-Tap Calendar Sync
            </h3>
          </div>
        </div>

        {/* Actionable Tomorrow / Next Collection Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          border: '2px solid #00A86B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#00A86B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', color: '#34D399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                IMMEDIATE NEXT COLLECTION:
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', margin: '2px 0' }}>
                Tomorrow: 🔥 Burnable Waste (燃やすごみ)
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                Place outside by <strong>{municipalRule.morning_deadline}</strong> at designated station
              </div>
            </div>
          </div>

          {/* 1-Tap Calendar Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSyncGoogleCalendar('combustible', ['Monday', 'Thursday'])}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                fontWeight: 700
              }}
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Add to Google Calendar</span>
            </button>

            <button
              type="button"
              onClick={handleExportICS}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 700
              }}
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download iCal (.ics)</span>
            </button>
          </div>
        </div>

        {/* 7-Day Day-Filter Calendar Strip */}
        <div className="utility-card" style={{ padding: '14px 18px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
              Neighborhood Weekly Timetable ({activeNeighborhood?.name_en || 'Your Area'}):
            </h4>
            {selectedDayFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                style={{ background: 'transparent', border: 'none', color: '#0284C7', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Filter
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', overflowX: 'auto' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const isSelected = selectedDayFilter === day;
              const isNext = day === 'Mon';

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(isSelected ? 'all' : day)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? '#00A86B' : isNext ? '#38BDF8' : '#E2E8F0'}`,
                    background: isSelected ? '#F0FDF4' : isNext ? '#F0F9FF' : '#FFFFFF',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>{day}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {day === 'Mon' || day === 'Thu' ? '🔥 Burn' :
                     day === 'Wed' ? '📦 Paper' :
                     day === 'Fri' ? '🥫 Cans' : '—'}
                  </div>
                  {isNext && (
                    <span style={{ fontSize: '0.58rem', color: '#0284C7', fontWeight: 800 }}>Next</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* STAGE 5: SODAI GOMI & CONVENIENCE STORE CARD              */}
      {/* ========================================================= */}
      <section aria-label="Bulky Sodai Gomi & Convenience Store Card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#D97706',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              5
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Bulky Waste (Sodai Gomi / 粗大ごみ) &amp; Convenience Store Card
            </h3>
          </div>
        </div>

        <div className="utility-card" style={{ padding: '18px 20px', border: '2px solid #D97706', background: '#FFFBEB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>City Booking Portal: {activeMunicipalityName}</span>
              </h4>
              <p style={{ fontSize: '0.76rem', color: '#78350F', margin: '2px 0 0 0' }}>
                Items exceeding <strong>{municipalRule.general_threshold_cm}cm</strong> require advance reservation and municipal revenue stickers.
              </p>
            </div>

            <a
              href="https://sodai.tokyokankyo.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                padding: '8px 14px',
                fontSize: '0.76rem',
                background: '#D97706',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <span>Open Ward Booking Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 3 Step Procedure */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '12px' }}>
            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D97706' }}>Step 1: Reserve Date</div>
              <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                Book on the ward website or call the Sodai Gomi Center. You will receive an appointment date.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D97706' }}>Step 2: Buy Combini Stickers</div>
              <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                Purchase designated stickers at 7-Eleven, FamilyMart, or Lawson.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D97706' }}>Step 3: Put Outside by 8:00 AM</div>
              <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                Write your name/reception number, affix sticker to item, and place outside morning of collection.
              </p>
            </div>
          </div>

          {/* Detected Bulky Items List with 1-Click Combini Card Generation */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <strong style={{ fontSize: '0.84rem', color: '#92400E' }}>
                Bulky Waste Candidates in this Scan:
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#78350F' }}>
                Tap button to generate cashier phrase card in Japanese
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {bulkyCandidates.length === 0 ? (
                <div style={{ fontSize: '0.76rem', color: '#92400E', padding: '10px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                  No items in this scan exceed the {municipalRule.general_threshold_cm}cm bulky threshold.
                </div>
              ) : (
                bulkyCandidates.map((item) => {
                  const fee = 400;
                  const stickers = calculateStickers(fee);

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #FCD34D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', marginLeft: '6px' }}>
                          (~{item.estimated_dim_cm}cm)
                        </span>
                        <div style={{ fontSize: '0.74rem', color: '#00A86B', fontWeight: 700, marginTop: '2px' }}>
                          Stickers Needed: {stickers.summary} (Total ¥{stickers.total_cost_yen})
                        </div>
                      </div>

                      {/* Launch Convenience Store Digital Card */}
                      <button
                        type="button"
                        onClick={() => setCombiniModalItem({ item, stickers })}
                        className="btn btn-primary"
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.76rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#00A86B'
                        }}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Show Convenience Store Card (コンビニカード)</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MODAL: CONVENIENCE STORE CARD                             */}
      {/* ========================================================= */}
      {combiniModalItem && (
        <CombiniCardModal
          isOpen={!!combiniModalItem}
          onClose={() => setCombiniModalItem(null)}
          itemName={combiniModalItem.item.name}
          itemDimCm={combiniModalItem.item.estimated_dim_cm}
          municipalityName={activeMunicipalityName}
          municipalityNameJa={municipalRule.name_ja}
          stickers={combiniModalItem.stickers}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD MISSING ITEM                                   */}
      {/* ========================================================= */}
      {isAddingNew && (
        <div className="modal-overlay" onClick={() => setIsAddingNew(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: '#0F172A' }}>
              Add Missing Room Item
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '14px' }}>
              Add an un-detected object from your pile to prescribe disposal actions.
            </p>
            <form onSubmit={handleAddNewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frying pan, Pizza box, Umbrella..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Material
                </label>
                <input
                  type="text"
                  placeholder="Metal, Plastic, Paper, Ceramic..."
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Longest Dimension (cm)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={newDim}
                  onChange={(e) => setNewDim(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsAddingNew(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ITEM INLINE */}
      {editingId && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px', color: '#0F172A' }}>
              Edit Item Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', marginBottom: '4px' }}>Dimension (cm)</label>
                <input
                  type="number"
                  value={editDim}
                  onChange={(e) => setEditDim(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={() => handleSaveEdit(editingId)} className="btn btn-primary">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
