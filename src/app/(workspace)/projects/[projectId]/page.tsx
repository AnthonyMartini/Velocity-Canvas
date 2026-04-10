import ProjectEditorRoute from "@/features/projects/ProjectEditorRoute";

export default async function ExistingProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectEditorRoute mode="existing" projectId={projectId} />;
}
