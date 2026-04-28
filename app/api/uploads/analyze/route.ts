import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const userId = await requireUserId()
    const body = await req.json().catch(() => null)
    const uploadId = String(body?.uploadId ?? "").trim()

    if (!uploadId) {
      return NextResponse.json({ ok: false, error: "Missing uploadId" }, { status: 400 })
    }

    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        project: { ownerId: userId },
      },
      select: {
        id: true,
        projectId: true,
        r2Key: true,
        status: true,
        intakeStatus: true,
      },
    })

    if (!upload) {
      return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 })
    }

    if (!upload.r2Key) {
      return NextResponse.json({ ok: false, error: "Upload missing r2Key" }, { status: 400 })
    }

    if (upload.status !== "UPLOADED") {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot mark ready unless status is UPLOADED (currently ${upload.status})`,
        },
        { status: 409 },
      )
    }

    // Idempotent: if already READY, just return success without re-writing.
    if (upload.intakeStatus === "READY") {
      return NextResponse.json({
        ok: true,
        status: "READY",
        message: "Already ready",
        uploadId: upload.id,
        projectId: upload.projectId,
      })
    }

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        intakeStatus: "READY",
        intakeStage: "v2_ready",
        intakeError: null,
        intakeDelayReason: null,
      },
    })

    return NextResponse.json({
      ok: true,
      status: "READY",
      message: "Upload ready",
      uploadId: upload.id,
      projectId: upload.projectId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isAuth = message === "UNAUTHENTICATED"
    const status = isAuth ? 401 : 500
    console.error("Analyze error:", error)
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
