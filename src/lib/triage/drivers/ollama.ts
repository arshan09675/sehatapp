/**
 * The local-model driver: a real LLM, no API key, no bill.
 *
 * Talks to an Ollama server running on the developer's own machine
 * (https://ollama.com). This is what makes the FYP's "AI triage" claim
 * defensible without a paid account — the same prompt and the same validated
 * shape as a hosted model would produce, just executed locally.
 *
 * Setup:  ollama serve  &&  ollama pull llama3.2
 *
 * Three env vars, all optional:
 *   OLLAMA_URL         default http://localhost:11434
 *   OLLAMA_MODEL       default llama3.2
 *   OLLAMA_TIMEOUT_MS  default 60000
 */

import { triageJsonSchema } from "../schema";
import { TRIAGE_SYSTEM_PROMPT, buildUserPrompt } from "../prompt";
import { TriageError, type TriageDriver, type TriageInput } from "../types";

const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2";
/**
 * Generous by design. A first request after `ollama serve` pays for loading
 * several gigabytes of weights, and on a CPU-only laptop — which is what a
 * student demo runs on — a single classification can genuinely take 30s.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

function config() {
  const timeout = Number(process.env.OLLAMA_TIMEOUT_MS);

  return {
    // Trailing slashes are the most common way this is mis-set, and they turn
    // the path into a 404 that reads like the server is down.
    url: (process.env.OLLAMA_URL?.trim() || DEFAULT_URL).replace(/\/+$/, ""),
    model: process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs:
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export function createOllamaDriver(): TriageDriver {
  const { url, model, timeoutMs } = config();

  return {
    name: "ollama",
    detail: `${model} @ ${url}`,

    async classify(input: TriageInput) {
      let response: Response;

      try {
        response = await fetch(`${url}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: "system", content: TRIAGE_SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(input.symptoms) },
            ],
            // Constrained decoding: the model is made to emit exactly the
            // shape schema.ts validates. Ollama added this in 0.5; older
            // builds ignore the field, which is why the response is still
            // parsed leniently and validated afterwards.
            format: triageJsonSchema(),
            // Deterministic, so re-running the eval on the same cases gives
            // the same table. A triage classifier has no use for creativity.
            options: { temperature: 0 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (cause) {
        const timedOut =
          cause instanceof Error && cause.name === "TimeoutError";
        throw new TriageError(
          "unavailable",
          timedOut
            ? `Ollama did not respond within ${timeoutMs}ms (model ${model}). A cold start can exceed this — raise OLLAMA_TIMEOUT_MS or run the model once by hand.`
            : `Could not reach Ollama at ${url}. Is it running? Start it with \`ollama serve\`.`,
          { cause },
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        // 404 here means the model, not the endpoint — the path is fixed.
        const hint =
          response.status === 404
            ? ` Pull it first: \`ollama pull ${model}\`.`
            : "";
        throw new TriageError(
          "unavailable",
          `Ollama returned ${response.status} for model ${model}.${hint} ${body.slice(0, 200)}`.trim(),
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      if (data.error) {
        throw new TriageError("unavailable", `Ollama error: ${data.error}`);
      }

      const content = data.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new TriageError(
          "invalid_response",
          `Ollama returned an empty message for model ${model}.`,
        );
      }

      // Returned as a string on purpose: classify.ts owns extraction and
      // validation, so every driver is held to the schema the same way.
      return content;
    },
  };
}
