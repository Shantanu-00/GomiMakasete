import { NextResponse } from 'next/server';
import { runTieredVisionAnalysis } from '@/lib/vision-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { preset, forceTier2, filenames } = body;

    const result = await runTieredVisionAnalysis(
      preset || 'messy_desk', 
      !!forceTier2,
      filenames
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

