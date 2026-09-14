import { DetectedItem, EvaluatedItem, ClarificationQuestion, ClarificationOption } from './types';

export interface MunicipalRuleConfig {
  municipality_id: string;
  name_en: string;
  name_ja: string;
  general_threshold_cm: number;
  metal_threshold_cm: number;
  bag_requirement_en: string;
  bag_requirement_ja: string;
  spray_can_rule_en: string;
  spray_can_rule_ja: string;
  morning_deadline: string;
  is_station_dropoff_only?: boolean;
}

export const MUNICIPAL_RULES: Record<string, MunicipalRuleConfig> = {
  tokyo_shinjuku: {
    municipality_id: 'tokyo_shinjuku',
    name_en: 'Tokyo - Shinjuku City',
    name_ja: '東京都新宿区',
    general_threshold_cm: 30,
    metal_threshold_cm: 30,
    bag_requirement_en: 'Transparent or translucent bags (45L max) or designated collection bins.',
    bag_requirement_ja: '45L以下の透明・半透明の袋、または蓋付き容器。',
    spray_can_rule_en: 'Outdoor degas completely. DO NOT puncture holes (prevents sparks/fires in garbage trucks).',
    spray_can_rule_ja: '屋外で中身を使い切り、穴あけは不要です（車両火災防止）。',
    morning_deadline: '08:00 AM'
  },
  kanagawa_yokohama: {
    municipality_id: 'kanagawa_yokohama',
    name_en: 'Kanagawa - Yokohama City',
    name_ja: '神奈川県横浜市',
    general_threshold_cm: 50,
    metal_threshold_cm: 30,
    bag_requirement_en: 'Transparent or translucent plastic bags (translucent white/clear).',
    bag_requirement_ja: '半透明または透明のゴミ袋を使用。',
    spray_can_rule_en: 'Use up completely outdoors. No puncturing required.',
    spray_can_rule_ja: '屋外で使い切る。穴あけ不要。',
    morning_deadline: '08:00 AM'
  },
  kyoto_kyoto: {
    municipality_id: 'kyoto_kyoto',
    name_en: 'Kyoto - Kyoto City',
    name_ja: '京都府京都市',
    general_threshold_cm: 30,
    metal_threshold_cm: 30,
    bag_requirement_en: 'Mandatory designated paid bags (Shitei Gomibukuro: Yellow for Burnable, Translucent for Plastics).',
    bag_requirement_ja: '有料指定袋（燃やすごみ：黄色、プラスチック：透明）が必須。',
    spray_can_rule_en: 'Use up completely in a well-ventilated outdoor area. Place in designated yellow bin on can day.',
    spray_can_rule_ja: '屋外で使い切り、缶・ビンの日に収集場所の黄色コンテナへ。',
    morning_deadline: '08:00 AM'
  },
  tokushima_kamikatsu: {
    municipality_id: 'tokushima_kamikatsu',
    name_en: 'Tokushima - Kamikatsu Town',
    name_ja: '徳島県上勝町',
    general_threshold_cm: 50,
    metal_threshold_cm: 50,
    bag_requirement_en: 'No curbside pickup. Bring directly to Kamikatsu Zero Waste Station separated into 45 streams.',
    bag_requirement_ja: '戸別収集なし。ゼロ・ウェイストセンターへ直接持ち込み、45分別。',
    spray_can_rule_en: 'Depressurize at the Zero Waste Station designated degassing jig.',
    spray_can_rule_ja: 'ステーションの専用治具で脱圧・分別。',
    morning_deadline: '07:30 AM - 02:00 PM Station Hours',
    is_station_dropoff_only: true
  }
};

// Catalog of Ambiguity Clarification Questions for Conditional Items
export const AMBIGUITY_QUESTION_CATALOG: Record<string, ClarificationQuestion> = {
  pizza_box: {
    id: 'pizza_box',
    question: 'Is this pizza box soiled with food grease/cheese, or is it clean dry cardboard?',
    options: [
      {
        label: '🔥 Greasy / Food Residue',
        chosen_answer: 'greasy',
        target_classification: 'Combustible Waste (燃やすごみ)',
        target_schedule_key: 'combustible',
        description: 'Oil contamination prevents paper recycling; belongs in burnables.'
      },
      {
        label: '📦 Clean / Dry Paper',
        chosen_answer: 'clean',
        target_classification: 'Recyclable Paper (古紙・段ボール)',
        target_schedule_key: 'resources',
        description: 'Flatten cardboard and bundle crosswise with twine.'
      }
    ]
  },
  umbrella: {
    id: 'umbrella',
    question: 'Can you separate the vinyl canopy from the metal ribs/frame?',
    options: [
      {
        label: '✂️ Disassemble (Vinyl + Metal)',
        chosen_answer: 'disassembled',
        target_classification: 'Canopy: Combustible / Frame: Metal (不燃ごみ)',
        target_schedule_key: 'metal_ceramics_glass',
        description: 'Vinyl goes to burnables/plastics; steel skeleton goes to non-burnable metals.'
      },
      {
        label: '☂️ Keep Whole (Single piece)',
        chosen_answer: 'intact',
        target_classification: 'Non-Combustible (不燃ごみ) / Bulky if > threshold',
        target_schedule_key: 'metal_ceramics_glass',
        description: 'Place in non-burnable bin if under limit, or book Sodai Gomi if exceeds limit.'
      }
    ]
  },
  sponge: {
    id: 'sponge',
    question: 'Is this a soft polyurethane/cellulose sponge or does it have metal steel-mesh wiring?',
    options: [
      {
        label: '🧽 Soft Synthetic / Cellulose',
        chosen_answer: 'soft',
        target_classification: 'Combustible Waste (燃やすごみ)',
        target_schedule_key: 'combustible',
        description: 'Standard kitchen dish sponge incinerates cleanly.'
      },
      {
        label: '🧲 Steel Wool / Wire Mesh',
        chosen_answer: 'metal',
        target_classification: 'Incombustible Metal (不燃・金物)',
        target_schedule_key: 'metal_ceramics_glass',
        description: 'Metal scrubbers cannot be incinerated.'
      }
    ]
  },
  frying_pan: {
    id: 'frying_pan',
    question: 'Is the total longest dimension (including handle) within your city threshold?',
    options: [
      {
        label: '🍳 Under City Threshold',
        chosen_answer: 'under_threshold',
        target_classification: 'Metal & Glass (金属・不燃ごみ)',
        target_schedule_key: 'metal_ceramics_glass',
        description: 'Free curbside pickup on non-burnable collection day.'
      },
      {
        label: '📏 Exceeds Threshold (Bulky)',
        chosen_answer: 'over_threshold',
        target_classification: 'Bulky Waste (粗大ごみ - Requires Ticket)',
        target_schedule_key: 'sodai_gomi',
        description: 'Requires municipal sticker and appointment reservation.'
      }
    ]
  },
  spray_can: {
    id: 'spray_can',
    question: 'Is the canister completely empty with zero audible hissing sound?',
    options: [
      {
        label: '💨 Completely Empty & Degassed',
        chosen_answer: 'empty',
        target_classification: 'Resource Cans / Spray Cans (資源スプレー缶)',
        target_schedule_key: 'cans_bottles_pet',
        description: 'Place in separate clear bag next to metal cans (Do NOT puncture in Shinjuku!).'
      },
      {
        label: '⚠️ Still Contains Residual Gas',
        chosen_answer: 'contains_gas',
        target_classification: 'Hazardous (要ガス抜き・発火注意)',
        target_schedule_key: 'hazardous',
        description: 'Take outdoors to an open area away from sparks and press nozzle until hiss stops.'
      }
    ]
  },
  power_bank: {
    id: 'power_bank',
    question: 'Does this item contain a rechargeable lithium-ion battery?',
    options: [
      {
        label: '🔋 Yes, Rechargeable Lithium-Ion',
        chosen_answer: 'lithium',
        target_classification: 'PROHIBITED from Curbside (JBRC Yellow Box)',
        target_schedule_key: 'prohibited',
        description: 'Causes compactor fires! Drop off at Bic Camera, Yodobashi, or municipal office JBRC box.'
      },
      {
        label: '⚡ Disposable Alkaline Battery',
        chosen_answer: 'alkaline',
        target_classification: 'Harmful Waste Batteries (乾電池・有害ごみ)',
        target_schedule_key: 'hazardous_battery',
        description: 'Insulate both terminals with scotch tape and place in small clear bag.'
      }
    ]
  }
};

/**
 * Detects if an item triggers an ambiguity question based on its name and material
 */
export function findAmbiguityQuestion(itemName: string, material: string): ClarificationQuestion | undefined {
  const lower = itemName.toLowerCase();

  if (lower.includes('pizza') || lower.includes('ピザ') || (lower.includes('box') && lower.includes('food'))) {
    return AMBIGUITY_QUESTION_CATALOG['pizza_box'];
  }
  if (lower.includes('umbrella') || lower.includes('傘') || lower.includes('parasol')) {
    return AMBIGUITY_QUESTION_CATALOG['umbrella'];
  }
  if (lower.includes('sponge') || lower.includes('スポンジ') || lower.includes('scour')) {
    return AMBIGUITY_QUESTION_CATALOG['sponge'];
  }
  if (lower.includes('pan') || lower.includes('pot') || lower.includes('フライパン') || lower.includes('鍋') || lower.includes('wok')) {
    return AMBIGUITY_QUESTION_CATALOG['frying_pan'];
  }
  if (lower.includes('power bank') || lower.includes('battery') || lower.includes('lithium') || lower.includes('バッテリー') || lower.includes('充電器')) {
    return AMBIGUITY_QUESTION_CATALOG['power_bank'];
  }
  return undefined;
}

/**
 * Evaluates an item's dimensions against the municipality's threshold.
 * Flags approximation warning if dimension is near the boundary.
 */
export function evaluateItemSizeWithMunicipality(
  itemDimCm: number,
  itemMaterial: string,
  municipalityId: string
): {
  threshold_cm: number;
  is_over_threshold: boolean;
  needs_size_confirmation: boolean;
  warning_text?: string;
} {
  const rule = MUNICIPAL_RULES[municipalityId] || MUNICIPAL_RULES.tokyo_shinjuku;
  const isMetal = itemMaterial.toLowerCase().includes('metal') || 
                  itemMaterial.toLowerCase().includes('steel') || 
                  itemMaterial.toLowerCase().includes('iron') ||
                  itemMaterial.toLowerCase().includes('aluminum');

  const threshold_cm = (isMetal && rule.metal_threshold_cm) ? rule.metal_threshold_cm : rule.general_threshold_cm;
  const is_over_threshold = itemDimCm > threshold_cm;

  // Approximation window: within 6cm below or 12cm above threshold
  const near_boundary = itemDimCm >= (threshold_cm - 6) && itemDimCm <= (threshold_cm + 12);
  const needs_size_confirmation = near_boundary;

  let warning_text: string | undefined;
  if (near_boundary) {
    if (municipalityId === 'kanagawa_yokohama') {
      warning_text = isMetal
        ? `⚠️ Yokohama metal threshold is 30cm (AI estimated ~${itemDimCm}cm). Please confirm exact length.`
        : `⚠️ Yokohama threshold is 50cm (AI estimated ~${itemDimCm}cm). Under 50cm is curbside non-burnable; over 50cm is Sodai Gomi.`;
    } else {
      warning_text = `⚠️ AI Estimated Size: ~${itemDimCm}cm. In ${rule.name_en}, Sodai Gomi threshold is ${threshold_cm}cm. Please verify.`;
    }
  }

  return {
    threshold_cm,
    is_over_threshold,
    needs_size_confirmation,
    warning_text
  };
}
