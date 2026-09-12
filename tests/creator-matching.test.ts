import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CreatorResults from "../src/components/creator-results";
import { getCreators, parseCreators } from "../src/lib/creator-data";
import { filterCreators, matchesFollowerSize } from "../src/lib/creator-filter";
import type { CampaignFilters, Creator, FollowerSize } from "../src/lib/creator-types";

const filters: CampaignFilters = { budget: 1_000_000, categories: ["뷰티", "식품"], platform: "전체", size: "micro" };
const creator: Creator = {
  id: "internal-id", name: "테스트 크리에이터", category: "뷰티", platform: "유튜브",
  followers: 10_000, avgViewCount: 5_000, engagementRate: 3.5,
  totalCampaignCount: 2, avgCampaignBudgetKrw: 1_000_000, advertiserRating: null,
};

test("팔로워 경계값은 겹치거나 누락되는 구간 없이 하나의 규모에 속한다", () => {
  const sizes: FollowerSize[] = ["nano", "micro", "macro"];
  for (const [followers, expected] of [[9_999, "nano"], [10_000, "micro"], [99_999, "micro"], [100_000, "macro"]] as const) {
    assert.deepEqual(sizes.filter((size) => matchesFollowerSize(followers, size)), [expected]);
  }
  for (const invalid of [null, -1, NaN, Infinity]) {
    assert.equal(sizes.some((size) => matchesFollowerSize(invalid, size)), false);
  }
});

test("예산과 같은 금액까지 포함하고 초과 금액 및 미확인 예산은 제외한다", () => {
  const candidates = [
    { ...creator, id: "under", avgCampaignBudgetKrw: 999_999 },
    { ...creator, id: "equal" },
    { ...creator, id: "over", avgCampaignBudgetKrw: 1_000_001 },
    { ...creator, id: "unknown", avgCampaignBudgetKrw: null },
    { ...creator, id: "zero", avgCampaignBudgetKrw: 0 },
  ];
  const result = filterCreators(candidates, filters);
  assert.deepEqual(result.matches.map(({ id }) => id), ["under", "equal"]);
  assert.equal(result.unknownBudgetCount, 1);
  for (const budget of [0, -1, NaN, Infinity]) {
    assert.deepEqual(filterCreators(candidates, { ...filters, budget }).matches, []);
  }
});

test("복수 카테고리는 합집합이며 플랫폼 및 규모 조건도 함께 충족해야 한다", () => {
  const candidates: Creator[] = [
    { ...creator, id: "beauty-youtube" },
    { ...creator, id: "food-instagram", category: "식품", platform: "인스타그램" },
    { ...creator, id: "wrong-category", category: "게임" },
    { ...creator, id: "wrong-size", followers: 100_000 },
    { ...creator, id: "unknown-other-category", category: "게임", avgCampaignBudgetKrw: null },
  ];
  const result = filterCreators(candidates, filters);
  assert.deepEqual(result.matches.map(({ id }) => id), ["beauty-youtube", "food-instagram"]);
  assert.equal(result.unknownBudgetCount, 0);
  assert.deepEqual(filterCreators(candidates, { ...filters, platform: "인스타그램" }).matches.map(({ id }) => id), ["food-instagram"]);
  assert.deepEqual(filterCreators(candidates, { ...filters, categories: [] }).matches, []);
});

test("CSV의 따옴표 및 BOM을 처리하고 무이력 예산과 빈 평점은 미확인 값으로 유지한다", () => {
  const csv = '\uFEFFcreator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\nA,"이름,쉼표",뷰티,유튜브,10000,5000,3.5,0,0,0,\nB,두번째,뷰티,인스타그램,20000,8000,4.2,2,2000000,1000000,\n';
  const parsed = parseCreators(csv);
  assert.equal(parsed[0].name, "이름,쉼표");
  assert.equal(parsed[0].avgCampaignBudgetKrw, null);
  assert.equal(parsed[0].advertiserRating, null);
  assert.equal(parsed[1].avgCampaignBudgetKrw, 1_000_000);
  assert.equal(parsed[1].advertiserRating, null);
});

test("원본 200개 데이터에서 실제 조건에 맞는 후보를 반환한다", async () => {
  const creators = await getCreators();
  assert.equal(creators.length, 200);
  assert.equal(creators.filter(({ avgCampaignBudgetKrw }) => avgCampaignBudgetKrw === null).length, 27);
  const conditions: CampaignFilters = { ...filters, categories: ["게임"], platform: "유튜브" };
  const matches = filterCreators(creators, conditions).matches;
  assert.ok(matches.some(({ id }) => id === "C0002"));
  assert.ok(matches.every((item) => item.category === "게임" && item.platform === "유튜브" && item.followers! >= 10_000 && item.followers! < 100_000 && item.avgCampaignBudgetKrw! <= 1_000_000));
  assert.ok(!filterCreators(creators, { ...conditions, platform: "인스타그램" }).matches.some(({ id }) => id === "C0002"));
});

test("결과표는 요청한 컬럼 순서를 사용하고 내부 ID와 빈 평점을 숫자로 노출하지 않는다", () => {
  const markup = renderToStaticMarkup(createElement(CreatorResults, { creators: [creator], unknownBudgetCount: 0 }));
  const headers = [...markup.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(headers, ["크리에이터", "플랫폼", "카테고리", "평균 진행 예산", "팔로워 수", "평균 조회수", "참여율", "누적 캠페인 건수", "광고주 평점"]);
  assert.ok(!markup.includes(creator.id));
  assert.ok(markup.includes("평가 없음"));
  assert.ok(markup.includes("1,000,000원"));
});

test("결과가 없으면 빈 상태와 미확인 예산 제외 안내를 표시한다", () => {
  const markup = renderToStaticMarkup(createElement(CreatorResults, { creators: [], unknownBudgetCount: 2 }));
  assert.ok(markup.includes("조건에 맞는 크리에이터가 없어요."));
  assert.ok(markup.includes("2명은 결과에서 제외"));
  assert.ok(!markup.includes("<table"));
});
