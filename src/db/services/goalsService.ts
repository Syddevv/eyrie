import { eq } from "drizzle-orm";

import { db } from "../client";
import { goalsRepository } from "../repositories/goalsRepository";
import { goalContributions } from "../schema";
import {
  adjustGoalContributionAccountBalance,
  refreshGoalCurrentAmount,
} from "./financeOrchestrator";
import {
  generatePeriodicNotifications,
  processGoalContributionNotificationEvent,
  processGoalStateNotificationEvent,
} from "@/services/notifications";
import type { NewGoal, NewGoalContribution } from "../types";
import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import {
  assertCategoryIconType,
  assertNonNegativeAmount,
  assertPositiveAmount,
  assertRequiredText,
} from "../utils/validation";
import { emitAccountsChanged, emitGoalsChanged } from "@/src/lib/dbSync";
import {
  prepareCreateForSync,
  prepareDeleteForSync,
  prepareUpdateForSync,
} from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";
import { showSuccessToast } from "@/store/useToastStore";

export type CreateGoalInput = Omit<
  NewGoal,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "currentAmount"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
  currentAmount?: number;
};

export type CreateGoalContributionInput = Omit<
  NewGoalContribution,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "userId"
  | "deletedAt"
  | "syncStatus"
  | "lastSyncedAt"
  | "syncError"
> & {
  id?: string;
  allowOverdraft?: boolean;
};

export class GoalsService {
  async create(input: CreateGoalInput) {
    assertRequiredText(input.userId, "userId");
    assertRequiredText(input.title ?? "", "goal name");
    assertPositiveAmount(input.targetAmount, "target amount");
    assertNonNegativeAmount(input.currentAmount ?? 0, "current amount");
    assertRequiredText(input.targetDate ?? "", "target date");
    assertCategoryIconType(input.iconType ?? "vector");

    const timestamp = nowIso();

    const created = await goalsRepository.create({
      ...prepareCreateForSync({
        ...input,
        id: input.id ?? createId("goal"),
        currentAmount: input.currentAmount ?? 0,
        isCompleted: (input.currentAmount ?? 0) >= input.targetAmount,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (created) {
      await enqueueSync("saving_goals", created.id, "upsert", created.userId);
    }
    emitGoalsChanged();
    if (created) {
      showSuccessToast({
        title: "Goal created",
        message: "Your new savings goal is ready.",
        dedupeKey: `goal:create:${created.id}`,
        source: "goals-service",
      });
    }
    return created;
  }

  async update(id: string, input: Partial<NewGoal>) {
    if (input.title) {
      assertRequiredText(input.title, "goal name");
    }

    if (typeof input.targetAmount === "number") {
      assertPositiveAmount(input.targetAmount, "target amount");
    }

    if (typeof input.currentAmount === "number") {
      assertNonNegativeAmount(input.currentAmount, "current amount");
    }

    if (input.targetDate) {
      assertRequiredText(input.targetDate, "target date");
    }

    if (input.iconType) {
      assertCategoryIconType(input.iconType);
    }

    const existing = await goalsRepository.findById(id);
    if (!existing) {
      throw new Error("Goal not found.");
    }

    const nextTarget =
      typeof input.targetAmount === "number"
        ? input.targetAmount
        : existing.targetAmount;
    const nextCurrent =
      typeof input.currentAmount === "number"
        ? input.currentAmount
        : existing.currentAmount;

    const updated = await goalsRepository.update(
      id,
      prepareUpdateForSync({
        ...input,
        isCompleted: nextTarget > 0 ? nextCurrent >= nextTarget : false,
      }),
    );
    if (updated) {
      await enqueueSync("saving_goals", updated.id, "upsert", updated.userId);
    }

    processGoalStateNotificationEvent({
      userId: existing.userId,
      goalId: id,
      previousAmount: existing.currentAmount,
    })
      .then(() => generatePeriodicNotifications(existing.userId))
      .catch(() => undefined);

    emitGoalsChanged();
    if (updated) {
      showSuccessToast({
        title: "Goal updated",
        message: "Goal changes saved successfully.",
        dedupeKey: `goal:update:${updated.id}:${updated.updatedAt}`,
        source: "goals-service",
      });
    }
    return updated;
  }

  async delete(id: string) {
    const goal = await goalsRepository.findById(id);
    if (!goal) {
      return;
    }

    await goalsRepository.update(id, prepareDeleteForSync());
    await enqueueSync("saving_goals", goal.id, "delete", goal.userId);
    showSuccessToast({
      title: "Goal deleted",
      message: "The goal was removed successfully.",
      dedupeKey: `goal:delete:${goal.id}`,
      source: "goals-service",
    });
    emitGoalsChanged();
  }

  async archive(id: string) {
    const archived = await goalsRepository.update(
      id,
      prepareUpdateForSync({
        isArchived: true,
        updatedAt: nowIso(),
      }),
    );
    if (archived) {
      await enqueueSync("saving_goals", archived.id, "upsert", archived.userId);
    }
    emitGoalsChanged();
    return archived;
  }

  async restore(id: string) {
    const restored = await goalsRepository.update(
      id,
      prepareUpdateForSync({
        isArchived: false,
        updatedAt: nowIso(),
      }),
    );
    if (restored) {
      await enqueueSync("saving_goals", restored.id, "upsert", restored.userId);
    }
    emitGoalsChanged();
    return restored;
  }

  async fetch(userId: string) {
    return goalsRepository.findAllByUser(userId);
  }

  async fetchById(id: string) {
    return goalsRepository.findById(id);
  }

  async createContribution(input: CreateGoalContributionInput) {
    assertRequiredText(input.goalId, "goalId");
    assertPositiveAmount(input.amount, "contribution amount");
    const { allowOverdraft = false, ...payload } = input;

    const timestamp = nowIso();

    const created = await db.transaction(async (tx) => {
      const goal = await tx.query.goals.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, payload.goalId),
      });

      if (!goal) {
        throw new Error("Goal not found.");
      }

      if (payload.walletId) {
        const wallet = await tx.query.accounts.findFirst({
          where: (table, { eq: innerEq }) =>
            innerEq(table.id, payload.walletId ?? ""),
        });

        if (!wallet) {
          throw new Error("Wallet not found.");
        }

        if (
          !allowOverdraft &&
          wallet.type !== "credit" &&
          wallet.balance < payload.amount
        ) {
          throw new Error(
            "Contribution is greater than the selected wallet balance.",
          );
        }
      }

      const contributionId = input.id ?? createId("gcon");

      await tx.insert(goalContributions).values({
        ...prepareCreateForSync({
          ...payload,
          id: contributionId,
          userId: goal.userId,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      });

      if (payload.walletId) {
        await adjustGoalContributionAccountBalance(
          tx,
          payload.walletId,
          -payload.amount,
        );
      }
      await refreshGoalCurrentAmount(tx, payload.goalId);

      const created = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, contributionId),
        with: {
          wallet: true,
        },
      });

      return {
        contribution: created,
        previousGoalAmount: goal.currentAmount,
        userId: goal.userId,
      };
    });

    emitGoalsChanged();
    if (payload.walletId) {
      emitAccountsChanged();
    }

    if (created?.contribution) {
      await enqueueSync(
        "goal_contributions",
        created.contribution.id,
        "upsert",
        created.userId,
      );
      await enqueueSync(
        "saving_goals",
        payload.goalId,
        "upsert",
        created.userId,
      );
      if (payload.walletId) {
        await enqueueSync(
          "accounts",
          payload.walletId,
          "upsert",
          created.userId,
        );
      }
    }

    if (created?.contribution) {
      processGoalContributionNotificationEvent({
        userId: created.userId,
        goalId: payload.goalId,
        previousAmount: created.previousGoalAmount,
        contributionAmount: payload.amount,
      })
        .then(() => generatePeriodicNotifications(created.userId))
        .catch(() => undefined);
    }

    if (created?.contribution) {
      showSuccessToast({
        title: "Contribution added",
        message: "Goal progress updated successfully.",
        dedupeKey: `goal:contribution:create:${created.contribution.id}`,
        source: "goals-service",
      });
    }

    return created?.contribution ?? null;
  }

  async updateContribution(id: string, input: Partial<NewGoalContribution>) {
    const updated = await db.transaction(async (tx) => {
      const existing = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, id),
      });

      if (!existing) {
        throw new Error(`Goal contribution ${id} not found.`);
      }

      const next = { ...existing, ...input };
      assertPositiveAmount(next.amount, "contribution amount");
      const currentGoal = await tx.query.goals.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, existing.goalId),
      });

      if (existing.walletId) {
        await adjustGoalContributionAccountBalance(
          tx,
          existing.walletId,
          existing.amount,
        );
      }
      await tx
        .update(goalContributions)
        .set(
          prepareUpdateForSync({
            ...input,
            updatedAt: nowIso(),
          }),
        )
        .where(eq(goalContributions.id, id));
      if (next.walletId) {
        await adjustGoalContributionAccountBalance(
          tx,
          next.walletId,
          -next.amount,
        );
      }
      await refreshGoalCurrentAmount(tx, existing.goalId);

      if (existing.goalId !== next.goalId) {
        await refreshGoalCurrentAmount(tx, next.goalId);
      }

      return {
        contribution: await tx.query.goalContributions.findFirst({
          where: (table, { eq: innerEq }) => innerEq(table.id, id),
          with: {
            wallet: true,
          },
        }),
        previousGoalAmount: currentGoal?.currentAmount ?? 0,
        userId: currentGoal?.userId ?? null,
        goalId: next.goalId,
      };
    });

    emitGoalsChanged();
    emitAccountsChanged();

    if (updated?.contribution && updated.userId) {
      await enqueueSync(
        "goal_contributions",
        updated.contribution.id,
        "upsert",
        updated.userId,
      );
      await enqueueSync(
        "saving_goals",
        updated.goalId,
        "upsert",
        updated.userId,
      );
      if (updated.contribution.walletId) {
        await enqueueSync(
          "accounts",
          updated.contribution.walletId,
          "upsert",
          updated.userId,
        );
      }
    }

    if (updated?.contribution && updated.userId) {
      const syncUserId = updated.userId;
      processGoalContributionNotificationEvent({
        userId: syncUserId,
        goalId: updated.goalId,
        previousAmount: updated.previousGoalAmount,
        contributionAmount: updated.contribution.amount,
      })
        .then(() => generatePeriodicNotifications(syncUserId))
        .catch(() => undefined);
    }

    if (updated?.contribution) {
      showSuccessToast({
        title: "Contribution updated",
        message: "Goal contribution changes were saved.",
        dedupeKey: `goal:contribution:update:${updated.contribution.id}:${updated.contribution.updatedAt}`,
        source: "goals-service",
      });
    }

    return updated?.contribution ?? null;
  }

  async deleteContribution(id: string) {
    const deleted = await db.transaction(async (tx) => {
      const existing = await tx.query.goalContributions.findFirst({
        where: (table, { eq }) => eq(table.id, id),
      });

      if (!existing) {
        return null;
      }

      await tx
        .update(goalContributions)
        .set(prepareDeleteForSync())
        .where(eq(goalContributions.id, id));
      if (existing.walletId) {
        await adjustGoalContributionAccountBalance(
          tx,
          existing.walletId,
          existing.amount,
        );
      }
      await refreshGoalCurrentAmount(tx, existing.goalId);
      return existing;
    });

    emitGoalsChanged();
    emitAccountsChanged();

    if (deleted) {
      await enqueueSync(
        "goal_contributions",
        deleted.id,
        "delete",
        deleted.userId,
      );
      await enqueueSync(
        "saving_goals",
        deleted.goalId,
        "upsert",
        deleted.userId,
      );
      if (deleted.walletId) {
        await enqueueSync(
          "accounts",
          deleted.walletId,
          "upsert",
          deleted.userId,
        );
      }
      showSuccessToast({
        title: "Contribution deleted",
        message: "The goal contribution was removed successfully.",
        dedupeKey: `goal:contribution:delete:${deleted.id}`,
        source: "goals-service",
      });
    }
  }

  async fetchContributionById(id: string) {
    return goalsRepository.findContributionById(id);
  }

  async fetchContributions(goalId: string) {
    return goalsRepository.findContributionsByGoal(goalId);
  }
}

export const goalsService = new GoalsService();
