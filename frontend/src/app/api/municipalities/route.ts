import { NextResponse } from 'next/server';
import { MunicipalityOption } from '@/lib/types';

const MUNICIPALITIES_DATA: MunicipalityOption[] = [
  {
    id: 'tokyo_shinjuku',
    name_en: 'Shinjuku City',
    name_ja: '新宿区',
    prefecture: 'Tokyo (東京都)',
    total_neighborhoods: 171,
    icon: '🏙️',
    morning_deadline: '08:00 AM',
    badge_color: '#00A86B',
    description: '171 fine-grained neighborhoods with designated banchi address ranges.'
  },
  {
    id: 'kanagawa_yokohama',
    name_en: 'Yokohama City',
    name_ja: '横浜市',
    prefecture: 'Kanagawa (神奈川県)',
    total_neighborhoods: 3,
    icon: '🌊',
    morning_deadline: '08:00 AM',
    badge_color: '#0284C7',
    description: 'Iconic port district (Minato Mirai, Yamashitacho, Shin-Yokohama).'
  },
  {
    id: 'kyoto_kyoto',
    name_en: 'Kyoto City',
    name_ja: '京都市',
    prefecture: 'Kyoto (京都府)',
    total_neighborhoods: 3,
    icon: '⛩️',
    morning_deadline: '08:00 AM',
    badge_color: '#D97706',
    description: 'Historic cultural capital (Gionmachi, Kawaramachi-Sanjo, Shijo-Karasuma).'
  },
  {
    id: 'tokushima_kamikatsu',
    name_en: 'Kamikatsu Town',
    name_ja: '上勝町',
    prefecture: 'Tokushima (徳島県)',
    total_neighborhoods: 1,
    icon: '🍃',
    morning_deadline: '07:30 AM - 02:00 PM Station',
    badge_color: '#059669',
    description: "World's pioneer Zero Waste town with 45 meticulous recycling streams."
  }
];

export async function GET() {
  const startTime = Date.now();
  const latency = Math.floor(Math.random() * 8) + 12; // 12-20ms simulated DynamoDB GSI fetch

  return NextResponse.json(
    {
      success: true,
      data: MUNICIPALITIES_DATA,
      count: MUNICIPALITIES_DATA.length,
      source: 'AWS_DYNAMODB_GOMI_SCHEDULE_TABLE'
    },
    {
      headers: {
        'x-aws-dynamodb-table': 'GOMIScheduleTable',
        'x-aws-latency-ms': `${latency}`,
        'x-amzn-requestid': `req-muni-${Date.now()}`,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    }
  );
}
