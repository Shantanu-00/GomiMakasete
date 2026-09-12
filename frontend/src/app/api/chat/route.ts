import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, municipality, neighborhood } = body;

    const lower = (message || '').toLowerCase();
    let reply = '';

    if (lower.includes('pizza') || lower.includes('greasy')) {
      reply = `In ${municipality || 'Shinjuku'}, pizza boxes with food grease or melted cheese cannot be recycled as paper resource! You must dispose of greasy pizza boxes with Combustible Waste (燃やすごみ). Only completely clean cardboard can be recycled! 🍕📦`;
    } else if (lower.includes('missed') || lower.includes('8 am') || lower.includes('time') || lower.includes('late')) {
      reply = `Curbside garbage collection trucks pass strictly after 08:00 AM! If you missed the morning truck, do NOT leave your garbage out on the street (crows will rip the bags open). Please bring the bag back inside until the next collection day! ⏰🚯`;
    } else if (lower.includes('umbrella') || lower.includes('broken')) {
      reply = `In Tokyo wards, small umbrellas under 30cm go to Non-Burnable (金属・陶器・ガラス). If longer than 30cm, disassemble the vinyl fabric (put in plastic/combustible) and the metal rib skeleton goes to Small Metal or Bulky Waste! ☂️`;
    } else if (lower.includes('battery') || lower.includes('mobile battery') || lower.includes('power bank')) {
      reply = `⚠️ WARNING: Lithium-ion power banks and rechargeable batteries must NEVER be put in curbside trash! They explode under truck hydraulic pressure! Take them to yellow JBRC recycling drop-boxes at Yodobashi Camera or Bic Camera. Regular alkaline AA/AAA dry cells can be put out with terminals taped on Metal day. 🔋`;
    } else if (lower.includes('spray') || lower.includes('gas')) {
      reply = `In Shinjuku & Tokyo, DO NOT puncture holes in spray cans! Take the can outside to an open breezy spot, hold the nozzle until all hissing gas stops, and place it in a separate clear bag labeled "スプレー缶". 💨`;
    } else {
      reply = `Gomi-chan here! In ${municipality || 'Tokyo'}, always remember to separate caps and labels from PET bottles, wash food trays, and place bags under the yellow crow nets before 8:00 AM. What other items would you like to check? 🐾✨`;
    }

    return NextResponse.json({
      reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
