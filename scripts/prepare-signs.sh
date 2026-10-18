#!/usr/bin/env bash
# Rebuilds client/public/signs/*.webp from the official DfT traffic sign image packs.
#
# Only needed if you change the sign list in content/signs.ts. The converted images are
# committed, so normal builds don't download anything.
#
# Source: https://www.gov.uk/guidance/traffic-sign-images (Crown copyright, OGL v3.0)
# Needs: curl, unzip, cwebp (apt install webp)
set -euo pipefail

cd "$(dirname "$0")/.."
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

base=https://assets.publishing.service.gov.uk/media
packs=(
  5a7ef66e40f0b62305b8445e/warning-signs-jpg.zip
  5a7e23d9e5274a2e8ab4617d/regulatory-signs-jpg.zip
  5a7b6b6240f0b6425d59306b/speed-limit-signs-jpg.zip
  5a7585b840f0b6397f35f132/motorway-signs-jpg.zip
  5a7b0b9bed915d3ed9061bf1/information-signs-jpg.zip
  5a7d7bfce5274a6b89a505a7/on-street-parking-jpg.zip
  5a74d7c8e5274a59fa715601/level-crossing-signs-jpg.zip
  5a7b15e640f0b66eab99ee0b/direction-and-tourist-signs-jpg.zip
  5a7b0d7e40f0b66a2fc04cef/road-works-and-temporary-jpg.zip
  5a74d530e5274a3cb28678bd/bus-and-cycle-signs-jpg.zip
  5a79ffee40f0b66a2fbff2ab/traffic-calming-jpg.zip
)

for p in "${packs[@]}"; do
  echo "downloading $(basename "$p")"
  curl -fsSL -o "$work/pack.zip" "$base/$p"
  unzip -qo "$work/pack.zip" -d "$work/x"
done

out=client/public/signs
mkdir -p "$out"
grep -o 'dft("[^"]*")' content/signs.ts | sed 's/dft("//; s/")//' | sort -u | while read -r stem; do
  src="$(find "$work/x" -name "$stem.jpg" | head -n1)"
  if [[ -z "$src" ]]; then
    echo "missing: $stem" >&2
    exit 1
  fi
  if ! cwebp -quiet -q 82 -resize 360 0 "$src" -o "$out/$stem.webp" 2>/dev/null; then
    # A few DfT JPGs are CMYK, which cwebp can't read. Convert to RGB first.
    python3 -c "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2])" \
      "$src" "$work/rgb.png"
    cwebp -quiet -q 82 -resize 360 0 "$work/rgb.png" -o "$out/$stem.webp"
  fi
done

echo "done: $(ls "$out" | wc -l) images in $out"
