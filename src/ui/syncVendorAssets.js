import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const VENDOR_MAPPINGS = [
  {
    source: path.join(repoRoot, "node_modules", "@picocss", "pico", "css", "pico.min.css"),
    target: path.join(repoRoot, "public", "assets", "vendor", "pico.min.css"),
  },
];

async function copyFile({ source, target }) {
  try {
    await fs.access(source);
  } catch {
    throw new Error(`Vendor source file is missing: ${source}`);
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function run() {
  for (const mapping of VENDOR_MAPPINGS) {
    await copyFile(mapping);
  }

  process.stdout.write(`${JSON.stringify({
    status: "vendor_assets_synced",
    files: VENDOR_MAPPINGS.map((item) => path.relative(repoRoot, item.target)),
  })}\n`);
}

run().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "vendor_assets_sync_failed",
    message: error.message,
  })}\n`);
  process.exitCode = 1;
});
