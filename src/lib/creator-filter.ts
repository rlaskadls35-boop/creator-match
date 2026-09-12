import { categories, maxBudget, platforms, sizes } from "./campaign-options";
import type { CampaignFilters } from "./creator-types";

export class InvalidCampaignFilters extends Error {}

export function validateCampaignFilters(input: unknown): CampaignFilters {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidCampaignFilters("캠페인 조건을 확인해 주세요.");
  }
  const values = input as Record<string, unknown>;
  if (typeof values.budget !== "number" || !Number.isSafeInteger(values.budget) || values.budget <= 0 || values.budget > maxBudget) {
    throw new InvalidCampaignFilters("예산은 1원 이상 999,999,999,999원 이하의 정수로 입력해 주세요.");
  }
  if (!Array.isArray(values.categories) || values.categories.length === 0 || values.categories.length > categories.length
    || !values.categories.every((category) => typeof category === "string" && categories.includes(category))) {
    throw new InvalidCampaignFilters("올바른 카테고리를 1개 이상 선택해 주세요.");
  }
  const platform = platforms.find((option) => option === values.platform);
  const size = sizes.find((option) => option.id === values.size);
  if (!platform) throw new InvalidCampaignFilters("플랫폼을 확인해 주세요.");
  if (!size) throw new InvalidCampaignFilters("팔로워 규모를 선택해 주세요.");
  return { budget: values.budget, categories: [...new Set<string>(values.categories)], platform, size: size.id };
}
