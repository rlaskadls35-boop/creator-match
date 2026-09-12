export type CreatorPlatform = "유튜브" | "인스타그램";
export type FollowerSize = "nano" | "micro" | "macro";
export type PlatformFilter = CreatorPlatform | "전체";

export type Creator = {
  id: string;
  name: string;
  category: string;
  platform: CreatorPlatform;
  followers: number | null;
  avgViewCount: number | null;
  engagementRate: number | null;
  totalCampaignCount: number | null;
  avgCampaignBudgetKrw: number | null;
  advertiserRating: number | null;
};

export type CampaignFilters = {
  budget: number;
  categories: string[];
  platform: PlatformFilter;
  size: FollowerSize;
};
