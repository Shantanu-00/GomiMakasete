import { NextResponse } from 'next/server';
import { MUNICIPAL_RULES } from '@/lib/knowledge-rules';
import { 
  SODAI_CATALOG, 
  calculateStickers, 
  classifyWasteItem, 
  evaluateScheduleAndItems 
} from '@/lib/waste-logic';

interface ChatRequestBody {
  message?: string;
  query?: string;
  municipalityId?: string;
  municipality?: string;
  neighborhood?: string;
  banchi?: string;
  profileName?: string;
  history?: Array<{ role: string; content: string }>;
  isVoice?: boolean;
}

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    const message = (body.message || body.query || '').trim();
    const municipalityId = body.municipalityId || body.municipality || 'tokyo_shinjuku';
    const neighborhood = body.neighborhood || '愛住町';
    const banchi = body.banchi || '';
    const profileName = body.profileName || 'Resident';

    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // 1. Try Live Bedrock AgentCore Runtime backend if accessible
    const agentCoreUrl = process.env.AGENTCORE_ENDPOINT_URL || 'http://localhost:8080/invocations';
    try {
      const resp = await fetch(agentCoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            action: 'chat',
            prompt: message,
            session_id: `resident-${municipalityId}`,
            context: {
              municipality: municipalityId,
              neighborhood: neighborhood,
              banchi: banchi
            }
          }
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (resp.ok) {
        const data = await resp.json();
        const replyText = data.output?.message;
        if (replyText && !replyText.includes('I can help you sort any household waste for')) {
          return NextResponse.json({
            reply: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'Amazon Bedrock AgentCore (Nova Fleet)'
          });
        }
      }
    } catch {
      // Fallback to local municipal intelligence
    }

    // 2. High-Accuracy Deterministic Municipal Waste Intelligence Engine
    const lower = message.toLowerCase();
    const ruleConfig = MUNICIPAL_RULES[municipalityId] || MUNICIPAL_RULES['tokyo_shinjuku'];
    const cityName = ruleConfig.name_en;
    let reply = '';

    // GREETINGS & INTRODUCTIONS
    if (['hello', 'hi', 'hey', 'konnichiwa', 'who are you', 'what can you do', 'help', 'ohayo', 'greetings', 'start', 'こんにちは', 'はじめまして'].some(g => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
      reply = `Konnichiwa, ${profileName}! I am Gomi-chan (ゴミちゃん) 🐾, your autonomous recycling assistant for ${cityName}.

I can assist you with:
• 🗑️ **Item Sorting & Separation:** Ask about any item (e.g., "frying pan", "shoes", "pizza box", "milk carton").
• 📅 **Collection Schedules:** Ask "When is combustible pickup in ${neighborhood}?" or "What time should I put trash out?".
• 🛋️ **Bulky Waste (粗大ごみ):** Inquire about fees, stickers (Ticket A/B), and reservation steps.
• ⚠️ **Hazard Safety:** Ask about spray cans, lithium power banks, kitchen knives, and tempura oil.

What item would you like to check today? ✨`;
    }
    // THANKS / COURTESY
    else if (['thank', 'thanks', 'arigato', 'arigatou', 'domo', 'great', 'awesome', 'ありがとう', '助かりました'].some(t => lower.includes(t))) {
      reply = `You are very welcome, ${profileName}! (どういたしまして 🌸). Proper waste separation keeps our neighborhood clean, protects our sanitation workers, and maximizes Japan's resource recycling rate! Let me know if you have any more items to sort! 🐾`;
    }
    // TIME & MORNING PROTOCOL
    else if (lower.includes('what time') || lower.includes('night before') || lower.includes('late') || lower.includes('missed') || lower.includes('8 am') || lower.includes('8:00') || lower.includes('crows') || lower.includes('烏') || lower.includes('時間') || lower.includes('前日')) {
      reply = `⏰ **Official Collection Timing Rules for ${cityName}:**

1. **Morning Cut-off:** Place your garbage bags at the designated collection spot **before 08:00 AM** on the morning of collection.
2. **Night-Before Prohibition:** Strictly **NEVER** put garbage out the night before! Urban crows (*karasu*) and nocturnal animals will rip open bags and scatter waste across streets.
3. **Crow Net Etiquette:** Always place bags completely underneath the yellow crow netting (*防鳥ネット*) and tuck the net edges securely with weights or stones.
4. **If you missed the truck:** Bring your garbage bag back inside your home until the next scheduled collection morning! 🚯`;
    }
    // APPLIANCE RECYCLING ACT (TV, FRIDGE, WASHER, AC)
    else if (['tv', 'television', 'refrigerator', 'fridge', 'freezer', 'washing machine', 'washer', 'dryer', 'air conditioner', 'ac', 'テレビ', '冷蔵庫', '冷凍庫', '洗濯機', 'エアコン'].some(k => lower.includes(k))) {
      reply = `⚠️ **Home Appliance Recycling Act (特定家庭用機器再商品化法):**

Air conditioners, TVs, refrigerators/freezers, and washing machines/dryers **CANNOT** be collected by municipal garbage trucks or regular Bulky Waste (*Sodai Gomi*)!

**How to Dispose:**
1. **Retailer Trade-in:** If buying a new unit, the electronics store (Yodobashi, Bic Camera, Yamada Denki) is legally required to take your old unit for a recycling fee + pickup charge.
2. **Post Office Voucher (家電リサイクル券):** Visit any Japan Post Bank (*Yucho*) window, pay the statutory recycling fee, and drop the appliance off at your ward's designated collection yard (*指定引取場所*).
3. **Certified Home Collection:** Contact the Tokyo / Municipal Home Appliance Recycle Center (*家電リサイクル受付センター*) for door-to-door pickup.`;
    }
    // PC & COMPUTER RECYCLING
    else if (['pc', 'laptop', 'desktop computer', 'computer', 'monitor', 'パソコン', 'ノートパソコン'].some(k => lower.includes(k))) {
      reply = `💻 **PC Recycling Law (資源有効利用促進法):**

Computers (laptops, desktop towers, monitors) cannot be thrown in curbside trash!
• **PC Recycle Mark:** Look for the "PCリサイクル" sticker on your device. If present, the manufacturer will collect it **100% free of charge** via Japan Post Yu-Pack.
• **Municipal Small Electronics Drop-Box:** Small laptops and tablets can also be deposited into the small appliance collection boxes (*小型家電回収ボックス*) inside ward offices and library lobbies.
• **Hard Drive Safety:** Always securely wipe or destroy your storage drive before recycling to safeguard personal data!`;
    }
    // LITHIUM BATTERIES & POWER BANKS (FIRE HAZARD)
    else if (['battery', 'batteries', 'power bank', 'mobile battery', 'lithium', 'vape', 'e-cigarette', 'charger', '充電器', 'モバイルバッテリー', '電池'].some(k => lower.includes(k))) {
      if (lower.includes('lithium') || lower.includes('power bank') || lower.includes('mobile battery') || lower.includes('rechargeable') || lower.includes('vape')) {
        reply = `🚨 **CRITICAL FIRE HAZARD: Rechargeable Batteries & Power Banks:**

Lithium-ion batteries must **NEVER, UNDER ANY CIRCUMSTANCES** be placed into curbside trash or combustible bags! Under the hydraulic compression compactors of garbage trucks, punctured lithium batteries explode and cause severe vehicle fires.

**Correct Disposal:**
• Take them to the yellow **JBRC Recycle Boxes** found at electronics retailers (Bic Camera, Yodobashi Camera, Kojima) or ward sanitation offices.
• Cover both metal terminals (+ and -) with non-conductive cellophane tape before dropping them in! 🔋⚡`;
      } else {
        reply = `🔋 **Battery Disposal Guidelines for ${cityName}:**

• **Alkaline & Manganese Dry Cells (AA, AAA, 9V):** Tape both positive (+) and negative (-) terminals with cellophane tape to prevent short-circuit sparks. Dispose on **Incombustible / Small Metal day (金属・陶器・ガラス)** in a clear bag.
• **Button / Coin Cells (CR / LR):** Tape both sides with tape and return to button battery collection cans at electronics stores.
• **Rechargeable Lithium Power Banks:** Never curbside! Take to yellow JBRC recycling boxes at Bic Camera or Yodobashi Camera.`;
      }
    }
    // SPRAY CANS & CASSETTE GAS CANISTERS
    else if (['spray', 'gas can', 'gas canister', 'cassette gas', 'deodorant spray', 'hair spray', 'スプレー缶', 'カセットボンベ', 'ガス缶'].some(k => lower.includes(k))) {
      reply = `💨 **Spray Can & Gas Canister Protocol for ${cityName}:**

${ruleConfig.spray_can_rule_en}

**Step-by-Step Safety Action:**
1. **Exhaust Outdoors:** Take the can outside to a breezy, open area away from naked flames, cigarettes, or vents.
2. **Depress Nozzle:** Press the nozzle until the hissing sound stops completely and no residual propellant remains.
3. **DO NOT PUNCTURE HOLES:** Never hammer nail holes in spray cans! Sparks can ignite residual vapor.
4. **Bagging:** Place exhausted cans in a transparent bag separate from other trash, clearly marked **"スプレー缶"** on Resource Collection Day!`;
    }
    // USED COOKING OIL (TEMPURA OIL)
    else if (['oil', 'cooking oil', 'tempura oil', 'vegetable oil', 'frying oil', '油', '天ぷら油', '食用油'].some(k => lower.includes(k))) {
      reply = `🍳 **Used Cooking Oil Disposal Protocol:**

**NEVER pour cooking oil down your kitchen sink or toilet drain!** It congeals in city sewer mains, causing catastrophic blockages and water contamination.

**Safe Disposal Options:**
1. **Solidifier Powder:** Stir commercial oil hardener powder (*固めるテンプル* / Katameru-ten) into warm oil. Once cooled into a solid puck, discard with **Combustible Waste (燃やすごみ)**.
2. **Milk Carton Absorption:** Pack an empty paper milk carton with crumpled newspaper or paper towels, pour in the cooled oil, tape the top shut with duct tape, and dispose with **Combustible Waste**.
3. **Eco Drop-off:** Many ward offices and supermarkets maintain collection stations for used vegetable oil to be refined into biodiesel fuel! 🛢️🌱`;
    }
    // SHARP HAZARDS (KNIVES, BROKEN GLASS, CERAMICS)
    else if (['knife', 'blade', 'broken glass', 'glass shard', 'ceramic', 'plate', 'razor', 'scissors', 'needles', '包丁', 'ガラス', '陶器', '割れ物', '刃物'].some(k => lower.includes(k))) {
      reply = `🔪 **Sharp Hazard Protocol (Safe Wrap for Sanitation Workers):**

To protect municipal sanitation workers from lacerations and puncture wounds:
1. **Thick Wrap:** Wrap the sharp blade or broken glass fragments in several layers of thick cardboard or corrugated paper.
2. **Heavy Tape:** Tape the packaging securely on all sides with packing tape so sharp edges cannot poke through.
3. **Bold Label:** Clearly write **「キケン」** (DANGER) or **「割れ物・包丁」** in bold red or black permanent marker on the outside.
4. **Collection Day:** Place out on **Incombustible / Small Metal Day (金属・陶器・ガラス)** in a clear transparent bag. 🛡️`;
    }
    // PIZZA BOX & GREASY CARDBOARD
    else if (['pizza', 'pizza box', 'greasy box', 'oily cardboard', 'ピザ', 'ピザ箱'].some(k => lower.includes(k))) {
      reply = `🍕 **Pizza Box & Soiled Cardboard Disposal Rule:**

• **Greasy / Cheese-Stained Boxes:** Cardboard soiled with food oil, melted cheese, or sauce **CANNOT be recycled as paper resource**! You must dispose of greasy pizza boxes with **Combustible Waste (燃やすごみ)**.
• **Clean Tops:** If the top lid is completely clean and dry, you can tear it off and recycle it with Paper Resources (*古紙*).
• **Clean Cardboard Rule:** All clean shipping boxes must be flattened and tied securely in a cross pattern with paper twine (*紙ひも*). Do NOT use adhesive tape!`;
    }
    // PET BOTTLES
    else if (['pet bottle', 'plastic bottle', 'water bottle', 'coke bottle', 'ペットボトル'].some(k => lower.includes(k))) {
      reply = `🧴 **Standard 3-Step PET Bottle Separation Rule:**

In ${cityName}, PET bottles are high-value resources and require strict separation:
1. **Remove Cap (キャップ):** Unscrew the plastic cap -> goes into **Plastic Resource (プラマーク)**.
2. **Peel Film/Label (ラベル):** Peel off the shrink-wrap plastic label along the perforation -> goes into **Plastic Resource (プラマーク)**.
3. **Rinse & Crush:** Rinse the bottle interior with tap water, stomp or crush it flat, and place the transparent bottle into the dedicated **PET Bottle collection net/bin** on Recyclables Day! 🔄`;
    }
    // MILK & JUICE CARTONS
    else if (['milk carton', 'juice carton', 'paper carton', 'tetrapak', '牛乳パック', '紙パック'].some(k => lower.includes(k))) {
      reply = `🥛 **Paper Milk & Juice Carton Protocol:**

1. **Rinse:** Wash the inside with cold water immediately after emptying.
2. **Cut Flat:** Use kitchen scissors to slice down the side seam and cut out the bottom so it lays completely flat.
3. **Dry & Tie:** Allow it to dry thoroughly. Bundle 10–20 cartons together and tie with paper twine (*紙ひも*).
• *Note:* Cartons with silver aluminum foil lining on the inside cannot be recycled as paper resource — they go to Combustible Waste (燃やすごみ).
• Supermarkets (Life, Maruetsu, Aeon) also have collection boxes at entrances!`;
    }
    // CLOTHING, TEXTILES, SHOES
    else if (['clothes', 'clothing', 'textile', 'shirt', 'jacket', 'pants', 'shoes', 'boots', 'towel', '古着', '靴', '衣類', '布'].some(k => lower.includes(k))) {
      if (lower.includes('shoe') || lower.includes('boot') || lower.includes('sneaker')) {
        reply = `👟 **Footwear & Shoes:**
Shoes, leather sneakers, sandals, and boots are classified as **Combustible Waste (燃やすごみ)** in ${cityName}. Place them directly in your burnable bag. If shoes contain steel safety toe caps, they go to Incombustible/Small Metal.`;
      } else {
        reply = `👕 **Used Clothing & Textile Resource Protocol:**

• **Clean, Wearable Clothes:** Bundle dry garments in a transparent bag for **Used Cloth Resource (古着・布類)** collection.
• **RAIN DAY CANCELLATION:** In Yokohama and Tokyo wards, textile collection is cancelled on rainy days to prevent mildew damage! Keep bags indoors until the next dry pickup day.
• **Torn, Oily, or Dirty Rags:** Damaged underwear, soiled towels, and oily work clothes go to **Combustible Waste (燃やすごみ)**.`;
      }
    }
    // FRYING PAN / POT / COOKWARE
    else if (['frying pan', 'pan', 'pot', 'kettle', 'wok', 'フライパン', '鍋', 'やかん'].some(k => lower.includes(k))) {
      reply = `🍳 **Frying Pan & Cookware Sorting Rule for ${cityName}:**

• **Under ${ruleConfig.metal_threshold_cm} cm:** Dispose with **Incombustible Waste / Small Metal (金属・陶器・ガラス)**. Wash off residual grease before bagging.
• **Over ${ruleConfig.metal_threshold_cm} cm:** Classified as **Bulky Waste (粗大ごみ)**. Requires reservation (standard fee: ~¥400, Ticket A × 2).
• **Glass Lids:** If the lid is detachable glass, place it together with Incombustible waste.`;
    }
    // BULKY WASTE (SODAI GOMI) SPECIFIC ITEMS
    else if (['mattress', 'futon', 'sofa', 'couch', 'desk', 'table', 'chair', 'bicycle', 'bookshelf', 'carpet', 'rug', 'suitcase', 'guitar', 'microwave', 'vacuum', 'fan', 'heater', 'bed', '粗大ごみ', '布団', '机', 'ベッド', '自転車'].some(k => lower.includes(k))) {
      let matchedKey = '';
      for (const key of Object.keys(SODAI_CATALOG)) {
        if (lower.includes(key)) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey && SODAI_CATALOG[matchedKey]) {
        const item = SODAI_CATALOG[matchedKey];
        const stickers = calculateStickers(item.fee);
        reply = `🛋️ **Bulky Waste (粗大ごみ) Details: ${item.jp_name} (${matchedKey}):**

• **Classification:** Bulky Waste (exceeds ${ruleConfig.general_threshold_cm} cm threshold)
• **Standard Fee:** ¥${item.fee}
• **Required Stickers:** ${stickers.summary} (Ticket A ¥200 × ${stickers.sticker_a_count}, Ticket B ¥300 × ${stickers.sticker_b_count})

**How to Arrange Collection:**
1. **Reserve:** Contact your local Ward Bulky Waste Reception Center (*粗大ごみ受付センター*) online or by phone.
2. **Purchase Stickers:** Buy the required fee stickers at any 7-Eleven, Lawson, or FamilyMart within your municipality.
3. **Affix Sticker:** Write your reception number and collection date on the sticker, attach it prominently to the item.
4. **Place Outside:** Place the item at your apartment entrance or curb by **08:00 AM** on the booked date!`;
      } else {
        reply = `🛋️ **Bulky Waste (粗大ごみ) General Procedure for ${cityName}:**

In ${cityName}, any household furniture or large item exceeding **${ruleConfig.general_threshold_cm} cm** on any side cannot go into curbside bins.

**4-Step Procedure:**
1. **Measure:** Check width, depth, and height.
2. **Reserve:** Book pickup online via your ward's Bulky Waste Center (*粗大ごみ受付センター*).
3. **Buy Stickers:** Purchase combination revenue stickers (**Ticket A: ¥200**, **Ticket B: ¥300**) at convenience stores.
4. **Attach & Set Out:** Paste stickers onto items and set outside by **08:00 AM** on your collection morning.`;
      }
    }
    // SCHEDULE & DAY QUERY FOR ACTIVE NEIGHBORHOOD
    else if (['when', 'schedule', 'day', 'calendar', 'tomorrow', 'today', 'pickup', 'timetable', '収集日', 'いつ', '曜日', 'カレンダー'].some(w => lower.includes(w))) {
      try {
        const sched = evaluateScheduleAndItems([], neighborhood, banchi, municipalityId);
        reply = `📅 **Collection Timetable for ${sched.neighborhood} (${cityName}):**

• 🔥 **Combustible Waste (燃やすごみ):** ${sched.schedules.burnable.days} (Next: **${sched.schedules.burnable.next.next_date}**)
• ♻️ **Recyclable Resources (資源ごみ):** ${sched.schedules.recyclable.days} (Next: **${sched.schedules.recyclable.next.next_date}**)
• 🏺 **Incombustibles & Metal (金属・陶器・ガラス):** ${sched.schedules.unburnable.days} (Next: **${sched.schedules.unburnable.next.next_date}**)
• 🏢 **Sanitation Office:** ${sched.sanitation_office}

*Reminder:* All garbage bags must be placed under crow nets **before 08:00 AM** on collection morning! ⏰`;
      } catch {
        reply = `📅 In **${neighborhood} (${cityName})**, curbside collection occurs as follows:
• **Combustible (燃やすごみ):** Twice per week (e.g. Tuesday & Friday before 08:00 AM).
• **Recyclables (資源):** Once per week.
• **Incombustibles (不燃):** Twice per month.
Please ensure all bags are placed under yellow crow nets before 8:00 AM!`;
      }
    }
    // BAG REQUIREMENTS
    else if (['bag', 'trash bag', 'yellow bag', 'garbage bag', '袋', 'ゴミ袋', '指定袋'].some(k => lower.includes(k))) {
      reply = `🛍️ **Bag Regulations for ${cityName}:**

• **Designated Bags:** ${ruleConfig.bag_requirement_en}
• **Kyoto Note:** Kyoto City requires mandatory paid yellow bags (*有料指定袋*) for Combustible waste.
• **Tokyo & Yokohama:** Use clear, colorless transparent or translucent bags (up to 45L). Black or opaque bags are strictly prohibited and will receive a rejection sticker (*不適正排出シール*)!`;
    }
    // GENERIC CLASSIFICATION NLP FALLBACK
    else {
      const itemClass = classifyWasteItem(message, '');

      reply = `🔍 **Sorting Guidance for "${message}" in ${cityName}:**

• **Category:** ${itemClass.category} (${itemClass.category_jp})
• **Action Required:** ${itemClass.disposal_rules}
${itemClass.disassembly_notes ? `• **Preparation:** ${itemClass.disassembly_notes}\n` : ''}• **Bag Requirement:** ${itemClass.bag_rule}
${itemClass.special_warning ? `• ⚠️ **Notice:** ${itemClass.special_warning}\n` : ''}
Place outside before **${ruleConfig.morning_deadline}** on the designated collection day. Have more items to sort? Just ask! 🐾✨`;
    }

    return NextResponse.json({
      reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'GomiMakasete Autonomous Rules Engine'
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

