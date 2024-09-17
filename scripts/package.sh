#!/usr/bin/env bash

set -Eeou pipefail

scripts_dir="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
repo_dir="$(dirname "$scripts_dir")"
cd "$repo_dir"

mkdir -p "dist"
out_dir="$repo_dir/dist"
export CI=true

for package in plugins/*; do
    echo "# $package"
    pushd "$package"
    pnpm install --frozen-lockfile -s
    entry="$(jq -r .main < package.json)"
    esbuild --bundle "$entry" --format=esm --platform=neutral --outdir=dist --sourcemap
    cp package.json dist/
    pushd "dist"
    deterministic-zip -r "../plugin.zip" .
    popd
    hash="$(openssl dgst -sha256 -binary "plugin.zip" | bs58)"
    version="$(jq -r .version < package.json)"
    echo "## $version"
    echo "## $hash"
    mv "plugin.zip" "$out_dir/${package##*/}-$version-$hash.zip"
    popd
done
