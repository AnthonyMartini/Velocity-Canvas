import ProjectEditorRoute from "@/features/projects/ProjectEditorRoute";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ name?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawName = resolvedSearchParams?.name;
  const initialName = Array.isArray(rawName) ? rawName[0] : rawName;

  return <ProjectEditorRoute mode="new" initialName={initialName} />;
}
