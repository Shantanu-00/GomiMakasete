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
  Cpu,
  PhoneCall,
  Tag,
  Copy,
  CheckSquare,
  Square,
  FileText,
  ShoppingBag
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';
import { 
  MUNICIPAL_RULES, 
  findAmbiguityQuestion, 
  evaluateItemSizeWithMunicipality 
} from '@/lib/knowledge-rules';
import { 
  buildGoogleCalendarUrl, 
  buildDayManifestGoogleCalendarUrl,
  getNextDateForDayName,
  generateICSContent, 
  downloadICSFile,
  GarbageScheduleEvent 
} from '@/lib/calendar-sync';
import { calculateStickers, evaluateSodaiGomi } from '@/lib/waste-logic';
import CombiniCardModal from './CombiniCardModal';

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

  // Track confirmed safeguards so clicking "Keep Safe" dismisses exception from the gate
  const [confirmedSafeguards, setConfirmedSafeguards] = useState<Record<string, boolean>>({});

  // Filter day for schedule strip
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  // Bulky Waste Booking Center state
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('2026-09-18');
  const [receptionNumber, setReceptionNumber] = useState<string>('4829');
  const [isEditingReception, setIsEditingReception] = useState<boolean>(false);
  const [combiniCopied, setCombiniCopied] = useState<boolean>(false);
  const [bookingChecklist, setBookingChecklist] = useState<Record<string, boolean>>({
    step1_reserved: false,
    step2_stickers_bought: false,
    step3_labeled: false,
    step4_pasted: false,
    step5_placed_outside: false
  });

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

  // Calculate exact official Sodai Gomi fees, stickers, and combined totals
  const bulkyEvaluations = useMemo(() => {
    return bulkyCandidates.map(item => {
      const sodai = evaluateSodaiGomi(item.name, item.estimated_dim_cm);
      const fee = sodai.fee_yen || (item.estimated_dim_cm > 80 ? 800 : 400);
      const stickers = sodai.stickers || calculateStickers(fee);
      return {
        item,
        sodai,
        fee,
        stickers
      };
    });
  }, [bulkyCandidates]);

  const totalBulkyFee = useMemo(() => {
    return bulkyEvaluations.reduce((acc, curr) => acc + curr.fee, 0);
  }, [bulkyEvaluations]);

  const totalStickerA = useMemo(() => {
    return bulkyEvaluations.reduce((acc, curr) => acc + curr.stickers.sticker_a_count, 0);
  }, [bulkyEvaluations]);

  const totalStickerB = useMemo(() => {
    return bulkyEvaluations.reduce((acc, curr) => acc + curr.stickers.sticker_b_count, 0);
  }, [bulkyEvaluations]);

  const totalCombinedStickers: StickerBreakdown = useMemo(() => {
    const parts: string[] = [];
    if (totalStickerA > 0) parts.push(`${totalStickerA}x Sticker A (A券 ¥200)`);
    if (totalStickerB > 0) parts.push(`${totalStickerB}x Sticker B (B券 ¥300)`);
    return {
      sticker_a_count: totalStickerA,
      sticker_b_count: totalStickerB,
      total_stickers: totalStickerA + totalStickerB,
      summary: parts.join(' + ') || 'None',
      total_cost_yen: totalBulkyFee
    };
  }, [totalStickerA, totalStickerB, totalBulkyFee]);

  const cashierJapanesePhrase = useMemo(() => {
    const lines: string[] = [];
    if (totalStickerA > 0) lines.push(`・A券 (200円) × ${totalStickerA}枚 = ${(totalStickerA * 200).toLocaleString()}円`);
    if (totalStickerB > 0) lines.push(`・B券 (300円) × ${totalStickerB}枚 = ${(totalStickerB * 300).toLocaleString()}円`);

    return `【店員さんへ / To Store Clerk】
すみません、${municipalRule.name_ja}の粗大ごみ処理券を購入したいです。
(Sumimasen, ${municipalRule.name_ja} no sodai gomi shori-ken o kounyuu shitai desu.)

購入券種 / Requested Stickers:
${lines.join('\n')}

合計金額: ¥${totalBulkyFee.toLocaleString()} (非課税)
現金でお支払いします。よろしくお願いします。`;
  }, [municipalRule.name_ja, totalStickerA, totalStickerB, totalBulkyFee]);

  const handleCopyCashierScript = async () => {
    try {
      await navigator.clipboard.writeText(cashierJapanesePhrase);
      setCombiniCopied(true);
      setTimeout(() => setCombiniCopied(false), 2500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const toggleChecklistItem = (key: string) => {
    setBookingChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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

    // 1. Valuables / Safeguarded personal items (only if not yet confirmed safe by resident)
    safeguardItems.forEach(item => {
      if (!confirmedSafeguards[item.id]) {
        exceptions.push({ type: 'safeguard', item });
      }
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
      small_appliances: DetectedItem[];
      bulky: DetectedItem[];
    } = {
      combustible: [],
      plastics: [],
      cans_bottles_pet: [],
      incombustible: [],
      small_appliances: [],
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

      // Small Electronics & Lithium-Ion Battery check (Small Home Appliance Act)
      const lowerMat = item.material.toLowerCase();
      const lowerName = item.name.toLowerCase();
      const isSmallElectronic = ['phone', 'smartphone', 'iphone', 'android', 'laptop', 'tablet', 'power bank', 'battery', '充電器', 'スマホ', '携帯'].some(k => lowerName.includes(k) || lowerMat.includes(k));
      if (isSmallElectronic) {
        buckets.small_appliances.push(item);
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

      if (item.preparation?.components && item.preparation.components.length > 0) {
        item.preparation.components.forEach(comp => {
          const compItem: DetectedItem = {
            ...item,
            id: `${item.id}-${comp.name.replace(/\s+/g, '-')}`,
            name: `${comp.name} (from ${item.name})`,
            material: comp.material,
            preparation: {
              action_type: 'NONE',
              action_label: '',
              action_label_jp: '',
              badge_color: 'slate',
              steps: []
            }
          };
          
          const lowerMat = comp.material.toLowerCase();
          const lowerName = comp.name.toLowerCase();
          const lowerDest = (comp.destination_stream || '').toLowerCase();

          if (lowerDest.includes('plastic') || lowerDest.includes('プラ') || lowerMat.includes('plastic') || lowerMat.includes('vinyl') || lowerMat.includes('poly')) {
            buckets.plastics.push(compItem);
          } else if (lowerDest.includes('pet') || lowerName.includes('pet') || lowerMat.includes('pet') || lowerName.includes('can') || lowerMat.includes('can') || lowerName.includes('bottle')) {
            buckets.cans_bottles_pet.push(compItem);
          } else if (lowerDest.includes('metal') || lowerDest.includes('glass') || lowerDest.includes('ceramic') || lowerMat.includes('metal') || lowerMat.includes('ceramic') || lowerMat.includes('glass') || lowerName.includes('pan') || lowerName.includes('bowl')) {
            buckets.incombustible.push(compItem);
          } else {
            buckets.combustible.push(compItem);
          }
        });
        return;
      }

      if (lowerName.includes('pet') || lowerMat.includes('pet') || lowerName.includes('can') || lowerName.includes('can') || lowerName.includes('bottle')) {
        buckets.cans_bottles_pet.push(item);
      } else if (lowerMat.includes('plastic') || lowerMat.includes('vinyl') || lowerMat.includes('poly')) {
        buckets.plastics.push(item);
      } else if (lowerMat.includes('metal') || lowerMat.includes('glass') || lowerMat.includes('ceramic') || lowerName.includes('pan') || lowerName.includes('bowl')) {
        buckets.incombustible.push(item);
      } else {
        buckets.combustible.push(item);
      }
    });

    return buckets;
  }, [disposalItems, activeMunicipalityId, clarificationAnswers]);

  // Identify items that require disassembly
  const itemsRequiringDisassembly = useMemo(() => {
    return disposalItems.filter(item => item.preparation?.components && item.preparation.components.length > 0);
  }, [disposalItems]);

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

  // Map 7 days with their matching detected items from the buckets
  const weeklyScheduleData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sched = activeNeighborhood?.schedules || {};

    return days.map((day, idx) => {
      const fullDay = fullDayNames[idx];
      const streams: Array<{
        name: string;
        key: string;
        color: string;
        bg: string;
        items: DetectedItem[];
      }> = [];

      Object.entries(sched).forEach(([k, daysArr]) => {
        const matches = (daysArr as string[]).some(d => 
          d.toLowerCase().includes(fullDay.toLowerCase()) || 
          d.toLowerCase().includes(day.toLowerCase())
        );

        if (matches) {
          if (k === 'combustible') {
            streams.push({
              name: '🔥 Combustible (燃やすごみ)',
              key: 'combustible',
              color: '#B91C1C',
              bg: '#FEE2E2',
              items: streamBuckets.combustible
            });
          } else if (k === 'plastic_packaging') {
            streams.push({
              name: '📦 Plastics (容器包装プラ)',
              key: 'plastics',
              color: '#0369A1',
              bg: '#E0F2FE',
              items: streamBuckets.plastics
            });
          } else if (k === 'cans_bottles_pet') {
            streams.push({
              name: '🥫 Cans & PET (缶・ビン・PET)',
              key: 'cans_bottles_pet',
              color: '#047857',
              bg: '#DCFCE7',
              items: streamBuckets.cans_bottles_pet
            });
          } else if (k === 'resources') {
            streams.push({
              name: '♻️ Recyclables (資源ごみ - Cans, PET & Plastics)',
              key: 'resources',
              color: '#047857',
              bg: '#DCFCE7',
              items: [...streamBuckets.plastics, ...streamBuckets.cans_bottles_pet]
            });
          } else if (k.includes('metal') || k.includes('glass') || k.includes('non_combustible') || k.includes('small_metal')) {
            streams.push({
              name: '🔨 Metal & Glass (不燃ごみ)',
              key: 'incombustible',
              color: '#334155',
              bg: '#F1F5F9',
              items: streamBuckets.incombustible
            });
          }
        }
      });

      const totalItemsCount = streams.reduce((acc, s) => acc + s.items.length, 0);

      return {
        day,
        fullDay,
        streams,
        totalItemsCount
      };
    });
  }, [activeNeighborhood, streamBuckets]);

  // Find the exact upcoming collection day that actually has scanned items ready to throw out
  const nextItemDisposalDay = useMemo(() => {
    // Check days in sequence starting from today/tomorrow
    const now = new Date();
    const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon=1..Sat=6, Sun=0
    const todayIndex = now.getDay();
    const isPastCutoff = now.getHours() >= 8;

    // Collect all scheduled days that have items
    const daysWithItems = weeklyScheduleData.filter(d => d.totalItemsCount > 0);
    if (daysWithItems.length === 0) {
      // If no items classified yet, fallback to first day with any neighborhood schedule
      const firstScheduledDay = weeklyScheduleData.find(d => d.streams.length > 0);
      if (firstScheduledDay) {
        const targetDate = getNextDateForDayName(firstScheduledDay.fullDay);
        return {
          dayData: firstScheduledDay,
          targetDate,
          isItemSpecific: false
        };
      }
      return null;
    }

    // Sort daysWithItems by proximity to today
    const sorted = [...daysWithItems].map(d => {
      const targetDate = getNextDateForDayName(d.fullDay);
      return {
        dayData: d,
        targetDate,
        diffMs: targetDate.getTime() - now.getTime(),
        isItemSpecific: true
      };
    }).sort((a, b) => a.diffMs - b.diffMs);

    return sorted[0] || null;
  }, [weeklyScheduleData]);

  // Calendar sync handlers
  const handleSyncNextTrashDayToCalendar = () => {
    if (!nextItemDisposalDay) return;
    const { dayData, targetDate, isItemSpecific } = nextItemDisposalDay;
    
    if (isItemSpecific) {
      const url = buildDayManifestGoogleCalendarUrl({
        dayName: dayData.fullDay,
        date: targetDate,
        streams: dayData.streams.filter(s => s.items.length > 0).map(s => ({
          name: s.name,
          key: s.key,
          items: s.items.map(i => ({ name: i.name, id: i.id }))
        })),
        cutoffTime: municipalRule.morning_deadline,
        municipalityName: activeMunicipalityName,
        neighborhoodName: activeNeighborhood?.name_en || 'Your Area'
      });
      if (typeof window !== 'undefined') window.open(url, '_blank');
    } else {
      const firstStream = dayData.streams[0];
      const event: GarbageScheduleEvent = {
        categoryKey: firstStream?.key || 'combustible',
        categoryLabel: firstStream?.name?.split('(')[0]?.trim() || 'Waste Collection',
        categoryLabelJp: 'ごみ収集日',
        emoji: '🗑️',
        targetDate,
        days: [dayData.fullDay],
        cutoffTime: municipalRule.morning_deadline,
        municipalityName: activeMunicipalityName,
        neighborhoodName: activeNeighborhood?.name_en || 'Your Area',
        isRecurring: false
      };
      const url = buildGoogleCalendarUrl(event);
      if (typeof window !== 'undefined') window.open(url, '_blank');
    }
  };

  const handleSyncEntireMonthCalendar = () => {
    if (!activeNeighborhood?.schedules) return;
    const firstKey = Object.keys(activeNeighborhood.schedules)[0] || 'combustible';
    const firstDays = activeNeighborhood.schedules[firstKey];
    const event: GarbageScheduleEvent = {
      categoryKey: firstKey,
      categoryLabel: 'Neighborhood Recurring Schedule',
      categoryLabelJp: '定期ごみ収集日',
      emoji: '📅',
      days: Array.isArray(firstDays) ? firstDays : [firstDays],
      cutoffTime: municipalRule.morning_deadline,
      municipalityName: activeMunicipalityName,
      neighborhoodName: activeNeighborhood?.name_en || 'Your Area',
      isRecurring: true
    };
    const url = buildGoogleCalendarUrl(event);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const handleSyncSingleDayManifest = (dayData: typeof weeklyScheduleData[0]) => {
    const targetDate = getNextDateForDayName(dayData.fullDay);
    const url = buildDayManifestGoogleCalendarUrl({
      dayName: dayData.fullDay,
      date: targetDate,
      streams: dayData.streams.filter(s => s.items.length > 0).map(s => ({
        name: s.name,
        key: s.key,
        items: s.items.map(i => ({ name: i.name, id: i.id }))
      })),
      cutoffTime: municipalRule.morning_deadline,
      municipalityName: activeMunicipalityName,
      neighborhoodName: activeNeighborhood?.name_en || 'Your Area'
    });
    if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  const handleExportICS = (mode: 'all' | 'items_only' = 'items_only') => {
    if (!activeNeighborhood?.schedules) return;

    let itemDays: Array<{ dayName: string; date: Date; streams: Array<{ name: string; items: Array<{ name: string }> }> }> | undefined = undefined;
    
    if (mode === 'items_only') {
      const activeDays = weeklyScheduleData.filter(d => d.totalItemsCount > 0);
      if (activeDays.length > 0) {
        itemDays = activeDays.map(d => ({
          dayName: d.fullDay,
          date: getNextDateForDayName(d.fullDay),
          streams: d.streams.filter(s => s.items.length > 0).map(s => ({
            name: s.name,
            items: s.items.map(i => ({ name: i.name }))
          }))
        }));
      }
    }

    const icsString = generateICSContent(
      activeMunicipalityName,
      activeNeighborhood.name_en,
      activeNeighborhood.schedules,
      municipalRule.morning_deadline,
      itemDays
    );
    const suffix = mode === 'items_only' && itemDays ? 'ScannedItems' : 'FullMonthSchedule';
    const filename = `GomiSchedule_${activeNeighborhood.name_en.replace(/\s+/g, '_')}_${suffix}.ics`;
    downloadICSFile(filename, icsString);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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

          {/* Add Missing Item Card */}
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="utility-card"
            style={{
              padding: '16px 14px',
              background: '#F8FAFC',
              border: '2px dashed #CBD5E1',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              minHeight: '110px',
              transition: 'all 0.15s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00A86B';
              e.currentTarget.style.background = '#F0FDF4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#F8FAFC';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A'
            }}>
              <PlusCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <strong style={{ fontSize: '0.86rem', color: '#0F172A', display: 'block' }}>
                + Add Missing Item
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Add an unlisted object manually
              </span>
            </div>
          </button>
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
                    onClick={() => setConfirmedSafeguards(prev => ({ ...prev, [item.id]: true }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '2px solid #0284C7',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
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
      {/* STAGE 2.5: REQUIRES DISASSEMBLY                           */}
      {/* ========================================================= */}
      {itemsRequiringDisassembly.length > 0 && (
        <section aria-label="Items Requiring Disassembly" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: '#475569',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Requires Disassembly
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Please separate these items before disposal
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {itemsRequiringDisassembly.map((item) => (
              <div
                key={`disasm_${item.id}`}
                className="utility-card"
                style={{
                  padding: '16px 18px',
                  border: '1.5px solid #CBD5E1',
                  background: '#F8FAFC'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.94rem', color: '#0F172A' }}>{item.name}</strong>
                    <span className="badge badge-neutral" style={{ fontSize: '0.62rem', background: '#E2E8F0', color: '#334155' }}>
                      {item.preparation.action_label}
                    </span>
                  </div>
                </div>
                
                <div style={{ fontSize: '0.78rem', color: '#334155', marginBottom: '10px' }}>
                  <ol style={{ paddingLeft: '18px', margin: '6px 0', lineHeight: 1.5 }}>
                    {item.preparation.steps.map((st, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{st}</li>
                    ))}
                  </ol>
                </div>
                
                {item.preparation.components && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                      Separated Parts Destination (Sorted into buckets below):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {item.preparation.components.map((c, ci) => {
                        const lowerDest = (c.destination_stream || '').toLowerCase();
                        const lowerName = c.name.toLowerCase();
                        let targetBucket = 'Combustible (燃やすごみ)';
                        let badgeBg = '#FEE2E2';
                        let badgeColor = '#991B1B';
                        let badgeBorder = '#FCA5A5';

                        if (lowerDest.includes('plastic') || lowerDest.includes('プラ') || c.material.toLowerCase().includes('plastic') || c.material.toLowerCase().includes('film') || c.material.toLowerCase().includes('poly')) {
                          targetBucket = 'Plastics (容器包装プラ)';
                          badgeBg = '#E0F2FE';
                          badgeColor = '#0369A1';
                          badgeBorder = '#BAE6FD';
                        } else if (lowerDest.includes('pet') || lowerName.includes('pet') || lowerName.includes('bottle') || lowerName.includes('can')) {
                          targetBucket = 'Cans & PET (缶・ビン・PET)';
                          badgeBg = '#ECFDF5';
                          badgeColor = '#065F46';
                          badgeBorder = '#A7F3D0';
                        } else if (lowerDest.includes('metal') || lowerDest.includes('glass') || lowerDest.includes('ceramic')) {
                          targetBucket = 'Metal & Glass (不燃ごみ)';
                          badgeBg = '#F1F5F9';
                          badgeColor = '#334155';
                          badgeBorder = '#CBD5E1';
                        }

                        return (
                          <div
                            key={ci}
                            style={{
                              background: badgeBg,
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <strong>✂️ {c.name}</strong>
                            <span style={{ opacity: 0.8 }}>➔ Goes to:</span>
                            <span style={{ fontWeight: 800 }}>{targetBucket}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
            Categorized by curbside stream
          </span>
        </div>

        {/* 🚨 PROHIBITED HOME APPLIANCE RECYCLING ACT BANNER (Only shown when restricted appliance is detected) */}
        {restrictedApplianceItems.length > 0 && (
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
              </div>
            </div>
          </div>
        )}

        {/* 4 Crisp Stream Columns (Only visible if bucket has content) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          
          {/* BUCKET 1: COMBUSTIBLE WASTE */}
          {streamBuckets.combustible.length > 0 && (
            <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #EF4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame className="w-4 h-4 text-red-500" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Combustible (燃やすごみ)</strong>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {streamBuckets.combustible.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Bag: {municipalRule.bag_requirement_en}
                </span>
                <span className="badge" style={{ fontSize: '0.64rem', background: '#FEE2E2', color: '#991B1B', fontWeight: 700 }}>
                  📅 Collection: {activeNeighborhood?.schedules?.combustible?.join(' & ') || 'Mon & Thu'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {streamBuckets.combustible.map((item) => {
                  const hasPrep = item.preparation?.steps && item.preparation.steps.length > 0 && item.preparation.action_type !== 'NONE';
                  const isExpanded = !!expandedPrep[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={hasPrep ? () => togglePrep(item.id) : undefined}
                      style={{
                        padding: '8px 10px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        cursor: hasPrep ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                        {hasPrep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#0284C7' }}>
                            <span>{isExpanded ? 'Hide Instructions' : (item.preparation.action_label || 'Instructions')}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>

                      {hasPrep && isExpanded && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '0.74rem' }}>
                          <div style={{ color: '#065F46', fontWeight: 700, marginBottom: '4px' }}>
                            Preparation:
                          </div>
                          <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                            {item.preparation.steps.map((st, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BUCKET 2: RECYCLABLE PLASTICS */}
          {streamBuckets.plastics.length > 0 && (
            <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #0284C7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package className="w-4 h-4 text-blue-500" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Plastics (容器包装プラ)</strong>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {streamBuckets.plastics.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Clean packaging &amp; wrappers
                </span>
                <span className="badge" style={{ fontSize: '0.64rem', background: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
                  📅 Collection: {activeNeighborhood?.schedules?.plastic_packaging?.join(' & ') || activeNeighborhood?.schedules?.resources?.join(' & ') || 'Weekly'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {streamBuckets.plastics.map((item) => {
                  const hasPrep = item.preparation?.steps && item.preparation.steps.length > 0 && item.preparation.action_type !== 'NONE';
                  const isExpanded = !!expandedPrep[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={hasPrep ? () => togglePrep(item.id) : undefined}
                      style={{
                        padding: '8px 10px',
                        background: '#F0F9FF',
                        borderRadius: '8px',
                        border: '1px solid #BAE6FD',
                        cursor: hasPrep ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                        {hasPrep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#0284C7' }}>
                            <span>{isExpanded ? 'Hide Instructions' : (item.preparation.action_label || 'Instructions')}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>

                      {hasPrep && isExpanded && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #93C5FD', fontSize: '0.74rem' }}>
                          <div style={{ color: '#0369A1', fontWeight: 700, marginBottom: '4px' }}>
                            Preparation:
                          </div>
                          <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                            {item.preparation.steps.map((st, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BUCKET 3: CANS, BOTTLES & PET */}
          {streamBuckets.cans_bottles_pet.length > 0 && (
            <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #00A86B' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Cans &amp; PET (缶・ビン・PET)</strong>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {streamBuckets.cans_bottles_pet.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Rinse clean • Empty containers
                </span>
                <span className="badge" style={{ fontSize: '0.64rem', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                  📅 Collection: {activeNeighborhood?.schedules?.cans_bottles_pet?.join(' & ') || activeNeighborhood?.schedules?.resources?.join(' & ') || 'Weekly'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {streamBuckets.cans_bottles_pet.map((item) => {
                  const hasPrep = item.preparation?.steps && item.preparation.steps.length > 0 && item.preparation.action_type !== 'NONE';
                  const isExpanded = !!expandedPrep[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={hasPrep ? () => togglePrep(item.id) : undefined}
                      style={{
                        padding: '8px 10px',
                        background: '#ECFDF5',
                        borderRadius: '8px',
                        border: '1px solid #A7F3D0',
                        cursor: hasPrep ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                        {hasPrep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#047857' }}>
                            <span>{isExpanded ? 'Hide Instructions' : (item.preparation.action_label || 'Instructions')}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>

                      {hasPrep && isExpanded && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #6EE7B7', fontSize: '0.74rem' }}>
                          <div style={{ color: '#065F46', fontWeight: 700, marginBottom: '4px' }}>
                            Preparation:
                          </div>
                          <ol style={{ paddingLeft: '16px', color: '#334155', margin: 0 }}>
                            {item.preparation.steps.map((st, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BUCKET 4: INCOMBUSTIBLE / SMALL METAL */}
          {streamBuckets.incombustible.length > 0 && (
            <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Metal &amp; Glass (不燃ごみ)</strong>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {streamBuckets.incombustible.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Pans &lt;{municipalRule.general_threshold_cm}cm, ceramics, lightbulbs
                </span>
                <span className="badge" style={{ fontSize: '0.64rem', background: '#F1F5F9', color: '#334155', fontWeight: 700 }}>
                  📅 Collection: {activeNeighborhood?.schedules?.metal_ceramics_glass?.join(' & ') || activeNeighborhood?.schedules?.non_combustible?.join(' & ') || '2nd & 4th Week'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {streamBuckets.incombustible.map((item) => {
                  const hasPrep = item.preparation?.steps && item.preparation.steps.length > 0 && item.preparation.action_type !== 'NONE';
                  const isExpanded = !!expandedPrep[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={hasPrep ? () => togglePrep(item.id) : undefined}
                      style={{
                        padding: '8px 10px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        cursor: hasPrep ? 'pointer' : 'default',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>{item.name}</strong>
                        {hasPrep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#475569' }}>
                            <span>{isExpanded ? 'Hide Instructions' : (item.preparation.action_label || 'Instructions')}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </div>

                      {hasPrep && isExpanded && (
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
                  );
                })}
              </div>
            </div>
          )}

          {/* BUCKET 5: SMALL ELECTRONICS & BATTERIES */}
          {streamBuckets.small_appliances.length > 0 && (
            <div className="utility-card" style={{ padding: '14px', borderTop: '4px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Small Electronics (小型家電回収)</strong>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                  {streamBuckets.small_appliances.length}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#6D28D9', fontWeight: 600 }}>
                  Do NOT put in curbside bags (Lithium battery fire hazard)
                </span>
                <span className="badge" style={{ fontSize: '0.64rem', background: '#EDE9FE', color: '#6D28D9', fontWeight: 700 }}>
                  📍 Yellow Box / Retail Store Drop-Off
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {streamBuckets.small_appliances.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      background: '#FAF5FF',
                      borderRadius: '8px',
                      border: '1.5px solid #DDD6FE'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#4C1D95' }}>{item.name}</strong>
                      <span className="badge" style={{ fontSize: '0.64rem', background: '#8B5CF6', color: '#FFFFFF', fontWeight: 700 }}>
                        Recycling Box Drop-off
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6D28D9', marginTop: '4px', lineHeight: 1.4 }}>
                      ⚡ <strong>Small Home Appliance Recycling Act (小型家電リサイクル法):</strong> Contains precious metals and lithium-ion batteries. Deposit in yellow collection boxes at Ward Office or carrier shops (Docomo, au, SoftBank, Bic Camera) for free certified secure recycling.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              Curbside Pickup Timetable &amp; 1-Tap Calendar Sync
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Tap any day to see which items go out
          </span>
        </div>

        {/* 7-Day Day-Filter Calendar Strip (Now on Top!) */}
        <div className="utility-card" style={{ padding: '16px 18px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Neighborhood Weekly Timetable ({activeNeighborhood?.name_en || 'Your Area'}):
            </h4>
            {selectedDayFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                style={{ background: 'transparent', border: 'none', color: '#0284C7', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Show All Days
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
            {weeklyScheduleData.map((d) => {
              const isSelected = selectedDayFilter === d.day;
              const hasItems = d.totalItemsCount > 0;

              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDayFilter(isSelected ? 'all' : d.day)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: `2px solid ${isSelected ? '#00A86B' : hasItems ? '#0284C7' : '#E2E8F0'}`,
                    background: isSelected ? '#F0FDF4' : hasItems ? '#F0F9FF' : '#FFFFFF',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: isSelected ? '#065F46' : hasItems ? '#0369A1' : '#64748B', fontWeight: 800 }}>
                    {d.day}
                  </div>
                  
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0F172A', marginTop: '3px', lineHeight: 1.2 }}>
                    {d.streams.length > 0 ? d.streams.map(s => s.name.split(' ')[0]).join(' ') : '—'}
                  </div>

                  {hasItems ? (
                    <span className="badge" style={{ fontSize: '0.62rem', background: '#DCFCE7', color: '#166534', marginTop: '4px', fontWeight: 700, display: 'inline-block' }}>
                      {d.totalItemsCount} item(s)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: '#94A3B8', marginTop: '4px', display: 'inline-block' }}>
                      No items
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detailed Item Breakdown for Selected Day */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
            {selectedDayFilter === 'all' ? (
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Weekly Item Throw-Out Manifest (Items mapped to collection days):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weeklyScheduleData.filter(d => d.totalItemsCount > 0).map(d => (
                    <div key={d.day} style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>
                          📅 {d.fullDay} ({d.day})
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            {d.totalItemsCount} item(s) to place outside
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncSingleDayManifest(d)}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: '1px solid #0284C7',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title={`Sync ${d.day} items reminder to Google Calendar`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Add {d.day} to Cal</span>
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {d.streams.filter(s => s.items.length > 0).map(s => (
                          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: '4px' }}>
                              {s.name}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {s.items.map(i => (
                                <span key={i.id} style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.72rem', color: '#0F172A' }}>
                                  🗑️ {i.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const activeDayData = weeklyScheduleData.find(d => d.day === selectedDayFilter);
                if (!activeDayData) return null;

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>
                        📋 Items to Discard on {activeDayData.fullDay} ({activeDayData.day}):
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                          {activeDayData.totalItemsCount} item(s) ready
                        </span>
                        {activeDayData.totalItemsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSyncSingleDayManifest(activeDayData)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: '1px solid #0284C7',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Add {activeDayData.day} to Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {activeDayData.streams.length === 0 ? (
                      <div style={{ fontSize: '0.76rem', color: '#94A3B8', padding: '8px 0' }}>
                        No collection scheduled for this day in your neighborhood.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeDayData.streams.map(s => (
                          <div key={s.key} style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.bg}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '0.82rem', color: s.color }}>{s.name}</strong>
                              <span className="badge" style={{ fontSize: '0.64rem', background: s.bg, color: s.color, fontWeight: 700 }}>
                                {s.items.length} item(s)
                              </span>
                            </div>
                            {s.items.length > 0 ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {s.items.map(item => (
                                  <span key={item.id} style={{ background: '#FFFFFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.74rem', color: '#0F172A' }}>
                                    🗑️ {item.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                No items from your scan belong to this stream.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Actionable Next Collection & 1-Tap Calendar Export (Now Below Timetable!) */}
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
              {nextItemDisposalDay?.dayData?.streams[0]?.key === 'plastics' ? (
                <Sparkles className="w-6 h-6" />
              ) : (
                <Flame className="w-6 h-6" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', color: '#34D399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {nextItemDisposalDay?.isItemSpecific ? '🎯 NEXT THROW-OUT FOR YOUR SCANNED ITEMS:' : '📅 IMMEDIATE NEXT NEIGHBORHOOD COLLECTION:'}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', margin: '2px 0' }}>
                {nextItemDisposalDay ? (
                  <>
                    {(() => {
                      const diff = Math.ceil((nextItemDisposalDay.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const relStr = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days (${nextItemDisposalDay.dayData.fullDay})`;
                      const streamStr = nextItemDisposalDay.dayData.streams.filter(s => !nextItemDisposalDay.isItemSpecific || s.items.length > 0).map(s => s.name).join(' & ');
                      return `${relStr}: ${streamStr}`;
                    })()}
                  </>
                ) : (
                  'Next Pickup: Check Ward Calendar'
                )}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                {nextItemDisposalDay?.isItemSpecific ? (
                  <span>
                    Ready to discard: <strong>{nextItemDisposalDay.dayData.totalItemsCount} item(s)</strong> • Place out before <strong>{municipalRule.morning_deadline}</strong>
                  </span>
                ) : (
                  <span>
                    Place outside by <strong>{municipalRule.morning_deadline}</strong> at your designated station
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1-Tap Calendar Export Buttons with choices: Scanned Items vs Full Month */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Primary Action: Add exact next collection day */}
            <button
              type="button"
              onClick={handleSyncNextTrashDayToCalendar}
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
              title={nextItemDisposalDay?.isItemSpecific ? 'Add only the upcoming pickup day for your scanned items' : 'Add upcoming collection to Google Calendar'}
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>
                {nextItemDisposalDay?.isItemSpecific 
                  ? `Add ${nextItemDisposalDay.dayData.day} Trash Day` 
                  : 'Add Next Collection'}
              </span>
            </button>

            {/* Secondary Action: Add recurring full month calendar */}
            <button
              type="button"
              onClick={handleSyncEntireMonthCalendar}
              className="btn btn-secondary"
              style={{
                padding: '8px 12px',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.25)',
                fontWeight: 700
              }}
              title="Add recurring weekly collection pattern to Google Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Add Recurring Month</span>
            </button>

            {/* iCal / .ics Download: Scanned Items or Full Month */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <button
                type="button"
                onClick={() => handleExportICS('items_only')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  color: '#34D399',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Download .ics for only the specific days needed for scanned items"
              >
                <Download className="w-3.5 h-3.5" />
                <span>iCal (Items Only)</span>
              </button>

              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

              <button
                type="button"
                onClick={() => handleExportICS('all')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  color: '#94A3B8',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Download full monthly calendar schedule .ics"
              >
                <span>Full Month</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* STAGE 5: SODAI GOMI & CONVENIENCE STORE WORKFLOW (Only shown if bulky items exist) */}
      {/* ========================================================= */}
      {bulkyCandidates.length > 0 && (
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
                Bulky Waste Booking Center (粗大ごみ予約センター &amp; コンビニ券)
              </h3>
            </div>

            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FCD34D'
            }}>
              {bulkyCandidates.length} Bulky Item{bulkyCandidates.length > 1 ? 's' : ''} Detected (&gt;{municipalRule.general_threshold_cm}cm)
            </div>
          </div>

          <div className="utility-card" style={{ padding: '20px', border: '2px solid #D97706', background: '#FFFBEB' }}>
            {/* Top Municipality & Legal Notice */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid #FDE68A',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '640px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                    Mandatory Municipal Reservation: {activeMunicipalityName} ({municipalRule.name_ja})
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: '#78350F', margin: '3px 0 0 0', lineHeight: 1.45 }}>
                    Items exceeding <strong>{municipalRule.general_threshold_cm}cm</strong> cannot be discarded in curbside garbage bags. 
                    Tokyo municipal law requires: <strong>1) Prior appointment reservation</strong>, <strong>2) Purchasing official ward stickers at convenience stores</strong>, and <strong>3) Placement outside by 8:00 AM</strong> on your collection morning.
                  </p>
                </div>
              </div>

              {/* Grand Total Fee Badge */}
              <div style={{
                background: '#FEF3C7',
                border: '1.5px solid #F59E0B',
                borderRadius: '10px',
                padding: '8px 14px',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  Total Bulky Fee
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#B45309', lineHeight: 1.1 }}>
                  ¥{totalBulkyFee.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#78350F', marginTop: '2px' }}>
                  {totalStickerA > 0 ? `${totalStickerA}x A券 (¥200)` : ''}
                  {totalStickerA > 0 && totalStickerB > 0 ? ' + ' : ''}
                  {totalStickerB > 0 ? `${totalStickerB}x B券 (¥300)` : ''}
                </div>
              </div>
            </div>

            {/* 4-Step Interactive Workflow Navigator */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '8px',
              marginBottom: '18px'
            }}>
              {[
                { step: 1, title: '1. Reserve Date', sub: 'オンライン・電話予約', icon: Calendar },
                { step: 2, title: '2. Fee & Stickers', sub: '料金計算・A/B券内訳', icon: Tag },
                { step: 3, title: '3. Combini Card', sub: '店頭提示カード', icon: Store },
                { step: 4, title: '4. Affix & Place', sub: 'シールの貼り方・排出', icon: CheckSquare }
              ].map(s => {
                const isActive = bookingStep === s.step;
                const IconComp = s.icon;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setBookingStep(s.step)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isActive ? '2px solid #D97706' : '1px solid #FDE68A',
                      background: isActive ? '#D97706' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#78350F',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#FEF3C7',
                      color: isActive ? '#FFFFFF' : '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.2 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.66rem', opacity: isActive ? 0.9 : 0.75 }}>
                        {s.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ========================================================= */}
            {/* STEP 1: APPOINTMENT RESERVATION & RECEPTION NUMBER        */}
            {/* ========================================================= */}
            <div style={{
              display: bookingStep === 1 ? 'block' : 'none',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #FCD34D'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Step 1 of 4 • Booking &amp; Appointment Reservation
                  </span>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                    Reserve Collection Date with {activeMunicipalityName}
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem('step1_reserved')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: bookingChecklist.step1_reserved ? '1px solid #10B981' : '1px solid #CBD5E1',
                      background: bookingChecklist.step1_reserved ? '#ECFDF5' : '#F8FAFC',
                      color: bookingChecklist.step1_reserved ? '#059669' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    {bookingChecklist.step1_reserved ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{bookingChecklist.step1_reserved ? 'Reservation Confirmed' : 'Mark as Reserved'}</span>
                  </button>
                </div>
              </div>

              {/* Two Official Reservation Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                {/* Channel A: Web Portal */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                        🌐 Online Booking Portal (24 Hours)
                      </span>
                      <span style={{ fontSize: '0.65rem', background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Recommended
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                      Official Tokyo 23 Wards Bulky Waste Reception Center (東京二十三区清掃一部事務組合 粗大ごみ受付センター). Choose your items and select an open collection slot.
                    </p>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href="https://sodai.tokyokankyo.or.jp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.76rem',
                        background: '#D97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        borderRadius: '6px'
                      }}
                    >
                      <span>Open sodai.tokyokankyo.or.jp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Channel B: Telephone Center */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
                        ☎️ Telephone Reception Center
                      </span>
                      <span style={{ fontSize: '0.65rem', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        Mon–Sat 8:00–19:00
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                      Call directly if you require English phone support or have custom unlisted oversized items. Closed on Sundays and New Year holidays.
                    </p>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href="tel:0352967000"
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.76rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px'
                      }}
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                      <span>Call: 03-5296-7000</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Interactive Booking Tracker Form */}
              <div style={{
                background: '#FFFBEB',
                borderRadius: '10px',
                padding: '14px 16px',
                border: '1px dashed #FCD34D'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Your Reservation Details (Keep for Stickers):</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* Collection Date Selector */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350F', display: 'block', marginBottom: '4px' }}>
                      Scheduled Pickup Date (収集予定日):
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {['2026-09-18', '2026-09-22', '2026-09-25'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBookingDate(d)}
                          style={{
                            fontSize: '0.66rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: bookingDate === d ? '1px solid #D97706' : '1px solid #E2E8F0',
                            background: bookingDate === d ? '#FEF3C7' : '#FFFFFF',
                            color: bookingDate === d ? '#92400E' : '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          {d.slice(5)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reception Confirmation Number */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350F', display: 'block', marginBottom: '4px' }}>
                      Reception Number (受付番号):
                    </label>
                    {isEditingReception ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={receptionNumber}
                          onChange={(e) => setReceptionNumber(e.target.value)}
                          placeholder="e.g. 4829"
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingReception(false)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.72rem',
                            borderRadius: '6px',
                            background: '#D97706',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Tag className="w-3.5 h-3.5 text-amber-600" />
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A', letterSpacing: '0.05em' }}>
                            #{receptionNumber}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingReception(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#D97706',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          Edit Number
                        </button>
                      </div>
                    )}
                    <span style={{ fontSize: '0.66rem', color: '#78350F', marginTop: '4px', display: 'block' }}>
                      💡 Writing this 4-digit number on your stickers protects your name and privacy from passersby.
                    </span>
                  </div>
                </div>
              </div>

              {/* Advance to Next Step Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    background: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Next: Check Fees &amp; Required Stickers</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STEP 2: FEES & STICKER BREAKDOWN (A/B COMBINATION)        */}
            {/* ========================================================= */}
            <div style={{
              display: bookingStep === 2 ? 'block' : 'none',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #FCD34D'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Step 2 of 4 • Official Fee Calculation &amp; Stickers
                  </span>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                    Required Revenue Stickers Breakdown (A券 &amp; B券)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => toggleChecklistItem('step2_stickers_bought')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: bookingChecklist.step2_stickers_bought ? '1px solid #10B981' : '1px solid #CBD5E1',
                    background: bookingChecklist.step2_stickers_bought ? '#ECFDF5' : '#F8FAFC',
                    color: bookingChecklist.step2_stickers_bought ? '#059669' : '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  {bookingChecklist.step2_stickers_bought ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{bookingChecklist.step2_stickers_bought ? 'Stickers Purchased' : 'Mark as Purchased'}</span>
                </button>
              </div>

              {/* Items List with Specific Fee */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {bulkyEvaluations.map(({ item, sodai, fee, stickers }) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#F8FAFC',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          (~{item.estimated_dim_cm}cm)
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          background: '#FEF3C7',
                          color: '#B45309',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {sodai.official_catalog_name_jp || '粗大ごみ品目'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                        Category: <strong>{sodai.category || 'General Bulky Waste'}</strong> • Official Fee: <strong style={{ color: '#0F172A' }}>¥{fee.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        background: '#F0FDF4',
                        border: '1px solid #86EFAC',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#166534'
                      }}>
                        {stickers.summary}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCombiniModalItem({ item, stickers })}
                        className="btn btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A'
                        }}
                      >
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>Item Card</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Sticker Requirement Display & Visual Badges */}
              <div style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '18px 20px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Total Shopping Requirement for {activeMunicipalityName}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', marginTop: '2px' }}>
                      ¥{totalBulkyFee.toLocaleString()} Total (合計)
                    </div>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                    Exact Stickers: <strong>{totalStickerA + totalStickerB} total sticker{totalStickerA + totalStickerB > 1 ? 's' : ''}</strong>
                  </div>
                </div>

                {/* Visual Representation of the Two Tokyo Ward Stickers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* Sticker A: 200 Yen (Green/Orange) */}
                  <div style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    borderLeft: '6px solid #00A86B',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    opacity: totalStickerA > 0 ? 1 : 0.4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#065F46', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                        A券 (Sticker A)
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#065F46' }}>¥200</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, marginTop: '6px', color: '#0F172A' }}>
                      {municipalRule.name_ja} 有料粗大ごみ処理券 A
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                      Unit Value: ¥200 (Green Watermark)
                    </div>
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>Required:</span>
                      <strong style={{ fontSize: '0.95rem', color: '#00A86B' }}>
                        {totalStickerA} 枚 (Sheets)
                      </strong>
                    </div>
                  </div>

                  {/* Sticker B: 300 Yen (Blue/Cyan) */}
                  <div style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    borderLeft: '6px solid #0284C7',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    opacity: totalStickerB > 0 ? 1 : 0.4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369A1', background: '#E0F2FE', padding: '1px 6px', borderRadius: '4px' }}>
                        B券 (Sticker B)
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#0369A1' }}>¥300</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, marginTop: '6px', color: '#0F172A' }}>
                      {municipalRule.name_ja} 有料粗大ごみ処理券 B
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                      Unit Value: ¥300 (Blue Watermark)
                    </div>
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>Required:</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0284C7' }}>
                        {totalStickerB} 枚 (Sheets)
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strict Ward Jurisdiction Warning */}
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #F87171',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div style={{ fontSize: '0.73rem', color: '#991B1B', lineHeight: 1.4 }}>
                  <strong>MUNICIPAL JURISDICTION STRICT RULE:</strong> Stickers MUST be purchased within <strong>{activeMunicipalityName} ({municipalRule.name_ja})</strong>. 
                  Stickers purchased from other wards (e.g. Shibuya, Minato, Toshima) are <strong>legally void in Shinjuku</strong>. Sanitation crews will refuse collection if incorrect ward stickers are attached.
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Back: Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    background: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Next: Convenience Store Cashier Card</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STEP 3: CONVENIENCE STORE PURCHASE & JAPANESE CASHIER CARD */}
            {/* ========================================================= */}
            <div style={{
              display: bookingStep === 3 ? 'block' : 'none',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #FCD34D'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#00A86B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Step 3 of 4 • Convenience Store Purchase Card
                  </span>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                    Show This Card at 7-Eleven, FamilyMart, or Lawson
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem('step3_labeled')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: bookingChecklist.step3_labeled ? '1px solid #10B981' : '1px solid #CBD5E1',
                      background: bookingChecklist.step3_labeled ? '#ECFDF5' : '#F8FAFC',
                      color: bookingChecklist.step3_labeled ? '#059669' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    {bookingChecklist.step3_labeled ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{bookingChecklist.step3_labeled ? 'Stickers Ready' : 'Mark as Ready'}</span>
                  </button>
                </div>
              </div>

              {/* Store Location Guide */}
              <div style={{
                background: '#F0FDF4',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #BBF7D0',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#166534' }}>
                  <strong>Where to Buy:</strong> Any convenience store in {activeMunicipalityName} displaying the window sticker: <strong>「有料粗大ごみ処理券取扱所」</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700 }}>
                  7-Eleven • FamilyMart • Lawson • Ministop • Post Offices
                </div>
              </div>

              {/* The Presentation Card (Designed to be shown to the Japanese clerk) */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '20px',
                border: '2.5px solid #00A86B',
                boxShadow: '0 10px 20px -5px rgba(0, 168, 107, 0.15)',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px dashed #E2E8F0',
                  paddingBottom: '10px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    background: '#00A86B',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    padding: '3px 10px',
                    borderRadius: '6px'
                  }}>
                    【店員さんにお見せください / Show to Clerk】
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                    対象自治体: <strong style={{ color: '#0F172A' }}>{municipalRule.name_ja}</strong>
                  </div>
                </div>

                {/* Primary Japanese Spoken / Display Phrase */}
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  lineHeight: 1.45,
                  color: '#0F172A',
                  marginBottom: '10px'
                }}>
                  「すみません、{municipalRule.name_ja}の<br />
                  <span style={{ color: '#00A86B', borderBottom: '3px solid #00A86B' }}>
                    粗大ごみ処理券
                  </span>
                  を購入したいです。」
                </div>

                <div style={{
                  fontSize: '0.74rem',
                  color: '#64748B',
                  fontStyle: 'italic',
                  marginBottom: '14px'
                }}>
                  (Sumimasen, {municipalRule.name_ja} no sodai gomi shori-ken o kounyuu shitai desu.)
                </div>

                {/* Breakdown for Clerk to Key into Register */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  border: '1.5px solid #CBD5E1',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
                    購入希望の券種内訳 (Requested Stickers):
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {totalStickerA > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: '#0F172A'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00A86B' }} />
                          <span>A券 (200円)</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#00A86B', color: '#FFFFFF', padding: '2px 10px', borderRadius: '6px' }}>
                            {totalStickerA} 枚
                          </span>
                          <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                            = ¥{(totalStickerA * 200).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {totalStickerB > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: '#0F172A'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284C7' }} />
                          <span>B券 (300円)</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#0284C7', color: '#FFFFFF', padding: '2px 10px', borderRadius: '6px' }}>
                            {totalStickerB} 枚
                          </span>
                          <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                            = ¥{(totalStickerB * 300).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>お支払い合計金額:</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#00A86B' }}>
                      ¥{totalBulkyFee.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  background: '#FEF3C7',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    <strong>Cash Payment Tip:</strong> Convenience stores in Japan typically accept only <strong>cash</strong> (or nanaco at 7-Eleven) for municipal revenue waste stickers. Credit cards are legally non-usable for local government stamps.
                  </span>
                </div>
              </div>

              {/* Action Buttons: Copy Text & Fullscreen Card */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleCopyCashierScript}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: combiniCopied ? '#059669' : '#00A86B'
                  }}
                >
                  {combiniCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{combiniCopied ? 'Copied Japanese Request!' : 'Copy Japanese Request Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCombiniModalItem({
                      item: {
                        ...bulkyCandidates[0],
                        id: 'all-bulky-items',
                        name: bulkyCandidates.length === 1 
                          ? bulkyCandidates[0].name 
                          : `${bulkyCandidates.length} Bulky Items (${bulkyCandidates.map(i => i.name).join(', ')})`,
                        estimated_dim_cm: Math.max(...bulkyCandidates.map(i => i.estimated_dim_cm))
                      },
                      stickers: totalCombinedStickers
                    });
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 16px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1.5px solid #00A86B',
                    color: '#00A86B',
                    fontWeight: 700
                  }}
                >
                  <Store className="w-4 h-4" />
                  <span>Launch High-Contrast Fullscreen Card</span>
                </button>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Back: Step 2
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep(4)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    background: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Next: Affixing &amp; Collection Morning Rules</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STEP 4: STICKER AFFIXING & COLLECTION RULES                */}
            {/* ========================================================= */}
            <div style={{
              display: bookingStep === 4 ? 'block' : 'none',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #FCD34D'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Step 4 of 4 • Rules &amp; Collection Morning
                  </span>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                    How to Fill In, Paste Stickers &amp; Place Items Outside
                  </h4>
                </div>
              </div>

              {/* 3 Core Rules Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                {/* Rule A: Writing on the Sticker */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#FEF3C7',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      A
                    </div>
                    <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                      What to Write on Stickers
                    </strong>
                  </div>
                  <ul style={{ fontSize: '0.74rem', color: '#475569', margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Use an <strong>oil-based permanent marker (油性ペン)</strong> so rain will not smudge it.</li>
                    <li>Write your <strong>Reception Number (#{receptionNumber})</strong> or Full Name.</li>
                    <li>Write your scheduled <strong>Collection Date ({bookingDate})</strong>.</li>
                    <li><strong>Crucial:</strong> Tear off and keep the <strong>Receipt Stub (購入者控)</strong> until collection is completed. If the sticker gets torn off in wind, this is your legal receipt!</li>
                  </ul>
                </div>

                {/* Rule B: Where & How to Affix */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#FEF3C7',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      B
                    </div>
                    <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                      Where &amp; How to Affix
                    </strong>
                  </div>
                  <ul style={{ fontSize: '0.74rem', color: '#475569', margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Peel off backing paper and press sticker firmly onto a <strong>flat, prominent exterior surface</strong> (front or top).</li>
                    <li>Do not stick on dusty or oily areas. Reinforce edges with transparent tape if peeling, but keep barcode visible.</li>
                    <li>If an item requires multiple stickers (e.g. 2× A券), stick both together on that <strong>same item</strong>.</li>
                    <li>If multiple items, <strong>each item must have its own stickers</strong> attached.</li>
                  </ul>
                </div>

                {/* Rule C: Collection Morning */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#FEF3C7',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      C
                    </div>
                    <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                      Collection Morning Placement
                    </strong>
                  </div>
                  <ul style={{ fontSize: '0.74rem', color: '#475569', margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Put outside by <strong>8:00 AM sharp</strong> on the reservation morning.</li>
                    <li><strong>Single House:</strong> Place by your front entrance facing the road.</li>
                    <li><strong>Apartment / Mansion:</strong> Place in designated 1st-floor bulky waste area (粗大ごみ置場) or beside building entrance. Do not block emergency routes.</li>
                    <li><strong>No Attendance Needed:</strong> You do NOT need to wait or be present when the truck arrives.</li>
                  </ul>
                </div>
              </div>

              {/* Pre-Collection Interactive Readiness Checklist */}
              <div style={{
                background: '#F0FDF4',
                borderRadius: '10px',
                padding: '14px 18px',
                border: '1.5px solid #86EFAC',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <strong style={{ fontSize: '0.86rem', color: '#065F46' }}>
                      Disposal Readiness Checklist (5-Point Protocol)
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>
                    {Object.values(bookingChecklist).filter(Boolean).length} of 5 Complete
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'step1_reserved', label: `1. Appointment reserved with Ward (Reception #${receptionNumber} secured)` },
                    { key: 'step2_stickers_bought', label: `2. Correct stickers purchased in ${activeMunicipalityName} (${totalStickerA > 0 ? `${totalStickerA}x A` : ''}${totalStickerA > 0 && totalStickerB > 0 ? ' + ' : ''}${totalStickerB > 0 ? `${totalStickerB}x B` : ''})` },
                    { key: 'step3_labeled', label: `3. Collection Date (${bookingDate}) and Reception #${receptionNumber} written on stickers` },
                    { key: 'step4_pasted', label: '4. Stickers firmly pasted on item front & receipt stubs stored safely' },
                    { key: 'step5_placed_outside', label: '5. Items placed at collection spot outside before 8:00 AM' }
                  ].map(item => {
                    const isChecked = !!bookingChecklist[item.key];
                    return (
                      <label
                        key={item.key}
                        onClick={() => toggleChecklistItem(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.76rem',
                          color: isChecked ? '#065F46' : '#334155',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isChecked ? '1.5px solid #00A86B' : '1.5px solid #94A3B8',
                          background: isChecked ? '#00A86B' : '#FFFFFF',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Back: Step 3
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Restart Workflow (Step 1)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

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
