import { PropertyDetailScreen } from "@/features/product/components/PropertyDetailScreen";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PropertyDetailScreen slug={slug} />;
}
