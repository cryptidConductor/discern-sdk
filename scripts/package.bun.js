#!/usr/bin/env bun

import { $, Glob } from "bun";
import { dirname, resolve } from "node:path";
import bs58 from "bs58";
import { mkdir } from "node:fs/promises";

const root = dirname(import.meta.dir);
const outDir = resolve(root, "dist");

const pluginFolders = new Glob(`plugins/*`);
const packageFolders = new Glob(`{clients,sdk}/*`);
const outputFiles = new Glob(`dist/**`);

await mkdir(`${outDir}/packages`, { recursive: true });
await mkdir(`${outDir}/plugins`, { recursive: true });

const globOptions = { cwd: root, onlyFiles: false, absolute: true };

const plugins = new Map();

for await (const plugin of pluginFolders.scan(globOptions)) {
    await $`pnpm install -C ${plugin} --frozen-lockfile -s`;
    const definition = await Bun.file(`${plugin}/package.json`).json();
    await $`esbuild --bundle ${plugin}/${definition.main} --format=esm --platform=neutral --outdir=${plugin}/dist --sourcemap`;
    await $`cp package.json ${plugin}/dist/`;
    await $`deterministic-zip -r "${plugin}/plugin.zip" ${plugin}/dist`;
    const name = definition.name.replaceAll(/@/g, "").replaceAll(/\//g, "-");
    const target = `dist/plugins/${name}-${definition.version}.zip`;
    await $`mv ${plugin}/plugin.zip ${target}`;
    plugins.set(definition.name, {
        version: definition.version,
        path: `plugins/${name}-${definition.version}.zip`,
    });
}

for await (const pkg of packageFolders.scan(globOptions)) {
    await $`npm pack --pack-destination ${outDir}/packages ${pkg}`;
}

for await (const file of outputFiles.scan({ cwd: root, absolute: true })) {
    if (!file.endsWith(".sig") && !file.endsWith(".json")) {
        await $`rm -f ${file}.sig`;
        await $`ssh-keygen -Y sign -f ~/.ssh/files -n files@discern.chat ${file}`;
    }
}

const manifestRequest = await fetch(
    "https://files.discern.chat/live/manifest.json"
);
let manifest;
if (manifestRequest.status === 404) {
    manifest = { plugins: {} };
} else {
    manifest = await manifestRequest.json();
}

for (const [name, plugin] of plugins) {
    manifest.plugins[name] = manifest.plugins[name] ?? { versions: {} };
    manifest.plugins[name].versions = manifest.plugins[name].versions ?? {};
    manifest.plugins[name].versions[plugin.version] = { path: plugin.path };
    manifest.plugins[name].latest = plugin.version;
}

const manifestPath = resolve(outDir, "manifest.json");
await Bun.write(manifestPath, JSON.stringify(manifest, null, 4));

await $`s3cmd put -r ${outDir}/ s3://discern-files/live/`;
