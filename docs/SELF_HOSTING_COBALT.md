# Self-Hosting Cobalt (Free) for MediaDrop YouTube Support

Public Cobalt instances are blocked by YouTube. Self-hosting on an IP YouTube
doesn't recognize as a datacenter scraper is the reliable fix. This guide
covers three **free** options.

MediaDrop reads two env vars (already wired in `src/lib/cobalt.functions.ts`):

- `COBALT_API_URL` — your Cobalt instance URL (e.g. `https://cobalt.yourdomain.com`)
- `COBALT_API_KEY` — optional UUID, required only if you set `API_AUTH_REQUIRED=1`

Both are set as Lovable Cloud secrets — no code changes needed.

---

## Option A (recommended): Oracle Cloud Always Free

Free **forever**: up to 4× ARM Ampere cores + 24 GB RAM.

### 1. Create the VM
1. Sign up at https://cloud.oracle.com (credit card required, not charged).
2. Compute → Instances → Create Instance.
3. Image: **Ubuntu 22.04**. Shape: **VM.Standard.A1.Flex** (ARM, 1 OCPU / 6 GB is plenty).
4. Add your SSH public key, create.
5. Networking → VCN → Security List → add ingress rules for TCP **80** and **443** from `0.0.0.0/0`.
6. SSH in: `ssh ubuntu@<public-ip>` and open the firewall:
   ```bash
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### 2. Get a free domain
Use https://www.duckdns.org (free) or a real domain. Point an A record at your VM's public IP. Example: `cobalt.yourname.duckdns.org`.

### 3. Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 4. Create `docker-compose.yml`
```bash
mkdir ~/cobalt && cd ~/cobalt
nano docker-compose.yml
```

Paste (replace `cobalt.yourname.duckdns.org` and generate a UUID with `uuidgen`):

```yaml
services:
  cobalt-api:
    image: ghcr.io/imputnet/cobalt:11
    init: true
    read_only: true
    restart: unless-stopped
    container_name: cobalt-api
    ports:
      - 9000:9000/tcp
    environment:
      API_URL: "https://cobalt.yourname.duckdns.org/"
      API_AUTH_REQUIRED: "1"
      API_KEY_URL: "file:///keys.json"
    volumes:
      - ./keys.json:/keys.json:ro

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - 80:80
      - 443:443
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  caddy_data:
```

### 5. Create `keys.json`
```bash
KEY=$(uuidgen)
echo "Your API key: $KEY"
cat > keys.json <<EOF
{
  "$KEY": { "name": "mediadrop", "limit": "unlimited" }
}
EOF
```
**Save `$KEY`** — you'll paste it into MediaDrop later.

### 6. Create `Caddyfile` (free auto-HTTPS)
```
cobalt.yourname.duckdns.org {
  reverse_proxy cobalt-api:9000
}
```

### 7. Start it
```bash
docker compose up -d
docker compose logs -f
```

Test from your laptop:
```bash
curl https://cobalt.yourname.duckdns.org/
```
Should return JSON with `cobalt` info.

### 8. Wire into MediaDrop
Below, after you confirm, I'll request the two secrets:
- `COBALT_API_URL` = `https://cobalt.yourname.duckdns.org`
- `COBALT_API_KEY` = the UUID from step 5

---

## Option B: Home server / Raspberry Pi

Truly free if you already have hardware.

1. Install Docker on the Pi/old laptop.
2. Sign up at https://www.duckdns.org, get a subdomain + token.
3. Set up DuckDNS auto-update (see their install page).
4. Forward router ports **80** and **443** to the device's LAN IP.
5. Follow steps 4–8 from Option A.

Caveat: your home IP is exposed to anyone hitting the API — keep `API_AUTH_REQUIRED=1`.

---

## Option C: Fly.io (256 MB free)

Quickest to deploy, but tight on RAM (may OOM on long videos).

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup
mkdir cobalt-fly && cd cobalt-fly
fly launch --image ghcr.io/imputnet/cobalt:11 --no-deploy
```

Edit `fly.toml`:
```toml
[env]
  API_URL = "https://your-app.fly.dev/"
  API_AUTH_REQUIRED = "1"

[[services]]
  internal_port = 9000
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

Set the API key as a secret:
```bash
fly secrets set API_KEY_URL='base64+json+inline...'
fly deploy
```

(See https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md for inline key formats.)

---

## YouTube reliability tips

- Use a **residential IP** when possible (home server > VPS).
- Add a YouTube cookies file via `COOKIE_PATH` env var on the Cobalt container.
- If blocked, set `YOUTUBE_HLS=1` to use HLS streams.
- Reference: https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md

---

## Verify it works

After setting the secrets in MediaDrop, paste a YouTube URL on the home page. If you see the file appear, you're done. If you get an error, check `docker compose logs cobalt-api`.
