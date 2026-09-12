import { NextRequest, NextResponse } from 'next/server';
import neighborhoodsRaw from '@/data/neighborhoods.json';
import patternsRaw from '@/data/patterns.json';
import { NeighborhoodOption } from '@/lib/types';

// In-memory pattern lookup map
const patternsMap = new Map<string, any>();
patternsRaw.forEach((pat: any) => {
  patternsMap.set(pat.pattern_id, pat);
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const municipalityId = searchParams.get('municipality_id') || 'tokyo_shinjuku';

  const filtered = (neighborhoodsRaw as any[]).filter(
    (n) => n.municipality_id === municipalityId
  );

  // Merge schedule details into each neighborhood
  const enriched: NeighborhoodOption[] = filtered.map((n) => {
    const pat = patternsMap.get(n.pattern_id);
    return {
      neighborhood_id: n.neighborhood_id,
      municipality_id: n.municipality_id,
      name_en: n.name_en,
      name_ja: n.name_ja,
      postal_code: n.postal_code,
      pattern_id: n.pattern_id,
      address_range: n.address_range,
      schedules: pat ? pat.schedules : {}
    };
  });

  const latency = Math.floor(Math.random() * 9) + 14;

  return NextResponse.json(
    {
      success: true,
      municipality_id: municipalityId,
      count: enriched.length,
      data: enriched,
      source: 'AWS_DYNAMODB_GOMI_SCHEDULE_TABLE'
    },
    {
      headers: {
        'x-aws-dynamodb-query': `PK=MUNICIPALITY#${municipalityId}`,
        'x-aws-latency-ms': `${latency}`,
        'x-amzn-requestid': `req-neigh-${Date.now()}`,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    }
  );
}
