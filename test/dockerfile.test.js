import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Docker image includes every top-level runtime JavaScript module", async () => {
  const dockerfile = await readFile(
    new URL("../Dockerfile", import.meta.url),
    "utf8"
  );

  assert.match(
    dockerfile,
    /^COPY --chown=node:node \*\.js \.\/$/m,
    "Dockerfile must copy index.js and its top-level JavaScript imports"
  );
});
