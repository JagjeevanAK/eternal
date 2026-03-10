import { redirect } from "next/navigation";

export default async function LegacyAssetRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/marketplace/${id}`);
}
