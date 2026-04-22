import { spawn } from "node:child_process";

const maxAttempts = Number(process.env.DB_MIGRATE_MAX_ATTEMPTS ?? "6");
const delayMs = Number(process.env.DB_MIGRATE_RETRY_DELAY_MS ?? "5000");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientNetworkError(output: string) {
  return [
    "EAI_AGAIN",
    "ENOTFOUND",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "Connection terminated unexpectedly",
    "terminating connection due to administrator command",
  ].some((pattern) => output.includes(pattern));
}

async function runMigrate(attempt: number) {
  return await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["./node_modules/drizzle-kit/bin.cjs", "migrate"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let combinedOutput = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Migration attempt ${attempt} failed.\n${combinedOutput}`));
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`[db:migrate:retry] attempt ${attempt}/${maxAttempts}`);
      await runMigrate(attempt);
      console.log("[db:migrate:retry] migrations applied successfully");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = isTransientNetworkError(message);

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      console.warn(`[db:migrate:retry] transient database connectivity failure, retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
}

main().catch((error) => {
  console.error("[db:migrate:retry] failed", error);
  process.exit(1);
});
