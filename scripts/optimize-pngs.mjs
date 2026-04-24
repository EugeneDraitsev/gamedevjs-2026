import { readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const root = path.resolve(
  args.find((arg) => !arg.startsWith("--")) ?? "src/lib/assets"
);
const dryRun = args.includes("--dry-run");
const lossless = args.includes("--lossless");
const qualityArg = args.find((arg) => arg.startsWith("--quality="));
const quality = Math.max(
  1,
  Math.min(100, Number(qualityArg?.split("=")[1] ?? 86))
);
const mapFile = /(?:normal|height|bump|roughness|metallic|metalness|ao)\.png$/i;
let totalBefore = 0;
let totalAfter = 0;

const pngFiles = async (dir) => {
  const files = [];

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await pngFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(fullPath);
    }
  }

  return files;
};

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

for (const file of await pngFiles(root)) {
  const before = (await stat(file)).size;

  if (before === 0) {
    console.log(`skip empty ${path.relative(root, file)}`);
    continue;
  }

  const tmp = `${file}.opt-${process.pid}.png`;
  const palette = !(lossless || mapFile.test(path.basename(file)));

  await sharp(file, { limitInputPixels: false })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10,
      palette,
      quality,
    })
    .toFile(tmp);

  const after = (await stat(tmp)).size;
  totalBefore += before;
  totalAfter += Math.min(before, after);

  if (after >= before) {
    await unlink(tmp);
    console.log(`keep ${path.relative(root, file)} ${formatBytes(before)}`);
    continue;
  }

  if (dryRun) {
    await unlink(tmp);
  } else {
    await rename(tmp, file);
  }

  console.log(
    `${dryRun ? "would optimize" : "optimized"} ${path.relative(root, file)} ` +
      `${formatBytes(before)} -> ${formatBytes(after)}`
  );
}

console.log(
  `${dryRun ? "would save" : "saved"} ${formatBytes(totalBefore - totalAfter)}`
);
