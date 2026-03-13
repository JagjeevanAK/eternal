import { redirect } from "next/navigation";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/marketplace/${slug}`);
}
