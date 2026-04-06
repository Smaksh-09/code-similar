import { describe, expect, it } from "vitest";

import { analyzeRepositories, filterRepositoryFiles } from "@/lib/similarity/engine";
import type { RepositoryInput } from "@/lib/types";

describe("filterRepositoryFiles", () => {
  it("keeps only files that match selected languages and known extensions", () => {
    const repos: RepositoryInput[] = [
      {
        id: "repo-a",
        name: "repo-a",
        source: "seed",
        files: [
          { path: "src/main.ts", language: "TypeScript", content: "const a = 1;" },
          { path: "src/main.py", language: "Python", content: "x = 1" },
          { path: "notes/readme.txt", language: "TypeScript", content: "ignore me" },
        ],
      },
    ];

    const filtered = filterRepositoryFiles(repos, ["TypeScript"]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].files).toHaveLength(1);
    expect(filtered[0].files[0].path).toBe("src/main.ts");
  });
});

describe("analyzeRepositories", () => {
  it("detects strong similarity despite identifier renaming", () => {
    const repos: RepositoryInput[] = [
      {
        id: "left",
        name: "left",
        source: "seed",
        files: [
          {
            path: "src/calc.ts",
            language: "TypeScript",
            content: `
export function addTaxes(items: number[], taxRate = 0.1) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item;
  }
  const taxes = subtotal * taxRate;
  return subtotal + taxes;
}
`,
          },
        ],
      },
      {
        id: "right",
        name: "right",
        source: "seed",
        files: [
          {
            path: "src/pricing.ts",
            language: "TypeScript",
            content: `
export function computeTotal(values: number[], rate = 0.1) {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  const fee = sum * rate;
  return sum + fee;
}
`,
          },
        ],
      },
    ];

    const result = analyzeRepositories(repos, "hybrid");

    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.pairs[0].leftFileId).toContain("left");
    expect(result.pairs[0].rightFileId).toContain("right");
    expect(result.pairs[0].score).toBeGreaterThan(0.7);
    expect(result.pairs[0].matchingBlocks.length).toBeGreaterThan(0);
  });

  it("does not compare unrelated languages except JS/TS compatibility", () => {
    const repos: RepositoryInput[] = [
      {
        id: "mixed-a",
        name: "mixed-a",
        source: "seed",
        files: [{ path: "a.py", language: "Python", content: "def fn():\n    return 1" }],
      },
      {
        id: "mixed-b",
        name: "mixed-b",
        source: "seed",
        files: [{ path: "b.ts", language: "TypeScript", content: "export const fn = () => 1;" }],
      },
    ];

    const result = analyzeRepositories(repos, "hybrid");
    expect(result.pairs).toHaveLength(0);
  });
});
