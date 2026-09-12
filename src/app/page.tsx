import CampaignMatcher from "@/components/campaign-matcher";
import { getCreators } from "@/lib/creator-data";

export default async function Home() {
  const creators = await getCreators();
  return <CampaignMatcher creators={creators} />;
}
