import type {
  AppNotification,
  CreateNotificationInput,
  NotificationCandidate,
  NotificationCategory,
  NotificationPreferences,
  NotificationPriority,
  NotificationType,
} from "./types";

type NotificationMetadata = {
  icon: string;
  color: string;
  category: NotificationCategory;
  priority: NotificationPriority;
};

export const notificationMetadataMap: Record<
  NotificationType,
  NotificationMetadata
> = {
  budget_warning: {
    icon: "alert-triangle",
    color: "#F59E0B",
    category: "budget",
    priority: "medium",
  },
  budget_exceeded: {
    icon: "alert-octagon",
    color: "#EF4444",
    category: "budget",
    priority: "high",
  },
  goal_progress: {
    icon: "target",
    color: "#3B82F6",
    category: "goals",
    priority: "medium",
  },
  goal_completed: {
    icon: "check-circle",
    color: "#10B981",
    category: "goals",
    priority: "high",
  },
  weekly_report: {
    icon: "bar-chart-2",
    color: "#2563EB",
    category: "reports",
    priority: "low",
  },
  monthly_report: {
    icon: "trending-up",
    color: "#0EA5E9",
    category: "reports",
    priority: "medium",
  },
  unusual_spending: {
    icon: "alert-circle",
    color: "#F97316",
    category: "transactions",
    priority: "high",
  },
  recurring_bill: {
    icon: "refresh-cw",
    color: "#8B5CF6",
    category: "transactions",
    priority: "medium",
  },
  savings_tip: {
    icon: "zap",
    color: "#EC4899",
    category: "tips",
    priority: "low",
  },
  contribution_added: {
    icon: "plus-circle",
    color: "#14B86A",
    category: "goals",
    priority: "medium",
  },
  transaction_added: {
    icon: "credit-card",
    color: "#1495FF",
    category: "transactions",
    priority: "low",
  },
  wallet_low_balance: {
    icon: "credit-card",
    color: "#EF4444",
    category: "wallets",
    priority: "high",
  },
  achievement: {
    icon: "award",
    color: "#F59E0B",
    category: "achievements",
    priority: "medium",
  },
  streak_lost: {
    icon: "flame",
    color: "#F97316",
    category: "achievements",
    priority: "medium",
  },
  reminder: {
    icon: "bell",
    color: "#6366F1",
    category: "reminders",
    priority: "medium",
  },
  security_alert: {
    icon: "shield",
    color: "#F97316",
    category: "security",
    priority: "high",
  },
};

export function getNotificationMetadata(type: NotificationType) {
  return notificationMetadataMap[type];
}

export function buildNotificationCandidate(
  candidate: Omit<
    NotificationCandidate,
    "icon" | "color" | "category" | "priority"
  > &
    Partial<
      Pick<NotificationCandidate, "icon" | "color" | "category" | "priority">
    >,
): NotificationCandidate {
  const metadata = getNotificationMetadata(candidate.type);
  return {
    ...candidate,
    icon: candidate.icon ?? metadata.icon,
    color: candidate.color ?? metadata.color,
    category: candidate.category ?? metadata.category,
    priority: candidate.priority ?? metadata.priority,
  };
}

export const defaultNotificationPreferences = (
  userId: string,
): NotificationPreferences => ({
  user_id: userId,
  notifications_enabled: true,
  budget_alerts: true,
  goal_reminders: true,
  weekly_reports: true,
  monthly_reports: true,
  savings_tips: true,
  transaction_alerts: true,
  security_alerts: true,
  push_enabled: true,
  push_token: null,
  push_token_platform: null,
  updated_at: new Date().toISOString(),
});

export function toCreateNotificationInput(
  userId: string,
  candidate: NotificationCandidate,
): CreateNotificationInput {
  return {
    user_id: userId,
    type: candidate.type,
    title: candidate.title,
    message: candidate.message,
    data: candidate.data ?? null,
    action_url: candidate.action_url ?? candidate.data?.url ?? null,
    category: candidate.category,
    priority: candidate.priority,
    icon: candidate.icon,
    color: candidate.color,
    dedupe_key: candidate.dedupe_key,
  };
}

export function shouldNotifyViaPush(
  notification: Pick<AppNotification, "type" | "priority">,
  preferences: NotificationPreferences,
) {
  if (
    !shouldReceiveNotification(notification, preferences) ||
    !preferences.push_enabled
  ) {
    return false;
  }

  return shouldReceiveNotification(notification, preferences);
}

export function shouldReceiveNotification(
  notification: Pick<AppNotification, "type" | "priority">,
  preferences: NotificationPreferences,
) {
  if (!preferences.notifications_enabled) {
    return false;
  }

  switch (notification.type) {
    case "budget_warning":
    case "budget_exceeded":
      return preferences.budget_alerts;
    case "goal_progress":
    case "goal_completed":
    case "contribution_added":
    case "reminder":
      return preferences.goal_reminders;
    case "weekly_report":
      return preferences.weekly_reports;
    case "monthly_report":
      return preferences.monthly_reports;
    case "savings_tip":
      return preferences.savings_tips;
    case "transaction_added":
    case "unusual_spending":
    case "recurring_bill":
    case "wallet_low_balance":
      return preferences.transaction_alerts;
    case "security_alert":
      return preferences.security_alerts;
    case "achievement":
    case "streak_lost":
      return true;
    default:
      return notification.priority === "high";
  }
}
