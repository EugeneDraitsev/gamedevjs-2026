import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = path.join(rootDir, "build-itch");
const flatOutDir = path.join(rootDir, "build-itch-flat");
const zipFile = path.join(rootDir, "output", "orb-knight-itch.zip");
const layoutOptionsFile = path.join(rootDir, "src", "routes", "+layout.ts");
const shouldZip = process.argv.includes("--zip");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg"]);

const assertInsideRoot = (target) => {
  const relative = path.relative(rootDir, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside project root: ${target}`);
  }
};

const run = (command, args, env = {}, cwd = rootDir) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });

const bunRunner = process.env.npm_execpath?.toLowerCase().includes("bun")
  ? process.env.npm_execpath
  : "bun";

const stripLayoutPageOptions = async () => {
  assertInsideRoot(layoutOptionsFile);

  const original = await readFile(layoutOptionsFile, "utf8");
  const stripped = original.replace(
    /export\s+const\s+ssr\s*=\s*false\s*;?/g,
    ""
  );

  if (stripped === original) {
    return async () => undefined;
  }

  await writeFile(layoutOptionsFile, stripped);

  return async () => {
    await writeFile(layoutOptionsFile, original);
  };
};

const makeIndexPortable = async () => {
  const indexFile = path.join(outDir, "index.html");
  let html = await readFile(indexFile, "utf8");

  for (const appDir of ["_app", "app"]) {
    html = html
      .replaceAll(`"/${appDir}/`, `"./${appDir}/`)
      .replaceAll(`'/${appDir}/`, `'./${appDir}/`)
      .replaceAll(`\`/${appDir}/`, `\`./${appDir}/`);
  }

  await writeFile(indexFile, html);
};

const removeNonItchArtifacts = async () => {
  await rm(path.join(outDir, "storybook"), { force: true, recursive: true });
  await rm(path.join(outDir, "storybook.html"), { force: true });
};

const toPosixPath = (value) => value.split(path.sep).join("/");

const listFiles = async (directory, baseDirectory = directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, baseDirectory)));
    } else if (entry.isFile()) {
      files.push({
        absolutePath,
        relativePath: toPosixPath(path.relative(baseDirectory, absolutePath)),
      });
    }
  }

  return files;
};

const makeFlatName = (relativePath, usedNames) => {
  let candidate = path.posix.basename(relativePath);

  if (usedNames.has(candidate)) {
    candidate = relativePath.replaceAll("/", "__");
  }

  let uniqueName = candidate;
  let suffix = 2;

  while (usedNames.has(uniqueName)) {
    const extension = path.posix.extname(candidate);
    const stem = candidate.slice(0, -extension.length);

    uniqueName = `${stem}-${suffix}${extension}`;
    suffix += 1;
  }

  usedNames.add(uniqueName);
  return uniqueName;
};

const buildPathReferences = (sourceRelativePath, targetRelativePath) => {
  const sourceDirectory = path.posix.dirname(sourceRelativePath);
  const relativeFromSource = path.posix.relative(
    sourceDirectory,
    targetRelativePath
  );
  const normalizedRelativeFromSource = relativeFromSource.startsWith(".")
    ? relativeFromSource
    : `./${relativeFromSource}`;
  const references = new Set([
    `./${targetRelativePath}`,
    `/${targetRelativePath}`,
    normalizedRelativeFromSource,
  ]);

  if (targetRelativePath.includes("/")) {
    references.add(targetRelativePath);
  }

  if (relativeFromSource.startsWith(".")) {
    references.add(relativeFromSource);
  }

  return references;
};

const flattenItchBuild = async () => {
  await rm(flatOutDir, { force: true, recursive: true });
  await mkdir(flatOutDir, { recursive: true });

  const files = await listFiles(outDir);
  const usedNames = new Set();
  const flatNames = new Map();

  for (const file of files) {
    flatNames.set(
      file.relativePath,
      makeFlatName(file.relativePath, usedNames)
    );
  }

  for (const file of files) {
    const flatName = flatNames.get(file.relativePath);
    const targetPath = path.join(flatOutDir, flatName);

    if (!textExtensions.has(path.extname(file.relativePath))) {
      await copyFile(file.absolutePath, targetPath);
      continue;
    }

    let content = await readFile(file.absolutePath, "utf8");

    for (const [targetRelativePath, targetFlatName] of flatNames) {
      const references = buildPathReferences(
        file.relativePath,
        targetRelativePath
      );

      for (const reference of [...references].sort(
        (left, right) => right.length - left.length
      )) {
        if (!reference) {
          continue;
        }

        const replacement = reference.startsWith("/")
          ? `/${targetFlatName}`
          : `./${targetFlatName}`;

        content = content.replaceAll(reference, replacement);
      }
    }

    content = content.replaceAll('href="/favicon.ico"', 'href="./favicon.ico"');

    await writeFile(targetPath, content);
  }

  await rm(outDir, { force: true, recursive: true });
  await rename(flatOutDir, outDir);
};

const createZip = async (sourceDir, targetFile) => {
  assertInsideRoot(sourceDir);
  assertInsideRoot(targetFile);

  await mkdir(path.dirname(targetFile), { recursive: true });
  await rm(targetFile, { force: true });

  if (process.platform === "win32") {
    const command = [
      "$ErrorActionPreference = 'Stop';",
      `Compress-Archive -Path (Join-Path ${JSON.stringify(sourceDir)} '*')`,
      `-DestinationPath ${JSON.stringify(targetFile)} -Force`,
    ].join(" ");

    await run("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command,
    ]);
    return;
  }

  await run("zip", ["-qr", targetFile, "."], {}, sourceDir);
};

assertInsideRoot(outDir);
assertInsideRoot(flatOutDir);
const restoreLayoutPageOptions = await stripLayoutPageOptions();

try {
  await rm(outDir, { force: true, recursive: true });
  await rm(flatOutDir, { force: true, recursive: true });
  await run(bunRunner, ["x", "vite", "build"], {
    ITCH_BUILD: "1",
    VITE_ITCH_BUILD: "1",
  });
} finally {
  await restoreLayoutPageOptions();
}

await stat(path.join(outDir, "index.html"));
await makeIndexPortable();
await removeNonItchArtifacts();
await flattenItchBuild();

if (shouldZip) {
  await createZip(outDir, zipFile);
}

console.log("");
console.log(`Itch static build ready: ${path.relative(rootDir, outDir)}`);
if (shouldZip) {
  console.log(`Itch upload zip ready: ${path.relative(rootDir, zipFile)}`);
} else {
  console.log("Upload the contents of that folder as an HTML5 game zip.");
}
