import { requireUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runPreBidChecklist } from "@/lib/agents/pre-bid-checklist/run-pre-bid-checklist"
import { savePreBidChecklist } from "@/lib/agents/pre-bid-checklist/save-checklist"

export const runtime = "nodejs"
export const maxDuration = 300

const HEARTBEAT_MESSAGES = [
  "Still working…",
  "Hang tight…",
  "Almost there…",
  "Still scanning, please stand by…",
  "Working through it…",
]

export async function GET(req: Request) {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === "UNAUTHENTICATED") {
      return new Response("UNAUTHENTICATED", { status: 401 })
    }
    return new Response(msg, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const uploadId = searchParams.get("uploadId")?.trim() ?? ""
  if (!uploadId) {
    return new Response("Missing uploadId query parameter.", { status: 400 })
  }

  const upload = await prisma.upload.findFirst({
    where: { id: uploadId, project: { ownerId: userId } },
    select: { id: true, r2Key: true },
  })

  if (!upload?.r2Key) {
    return new Response("Upload not found", { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let heartbeatIndex = 0

      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          closed = true
        }
      }

      const sendMessage = (message: string) => {
        // SSE data lines cannot contain raw newlines — split into multiple data: lines
        const dataLines = message.split("\n").map((line) => `data: ${line}`).join("\n")
        safeEnqueue(`event: message\n${dataLines}\n\n`)
      }

      const sendEvent = (event: string, data: string) => {
        const dataLines = data.split("\n").map((line) => `data: ${line}`).join("\n")
        safeEnqueue(`event: ${event}\n${dataLines}\n\n`)
      }

      const heartbeat = setInterval(() => {
        const msg = HEARTBEAT_MESSAGES[heartbeatIndex % HEARTBEAT_MESSAGES.length]
        heartbeatIndex++
        sendMessage(msg)
      }, 10000)

      const onAbort = () => {
        clearInterval(heartbeat)
        closed = true
        try { controller.close() } catch {}
      }
      req.signal.addEventListener("abort", onAbort)

      try {
        const result = await runPreBidChecklist({
          uploadId: upload.id,
          r2Key: upload.r2Key,
          onProgress: (message) => sendMessage(message),
        })

        clearInterval(heartbeat)

        if (result.ok) {
          await savePreBidChecklist({
            uploadId: upload.id,
            fields: result.fields,
            meta: result.meta,
            extractedAt: result.extractedAt,
          })
        }

        sendEvent("done", JSON.stringify(result))
      } catch (err) {
        clearInterval(heartbeat)
        const msg = err instanceof Error ? err.message : String(err)
        console.error("pre-bid-checklist stream API:", err)
        sendEvent("error", JSON.stringify({ error: msg }))
      } finally {
        req.signal.removeEventListener("abort", onAbort)
        closed = true
        try { controller.close() } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
