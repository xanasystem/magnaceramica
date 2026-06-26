// One-off: convert all project JPGs to optimized WebP (same dimensions).
// Adaptive quality: try a descending quality ladder and keep the first WebP
// that is smaller than the source JPG, so no file ever grows. Falls back to
// the smallest produced if even the lowest quality can't beat the JPG.
// Run with: node scripts/convert-to-webp.mjs
import sharp from "sharp";
import { readdirSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src/assets", "public/img"];
const QUALITY_LADDER = [74, 64, 56, 50];
const EFFORT = 6; // max sharp compression effort (0-6)

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.jpe?g$/i.test(extname(p))) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap(walk);
let oldTotal = 0;
let newTotal = 0;

for (const jpg of files) {
  const webp = jpg.replace(/\.jpe?g$/i, ".webp");
  const oldSize = statSync(jpg).size;

  let best = null; // { quality, size, tmp }
  for (const quality of QUALITY_LADDER) {
    const tmp = `${webp}.q${quality}`;
    await sharp(jpg).webp({ quality, effort: EFFORT }).toFile(tmp);
    const size = statSync(tmp).size;
    if (!best || size < best.size) {
      if (best) unlinkSync(best.tmp);
      best = { quality, size, tmp };
    } else {
      unlinkSync(tmp);
    }
    if (size < oldSize) break; // good enough, keep highest quality that wins
  }

  renameSync(best.tmp, webp);
  unlinkSync(jpg);
  oldTotal += oldSize;
  newTotal += best.size;
  const pct = Math.round((1 - best.size / oldSize) * 100);
  console.log(
    `${jpg.replace(/\\/g, "/")}  ${Math.round(oldSize / 1024)}KB -> ${Math.round(best.size / 1024)}KB  (-${pct}%)  q${best.quality}`,
  );
}

console.log(
  `\nTotal: ${Math.round(oldTotal / 1024)}KB -> ${Math.round(newTotal / 1024)}KB  (-${Math.round((1 - newTotal / oldTotal) * 100)}%)  across ${files.length} files`,
);
