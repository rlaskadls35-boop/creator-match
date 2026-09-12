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

export type CreatorResultsData = {
  matches: Creator[];
  unknownBudgetCount: number;
};

/** CSV의 11개 컬럼을 보존하는 저장용 데이터. 공란만 NULL로 변환한다. */
export type CreatorRecord = {
  creator_id: string;
  creator_name: string;
  category: string;
  platform: CreatorPlatform;
  followers: number | null;
  avg_view_count: number | null;
  engagement_rate: number | null;
  total_campaign_count: number | null;
  total_campaign_budget_krw: number | null;
  avg_campaign_budget_krw: number | null;
  advertiser_rating: number | null;
};
