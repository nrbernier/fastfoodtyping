#!/usr/bin/env bash
# Build the published site: main at the root, plus a preview of every branch
# that isn't merged into main yet at preview/<branch>/, and a list of the
# previews at preview/. Run from a full clone (fetch-depth 0) on main.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
SITE_BASE=/fastfoodtyping/

npm run build
mkdir -p dist/preview

rows=""
for ref in $(git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin); do
  branch=${ref#origin/}
  [[ "$branch" == main || "$branch" == HEAD || "$branch" == origin ]] && continue
  # Merged branches have nothing new to try.
  git merge-base --is-ancestor "$ref" origin/main && continue
  slug=$(echo "$branch" | tr -c 'A-Za-z0-9._-\n' '-')
  echo "::group::preview $branch"
  dir=$(mktemp -d)
  git worktree add --detach "$dir" "$ref" >/dev/null
  if (cd "$dir" && npm ci --prefer-offline --no-audit --no-fund >/dev/null \
      && VITE_BASE="${SITE_BASE}preview/$slug/" VITE_PREVIEW_BRANCH="$branch" npx vite build --outDir "$ROOT/dist/preview/$slug" --emptyOutDir); then
    status="ready"
  else
    status="build failed"
  fi
  git worktree remove --force "$dir"
  echo "::endgroup::"
  when=$(git log -1 --format='%cr' "$ref")
  subject=$(git log -1 --format='%s' "$ref" | sed 's/&/\&amp;/g; s/</\&lt;/g')
  if [[ "$status" == ready ]]; then
    rows+="<li><a href=\"$slug/\">$branch</a><span>$subject · $when</span></li>"
  else
    rows+="<li><b>$branch</b><span>build failed · $when</span></li>"
  fi
done

[[ -z "$rows" ]] && rows="<li><span>No branches waiting to be merged.</span></li>"
cat > dist/preview/index.html <<EOF
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Short-Order Hero previews</title>
<style>
body{margin:0;background:#3fa8a1;font:16px/1.4 system-ui,sans-serif;color:#26221e}
main{max-width:560px;margin:0 auto;padding:24px 16px}
h1{font:700 26px Georgia,serif;color:#f4e8cf;margin:0 0 4px}
p{color:#f4e8cf;margin:0 0 18px}
ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
li{background:#f4e8cf;border:2px solid #26221e;border-radius:8px;padding:12px 14px;display:grid;gap:2px}
a,b{font-weight:700;font-size:18px;color:#d63b2a;text-decoration:none}
span{color:#6f6556;font-size:14px}
.main{background:#e3a51c}
</style></head><body><main>
<h1>Short-Order Hero previews</h1>
<p>Branches not merged yet, newest first. Each keeps its own save, copied from your real game the first time.</p>
<ul><li class="main"><a href="${SITE_BASE}">main (the real game)</a></li>$rows</ul>
</main></body></html>
EOF
echo "previews:"; ls dist/preview
