import { PropertyDetailScreen } from "@/features/exchange/components/PropertyDetailScreen";

export default async function MarketplaceAssetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PropertyDetailScreen slug={slug} />;
}
