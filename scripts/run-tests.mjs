import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function tests(dir, suffix) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? tests(join(dir, entry.name), suffix)
      : entry.name.endsWith(suffix)
        ? [join(dir, entry.name)]
        : [],
  );
}
const scaffold = process.argv.includes("--scaffold");
const files = scaffold
  ? tests("scripts", ".test.mjs")
  : [
      ...tests("src/lib/editor", ".test.ts"),
      "src/lib/app-data/app-data.test.ts",
      "src/lib/auth/gate-identity.test.ts",
    ];
if (!files.length) throw new Error("No tests discovered");
console.log(
  `Running ${files.length} ${scaffold ? "Grok scaffold (requires sandbox fixtures)" : "portable application"} test files.`,
);
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], {
  stdio: "inherit",
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
