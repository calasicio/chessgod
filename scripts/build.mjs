import * as esbuild from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const watch = process.argv.includes("--watch");

const EXTENSIONS = [".ts", ".tsx", "/index.ts", ".js"];

const aliasPlugin = {
  name: "alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const basePath = path.join(process.cwd(), "src", args.path.slice(2));

      for (const ext of EXTENSIONS) {
        const candidate = basePath + ext;
        if (existsSync(candidate)) {
          return { path: candidate };
        }
      }

      return {
        path: basePath,
        errors: [
          { text: `Alias resolution failed: no file found for "${args.path}"` },
        ],
      };
    });
  },
};

const entryPoints = {
  "background/index": "src/background/index.ts",
  "content-scripts/injector": "src/content-scripts/injector.ts",
};

const buildOptions = {
  entryPoints,
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "firefox115",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  logLevel: "info",
  plugins: [aliasPlugin],
};

async function copyStatic() {
  await mkdir("dist", { recursive: true });
  await cp("public", "dist", { recursive: true });
  await cp("src/vendor", "dist/vendor", { recursive: true });
}

await copyStatic();

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete.");
}
