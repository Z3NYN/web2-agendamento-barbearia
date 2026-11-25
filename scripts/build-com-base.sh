#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Uso: $0 /caminho/do/app.jar [caminho/do/novo.jar]" >&2
  exit 2
fi
base="$(realpath "$1")"
cd "$(dirname "$0")/.."
saida="$(realpath -m "${2:-target/app-v3.jar}")"
if [ "$saida" = "$base" ]; then echo "Escolha outro caminho de saída." >&2; exit 2; fi
trabalho="$(mktemp -d)"
trap 'rm -rf "$trabalho"' EXIT
mkdir -p "$trabalho/BOOT-INF/classes/static" target
unzip -q "$base" 'BOOT-INF/lib/*.jar' -d "$trabalho"
classpath="$(find "$trabalho/BOOT-INF/lib" -name "*.jar" -printf "%p:" | sed "s/:$//")"
find src/main/java -name '*.java' | sort > "$trabalho/fontes"
java -m jdk.compiler/com.sun.tools.javac.Main -source 21 -target 21 -parameters -encoding UTF-8 -cp "$classpath" \
  -d "$trabalho/BOOT-INF/classes" @"$trabalho/fontes"
cp -a src/main/resources/. "$trabalho/BOOT-INF/classes/"
cp -a src/main/frontend/dist/. "$trabalho/BOOT-INF/classes/static/"
mkdir -p "$(dirname "$saida")" "$trabalho/META-INF"
cp "$base" "$saida"
zip -qd "$saida" 'BOOT-INF/classes/*'
unzip -p "$base" META-INF/MANIFEST.MF | sed 's/^Implementation-Version: 1\.0\.0/Implementation-Version: 3.0.0/' > "$trabalho/META-INF/MANIFEST.MF"
(cd "$trabalho" && zip -qr "$saida" BOOT-INF/classes META-INF/MANIFEST.MF)
