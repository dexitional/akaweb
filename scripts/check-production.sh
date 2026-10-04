#!/usr/bin/env bash
# Diagnoses missing styles/images on the production server. Run it ON the
# server, from the repo root:
#
#   bash scripts/check-production.sh https://akatsico.edu.gh
#
# It compares what the app serves directly (127.0.0.1:$PORT) with what
# visitors get through the public URL, which pinpoints the failing layer:
# the build, the Node app, sharp (images), or the web server in front.
set -u
PUBLIC="${1:-}"; PUBLIC="${PUBLIC%/}"
PORT="${PORT:-3000}"
APP="http://127.0.0.1:${PORT}"
WEB="$(cd "$(dirname "$0")/.." && pwd)/apps/web"
ok()   { printf '  \033[32m✔\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✘\033[0m %s\n' "$*"; FAIL=1; }
info() { printf '    %s\n' "$*"; }
FAIL=0
status() { curl -s -o /dev/null -w '%{http_code} %{content_type}' "$@"; }

echo "1. Build output ($WEB/.output)"
if [ -f "$WEB/.output/server/index.mjs" ]; then ok "server bundle present"; else bad "no .output/server/index.mjs — run: npm run build"; fi
CSS_FILES=$(ls "$WEB/.output/public/assets/"*.css 2>/dev/null | wc -l | tr -d ' ')
if [ "$CSS_FILES" -gt 0 ]; then ok "$CSS_FILES stylesheet(s) in .output/public/assets"; else bad "no CSS in .output/public/assets — the build is incomplete, or only .output/server was copied"; fi

echo "2. Node app on $APP"
HTML=$(curl -s --max-time 10 "$APP/")
if [ -z "$HTML" ]; then
  bad "nothing answers on $APP — check: pm2 status / pm2 logs akaweb"
else
  ok "home page responds"
  CSS=$(printf '%s' "$HTML" | grep -o '/assets/[^"]*\.css' | head -1)
  JS=$(printf '%s' "$HTML" | grep -o '/assets/[^"]*\.js' | head -1)
  info "page asks for: ${CSS:-<no css link found>}"
  for A in $CSS $JS; do
    S=$(status "$APP$A"); case "$S" in 200*) ok "$A → $S";; *) bad "$A → $S (the app can't serve its own assets)";; esac
  done
  S=$(status -H 'Accept: image/avif,image/webp,*/*' "$APP/img?src=%2Flogo-sm.webp&w=64&q=75")
  case "$S" in 200\ image/*) ok "image optimiser /img → $S";; *) bad "image optimiser /img → $S (see step 4)";; esac
fi

echo "3. Through the public URL ${PUBLIC:-<not given>}"
if [ -z "$PUBLIC" ]; then
  info "skipped — pass your site URL, e.g. bash scripts/check-production.sh https://akatsico.edu.gh"
else
  PATH_PART=$(printf '%s' "$PUBLIC" | sed -E 's#^https?://[^/]+##')
  if [ -n "$PATH_PART" ]; then
    bad "the site is under a sub-path ($PATH_PART). The app is built for the domain root: /assets and /img are requested at the root, not under $PATH_PART. Serve it at the root of a (sub)domain instead."
  fi
  for A in ${CSS:-} ${JS:-} "/logo-sm.webp" "/img?src=%2Flogo-sm.webp&w=64&q=75"; do
    S=$(status -H 'Accept: image/avif,image/webp,*/*' "$PUBLIC$A")
    case "$S" in
      200\ text/html*) bad "$A → $S (got an HTML page instead of the file — the web server isn't passing it to the app)";;
      200*) ok "$A → $S";;
      *) bad "$A → $S (works on the app directly but not publicly → web server config; see step 5)";;
    esac
  done
fi

echo "4. sharp (image optimiser)"
if (cd "$WEB/.output/server" 2>/dev/null && node -e "import('sharp').then(s=>{console.log(s.default.versions.sharp)}).catch(e=>{console.error(e.message.split('\n')[0]);process.exit(1)})") >/tmp/.sharp-check 2>&1; then
  ok "sharp $(cat /tmp/.sharp-check) loads on $(uname -sm)"
else
  bad "sharp doesn't load: $(head -1 /tmp/.sharp-check)"
  info "Usually node_modules or .output was copied from a Mac. Build ON the server: rm -rf node_modules && npm ci --include=dev && npm run build"
fi
rm -f /tmp/.sharp-check

echo "5. Web server in front"
for CONF in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [ -f "$CONF" ] || continue
  grep -q "$PORT" "$CONF" 2>/dev/null || continue
  info "$CONF proxies to port $PORT"
  if grep -nE 'location\s+~\*?\s+.*\\\.\(?(css|js|png|jpe?g|webp|svg|ico)' "$CONF" >/dev/null; then
    bad "it has a static-file location (css/js/images) — those requests never reach the app:"
    grep -nE 'location\s+~\*?\s+.*\\\.\(?(css|js|png|jpe?g|webp|svg|ico)' "$CONF" | sed 's/^/      /'
  fi
  if grep -nE '^\s*(root|alias)\s+/var/www/html' "$CONF" >/dev/null && grep -q 'try_files' "$CONF"; then
    bad "it uses root /var/www/html + try_files — files are looked up on disk, not in the app"
  fi
done
command -v apache2 >/dev/null 2>&1 && systemctl is-active --quiet apache2 2>/dev/null && info "Apache is running too — make sure it isn't the one answering on 80/443"

echo "6. Recent app errors"
pm2 logs akaweb --err --lines 15 --nostream 2>/dev/null | tail -15 | sed 's/^/    /' || info "pm2 not available to this user"

echo
[ "$FAIL" = 0 ] && echo "No problems found." || echo "Fix the ✘ items above (top to bottom), then reload: pm2 reload akaweb --update-env"
