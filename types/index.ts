export type Platform = 'tiktok' | 'instagram' | 'youtube';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Tier = 'worker' | 'drone' | 'queen';
export type ContentTypeName =
  | 'talking_head'
  | 'skit'
  | 'demo'
  | 'slideshow'
  | 'pov'
  | 'clipping';

export interface UserProfile {
  id: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  tiktok_handle: string | null;
  instagram_handle: string | null;
  youtube_handle: string | null;
  stripe_connect_id: string | null;
  tier: Tier;
  total_earned: number;
  total_views: number;
  campaigns_completed: number;
  created_at: string;
}

export interface HiveContentType {
  id: string;
  hive_id: string;
  type: ContentTypeName;
  label: string;
  base_payout: number;
  cpm_rate: number;
  min_views: number;
  max_payout: number;
  is_active: boolean;
}

export interface Hive {
  id: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  app_store_url: string | null;
  play_store_url: string | null;
  is_verified: boolean;
  content_types: HiveContentType[];
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  hive_id: string;
  content_type: ContentTypeName;
  content_type_label: string;
  platform: Platform;
  post_url: string;
  screenshot_url: string | null;
  view_count: number;
  last_verified_at: string | null;
  status: SubmissionStatus;
  earnings_amount: number;
  submitted_at: string;
  hive?: Pick<Hive, 'id' | 'name' | 'logo_url'>;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  stripe_transfer_id: string | null;
  status: PayoutStatus;
  created_at: string;
}
