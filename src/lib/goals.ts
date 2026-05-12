import type { Goal, GoalContribution } from "@/src/db/types";
import { clamp, roundMoney } from "@/src/db/utils/money";

type GoalWallet = {
  id: string;
  name: string;
  type: string;
  balance: number;
  currencyCode: string;
  color: string | null;
  icon: string | null;
} | null;

type ContributionWithWallet = GoalContribution & {
  wallet?: GoalWallet;
};

export type GoalWithDetails = Goal & {
  linkedWallet?: GoalWallet;
  contributions: ContributionWithWallet[];
};

export type GoalInsightTone = "positive" | "neutral" | "attention";

export type GoalInsight = {
  id: string;
  message: string;
  tone: GoalInsightTone;
};

export type GoalContributionGroup = {
  monthKey: string;
  monthLabel: string;
  entries: ContributionWithWallet[];
};

export type GoalMetrics = {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  daysRemaining: number;
  monthsRemaining: number;
  weeklyTarget: number;
  monthlyTarget: number;
  dailyTarget: number;
  contributionCount: number;
  averageContribution: number;
  projectedCompletionDate: string | null;
  estimatedCompletionLabel: string | null;
  recentContributionAt: string | null;
  daysSinceLastContribution: number | null;
  isCompleted: boolean;
};

export type GoalsOverview = {
  totalSaved: number;
  totalTarget: number;
  overallProgress: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  archivedGoalsCount: number;
};

export type GoalContributionPlan = {
  label: string;
  amount: number;
  suffix: "/day" | "/week" | "/month";
};

export function formatCurrency(value: number, currencyCode = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getGoalMetrics(goal: GoalWithDetails, referenceDate = new Date()): GoalMetrics {
  const targetAmount = Number(goal.targetAmount) || 0;
  const currentAmount = roundMoney(Number(goal.currentAmount) || 0);
  const remainingAmount = roundMoney(Math.max(0, targetAmount - currentAmount));
  const progressPercentage =
    targetAmount > 0 ? clamp((currentAmount / targetAmount) * 100, 0, 100) : 0;
  const targetDate = new Date(goal.targetDate);
  const msRemaining = Math.max(0, targetDate.getTime() - referenceDate.getTime());
  const dayCount = Math.max(1, Math.ceil(msRemaining / 86400000));
  const monthsRemaining = Math.max(
    0,
    (targetDate.getUTCFullYear() - referenceDate.getUTCFullYear()) * 12 +
      (targetDate.getUTCMonth() - referenceDate.getUTCMonth()) +
      (targetDate.getUTCDate() >= referenceDate.getUTCDate() ? 0 : -1),
  );
  const safeMonths = Math.max(1, monthsRemaining || Math.ceil(dayCount / 30));
  const monthlyTarget = roundMoney(remainingAmount / safeMonths);
  const weeklyTarget = roundMoney(remainingAmount / Math.max(1, Math.ceil(dayCount / 7)));
  const dailyTarget = roundMoney(remainingAmount / dayCount);
  const contributionCount = goal.contributions.length;
  const averageContribution = contributionCount
    ? roundMoney(
        goal.contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) / contributionCount,
      )
    : 0;
  const recentContributionAt = goal.contributions[0]?.createdAt ?? null;
  const daysSinceLastContribution = recentContributionAt
    ? Math.max(0, Math.floor((referenceDate.getTime() - new Date(recentContributionAt).getTime()) / 86400000))
    : null;

  let projectedCompletionDate: string | null = null;
  let estimatedCompletionLabel: string | null = null;
  if (contributionCount >= 2 && averageContribution > 0 && !goal.isCompleted) {
    const oldestContributionAt = goal.contributions[goal.contributions.length - 1]?.createdAt;
    if (oldestContributionAt) {
      const elapsedDays = Math.max(
        1,
        Math.ceil((referenceDate.getTime() - new Date(oldestContributionAt).getTime()) / 86400000),
      );
      const dailyRunRate = currentAmount / elapsedDays;
      if (dailyRunRate > 0) {
        const projected = new Date(referenceDate.getTime() + remainingAmount / dailyRunRate * 86400000);
        projectedCompletionDate = projected.toISOString();
        estimatedCompletionLabel = formatMonthYear(projectedCompletionDate);
      }
    }
  }

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    progressPercentage,
    daysRemaining: dayCount,
    monthsRemaining,
    weeklyTarget,
    monthlyTarget,
    dailyTarget,
    contributionCount,
    averageContribution,
    projectedCompletionDate,
    estimatedCompletionLabel,
    recentContributionAt,
    daysSinceLastContribution,
    isCompleted: Boolean(goal.isCompleted) || progressPercentage >= 100,
  };
}

export function getGoalContributionPlan(
  goal: GoalWithDetails,
  referenceDate = new Date(),
): GoalContributionPlan {
  const metrics = getGoalMetrics(goal, referenceDate);

  if (metrics.daysRemaining <= 14) {
    return {
      label: "Daily target",
      amount: metrics.dailyTarget,
      suffix: "/day",
    };
  }

  if (metrics.daysRemaining <= 90) {
    return {
      label: "Weekly target",
      amount: metrics.weeklyTarget,
      suffix: "/week",
    };
  }

  return {
    label: "Monthly target",
    amount: metrics.monthlyTarget,
    suffix: "/month",
  };
}

export function getGoalInsights(goal: GoalWithDetails, referenceDate = new Date()): GoalInsight[] {
  const metrics = getGoalMetrics(goal, referenceDate);
  const insights: GoalInsight[] = [];

  if (metrics.isCompleted) {
    insights.push({
      id: "completed",
      message: "Goal reached. Every future contribution is extra cushion.",
      tone: "positive",
    });
    return insights;
  }

  if (metrics.progressPercentage >= 75) {
    insights.push({
      id: "close",
      message: `You're ${Math.round(metrics.progressPercentage)}% closer to this goal.`,
      tone: "positive",
    });
  }

  if (metrics.projectedCompletionDate) {
    const projectedTime = new Date(metrics.projectedCompletionDate).getTime();
    const targetTime = new Date(goal.targetDate).getTime();
    const diffDays = Math.round((targetTime - projectedTime) / 86400000);

    if (diffDays >= 45) {
      insights.push({
        id: "ahead",
        message: `At this pace, you may reach this goal about ${Math.round(diffDays / 30)} months early.`,
        tone: "positive",
      });
    } else if (diffDays <= -30) {
      insights.push({
        id: "behind",
        message: `A slightly higher monthly save can keep you on track for ${formatMonthYear(goal.targetDate)}.`,
        tone: "attention",
      });
    }
  }

  if (metrics.daysSinceLastContribution !== null && metrics.daysSinceLastContribution >= 14) {
    insights.push({
      id: "stale",
      message: `You haven't contributed in ${metrics.daysSinceLastContribution} days.`,
      tone: "neutral",
    });
  }

  if (!insights.length) {
    const contributionPlan = getGoalContributionPlan(goal, referenceDate);
    insights.push({
      id: "target",
      message: `You need about ${formatCurrency(contributionPlan.amount)} ${contributionPlan.suffix.slice(1)} to stay on course.`,
      tone: "neutral",
    });
  }

  return insights.slice(0, 3);
}

export function getGoalsOverview(goals: GoalWithDetails[]): GoalsOverview {
  const activeGoals = goals.filter((goal) => !goal.isArchived && !goal.isCompleted);
  const completedGoals = goals.filter((goal) => goal.isCompleted && !goal.isArchived);
  const archivedGoals = goals.filter((goal) => goal.isArchived);
  const totalSaved = roundMoney(goals.reduce((sum, goal) => sum + (Number(goal.currentAmount) || 0), 0));
  const totalTarget = roundMoney(
    goals.filter((goal) => !goal.isArchived).reduce((sum, goal) => sum + (Number(goal.targetAmount) || 0), 0),
  );

  return {
    totalSaved,
    totalTarget,
    overallProgress: totalTarget > 0 ? clamp((totalSaved / totalTarget) * 100, 0, 100) : 0,
    activeGoalsCount: activeGoals.length,
    completedGoalsCount: completedGoals.length,
    archivedGoalsCount: archivedGoals.length,
  };
}

export function groupGoalContributions(entries: ContributionWithWallet[]): GoalContributionGroup[] {
  const groups = new Map<string, ContributionWithWallet[]>();

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), entry]);
  }

  return Array.from(groups.entries()).map(([monthKey, items]) => ({
    monthKey,
    monthLabel: formatMonthYear(`${monthKey}-01T00:00:00.000Z`),
    entries: items,
  }));
}

export function formatMonthYear(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}
