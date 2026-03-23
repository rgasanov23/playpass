import { JoinTrainingView } from "@/components/join-training-view";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ joinToken: string }>;
}) {
  const { joinToken } = await params;
  return <JoinTrainingView joinToken={joinToken} />;
}
