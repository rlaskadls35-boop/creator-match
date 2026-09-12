import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CreatorResults from "../src/components/creator-results";
import { POST } from "../src/app/api/creators/route";
import { creatorColumns, parseCreators } from "../src/lib/creator-data";
import { createCreatorTable, importCreators, queryCreators } from "../src/lib/creator-db";
import { InvalidCampaignFilters, validateCampaignFilters } from "../src/lib/creator-filter";
import type { CampaignFilters, Creator, CreatorRecord } from "../src/lib/creator-types";

const filters: CampaignFilters = { budget: 1_000_000, categories: ["뷰티", "식품"], platform: "전체", size: "micro" };
const record: CreatorRecord = {
  creator_id: "internal-id", creator_name: "테스트 크리에이터", category: "뷰티", platform: "유튜브",
  followers: 10_000, avg_view_count: 5_000, engagement_rate: 3.5,
  total_campaign_count: 2, total_campaign_budget_krw: 2_000_000, avg_campaign_budget_krw: 1_000_000, advertiser_rating: null,
};
const creator: Creator = {
  id: "internal-id", name: "테스트 크리에이터", category: "뷰티", platform: "유튜브",
  followers: 10_000, avgViewCount: 5_000, engagementRate: 3.5,
  totalCampaignCount: 2, avgCampaignBudgetKrw: 1_000_000, advertiserRating: null,
};

function makeCsv(rows: Partial<CreatorRecord>[]) {
  return `\uFEFF${creatorColumns.join(",")}\n${rows.map((row) => {
    const values = { ...record, ...row };
    return creatorColumns.map((column) => `"${String(values[column] ?? "").replace(/"/g, '""')}"`).join(",");
  }).join("\n")}\n`;
}

function withDatabase(run: (db: DatabaseSync) => void) {
  const db = new DatabaseSync(":memory:");
  try { createCreatorTable(db); run(db); } finally { db.close(); }
}

const ids = (db: DatabaseSync, conditions = filters) => queryCreators(db, conditions).matches.map(({ id }) => id);

test("한 개 테이블의 11개 컬럼에 원본 200행을 보존하고 재적재해도 중복되지 않는다", () => {
  const original = readFileSync("dummy_creators.csv");
  withDatabase((db) => {
    assert.equal(importCreators(db, original.toString("utf8")), 200);
    importCreators(db, original.toString("utf8"));
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(({ name }) => name), ["creators"]);
    assert.deepEqual(db.prepare("PRAGMA table_info(creators)").all().map(({ name }) => name), creatorColumns);
    const rows = db.prepare("SELECT * FROM creators ORDER BY rowid").all().map((row) => ({ ...row }));
    assert.deepEqual(rows, parseCreators(original.toString("utf8")));
    assert.equal(rows.length, 200);
    assert.equal(rows.filter(({ advertiser_rating }) => advertiser_rating === null).length, 27);
    assert.equal(rows.filter(({ avg_campaign_budget_krw }) => avg_campaign_budget_krw === 0).length, 27);
    assert.equal(db.prepare("SELECT total_campaign_budget_krw FROM creators WHERE creator_id = 'C0001'").get()!.total_campaign_budget_krw, 5_097_729);
    const conditions: CampaignFilters = { ...filters, categories: ["게임"], platform: "유튜브" };
    assert.ok(ids(db, conditions).includes("C0002"));
    assert.ok(!ids(db, { ...conditions, platform: "인스타그램" }).includes("C0002"));
  });
  assert.deepEqual(readFileSync("dummy_creators.csv"), original);
});

test("팔로워 경계값은 겹치거나 누락되는 구간 없이 분류되고 미확인 팔로워는 제외된다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([9_999, 10_000, 99_999, 100_000, null].map((followers, index) => ({ creator_id: String(index), followers }))));
    assert.deepEqual(ids(db, { ...filters, size: "nano" }), ["0"]);
    assert.deepEqual(ids(db, { ...filters, size: "micro" }), ["1", "2"]);
    assert.deepEqual(ids(db, { ...filters, size: "macro" }), ["3"]);
  });
});

test("예산 상한은 포함하고 초과 금액 및 무이력·미확인 예산은 제외한다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([
      { creator_id: "under", avg_campaign_budget_krw: 999_999 },
      { creator_id: "equal" },
      { creator_id: "over", avg_campaign_budget_krw: 1_000_001 },
      { creator_id: "unknown", avg_campaign_budget_krw: null },
      { creator_id: "zero", avg_campaign_budget_krw: 0 },
      { creator_id: "no-history", total_campaign_count: 0 },
      { creator_id: "unknown-history", total_campaign_count: null },
    ]));
    assert.deepEqual(ids(db), ["under", "equal"]);
    assert.equal(queryCreators(db, filters).unknownBudgetCount, 4);
    assert.deepEqual(ids(db, { ...filters, budget: 1 }), []);
    assert.equal(queryCreators(db, filters).matches[0].advertiserRating, null);
  });
});

test("카테고리는 합집합이며 플랫폼 및 규모 조건도 함께 충족해야 한다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([
      { creator_id: "beauty-youtube" },
      { creator_id: "food-instagram", category: "식품", platform: "인스타그램" },
      { creator_id: "wrong-category", category: "게임" },
      { creator_id: "wrong-size", followers: 100_000 },
      { creator_id: "unknown-other-category", category: "게임", avg_campaign_budget_krw: null },
    ]));
    assert.deepEqual(ids(db), ["beauty-youtube", "food-instagram"]);
    assert.equal(queryCreators(db, filters).unknownBudgetCount, 0);
    assert.deepEqual(ids(db, { ...filters, platform: "인스타그램" }), ["food-instagram"]);
  });
});

test("CSV의 BOM과 따옴표를 처리하고 0원은 보존하며 공란만 NULL로 저장한다", () => {
  const parsed = parseCreators(makeCsv([{ creator_name: '이름,"쉼표"', total_campaign_count: 0, avg_campaign_budget_krw: 0 }]));
  assert.equal(parsed[0].creator_name, '이름,"쉼표"');
  assert.equal(parsed[0].avg_campaign_budget_krw, 0);
  assert.equal(parsed[0].advertiser_rating, null);
});

test("중복 ID·잘못된 숫자·범위를 벗어난 평점이 있으면 기존 데이터를 바꾸지 않는다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([{}]));
    for (const invalid of [
      makeCsv([{}, {}]),
      makeCsv([{ followers: -1 }]),
      makeCsv([{ followers: 1.5 }]),
      makeCsv([{ followers: Infinity }]),
      makeCsv([{ advertiser_rating: 5.1 }]),
      makeCsv([{ engagement_rate: 100.1 }]),
      makeCsv([{ creator_id: "" }]),
      makeCsv([{ total_campaign_count: 0, advertiser_rating: 3 }]),
      makeCsv([{ category: "알수없음" }]),
      makeCsv([{ followers: 1 }]).replace('"1",', '"not-a-number",'),
      makeCsv([{ followers: 1 }]).replace('"1",', '"1.00000000000000001",'),
    ]) {
      assert.throws(() => importCreators(db, invalid));
      assert.equal(db.prepare("SELECT count(*) AS count FROM creators").get()!.count, 1);
      assert.equal(db.prepare("SELECT creator_name FROM creators").get()!.creator_name, record.creator_name);
    }
    importCreators(db, makeCsv([{ creator_name: "갱신한 이름" }]));
    assert.equal(db.prepare("SELECT count(*) AS count FROM creators").get()!.count, 1);
    assert.equal(db.prepare("SELECT creator_name FROM creators").get()!.creator_name, "갱신한 이름");
  });
});

test("적재 도중 DB 오류가 발생하면 앞서 수정한 행도 롤백한다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([{}]));
    db.exec("CREATE TEMP TRIGGER reject_test BEFORE INSERT ON creators WHEN NEW.creator_id = 'reject' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    assert.throws(() => importCreators(db, makeCsv([{ creator_name: "변경하면 안 됨" }, { creator_id: "reject" }])));
    assert.equal(db.prepare("SELECT creator_name FROM creators").get()!.creator_name, record.creator_name);
    assert.equal(db.prepare("SELECT count(*) AS count FROM creators").get()!.count, 1);
  });
});

test("DB 제약조건도 중복·음수·문자 숫자·범위 오류를 방어한다", () => {
  withDatabase((db) => {
    importCreators(db, makeCsv([{}]));
    const insert = db.prepare(`INSERT INTO creators (${creatorColumns.join(",")}) VALUES (${creatorColumns.map(() => "?").join(",")})`);
    assert.throws(() => insert.run(...creatorColumns.map((column) => record[column])));
    for (const sql of [
      "UPDATE creators SET followers = -1", "UPDATE creators SET followers = 'wrong'",
      "UPDATE creators SET followers = 1.5", "UPDATE creators SET advertiser_rating = 6",
      "UPDATE creators SET platform = 'unknown'", "UPDATE creators SET category = 'unknown'",
    ]) assert.throws(() => db.exec(sql));
  });
});

test("서버는 UI를 우회한 잘못된 조건과 SQL 문자열도 거부한다", () => {
  for (const input of [null, [], {}, { ...filters, budget: 0 }, { ...filters, budget: NaN },
    { ...filters, budget: Infinity }, { ...filters, budget: "1000" }, { ...filters, budget: 1.5 },
    { ...filters, budget: 1_000_000_000_000 }, { ...filters, categories: [] },
    { ...filters, categories: ["뷰티') OR 1=1 --"] }, { ...filters, platform: "unknown" }, { ...filters, size: "unknown" }]) {
    assert.throws(() => validateCampaignFilters(input), InvalidCampaignFilters);
  }
  assert.deepEqual(validateCampaignFilters({ ...filters, categories: ["뷰티", "뷰티"] }).categories, ["뷰티"]);
});

test("API는 잘못된 JSON 및 누락된 조건에 400 오류와 안내를 반환한다", async () => {
  for (const body of ["{", "{}", JSON.stringify({ ...filters, budget: -1 })]) {
    const response = await POST(new Request("http://localhost/api/creators", { method: "POST", body }));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
});

test("결과표 컬럼 순서와 평점 없음 표시를 유지하고 내부 ID는 숨긴다", () => {
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
