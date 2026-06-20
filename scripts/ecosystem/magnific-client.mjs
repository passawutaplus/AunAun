/**
 * Minimal Magnific REST client for batch avatar generation.
 * Docs: https://docs.magnific.com/llms.txt
 */

const API_BASE = "https://api.magnific.com";

/** @type {Record<string, { create: string; status: (taskId: string) => string }>} */
export const MAGNIFIC_TEXT_TO_IMAGE_MODELS = {
  hyperflux: {
    create: "/v1/ai/text-to-image/hyperflux",
    status: (taskId) => `/v1/ai/text-to-image/hyperflux/${taskId}`,
  },
  "flux-2-klein": {
    create: "/v1/ai/text-to-image/flux-2-klein",
    status: (taskId) => `/v1/ai/text-to-image/flux-2-klein/${taskId}`,
  },
  "flux-2-turbo": {
    create: "/v1/ai/text-to-image/flux-2-turbo",
    status: (taskId) => `/v1/ai/text-to-image/flux-2-turbo/${taskId}`,
  },
};

const TERMINAL = new Set(["COMPLETED", "FAILED"]);

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.prompt
 * @param {string} [opts.model]
 * @param {string} [opts.aspectRatio]
 * @param {number} [opts.seed]
 * @param {object} [opts.styling]
 * @param {number} [opts.pollIntervalMs]
 * @param {number} [opts.timeoutMs]
 */
export async function magnificGenerateImageBytes({
  apiKey,
  prompt,
  model = "hyperflux",
  aspectRatio = "square_1_1",
  seed,
  styling,
  pollIntervalMs = 1500,
  timeoutMs = 120_000,
}) {
  const routes = MAGNIFIC_TEXT_TO_IMAGE_MODELS[model];
  if (!routes) {
    throw new Error(
      `Unknown Magnific model "${model}". Supported: ${Object.keys(MAGNIFIC_TEXT_TO_IMAGE_MODELS).join(", ")}`,
    );
  }

  const body = { prompt, aspect_ratio: aspectRatio };
  if (seed != null) body.seed = seed;
  if (styling) body.styling = styling;

  const createRes = await fetch(`${API_BASE}${routes.create}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-magnific-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Magnific create ${createRes.status}: ${errText.slice(0, 500)}`);
  }

  const createJson = await createRes.json();
  const taskId = createJson?.data?.task_id;
  if (!taskId) {
    throw new Error(`Magnific create response missing task_id: ${JSON.stringify(createJson).slice(0, 300)}`);
  }

  const deadline = Date.now() + timeoutMs;
  let lastStatus = createJson?.data?.status ?? "CREATED";

  while (!TERMINAL.has(lastStatus)) {
    if (Date.now() > deadline) {
      throw new Error(`Magnific task ${taskId} timed out (last status: ${lastStatus})`);
    }
    await sleep(pollIntervalMs);

    const statusRes = await fetch(`${API_BASE}${routes.status(taskId)}`, {
      headers: { "x-magnific-api-key": apiKey },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      throw new Error(`Magnific status ${statusRes.status}: ${errText.slice(0, 500)}`);
    }

    const statusJson = await statusRes.json();
    lastStatus = statusJson?.data?.status ?? lastStatus;

    if (lastStatus === "COMPLETED") {
      const imageUrl = statusJson?.data?.generated?.[0];
      if (!imageUrl) {
        throw new Error(`Magnific task ${taskId} completed without image URL`);
      }
      return downloadImageBytes(imageUrl);
    }

    if (lastStatus === "FAILED") {
      throw new Error(`Magnific task ${taskId} failed`);
    }
  }

  throw new Error(`Magnific task ${taskId} ended with status ${lastStatus}`);
}

async function downloadImageBytes(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download Magnific image ${res.status}: ${imageUrl}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("Magnific image download returned empty body");
  return buf;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
