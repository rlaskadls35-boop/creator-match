import type { CampaignFilters, Creator, FollowerSize } from "./creator-types";

export function matchesFollowerSize(followers: number | null, size: FollowerSize): boolean {
  if (followers === null || !Number.isFinite(followers) || followers < 0) return false;
  if (size === "nano") return followers < 10_000;
  if (size === "micro") return followers >= 10_000 && followers < 100_000;
  return followers >= 100_000;
}

export function filterCreators(creators: Creator[], filters: CampaignFilters) {
  const matchingConditions = creators.filter((creator) => (
    filters.categories.includes(creator.category)
    && (filters.platform === "전체" || creator.platform === filters.platform)
    && matchesFollowerSize(creator.followers, filters.size)
  ));

  return {
    matches: matchingConditions.filter((creator) => (
      Number.isFinite(filters.budget) && filters.budget > 0
      && creator.avgCampaignBudgetKrw !== null
      && creator.avgCampaignBudgetKrw > 0
      && creator.avgCampaignBudgetKrw <= filters.budget
    )),
    unknownBudgetCount: matchingConditions.filter((creator) => creator.avgCampaignBudgetKrw === null).length,
  };
}
