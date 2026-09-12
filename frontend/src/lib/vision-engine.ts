import { DetectedItem, IntentCategory, PreparationPrescription, VisionScanResult } from './types';

// High-value personal property or ambient objects that should NEVER be assumed as trash
const SAFEGUARD_PATTERNS = [
  { pattern: /phone|iphone|android|smartphone|pixel/i, name: 'Smartphone', reason: 'High-value personal electronic device' },
  { pattern: /laptop|macbook|thinkpad|notebook pc/i, name: 'Laptop Computer', reason: 'High-value computing asset' },
  { pattern: /key|car key|house key|keychain/i, name: 'Personal Keys', reason: 'Critical household & vehicle access' },
  { pattern: /wallet|purse|credit card|cash/i, name: 'Wallet / Cards', reason: 'Financial & identity credentials' },
  { pattern: /watch|apple watch|rolex|smartwatch/i, name: 'Wristwatch', reason: 'Personal accessory & jewelry' },
  { pattern: /ring|necklace|jewelry/i, name: 'Jewelry', reason: 'Precious personal ornament' },
  { pattern: /passport|id card|driver license/i, name: 'Official ID / Passport', reason: 'Sensitive government credential' }
];

export function determinePreparationPrescription(itemName: string, material: string = ''): PreparationPrescription {
  const lower = itemName.toLowerCase();
  const matLower = material.toLowerCase();

  // 1. Pressurized Aerosol / Gas Cassettes -> OUTDOOR DEGASSING
  if (['spray', 'aerosol', 'gas cassette', 'スプレー缶', 'カセットボンベ', 'butane'].some(k => lower.includes(k) || matLower.includes(k))) {
    return {
      action_type: 'OUTDOOR_DEGAS',
      action_label: 'Outdoor Degas & Do Not Puncture',
      action_label_jp: '屋外ガス抜き・穴あけ禁止',
      badge_color: 'rose',
      safety_warning: 'CRITICAL HAZARD: Indoor puncturing or discarding with residual gas causes Tokyo garbage truck fires. Must be completely emptied outdoors in a breeze away from sparks.',
      steps: [
        '1. Take the can outdoors to a well-ventilated area away from any open flame or sparks.',
        '2. Press nozzle or engage degassing cap until hissing sound completely stops.',
        '3. Verify the canister is empty and feels light.',
        '4. In Shinjuku, place in transparent bag labeled "スプレー缶" (Do not puncture).'
      ]
    };
  }

  // 2. PET Bottles -> COMPONENT SEPARATION & RINSE
  if (lower.includes('pet') || lower.includes('bottle') || lower.includes('ペットボトル')) {
    return {
      action_type: 'SEPARATE_PARTS',
      action_label: 'Separate Cap & Film + Rinse',
      action_label_jp: 'キャップ・ラベル分別・水洗い',
      badge_color: 'cyan',
      steps: [
        '1. Unscrew plastic bottle cap by hand.',
        '2. Peel off plastic shrink-wrap film label along perforated tear line.',
        '3. Rinse bottle interior with clean tap water to remove sweet residue.',
        '4. Step on bottle to crush it flat for compact collection.'
      ],
      components: [
        { name: 'PET Bottle Body', material: 'Clear Polyethylene Terephthalate (#1)', destination_stream: 'PET Resource (資源ペットボトル)' },
        { name: 'Bottle Cap', material: 'Polypropylene (PP #5)', destination_stream: 'Plastic Containers (プラマーク)' },
        { name: 'Vinyl Film Label', material: 'Plastic Film', destination_stream: 'Plastic Containers (プラマーク)' }
      ]
    };
  }

  // 3. Sharp Hazards (Knives, Broken Glass, Ceramics, Blades) -> SAFE WRAP HAZARD
  if (['knife', 'blade', 'broken', 'glass', 'ceramic', 'razor', 'plate', 'bulb', 'mirror', '包丁', '割れ物'].some(k => lower.includes(k))) {
    return {
      action_type: 'SAFE_WRAP_HAZARD',
      action_label: 'Safe Wrap & Mark Danger',
      action_label_jp: '厚紙包装・「キケン」明記',
      badge_color: 'amber',
      safety_warning: 'Worker Safety: Exposed sharp edges can severely injure sanitation staff. Wrap securely.',
      steps: [
        '1. Wrap sharp edges or broken shards in several layers of thick newspaper or cardboard.',
        '2. Fasten the wrapping securely with duct tape or packing tape so nothing slips out.',
        '3. Using a red permanent marker, write clearly: 「キケン」 (DANGER).',
        '4. Place in designated Non-Burnable (金属・陶器・ガラス) collection bag.'
      ]
    };
  }

  // 4. Food Containers & Cans -> RINSE AND DRY
  if (['can', 'aluminum', 'steel', 'milk carton', 'tray', 'sauce', 'jam', '缶', '牛乳パック'].some(k => lower.includes(k) || matLower.includes(k))) {
    return {
      action_type: 'RINSE_AND_DRY',
      action_label: 'Rinse & Dry Thoroughly',
      action_label_jp: '水洗い・乾燥',
      badge_color: 'emerald',
      steps: [
        '1. Rinse residual beverage, milk, or sauce residue with tap water.',
        '2. Invert and let dry on a dish rack or paper towel.',
        '3. If milk carton: Cut open along seam, flatten, and dry completely.',
        '4. Do not crush aluminum beverage cans in Tokyo special wards.'
      ]
    };
  }

  // 5. Cardboard Boxes & Paper -> BUNDLE WITH STRING
  if (['cardboard', 'ダンボール', 'newspaper', 'magazine', 'paper box'].some(k => lower.includes(k))) {
    return {
      action_type: 'BUNDLE_CORD',
      action_label: 'Bundle with Paper Twine',
      action_label_jp: '紙ひも結束・平らに畳む',
      badge_color: 'purple',
      steps: [
        '1. Remove all plastic shipping tape, delivery slips, and styrofoam inserts.',
        '2. Flatten all cardboard boxes completely.',
        '3. Stack neatly and tie firmly in a cross pattern (+) using biodegradable paper string or polypropylene twine.',
        '4. Avoid putting out on heavy rain days to prevent soggy pulp.'
      ]
    };
  }

  // Default: Direct disposal
  return {
    action_type: 'NONE',
    action_label: 'Direct Bag Placement',
    action_label_jp: 'そのまま指定袋へ',
    badge_color: 'slate',
    steps: [
      '1. Place item inside transparent or semitransparent municipal disposal bag.',
      '2. Tie bag securely at the top.'
    ]
  };
}

export function evaluateIntentSafeguard(name: string): { intent: IntentCategory; reason?: string } {
  for (const item of SAFEGUARD_PATTERNS) {
    if (item.pattern.test(name)) {
      return {
        intent: 'SAFEGUARD_NON_WASTE',
        reason: item.reason
      };
    }
  }
  return { intent: 'DISCARD_CANDIDATE' };
}

export async function runTieredVisionAnalysis(
  presetKey?: string,
  forceTier2: boolean = false
): Promise<VisionScanResult> {
  const startTime = Date.now();

  // Tier Model Definition
  const modelTier = forceTier2
    ? 'Tier-2 (Claude 3.7 Sonnet / Nova Pro)'
    : 'Tier-1 (Nova 2 Lite)';

  // Preset Scenario Data Generation
  let rawItems: Array<{
    id: string;
    name: string;
    description: string;
    material: string;
    dim_cm: number;
    base_confidence: number;
  }> = [];

  if (presetKey === 'messy_desk') {
    // Realistic messy desk: empty PET bottle, coffee can, crumpled receipt, AND an Apple iPhone!
    rawItems = [
      {
        id: 'item-desk-1',
        name: 'Green Tea PET Bottle (500ml)',
        description: 'Commercial beverage bottle with attached screw-cap and printed shrink wrap label.',
        material: 'PET (#1) / Polypropylene Cap',
        dim_cm: 21,
        base_confidence: 0.97
      },
      {
        id: 'item-desk-2',
        name: 'Apple iPhone 15 Pro',
        description: 'Active cellular smartphone with titanium chassis and OLED display resting on desk.',
        material: 'Glass / Titanium / Electronics',
        dim_cm: 15,
        base_confidence: 0.99
      },
      {
        id: 'item-desk-3',
        name: 'Aluminum BOSS Coffee Can',
        description: 'Empty 185g steel/aluminum beverage can with tab pressed.',
        material: 'Aluminum / Steel',
        dim_cm: 11,
        base_confidence: 0.95
      },
      {
        id: 'item-desk-4',
        name: 'Crumpled Thermal Convenience Store Receipt',
        description: 'Small crumpled paper receipt from 7-Eleven.',
        material: 'Thermal Paper',
        dim_cm: 6,
        base_confidence: forceTier2 ? 0.92 : 0.68 // Low confidence on Tier 1, resolved on Tier 2!
      }
    ];
  } else if (presetKey === 'appliance_box') {
    rawItems = [
      {
        id: 'item-app-1',
        name: 'Electric Rice Cooker',
        description: 'Zojirushi 3-cup microcomputer electric rice cooker with power cord.',
        material: 'Polycarbonate / Stainless Steel / Wiring',
        dim_cm: 34,
        base_confidence: 0.96
      },
      {
        id: 'item-app-2',
        name: 'Appliance Packaging Cardboard Box',
        description: 'Corrugated brown shipping box with product printed graphics.',
        material: 'Corrugated Cardboard',
        dim_cm: 42,
        base_confidence: 0.94
      }
    ];
  } else if (presetKey === 'hazardous_kitchen') {
    rawItems = [
      {
        id: 'item-haz-1',
        name: 'Butane Gas Cassette Canister',
        description: 'Portable tabletop stove gas cylinder with fuel smell.',
        material: 'Steel / Liquefied Petroleum Gas',
        dim_cm: 20,
        base_confidence: 0.98
      },
      {
        id: 'item-haz-2',
        name: 'Chipped Ceramic Ramen Bowl',
        description: 'Porcelain bowl with visible crack along the rim and sharp fracture.',
        material: 'Ceramic / Porcelain',
        dim_cm: 18,
        base_confidence: forceTier2 ? 0.95 : 0.74 // Low confidence in Tier 1!
      }
    ];
  } else {
    // Default multi-item scene with an ambient safeguard
    rawItems = [
      {
        id: 'item-def-1',
        name: 'Green Tea PET Bottle',
        description: 'Empty plastic tea bottle with label and cap.',
        material: 'PET Plastic',
        dim_cm: 22,
        base_confidence: 0.97
      },
      {
        id: 'item-def-2',
        name: 'Car Key Fob & House Keys',
        description: 'Metal keyring with Toyota wireless fob and two brass door keys.',
        material: 'Brass / Electronics',
        dim_cm: 9,
        base_confidence: 0.99
      },
      {
        id: 'item-def-3',
        name: 'Takeout Plastic Bento Container',
        description: 'Transparent polypropylene meal lid with oily residue.',
        material: 'Plastic (PP #5)',
        dim_cm: 24,
        base_confidence: forceTier2 ? 0.94 : 0.79
      }
    ];
  }

  let safeguardsCount = 0;
  let hasLowConfidence = false;

  const processedItems: DetectedItem[] = rawItems.map(raw => {
    const intentRes = evaluateIntentSafeguard(raw.name);
    const isSafeguard = intentRes.intent === 'SAFEGUARD_NON_WASTE';
    if (isSafeguard) safeguardsCount++;

    const confidence = forceTier2 ? Math.min(0.99, raw.base_confidence + 0.15) : raw.base_confidence;
    const isLow = confidence < 0.85;
    if (isLow) hasLowConfidence = true;

    const prep = determinePreparationPrescription(raw.name, raw.material);

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      material: raw.material,
      estimated_dim_cm: raw.dim_cm,
      confidence: parseFloat(confidence.toFixed(2)),
      model_tier: modelTier,
      is_low_confidence: isLow,
      intent_category: intentRes.intent,
      is_marked_for_disposal: !isSafeguard, // Non-waste items default to UNCHECKED / KEEP!
      preparation: prep
    };
  });

  const latency = Date.now() - startTime + (forceTier2 ? 750 : 280);
  const avgConfidence = processedItems.reduce((acc, i) => acc + i.confidence, 0) / processedItems.length;

  return {
    items: processedItems,
    overall_confidence: parseFloat(avgConfidence.toFixed(2)),
    model_used: modelTier,
    latency_ms: latency,
    safeguards_triggered: safeguardsCount,
    needs_escalation: hasLowConfidence && !forceTier2
  };
}
