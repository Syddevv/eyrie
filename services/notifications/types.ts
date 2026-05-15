export const NOTIFICATION_TYPES = [
  "budget_warning",
  "budget_exceeded",
  "goal_progress",
  "goal_completed",
  "weekly_report",
  "monthly_report",
  "unusual_spending",
  "recurring_bill",
  "savings_tip",
  "contribution_added",
  "transaction_added",
  "wallet_low_balance",
  "achievement",
  "reminder",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationCategory =
  | "budget"
  | "goals"
  | "reports"
  | "transactions"
  | "wallets"
  | "tips"
  | "achievements"
  | "reminders";

export type NotificationPriority = "low" | "medium" | "high";

export type NotificationData = {
  budgetId?: string;
  categoryId?: string | null;
  goalId?: string;
  transactionId?: string;
  accountId?: string;
  merchantId?: string | null;
  url?: string;
  progress?: number;
  amount?: number;
  periodKey?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  read_at: string | null;
  scheduled_for?: string | null;
  delivered_at?: string | null;
  delivery_state?: "scheduled" | "delivered" | "dismissed";
  action_url: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  icon: string;
  color: string;
  dedupe_key: string;
  deleted_at: string | null;
  sync_status?: "pending" | "synced" | "failed";
  last_synced_at?: string | null;
  sync_error?: string | null;
  local_schedule_id?: string | null;
};

export type CreateNotificationInput = Omit<
  AppNotification,
  "id" | "created_at" | "is_read" | "read_at" | "deleted_at"
> & {
  id?: string;
  is_read?: boolean;
  read_at?: string | null;
  deleted_at?: string | null;
  created_at?: string;
};

export type NotificationPreferences = {
  user_id: string;
  notifications_enabled: boolean;
  budget_alerts: boolean;
  goal_reminders: boolean;
  weekly_reports: boolean;
  monthly_reports: boolean;
  savings_tips: boolean;
  transaction_alerts: boolean;
  push_enabled: boolean;
  push_token: string | null;
  push_token_platform: string | null;
  updated_at: string;
};

export type NotificationCandidate = {
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  action_url?: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  icon: string;
  color: string;
  dedupe_key: string;
};

export type NotificationRealtimeEvent =
  | {
      eventType: "INSERT" | "UPDATE";
      new: AppNotification;
      old: AppNotification | null;
    }
  | {
      eventType: "DELETE";
      new: null;
      old: AppNotification;
    };

