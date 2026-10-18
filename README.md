# UK Driving Theory Hub

A self-hosted app for practising the Great Britain car theory test (category B). Run it on your own computer with Node, as a single Docker container, or on a home k3s cluster like I do. Everything is kept in one SQLite file, and there's no account or cloud service involved.

![Dashboard](docs/screenshots/dashboard.webp)

What's in it:

- **Learn**: 14 topics, 43 lessons with diagrams, real UK road signs, quick checks and a 10-question quiz per topic. Rules that differ between England, Scotland and Wales are called out (the 20 mph default in Wales, Scotland's lower drink-drive limit and pavement parking ban).
- **Practice questions**: 233 original questions. Pick a topic and 10, 20, 30 or 50 questions. Answers are shuffled, and you get the explanation and Highway Code link straight after each one. Every answer is saved as you go.
- **Mock tests**: 50 questions, 57 minutes, pass mark 43, the same as the real test. Flag questions, change answers, question grid, auto-submit when time runs out, then a full review with a topic breakdown.
- **Hazard perception**: 10 animated practice clips (11 developing hazards, one clip has two) scored 5 to 1 like the real thing, including the zero score for pattern clicking. Licensed MP4 clips can be added later.
- **Road signs**: 175 official DfT sign images plus road markings, searchable, with flashcards that track which ones you didn't know.
- **Progress**: streak, daily activity, accuracy over time, mock history, weak and strong topics, and an estimated readiness score.
- Bookmarks, a "review my mistakes" mode, light and dark themes, and backup, restore and import in Settings.

<p>
  <img src="docs/screenshots/lesson.webp" width="49%" alt="A lesson in dark mode" />
  <img src="docs/screenshots/hazard.webp" width="49%" alt="Hazard perception clip" />
</p>

## Before you rely on it

- It's an independent practice tool. It isn't made or endorsed by DVSA, and none of the questions are official DVSA revision questions. They're original, written from the [Highway Code](https://www.gov.uk/guidance/the-highway-code) and GOV.UK guidance, and each one links to its source.
- The hazard clips are animations drawn by the app, not filmed footage. They're good for practising timing and scanning, but real clips look very different, so use the official practice clips too.
- The test format was checked against GOV.UK on **18 October 2026**: 50 questions in 57 minutes with 43 to pass, three of them about a short silent video, and hazard perception with 14 clips, 15 hazards, 75 points and 44 to pass ([theory test](https://www.gov.uk/theory-test), [pass marks](https://www.gov.uk/theory-test/pass-mark-and-result)). The Highway Code content matches the version last updated on GOV.UK on 22 October 2025. Every question stores the date it was last verified.
- Northern Ireland has its own test and isn't covered.

## Install and run it on your computer

This is the quickest way to use it if you've cloned the repo. It works on Linux, macOS and Windows (WSL or native).

### What you need

- **Node.js 20.19 or newer.** Node 22 LTS is what the Docker image uses. Check with `node -v`. If you don't have it, get it from [nodejs.org](https://nodejs.org/) or a version manager like `nvm`.
- **git**, to clone the repo.
- Usually nothing else. The SQLite driver (`better-sqlite3`) downloads a prebuilt binary for your platform. If there isn't one for your OS and Node version, npm compiles it instead, and that needs build tools: `sudo apt install python3 make g++` on Debian/Ubuntu, or `xcode-select --install` on macOS.

### Step by step

1. **Clone the repo and go into it**

   ```bash
   git clone https://github.com/victor-trapp/driving-test.git
   cd driving-test
   ```

2. **Install the dependencies**

   ```bash
   npm ci
   ```

   `npm ci` installs the exact versions in `package-lock.json`, so you get what was tested. It takes a minute or two the first time.

3. **(Optional) Create a settings file**

   ```bash
   cp .env.example .env
   ```

   You only need this if you want to change something, like the port. Every setting has a default, and they're listed [below](#settings).

4. **Start the app**

   ```bash
   npm run dev
   ```

   This starts the API on port 3000 and the web app on port 5173, with hot reload if you're editing the code. Leave the terminal open.

5. **Open http://localhost:5173** in your browser. The first screen asks for your name and whether you mostly drive in England, Scotland or Wales, then you're in.

6. **Stop it** with `Ctrl+C` in the terminal. Your progress is saved in `./data/theory.db` as you go, so next time you run `npm run dev` it's all still there.

The database, migrations, questions, lessons and clips are all set up automatically on first start. There's nothing to seed by hand.

### Running it day to day

`npm run dev` is fine for personal use, but if you're not changing the code, a production build is lighter and runs as a single process:

```bash
npm run build
npm start
```

Then open **http://localhost:3000**. `npm run build` puts the web app in `dist/client` and bundles the server into `dist/server`. Run `npm run build` again after pulling updates.

### Updating to a newer version

```bash
git pull
npm ci
npm run build   # only if you use npm start
```

Database migrations run automatically on the next start, and your progress is kept. Take a backup first (Settings → Download backup) if the release notes mention schema changes.

### Using it from your phone (optional)

By default the app only listens on `127.0.0.1`, so nothing else on your network can reach it. To use it from a phone on the same Wi-Fi:

1. In `.env`, set `HOST=0.0.0.0` and an admin token, e.g. `ADMIN_TOKEN=` followed by the output of `openssl rand -hex 16`.
2. Restart the app.
3. Find your computer's local IP: `ip -4 addr` on Linux, `ipconfig getifaddr en0` on macOS, `ipconfig` on Windows.
4. On the phone, open `http://<that-ip>:5173` with `npm run dev`, or `http://<that-ip>:3000` with `npm start`. If it doesn't load, your firewall is probably blocking the port.

Read [Security](#security) before doing this on a network you don't control.

### If something goes wrong

- **`npm ci` fails while building `better-sqlite3`**: there was no prebuilt binary for your setup. Install the build tools listed above, or switch to Node 22 LTS, which always has one.
- **`EADDRINUSE` / port already in use**: something else has port 3000. Set `PORT=3001` (or any free port) in `.env`. The web app's dev proxy follows it. If 5173 is taken, Vite picks the next free port and prints it.
- **"This server doesn't answer to ..."**: you opened it by a hostname rather than `localhost` or an IP address. Add that name to `ALLOWED_HOSTS` in `.env` (see [Security](#security) for why).
- **Start over from scratch**: stop the app and delete the `data/` folder. This permanently deletes all your progress, so download a backup from Settings first if you might want it.

### Extra commands

```bash
npm run db:migrate         # apply migrations
npm run db:seed            # migrate and load the built-in content
npm run content:check      # sanity check the content (add -- --links to check every URL)
npm run typecheck          # TypeScript checks for the client and server
npm test                   # unit and API tests
```

### Settings

Settings are environment variables, all optional. Put them in `.env` for local runs (variables already set in your shell win), or in the ConfigMap on Kubernetes.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `127.0.0.1` | Bind address. `127.0.0.1` keeps it on this machine. `0.0.0.0` makes it reachable from your network. The Docker image sets `0.0.0.0`, because inside a container that's the only way in |
| `DATA_DIR` | `./data` | Where `theory.db` and `media/` live |
| `APP_TIMEZONE` | `Europe/London` | Used for "today" and streaks. Must be a real IANA zone or the app won't start |
| `ADMIN_TOKEN` | not set | If set, backup, import and reset need it |
| `ALLOWED_HOSTS` | not set | Extra hostnames the app answers to, comma-separated. `localhost` and IP addresses always work. A leading dot allows subdomains, e.g. `.home.arpa` |
| `LOG_REQUESTS` | `true` | One log line per API request |

## Docker

```bash
docker build --build-arg APP_VERSION=1.0.0 -t driving-theory:1.0.0 .
docker run -d --name driving-theory -p 127.0.0.1:3000:3000 -v driving-theory-data:/data driving-theory:1.0.0
```

Then open http://localhost:3000. The `127.0.0.1:` in `-p` matters: plain `-p 3000:3000` publishes the port on every network interface, and Docker's port publishing goes around host firewalls like `ufw`. Use `-p 3000:3000` only if you want other devices to reach it, and set `-e ADMIN_TOKEN=...` when you do.

The image is `node:22-bookworm-slim` with only the production dependencies. It runs as uid 1000, works with a read-only root filesystem (`--read-only --tmpfs /tmp`), handles SIGTERM (closes SQLite cleanly, usually in under a second), and has a `HEALTHCHECK` on `/healthz`. The database lives on the `/data` volume, so recreating the container doesn't lose anything.

## Kubernetes (k3s)

The manifests in `k8s/` create a namespace, ConfigMap, PVC (k3s `local-path`), a single-replica Deployment, a NodePort Service and a NetworkPolicy. A few choices worth knowing about:

- **One replica, `Recreate` strategy.** SQLite has one writer and the volume is ReadWriteOnce, so the old pod is stopped before the new one starts. Upgrades have a few seconds of downtime, which is fine for this.
- **Locked down pod**: non-root, read-only root filesystem (with an `emptyDir` on `/tmp`), all capabilities dropped, `RuntimeDefault` seccomp, no service account token, no service links. The namespace enforces the `restricted` Pod Security level.
- **NetworkPolicy**: ingress on the app port only, and no egress at all, because the app never makes outbound connections. k3s enforces this out of the box. If you add something that needs outbound access, this is the file to change.
- **Probes**: startup and readiness on `/readyz` (checks the database), liveness on `/healthz`.
- **`ALLOWED_HOSTS`** in the ConfigMap lists hostnames the app answers to. NodePort access by IP and `kubectl port-forward` work without it. It's set to `theory.home.arpa` to match the optional Ingress, so change it if you use a different name.
- **NodePort 30081.** I'd normally use 30080, but `lab-calc-web` already has it on my k3s-lab cluster. Change `k8s/40-service.yaml` if you want something else.

### 1. Build the image and get it onto the node

There's no public registry involved. Build with Docker, then load the image straight into k3s's containerd:

```bash
docker build --build-arg APP_VERSION=1.0.0 -t driving-theory:1.0.0 .
docker save driving-theory:1.0.0 | sudo k3s ctr images import -
sudo k3s ctr images ls | grep driving-theory
```

The Deployment uses `imagePullPolicy: IfNotPresent`, so it uses that local copy and never tries Docker Hub.

If you can't use `sudo` on the node, a throwaway registry on localhost works too. containerd allows plain HTTP for `localhost`, so no registry config is needed:

```bash
docker run -d --name theory-registry -p 127.0.0.1:5000:5000 registry:2
docker tag driving-theory:1.0.0 localhost:5000/driving-theory:1.0.0
docker push localhost:5000/driving-theory:1.0.0
# after applying the manifests:
kubectl -n driving-theory set image deploy/driving-theory app=localhost:5000/driving-theory:1.0.0
```

This only works when the registry runs on the same machine as the k3s node, because `localhost` is resolved by the node.

### 2. Deploy

```bash
kubectl apply -f k8s/
kubectl -n driving-theory rollout status deploy/driving-theory
kubectl get pods -n driving-theory
kubectl get svc -n driving-theory
```

Files are numbered so the namespace is created first. The optional Ingress in `k8s/optional/` isn't applied by that command.

### 3. Open it

From anything on the home network, including phones on the Wi-Fi, use the node's LAN IP and the NodePort:

```
http://<node-ip>:30081
```

On my setup that's **http://192.168.0.55:30081**. To find the node IP:

```bash
kubectl get nodes -o wide        # INTERNAL-IP column
```

`localhost:30081` only works on the node itself. On another machine, `localhost` means that machine, not the cluster.

If you'd rather not use the NodePort, port-forward from your laptop instead:

```bash
kubectl -n driving-theory port-forward svc/driving-theory 8080:80
# then open http://localhost:8080
```

For a hostname instead of a port, there's an Ingress for `theory.home.arpa` in `k8s/optional/ingress.yaml`. `home.arpa` is reserved for home networks, so add it to your router's DNS or `/etc/hosts`.

### Checking on it

```bash
kubectl -n driving-theory logs deploy/driving-theory -f
kubectl -n driving-theory describe pod -l app.kubernetes.io/name=driving-theory
```

In k9s: `:ns` → `driving-theory`, then `l` on the pod for logs.

## Security

There's no login. It's a single-person app for your own computer or home network, so anyone who can reach the port can use it. With the defaults, that's only you.

**What's in place:**

- **Local only by default.** `npm run dev` and `npm start` listen on `127.0.0.1`, so other devices can't connect until you set `HOST=0.0.0.0`. The Docker command above publishes on `127.0.0.1` too.
- **DNS rebinding protection.** Being on localhost doesn't stop a website you visit from trying to talk to the app through your browser: it can point its own domain at `127.0.0.1` and read the API as if it were same-origin. The app only answers to `localhost`, IP addresses and the names in `ALLOWED_HOSTS`, which shuts that down.
- **Cross-site request protection.** Changes (answers, resets, imports) sent from another website's page are refused by checking the `Origin` header, so a page can't submit forms to the app behind your back.
- **Optional admin token** for backup, import and reset, compared in constant time.
- **Strict Content Security Policy.** Nothing is loaded from external sites (fonts, signs and scripts are all bundled), and the only outbound links go to GOV.UK.
- **Input limits.** Every API request is validated, bodies are capped at 100 kB (10 MB for question packs), and imported links and file names are restricted to plain `http(s)` URLs and safe characters.
- **Locked down container and pod**, described under Docker and Kubernetes above.

**If you make it reachable from your network** (`HOST=0.0.0.0`, `docker run -p 3000:3000` or the k3s NodePort):

- Set `ADMIN_TOKEN`, so only you can back up, import or reset. The app warns on startup if you don't. On Kubernetes:

  ```bash
  kubectl -n driving-theory create secret generic driving-theory-admin --from-literal=token="$(openssl rand -hex 16)"
  kubectl -n driving-theory rollout restart deploy/driving-theory
  kubectl -n driving-theory get secret driving-theory-admin -o jsonpath='{.data.token}' | base64 -d; echo
  ```

  Then paste the token in Settings → Data. The token only guards those three actions. Anyone on the network can still answer questions and see progress.
- **Don't port-forward it on your router** (3000, 5173, 30081, or 80/443 with the Ingress). There's no HTTPS, so the token and your data would cross the internet in plain text. NodePorts listen on every node interface, so router port forwarding is the main way this ends up public.
- Check your router doesn't have UPnP opening ports automatically.
- For access away from home, use a VPN like Tailscale or WireGuard rather than opening ports. If you open it by a MagicDNS name, add that name to `ALLOWED_HOSTS`.

## Upgrading

Use a new image tag for every build. With `IfNotPresent`, reusing a tag means the node keeps running the old image it already has.

```bash
git pull
docker build --build-arg APP_VERSION=1.0.1 -t driving-theory:1.0.1 .
docker save driving-theory:1.0.1 | sudo k3s ctr images import -
kubectl -n driving-theory set image deploy/driving-theory app=driving-theory:1.0.1
kubectl -n driving-theory rollout status deploy/driving-theory
```

Then update the tag in `k8s/30-deployment.yaml` so the manifest matches what's running. If the release changed anything else in `k8s/` (this one adds `50-networkpolicy.yaml` and `ALLOWED_HOSTS`), apply that too with `kubectl apply -f k8s/` once the tag is updated. Database migrations run automatically on start, and the built-in questions are updated in place. Questions removed from the code are deactivated rather than deleted, so your history stays intact. Take a backup first if the release notes mention schema changes.

## Backup and restore

**Backup from the app**: Settings → Download backup. It's a consistent copy taken while the app is running.

**Backup from the command line:**

```bash
POD=$(kubectl -n driving-theory get pod -l app.kubernetes.io/name=driving-theory -o jsonpath='{.items[0].metadata.name}')
kubectl -n driving-theory exec $POD -- node dist/server/cli.js backup /tmp/theory-backup.db
kubectl cp driving-theory/$POD:/tmp/theory-backup.db ./theory-backup-$(date +%F).db
```

**Restore**: copy the backup in as `restore.db` and restart. On start, the app checks it's a complete, uncorrupted SQLite file (a half-copied file is renamed to `restore.db.rejected` and your current data is left alone), moves the current database aside as `theory.db.before-restore-<timestamp>` and swaps the backup in.

```bash
kubectl cp ./theory-backup-2026-10-18.db driving-theory/$POD:/data/restore.db
kubectl -n driving-theory rollout restart deploy/driving-theory
kubectl -n driving-theory logs deploy/driving-theory | head -3   # "restored database from restore.db..."
```

With plain Docker it's the same idea: `docker cp backup.db driving-theory:/data/restore.db && docker restart driving-theory`. Running locally with Node, stop the app, copy the backup to `data/restore.db` and start it again.

The PVC uses `local-path`, so the data physically sits under `/var/lib/rancher/k3s/storage/` on the node. It survives pod restarts and redeploys, but **deleting the PVC or the namespace deletes the data** (the reclaim policy is `Delete`). Back up before `kubectl delete -f k8s/`.

## Adding licensed questions or hazard clips

See [docs/import-format.md](docs/import-format.md). In short: question packs are a JSON file you import from Settings or the CLI, and MP4 clips go on the data volume under `media/` with a small JSON file describing their scoring windows.

## How the readiness score works

It's an estimate to help decide what to do next, not an assessment.

```
readiness = 25% coverage + 35% recent accuracy + 40% mock tests
```

- **Coverage**: half from lessons completed, half from how many different questions you've answered per topic (the target is half of each topic's bank).
- **Recent accuracy**: correct rate over your last 100 practice answers, scaled down until you have 20, so a lucky 5 out of 5 doesn't count as 100%.
- **Mock tests**: average of your last 3 mock scores.

It's in `shared/readiness.ts` with tests in `tests/readiness.test.ts`.

## Tests

```bash
npm run typecheck
npm test
```

78 tests cover question selection (including lopsided question banks), answer and mock scoring, pass/fail at 43, the 57-minute timer and auto-submit, practice sessions surviving a restart, hazard scoring and pattern detection, imports and their validation, backup and restore (including refusing a truncated backup), the DNS rebinding and cross-site request guards, request size limits, and the main API flows against a real SQLite file.

## Project layout

```
client/            React app (Vite, Tailwind, shadcn-style components, Recharts)
  src/pages/       one file per screen
  src/hazard/      canvas renderer and player for the animated clips
  src/illustrations/  SVG diagrams used in lessons
server/src/        Express API, Drizzle schema, migrations, seeding, CLI
server/drizzle/    SQL migrations (generated with npm run db:generate)
shared/            exam rules, scoring, selection and readiness, used by both sides
content/           topics, lessons, questions, signs and hazard clips
k8s/               Kubernetes manifests
tests/             Vitest unit and API tests
scripts/           build, content checks and the sign image converter
```

## Credits and licences

- Traffic sign images are Crown copyright, from the [Department for Transport](https://www.gov.uk/guidance/traffic-sign-images), used under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). `scripts/prepare-signs.sh` rebuilds them from the official downloads.
- Highway Code rules are summarised from and linked to GOV.UK, Crown copyright, under the Open Government Licence v3.0.
- Questions, lessons, road marking drawings, illustrations and hazard clip animations are original to this project.
- UI font is [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/) (SIL Open Font License), bundled locally.
