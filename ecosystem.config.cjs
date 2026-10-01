// PM2 production config for akaweb (Akatsi College of Education website + CMS).
//
// First time, on your machine (needs SSH access to the server):
//   pm2 deploy ecosystem.config.cjs production setup     # clones the repo on the server
//   scp apps/web/.env.production akaweb@SERVER:/var/www/akaweb/shared/.env
//   pm2 deploy ecosystem.config.cjs production           # build + start
//
// Every release after that:
//   pm2 deploy ecosystem.config.cjs production
//
// On the server:
//   pm2 status | pm2 logs akaweb | pm2 reload akaweb --update-env
//   pm2 startup && pm2 save                               # start on boot (once)
//   pm2 install pm2-logrotate                             # keep logs bounded (once)
//
// Layout created on the server by `pm2 deploy`:
//   /var/www/akaweb/current            the live release (git checkout)
//   /var/www/akaweb/shared/.env        secrets, linked into apps/web/.env
//   /var/www/akaweb/shared/image-cache optimised image variants (IMAGE_CACHE_DIR), kept across releases
//   /var/www/akaweb/shared/logs        PM2 logs
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

const ROOT = "/var/www/akaweb";
const SHARED = `${ROOT}/shared`;
const APP_DIR = path.join(__dirname, "apps/web");

// Nitro's production server doesn't read .env itself, so load it here. This
// works the same in fork and cluster mode. After editing .env on the server,
// run `pm2 reload akaweb --update-env`.
function readEnv(file) {
  try {
    return parseEnv(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

module.exports = {
  apps: [
    {
      name: "akaweb",
      cwd: APP_DIR,
      script: ".output/server/index.mjs",

      // Two workers share port 3000: `pm2 reload` restarts them one at a time,
      // so deploys have no downtime. Raise this on a bigger server.
      exec_mode: "cluster",
      instances: 2,

      env: {
        ...readEnv(path.join(APP_DIR, ".env")),
        NODE_ENV: "production",
        HOST: "127.0.0.1", // nginx (or another proxy) faces the internet
        PORT: "3000",
        // Outside the release folder, so cached images survive every deploy.
        IMAGE_CACHE_DIR: `${SHARED}/image-cache`,
        // Images encoded at once, per worker (2 workers × 2 = 4 cores busy at most).
        IMAGE_CONCURRENCY: "2",
      },

      // Each worker holds a 64 MB in-memory image cache plus sharp's buffers.
      max_memory_restart: "1G",
      kill_timeout: 10_000, // let in-flight requests (image encodes) finish
      listen_timeout: 15_000,
      exp_backoff_restart_delay: 200, // back off instead of crash-looping (e.g. DB down)
      max_restarts: 20,

      out_file: `${SHARED}/logs/akaweb.out.log`,
      error_file: `${SHARED}/logs/akaweb.error.log`,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: false,
    },
  ],

  deploy: {
    production: {
      user: "akaweb", // the account the app runs as; it owns /var/www/akaweb
      host: ["YOUR_SERVER_IP"],
      ref: "origin/master",
      repo: "https://github.com/dexitional/akaweb.git", // use git@github.com:… if the repo is private
      path: ROOT,
      ssh_options: "StrictHostKeyChecking=accept-new",

      "pre-setup": `mkdir -p ${SHARED}/image-cache ${SHARED}/logs`,

      // Runs in /var/www/akaweb/current after each pull.
      "post-deploy": [
        `ln -sfn ${SHARED}/.env apps/web/.env`,
        "npm ci --include=dev", // the build needs Vite and the other devDependencies
        // Load .env for the build (VITE_* values are baked in) and migrations.
        `set -a && . ${SHARED}/.env && set +a`,
        "npm run build",
        "npm run db:migrate",
        "pm2 reload ecosystem.config.cjs --update-env",
        "pm2 save",
      ].join(" && "),
    },
  },
};
