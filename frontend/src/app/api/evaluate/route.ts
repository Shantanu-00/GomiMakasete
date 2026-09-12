import { NextResponse } from 'next/server';
import { evaluateScheduleAndItems } from '@/lib/waste-logic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, neighborhood, banchi, municipality } = body;

    // Try Bedrock AgentCore Runtime backend if accessible
    const agentCoreUrl = process.env.AGENTCORE_ENDPOINT_URL || 'http://localhost:8080/invocations';
    try {
      const resp = await fetch(agentCoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            action: 'evaluate',
            items,
            neighborhood: neighborhood || '愛住町',
            banchi: banchi || '',
            municipality: municipality || 'shinjuku'
          }
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.output?.items) {
          return NextResponse.json({ result: data.output, source: 'Bedrock AgentCore Runtime' });
        }
      }
    } catch {
      // Local deterministic evaluation engine
    }

    const evaluated = evaluateScheduleAndItems(
      items || [],
      neighborhood || '愛住町',
      banchi || '',
      municipality || 'shinjuku'
    );

    return NextResponse.json({ result: evaluated, source: 'Strands Municipal Rule Engine' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
