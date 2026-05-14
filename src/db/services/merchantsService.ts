import { createId } from "../utils/ids";
import { nowIso } from "../utils/time";
import { merchantsRepository } from "../repositories/merchantsRepository";
import { emitMerchantsChanged } from "@/src/lib/dbSync";
import { getMerchantPresetByName, searchMerchantPresets, type MerchantPresetOption } from "@/constants/expense-merchants";
import { prepareCreateForSync, prepareUpdateForSync } from "@/src/sync/helpers";
import { enqueueSync } from "@/src/sync/queue";

export type MerchantPickerOption = MerchantPresetOption & {
  merchantId: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  lastUsedAt: string | null;
  source: "history" | "merchant" | "preset";
};

type EnsureMerchantInput = {
  userId: string;
  name: string;
  defaultCategoryId?: string | null;
  logoUri?: string | null;
};

export class MerchantsService {
  async ensureMerchant(input: EnsureMerchantInput) {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      return null;
    }

    const existing = await merchantsRepository.findByUserAndName(input.userId, normalizedName);
    const timestamp = nowIso();

    if (existing) {
      if (!existing.defaultCategoryId && input.defaultCategoryId) {
        const updated = await merchantsRepository.update(
          existing.id,
          prepareUpdateForSync({
            defaultCategoryId: input.defaultCategoryId,
            updatedAt: timestamp,
          }),
        );
        if (updated) {
          await enqueueSync("merchants", updated.id, "upsert", updated.userId);
        }
        return updated;
      }

      return existing;
    }

    const preset = getMerchantPresetByName(normalizedName);
    const created = await merchantsRepository.create({
      ...prepareCreateForSync({
        id: createId("mer"),
        userId: input.userId,
        name: normalizedName,
        logoUri: input.logoUri ?? null,
        defaultCategoryId: input.defaultCategoryId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });

    if (!created) {
      return null;
    }

    if (!created.defaultCategoryId && preset?.defaultCategoryId) {
      const updated = await merchantsRepository.update(
        created.id,
        prepareUpdateForSync({
          defaultCategoryId: preset.defaultCategoryId,
          updatedAt: timestamp,
        }),
      );
      if (updated) {
        await enqueueSync("merchants", updated.id, "upsert", updated.userId);
      }
      return merchantsRepository.findById(created.id);
    }

    await enqueueSync("merchants", created.id, "upsert", created.userId);
    emitMerchantsChanged();
    return created;
  }

  async learnMerchantCategory(merchantId: string, categoryId: string) {
    const timestamp = nowIso();
    await merchantsRepository.recordCategoryUsage({
      merchantId,
      categoryId,
      usageCount: 1,
      lastUsedAt: timestamp,
    });

    const topCategory = await merchantsRepository.getTopCategoryForMerchant(merchantId);
    if (topCategory?.categoryId) {
      const updated = await merchantsRepository.update(
        merchantId,
        prepareUpdateForSync({
          defaultCategoryId: topCategory.categoryId,
          updatedAt: timestamp,
        }),
      );
      if (updated) {
        await enqueueSync("merchants", updated.id, "upsert", updated.userId);
      }
    }

    emitMerchantsChanged();
  }

  async search(userId: string, query?: string, limit = 16): Promise<MerchantPickerOption[]> {
    const merchants = await merchantsRepository.findAllByUser(userId, query);
    const recentUsage = await merchantsRepository.getRecentUsageByUser(userId);
    const topHistory = await merchantsRepository.getTopHistoryByMerchantIds(merchants.map((merchant) => merchant.id));

    const merchantOptions = merchants
      .map((merchant) => {
        const preset = getMerchantPresetByName(merchant.name);
        const history = topHistory.get(merchant.id);
        const suggestedCategoryId = history?.categoryId ?? merchant.defaultCategoryId ?? null;
        const source: MerchantPickerOption["source"] = history ? "history" : "merchant";

        return {
          id: merchant.id,
          merchantId: merchant.id,
          label: merchant.name,
          initials: preset?.initials ?? buildInitials(merchant.name),
          color: preset?.color ?? "#64748B",
          textColor: preset?.textColor,
          icon: preset?.icon,
          defaultCategoryName: merchant.defaultCategory?.name ?? preset?.defaultCategoryName ?? null,
          suggestedCategoryId,
          suggestedCategoryName:
            history?.categoryName ?? merchant.defaultCategory?.name ?? preset?.defaultCategoryName ?? null,
          lastUsedAt: recentUsage.get(merchant.id) ?? null,
          source,
        };
      })
      .sort((left, right) => {
        const leftRecent = left.lastUsedAt ?? "";
        const rightRecent = right.lastUsedAt ?? "";
        if (leftRecent !== rightRecent) {
          return rightRecent.localeCompare(leftRecent);
        }
        return left.label.localeCompare(right.label);
      });

    const existingNames = new Set(merchantOptions.map((merchant) => merchant.label.trim().toLowerCase()));
    const presetOptions = searchMerchantPresets(query)
      .filter((preset) => !existingNames.has(preset.label.trim().toLowerCase()))
      .map((preset) => ({
        ...preset,
        merchantId: null,
        suggestedCategoryId: preset.defaultCategoryId ?? null,
        suggestedCategoryName: preset.defaultCategoryName ?? null,
        lastUsedAt: null,
        source: "preset" as const,
      }));

    return [...merchantOptions, ...presetOptions].slice(0, limit);
  }
}

function buildInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "?";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export const merchantsService = new MerchantsService();
