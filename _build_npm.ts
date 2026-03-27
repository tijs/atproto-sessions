import { build, emptyDir } from "jsr:@deno/dnt@0.42.3";

const denoJson = JSON.parse(Deno.readTextFileSync("./deno.json"));

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {},
  test: false,
  filterDiagnostic(diagnostic) {
    const fileName = diagnostic.file?.fileName;
    if (fileName && fileName.includes("@std/assert")) return false;
    return true;
  },
  compilerOptions: {
    lib: ["ES2022", "DOM"],
  },
  importMap: "./deno.json",
  package: {
    name: "@tijs/atproto-sessions",
    version: denoJson.version,
    description:
      "Framework-agnostic session management for AT Protocol applications using encrypted cookies.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/tijs/atproto-sessions.git",
    },
    keywords: [
      "atproto",
      "bluesky",
      "oauth",
      "sessions",
      "iron-session",
      "cookies",
    ],
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
