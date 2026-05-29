// ── Auth & Users ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  email_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

// ── Workspaces ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace: string;
  user: string;
  user_email: string;
  user_name: string;
  user_avatar: string;
  role: 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

// ── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationStatus {
  google_ads: boolean;
  slack: boolean;
  hubspot: boolean;
}

export interface GoogleAdsConnection {
  id: string;
  google_account_email: string;
  is_active: boolean;
  token_expires_at: string;
  created_at: string;
}

export interface DiscoveredAccount {
  customer_id: string;
  name: string;
  currency_code: string;
  time_zone: string;
  is_manager: boolean;
  already_added: boolean;
}

export interface MonitoredAccount {
  id: string;
  connection: string;
  google_ads_customer_id: string;
  account_name: string;
  currency_code: string;
  time_zone: string;
  is_manager_account: boolean;
  status: 'active' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
  // computed by views
  latest_health_score?: number;
  latest_audit_at?: string;
  open_critical_count?: number;
}

export interface SlackIntegration {
  id: string;
  slack_workspace_name: string;
  channel_name: string;
  is_active: boolean;
}

// ── Audits ───────────────────────────────────────────────────────────────────

export type AuditStatus = 'queued' | 'running' | 'completed' | 'failed';
export type AuditTrigger = 'manual' | 'scheduled';
export type CheckStatus = 'pass' | 'warning' | 'critical' | 'error';

export interface AuditRun {
  id: string;
  account: string;
  account_name?: string;
  triggered_by: string | null;
  trigger_type: AuditTrigger;
  status: AuditStatus;
  health_score: number | null;
  pass_count: number;
  warning_count: number;
  critical_count: number;
  error_count: number;
  estimated_wasted_spend: string | null;
  failure_reason: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditCheck {
  id: number;
  audit_run: string;
  check_key: string;
  check_name: string;
  category: string;
  status: CheckStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  finding_summary: string;
  explanation: string;
  fix_instructions: string;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface AuditSchedule {
  id: number;
  account: string;
  account_name?: string;
  frequency: 'daily' | 'weekly';
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface HealthScoreEntry {
  score: number;
  recorded_at: string;
  audit_run?: string;
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'snoozed' | 'resolved';

export interface Alert {
  id: string;
  account: string;
  account_name: string;
  check_key: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  snoozed_until: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
  resolve_note: string;
  first_detected_at: string;
  last_seen_at: string;
}

export interface AlertStats {
  total_open: number;
  critical: number;
  warning: number;
  info: number;
}

export interface NotificationPreference {
  email_enabled: boolean;
  slack_enabled: boolean;
  webhook_url: string;
  min_severity: AlertSeverity;
  daily_digest_enabled: boolean;
  daily_digest_hour: number;
}

export interface AccountAlertOverride {
  id: number;
  account: string;
  account_name: string;
  is_muted: boolean;
  min_severity_override: AlertSeverity | '';
  updated_at: string;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export type ReportStatus = 'generating' | 'ready' | 'failed';

export interface Report {
  id: string;
  account: string;
  account_name: string;
  audit_run: string | null;
  generated_by: string | null;
  generated_by_name: string | null;
  status: ReportStatus;
  pdf_url: string;
  share_token: string;
  share_link_expires_at: string | null;
  share_url: string;
  created_at: string;
}

export interface WhiteLabelConfig {
  agency_name: string;
  logo_url: string;
  primary_color: string;
  custom_domain: string;
  updated_at: string;
}

// ── Billing ──────────────────────────────────────────────────────────────────

export type PlanTier = 'starter' | 'agency' | 'agency_pro';
export type BillingInterval = 'monthly' | 'annual';

export interface Plan {
  id: number;
  name: string;
  tier: PlanTier;
  interval: BillingInterval;
  price_cents: number;
  price_dollars: number;
  dodo_product_id: string;
  max_accounts: number;
  max_members: number;
  white_label_enabled: boolean;
  audit_frequency_minutes: number;
}

export interface Subscription {
  id: string;
  plan: Plan;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  is_active: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  amount_dollars: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoice_pdf_url: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
