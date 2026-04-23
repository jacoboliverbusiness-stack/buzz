export type Platform = 'tiktok' | 'instagram';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type CampaignStatus = 'active' | 'paused' | 'ended';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  tiktok_handle: string | null;
  instagram_handle: string | null;
  stripe_connect_id: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  brief: string;
  source_content_urls: string[];
  cpm_rate: number;
  budget_total: number;
  budget_remaining: number;
  max_payout_per_clip: number;
  min_payout_threshold: number;
  status: CampaignStatus;
  starts_at: string;
  ends_at: string;
  brand?: Brand;
}

export interface Brand {
  id: string;
  name: string;
  contact_email: string;
  stripe_customer_id: string | null;
  logo_url: string | null;
}

export interface Clip {
  id: string;
  user_id: string;
  campaign_id: string;
  vizard_job_id: string;
  clip_urls: string[];
  generated_at: string;
}

export interface Submission {
  id: string;
  clip_id: string;
  user_id: string;
  campaign_id: string;
  platform: Platform;
  post_url: string;
  view_count: number;
  last_verified_at: string | null;
  status: SubmissionStatus;
  earnings_amount: number;
  campaign?: Campaign;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  stripe_transfer_id: string | null;
  status: PayoutStatus;
  created_at: string;
}
