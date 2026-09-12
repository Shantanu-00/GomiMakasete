import neighborhoodsJson from '@/data/neighborhoods.json';
import patternsJson from '@/data/patterns.json';
import { MunicipalityOption, NeighborhoodOption } from './types';

// Map of pattern schedules for instant lookup
const patternsMap = new Map<string, any>();
patternsJson.forEach((p: any) => {
  patternsMap.set(p.pattern_id, p);
});

// 4 Official Municipalities
export const HARDCODED_MUNICIPALITIES: MunicipalityOption[] = [
  {
    id: 'tokyo_shinjuku',
    name_en: 'Tokyo - Shinjuku City',
    name_ja: '東京都新宿区',
    prefecture: 'Tokyo (東京都)',
    total_neighborhoods: 171,
    icon: '🏙️',
    morning_deadline: '08:00 AM',
    badge_color: '#00A86B',
    description: '171 neighborhoods with designated banchi address ranges.'
  },
  {
    id: 'kanagawa_yokohama',
    name_en: 'Kanagawa - Yokohama City',
    name_ja: '神奈川県横浜市',
    prefecture: 'Kanagawa (神奈川県)',
    total_neighborhoods: 3,
    icon: '🌊',
    morning_deadline: '08:00 AM',
    badge_color: '#0284C7',
    description: 'Minato Mirai, Yamashitacho, Shin-Yokohama.'
  },
  {
    id: 'kyoto_kyoto',
    name_en: 'Kyoto - Kyoto City',
    name_ja: '京都府京都市',
    prefecture: 'Kyoto (京都府)',
    total_neighborhoods: 3,
    icon: '⛩️',
    morning_deadline: '08:00 AM',
    badge_color: '#D97706',
    description: 'Gionmachi, Kawaramachi-Sanjo, Shijo-Karasuma.'
  },
  {
    id: 'tokushima_kamikatsu',
    name_en: 'Tokushima - Kamikatsu Town',
    name_ja: '徳島県上勝町',
    prefecture: 'Tokushima (徳島県)',
    total_neighborhoods: 1,
    icon: '🍃',
    morning_deadline: '07:30 AM - 02:00 PM Station',
    badge_color: '#059669',
    description: '45 Separation Streams Zero-Waste Station.'
  }
];

// Enrich all 178 neighborhoods with their pattern schedules
export const ALL_HARDCODED_NEIGHBORHOODS: NeighborhoodOption[] = (neighborhoodsJson as any[]).map((n) => {
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

// Fast sync helper for neighborhoods by municipality
export function getHardcodedNeighborhoodsFor(municipalityId: string): NeighborhoodOption[] {
  return ALL_HARDCODED_NEIGHBORHOODS.filter(n => n.municipality_id === municipalityId);
}
