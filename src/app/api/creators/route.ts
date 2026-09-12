import { searchCreators } from "@/lib/creator-db";
import { InvalidCampaignFilters, validateCampaignFilters } from "@/lib/creator-filter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "캠페인 조건을 올바른 형식으로 보내 주세요." }, { status: 400 });
  }
  try {
    const filters = validateCampaignFilters(input);
    return Response.json(searchCreators(filters), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvalidCampaignFilters) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("크리에이터 DB 조회 실패:", error);
    return Response.json({ error: "크리에이터 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
