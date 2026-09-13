import { UserProfile, ScanHistoryRecord, ChatMessage, MunicipalityOption, NeighborhoodOption } from './types';

const PROFILES_KEY = 'gomimakasete_profiles';
const ACTIVE_PROFILE_KEY = 'gomimakasete_active_profile';
const SCAN_HISTORY_KEY = 'gomimakasete_scan_history';
const CHAT_HISTORY_KEY = 'gomimakasete_chat_history';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user_jane_01',
    name: 'Jane (Home)',
    avatar_color: '#00A86B', // Yamanote green
    municipality_id: 'tokyo_shinjuku',
    municipality_name: 'Tokyo - Shinjuku City',
    neighborhood: 'Arakicho',
    neighborhood_id: 'shinjuku_arakicho_banchi_21_to_23',
    banchi: '22',
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 'user_john_02',
    name: 'John (Office)',
    avatar_color: '#0284C7', // Transit Blue
    municipality_id: 'kanagawa_yokohama',
    municipality_name: 'Kanagawa - Yokohama City',
    neighborhood: 'Minato Mirai 2-chome',
    neighborhood_id: 'yokohama_minato_mirai_2',
    banchi: '4',
    created_at: '2026-09-05T10:30:00Z'
  },
  {
    id: 'user_kenji_03',
    name: 'Kenji (Studio)',
    avatar_color: '#D97706', // Kyoto Amber
    municipality_id: 'kyoto_kyoto',
    municipality_name: 'Kyoto - Kyoto City',
    neighborhood: 'Gionmachi Minamigawa',
    neighborhood_id: 'kyoto_gionmachi_minamigawa',
    banchi: '12',
    created_at: '2026-09-08T14:15:00Z'
  },
  {
    id: 'user_yuki_04',
    name: 'Yuki (ZeroWaste)',
    avatar_color: '#059669', // Eco Forest Green
    municipality_id: 'tokushima_kamikatsu',
    municipality_name: 'Tokushima - Kamikatsu Town',
    neighborhood: 'Kamikatsu Town (All Districts)',
    neighborhood_id: 'kamikatsu_all',
    banchi: '1',
    created_at: '2026-09-10T09:00:00Z'
  }
];

// Memory Cache for Sub-50ms UI response
let memoryMunicipalities: MunicipalityOption[] | null = null;
const memoryNeighborhoods = new Map<string, NeighborhoodOption[]>();

export async function fetchMunicipalities(): Promise<MunicipalityOption[]> {
  if (memoryMunicipalities && memoryMunicipalities.length > 0) {
    return memoryMunicipalities;
  }
  try {
    const res = await fetch('/api/municipalities');
    if (res.ok) {
      const json = await res.json();
      memoryMunicipalities = json.data;
      return json.data;
    }
  } catch (err) {
    console.warn('Falling back to local default municipalities:', err);
  }
  return [];
}

export async function fetchNeighborhoods(municipalityId: string): Promise<NeighborhoodOption[]> {
  if (memoryNeighborhoods.has(municipalityId)) {
    return memoryNeighborhoods.get(municipalityId)!;
  }
  try {
    const res = await fetch(`/api/neighborhoods?municipality_id=${municipalityId}`);
    if (res.ok) {
      const json = await res.json();
      memoryNeighborhoods.set(municipalityId, json.data);
      return json.data;
    }
  } catch (err) {
    console.warn(`Falling back for neighborhoods of ${municipalityId}:`, err);
  }
  return [];
}

export function getStoredProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  try {
    const data = localStorage.getItem(PROFILES_KEY);
    if (!data) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    const parsed = JSON.parse(data);
    // Ensure all 4 defaults exist if needed
    if (parsed.length < DEFAULT_PROFILES.length) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return parsed;
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function getActiveProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILES[0];
  try {
    const profiles = getStoredProfiles();
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const found = profiles.find(p => p.id === activeId);
    return found || profiles[0] || DEFAULT_PROFILES[0];
  } catch {
    return DEFAULT_PROFILES[0];
  }
}

export function setActiveProfileId(profileId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  const profiles = getStoredProfiles();
  const index = profiles.findIndex(p => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getScanHistory(profileId?: string): ScanHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SCAN_HISTORY_KEY);
    if (!data) return [];
    const list: ScanHistoryRecord[] = JSON.parse(data);
    if (profileId) {
      return list.filter(r => r.profile_id === profileId);
    }
    return list;
  } catch {
    return [];
  }
}

export function addScanHistoryRecord(record: ScanHistoryRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getScanHistory();
    list.unshift(record); // newest first
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (err) {
    console.error('Failed to save scan history:', err);
  }
}

export function getChatMessages(profileId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${CHAT_HISTORY_KEY}_${profileId}`);
    if (!data) {
      return [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: 'Konnichiwa! I am Gomi-chan (ゴミちゃん) 🐾. Scan an item or ask me anything about Japan\'s waste sorting rules!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveChatMessages(profileId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CHAT_HISTORY_KEY}_${profileId}`, JSON.stringify(messages.slice(-50)));
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
}
