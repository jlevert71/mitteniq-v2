// AI configuration for MittenIQ V2.
// Replaces the V1 lib/intake/run-ai-intake.ts dependency with just the two
// constants and helpers V2 actually uses. No registries, no orchestration.

export const AI_INTAKE_MODEL = "gpt-4o-mini"

function getOpenAiApiKeyRaw(): string {
  const raw = process.env.OPENAI_API_KEY
  return typeof raw === "string" ? raw.trim() : ""
}

function llmEnabled(): boolean {
  const raw = process.env.MITTENIQ_LLM_INTAKE_ENABLED
  return String(raw ?? "").trim().toLowerCase() === "true"
}

/** True when V2 agents may call the OpenAI client (env flag + API key set). */
export function canRunAiIntake(): boolean {
  return llmEnabled() && Boolean(getOpenAiApiKeyRaw())
}
