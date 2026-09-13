export type IntentCategory = 'DISCARD_CANDIDATE' | 'SAFEGUARD_NON_WASTE';

export type PreparationActionType = 
  | 'SEPARATE_PARTS' 
  | 'RINSE_AND_DRY' 
  | 'SAFE_WRAP_HAZARD' 
  | 'OUTDOOR_DEGAS' 
  | 'BUNDLE_CORD' 
  | 'NONE';

export interface SeparableComponent {
  name: string;
  material: string;
  destination_stream: string;
  dim_cm?: number;
}

export interface PreparationPrescription {
  action_type: PreparationActionType;
  action_label: string;
  action_label_jp: string;
  badge_color: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple' | 'slate';
  steps: string[];
  safety_warning?: string;
  components?: SeparableComponent[];
}

export interface ClarificationOption {
  label: string;
  chosen_answer: string;
  target_classification: string;
  target_schedule_key: string;
  description?: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: ClarificationOption[];
}

export interface DetectedItem {
  id: string;
  name: string;
  description: string;
  material: string;
  estimated_dim_cm: number;
  confidence: number;
  model_tier: 'Tier-1 (Nova 2 Lite)' | 'Tier-2 (Claude 3.7 Sonnet / Nova Pro)';
  is_low_confidence: boolean;
  intent_category: IntentCategory;
  is_marked_for_disposal: boolean; // User toggle: true = throwing out, false = keep
  requires_disassembly?: boolean;
  user_edited?: boolean;
  preparation: PreparationPrescription;
  clarification_question?: ClarificationQuestion;
  resolved_answer?: string;
  needs_size_confirmation?: boolean;
  size_threshold_cm?: number;
}

export interface VisionScanResult {
  items: DetectedItem[];
  overall_confidence: number;
  model_used: string;
  latency_ms: number;
  safeguards_triggered: number;
  needs_escalation: boolean;
}

export interface StickerBreakdown {
  sticker_a_count: number;
  sticker_b_count: number;
  total_stickers: number;
  summary: string;
  total_cost_yen: number;
}

export interface SodaiDetails {
  is_sodai_gomi: boolean;
  is_restricted_appliance: boolean;
  official_catalog_name_jp?: string;
  category?: string;
  fee_yen?: number;
  stickers?: StickerBreakdown;
  booking_portal?: string;
  phone_number?: string;
  appointment_procedure?: string[];
  headline?: string;
  rules?: string;
  action_url?: string;
}

export interface EvaluatedItem {
  id: string;
  name: string;
  material: string;
  dimensions_cm: number;
  is_sodai_gomi: boolean;
  sodai_details?: SodaiDetails | null;
  classification: string;
  classification_jp: string;
  disposal_rules: string;
  requires_disassembly: boolean;
  disassembly_notes?: string;
  schedule_key?: string;
  pickup_day?: string;
  next_pickup_date?: string;
  bag_rule?: string;
  special_warning?: string;
  clarification_question?: ClarificationQuestion;
  resolved_answer?: string;
  needs_size_confirmation?: boolean;
  size_threshold_cm?: number;
}

export interface NextPickupInfo {
  pattern?: string;
  next_date: string;
  day_of_week?: string;
  relative_label?: string;
  cutoff_time?: string;
  description?: string;
}

export interface ScheduleCategory {
  days: string;
  next: NextPickupInfo;
}

export interface NeighborhoodScheduleResult {
  municipality: string;
  municipality_display: string;
  neighborhood: string;
  sanitation_office: string;
  is_special_commercial_zone?: boolean;
  schedules: {
    burnable: ScheduleCategory;
    recyclable: ScheduleCategory;
    unburnable: ScheduleCategory;
  };
  items: EvaluatedItem[];
}

export interface MunicipalityOption {
  id: 'tokyo_shinjuku' | 'kanagawa_yokohama' | 'kyoto_kyoto' | 'tokushima_kamikatsu';
  name_en: string;
  name_ja: string;
  prefecture: string;
  total_neighborhoods: number;
  icon: string;
  morning_deadline: string;
  badge_color: string;
  description: string;
  threshold_dim_cm: number;
  metal_threshold_dim_cm?: number;
}

export interface NeighborhoodOption {
  neighborhood_id: string;
  municipality_id: string;
  name_en: string;
  name_ja: string;
  postal_code?: string;
  pattern_id: string;
  address_range?: string | null;
  schedules?: Record<string, string[]>;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar_color: string;
  municipality_id: 'tokyo_shinjuku' | 'kanagawa_yokohama' | 'kyoto_kyoto' | 'tokushima_kamikatsu';
  municipality_name: string;
  neighborhood: string;
  neighborhood_id?: string;
  banchi?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


export interface ScanHistoryRecord {
  id: string;
  timestamp: string;
  profile_id: string;
  municipality_id?: string;
  preset_used?: string;
  model_used: string;
  items_detected: DetectedItem[];
  discard_count: number;
  safeguard_count: number;
  image_preview?: string;
  scenario_name?: string;
}

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  sizeBytes?: number;
  timestamp: string;
  source: 'preset' | 'upload' | 'camera';
}


