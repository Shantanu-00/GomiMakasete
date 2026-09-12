import shinjukuData from './shinjuku_data.json';
import { DetectedItem, EvaluatedItem, NeighborhoodScheduleResult, NextPickupInfo, StickerBreakdown } from './types';

// Home Appliance Recycling Act exclusions
const APPLIANCE_RECYCLING_ITEMS = [
  'air conditioner', 'エアコン',
  'television', 'tv', 'テレビ',
  'refrigerator', 'freezer', '冷蔵庫', '冷凍庫',
  'washing machine', 'clothes dryer', '洗濯機', '衣類乾燥機',
  'personal computer', 'pc', 'desktop computer', 'laptop', 'パソコン'
];

const SODAI_CATALOG: Record<string, { jp_name: string; fee: number; category: string }> = {
  microwave: { jp_name: '電子レンジ', fee: 400, category: 'Kitchen Appliance' },
  toaster: { jp_name: 'トースター', fee: 400, category: 'Kitchen Appliance' },
  'rice cooker': { jp_name: '炊飯器', fee: 400, category: 'Kitchen Appliance' },
  'vacuum cleaner': { jp_name: '掃除機', fee: 400, category: 'Home Appliance' },
  fan: { jp_name: '扇風機', fee: 400, category: 'Seasonal Appliance' },
  'electric heater': { jp_name: '電気ストーブ', fee: 400, category: 'Seasonal Appliance' },
  chair: { jp_name: 'いす (1人掛け)', fee: 400, category: 'Furniture' },
  'office chair': { jp_name: '回転いす', fee: 800, category: 'Furniture' },
  desk: { jp_name: '机 (両袖除く)', fee: 1200, category: 'Furniture' },
  table: { jp_name: 'テーブル', fee: 800, category: 'Furniture' },
  bookshelf: { jp_name: '本棚', fee: 1200, category: 'Furniture' },
  'single mattress': { jp_name: 'マットレス (スプリングなし)', fee: 1200, category: 'Bedding' },
  futon: { jp_name: '布団 (2枚まで1組)', fee: 400, category: 'Bedding' },
  carpet: { jp_name: 'カーペット (6畳未満)', fee: 400, category: 'Floor Covering' },
  bicycle: { jp_name: '自転車 (16インチ以上)', fee: 800, category: 'Leisure / Vehicle' },
  suitcase: { jp_name: 'スーツケース', fee: 400, category: 'Baggage / Luggage' },
  guitar: { jp_name: 'ギター', fee: 400, category: 'Musical Instrument' },
  'ironing board': { jp_name: 'アイロン台', fee: 400, category: 'Daily Household' },
  'storage plastic box': { jp_name: '衣装ケース', fee: 400, category: 'Storage' }
};

const WEEKDAYS_JP_TO_INT: Record<string, number> = {
  '月曜日': 1, '月曜': 1, '月': 1,
  '火曜日': 2, '火曜': 2, '火': 2,
  '水曜日': 3, '水曜': 3, '水': 3,
  '木曜日': 4, '木曜': 4, '木': 4,
  '金曜日': 5, '金曜': 5, '金': 5,
  '土曜日': 6, '土曜': 6, '土': 6,
  '日曜日': 0, '日曜': 0, '日': 0,
};

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function calculateStickers(fee: number): StickerBreakdown {
  const stickerAPrice = 200;
  const stickerBPrice = 300;

  let bestCombo: [number, number] = [0, 0];
  let minStickers = 999;

  for (let b = 0; b <= Math.floor(fee / stickerBPrice); b++) {
    const rem = fee - b * stickerBPrice;
    if (rem % stickerAPrice === 0) {
      const a = rem / stickerAPrice;
      if (a + b < minStickers) {
        minStickers = a + b;
        bestCombo = [a, b];
      }
    }
  }

  const [aCount, bCount] = bestCombo;
  const parts: string[] = [];
  if (aCount > 0) parts.push(`${aCount}x Sticker A (A券 ¥200)`);
  if (bCount > 0) parts.push(`${bCount}x Sticker B (B券 ¥300)`);

  return {
    sticker_a_count: aCount,
    sticker_b_count: bCount,
    total_stickers: aCount + bCount,
    summary: parts.join(' + '),
    total_cost_yen: fee
  };
}

export function evaluateSodaiGomi(itemName: string, dimCm: number = 0) {
  const lower = itemName.toLowerCase().trim();

  // 1. Restricted Appliance Law Check
  for (const item of APPLIANCE_RECYCLING_ITEMS) {
    if (lower.includes(item)) {
      return {
        is_sodai_gomi: true,
        is_restricted_appliance: true,
        headline: `${itemName} is regulated by the Home Appliance Recycling Act (家電リサイクル法).`,
        rules: 'This item cannot be collected by municipal garbage collection. You must book through an electronics retailer or certified recycling drop-off.',
        action_url: 'https://www.rkc.aeha.or.jp/',
        phone_number: '0120-059-428'
      };
    }
  }

  // 2. Dimension threshold (> 30 cm)
  const isOverDim = dimCm > 30;

  // 3. Catalog lookup
  let matched = null;
  for (const [key, val] of Object.entries(SODAI_CATALOG)) {
    if (lower.includes(key) || lower.includes(val.jp_name)) {
      matched = val;
      break;
    }
  }

  if (!matched && !isOverDim) {
    return { is_sodai_gomi: false, is_restricted_appliance: false };
  }

  const officialNameJp = matched ? matched.jp_name : `大型品 (${itemName})`;
  const fee = matched ? matched.fee : (dimCm > 80 ? 800 : 400);
  const category = matched ? matched.category : 'General Bulky Waste';
  const stickers = calculateStickers(fee);

  return {
    is_sodai_gomi: true,
    is_restricted_appliance: false,
    official_catalog_name_jp: officialNameJp,
    category,
    fee_yen: fee,
    stickers,
    booking_portal: 'https://sodai.tokyokankyo.or.jp/',
    phone_number: '03-5296-7000',
    appointment_procedure: [
      `1. Book an appointment online or by phone for: '${officialNameJp}'.`,
      `2. Purchase disposal stickers at convenience stores (7-Eleven, Lawson, FamilyMart): ${stickers.summary}.`,
      '3. Write your Name or 4-digit Reservation Number and Collection Date on the stickers.',
      '4. Affix the stickers firmly to the item.',
      '5. Place outside your entrance or collection site by 8:00 AM on appointment day.'
    ]
  };
}

export function classifyWasteItem(itemName: string, material: string = '') {
  const lowerItem = itemName.toLowerCase();
  const lowerMat = material.toLowerCase();

  // Priority 1: Pressurized Spray / Gas / Aerosol (Hazardous, must be checked BEFORE cans)
  if (['spray', 'aerosol', 'gas cassette', 'スプレー缶', 'カセットボンベ'].some(k => lowerItem.includes(k) || lowerMat.includes(k))) {
    return {
      category: 'unburnable',
      category_jp: '金属・陶器・ガラスごみ (不燃ごみ - スプレー缶)',
      disposal_rules: 'MUST be completely used up until empty in a well-ventilated outdoor space. In Shinjuku, do NOT puncture hole. Place in transparent bag labeled "スプレー缶".',
      requires_disassembly: false
    };
  }

  // Priority 2: PET Bottles
  if (lowerItem.includes('pet') || lowerItem.includes('bottle') || lowerItem.includes('ペットボトル')) {
    return {
      category: 'recyclable_pet',
      category_jp: '資源ごみ (ペットボトル)',
      disposal_rules: 'Step 1: Remove plastic cap. Step 2: Peel off plastic film label. Step 3: Rinse inside. Step 4: Flatten bottle.',
      requires_disassembly: true,
      disassembly_notes: 'Cap and label go into Plastic Resource (プラマーク), bottle body goes into PET collection.'
    };
  }

  // Priority 3: Metal Cans
  if (['can', 'aluminum', 'steel', '缶'].some(k => lowerItem.includes(k) || lowerMat.includes(k))) {
    return {
      category: 'recyclable_can',
      category_jp: '資源ごみ (缶)',
      disposal_rules: 'Rinse thoroughly. Do not crush cans in Shinjuku. Place in designated collection bin.',
      requires_disassembly: false
    };
  }

  // Priority 4: Glass Bottles
  if (['glass', 'jar', 'びん', '瓶'].some(k => lowerItem.includes(k) || lowerMat.includes(k))) {
    return {
      category: 'recyclable_glass',
      category_jp: '資源ごみ (びん)',
      disposal_rules: 'Rinse bottle. Remove metal/plastic caps. Place glass bottle upright in collection bin.',
      requires_disassembly: false
    };
  }

  // Priority 5: Metals & Ceramics <30cm
  if (['pan', 'pot', 'knife', 'blade', 'battery', 'ceramic', 'plate', 'cup', 'wire', 'hairdryer', 'iron'].some(k => lowerItem.includes(k) || lowerMat.includes(k))) {
    return {
      category: 'unburnable',
      category_jp: '金属・陶器・ガラスごみ (不燃ごみ)',
      disposal_rules: 'Place in transparent bag. If sharp, wrap safely in thick paper and write "キケン" (DANGER).',
      requires_disassembly: false
    };
  }

  // Priority 6: Paper & Cardboard
  if (['cardboard', 'ダンボール', 'newspaper', 'magazine', 'milk carton'].some(k => lowerItem.includes(k))) {
    return {
      category: 'recyclable_paper',
      category_jp: '資源ごみ (古紙)',
      disposal_rules: 'Flatten cardboard boxes and tie securely with paper string. Avoid putting out on rainy days.',
      requires_disassembly: false
    };
  }

  // Default: Burnable
  return {
    category: 'burnable',
    category_jp: '燃やすごみ (可燃ごみ)',
    disposal_rules: 'Put in transparent or semitransparent bags. Tie securely. Place out before 8:00 AM.',
    requires_disassembly: false
  };
}

export function computeNextDate(dayPatterns: string[]): NextPickupInfo {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday
  const currentHour = now.getHours();

  if (!dayPatterns || dayPatterns.length === 0 || dayPatterns.some(p => p.includes('*') || p.includes('Daily'))) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      next_date: tomorrow.toISOString().split('T')[0],
      day_of_week: WEEKDAYS_EN[tomorrow.getDay()],
      relative_label: 'Tomorrow (Daily Commercial)',
      cutoff_time: '08:00 AM',
      description: 'Daily Commercial Collection'
    };
  }

  const candidates: Date[] = [];

  for (const pattern of dayPatterns) {
    for (const [jp, dayIndex] of Object.entries(WEEKDAYS_JP_TO_INT)) {
      if (pattern.includes(jp)) {
        let diff = (dayIndex - currentDay + 7) % 7;
        if (diff === 0 && currentHour >= 8) {
          diff = 7; // Cutoff passed for today
        }
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + diff);
        candidate.setHours(8, 0, 0, 0);
        candidates.push(candidate);
        break;
      }
    }
  }

  if (candidates.length === 0) {
    return {
      next_date: 'Scheduled by ward',
      day_of_week: 'See calendar',
      relative_label: 'Twice Monthly',
      cutoff_time: '08:00 AM'
    };
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  const next = candidates[0];
  const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let relativeLabel = `In ${diffDays} days`;
  if (diffDays === 0) relativeLabel = 'Today before 8:00 AM';
  else if (diffDays === 1) relativeLabel = 'Tomorrow';

  return {
    pattern: dayPatterns.join(', '),
    next_date: next.toISOString().split('T')[0],
    day_of_week: WEEKDAYS_EN[next.getDay()],
    relative_label: relativeLabel,
    cutoff_time: '08:00 AM'
  };
}

export function evaluateScheduleAndItems(
  items: DetectedItem[],
  neighborhoodQuery: string = '愛住町',
  banchiQuery: string = '',
  municipality: string = 'shinjuku'
): NeighborhoodScheduleResult {
  const records = shinjukuData as any[];
  const cleanQ = neighborhoodQuery.trim();

  let matchedRows = records.filter(r => r.town_full.includes(cleanQ) || r.town_clean.includes(cleanQ));
  if (matchedRows.length === 0) {
    matchedRows = records.filter(r => cleanQ.includes(r.kana));
  }

  let chosenRow = matchedRows[0] || records[0];

  if (matchedRows.length > 1) {
    const num = parseInt(banchiQuery.replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      for (const r of matchedRows) {
        if (r.banchi_spec !== 'all' && !r.banchi_spec.includes('除く')) {
          const rangeMatch = r.banchi_spec.match(/(\d+)から(\d+)/);
          if (rangeMatch) {
            const [low, high] = [parseInt(rangeMatch[1]), parseInt(rangeMatch[2])];
            if (num >= low && num <= high) {
              chosenRow = r;
              break;
            }
          }
        }
      }
    } else {
      const defaultRow = matchedRows.find(r => r.town_full.includes('上記を除く'));
      if (defaultRow) chosenRow = defaultRow;
    }
  }

  const evaluatedItems: EvaluatedItem[] = items.map(item => {
    const sodai = evaluateSodaiGomi(item.name, item.estimated_dim_cm);
    const classification = classifyWasteItem(item.name, item.material);

    return {
      id: item.id,
      name: item.name,
      material: item.material || 'General Material',
      dimensions_cm: item.estimated_dim_cm,
      is_sodai_gomi: sodai.is_sodai_gomi,
      sodai_details: sodai.is_sodai_gomi ? sodai : null,
      classification: classification.category,
      classification_jp: classification.category_jp,
      disposal_rules: classification.disposal_rules,
      requires_disassembly: classification.requires_disassembly || !!item.requires_disassembly,
      disassembly_notes: classification.disassembly_notes
    };
  });

  return {
    municipality,
    municipality_display: 'Shinjuku-ku (新宿区)',
    neighborhood: chosenRow.town_full,
    sanitation_office: chosenRow.sanitation_office,
    is_special_commercial_zone: chosenRow.is_special_zone,
    schedules: {
      burnable: {
        days: chosenRow.burnable_raw,
        next: computeNextDate(chosenRow.burnable_days)
      },
      recyclable: {
        days: chosenRow.recyclable_raw,
        next: computeNextDate(chosenRow.recyclable_days)
      },
      unburnable: {
        days: chosenRow.unburnable_raw,
        next: computeNextDate(chosenRow.unburnable_days)
      }
    },
    items: evaluatedItems
  };
}
