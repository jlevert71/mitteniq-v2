// app/projects/[projectId]/intake/page.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import IntakeClient from "./IntakeClient"

export default async function ProjectIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const cookieStore = await cookies()
  const auth = cookieStore.get("mitten-auth")
  if (!auth) redirect("/login")

  const userId = auth.value

  const { projectId } = await params
  const sp = await searchParams

  const raw = sp.uploadId
  const uploadId = Array.isArray(raw) ? raw[0] : raw

  if (!uploadId) {
    redirect(`/projects/${projectId}`)
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { name: true },
  })

  if (!project) {
    redirect("/projects")
  }

  return <IntakeClient projectId={projectId} uploadId={uploadId} projectName={project.name} />
}
