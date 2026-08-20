param(
  [string]$HostName = "5.42.111.42",
  [string]$Domain = "eternaltime.shop",
  [string]$SshKey = "$env:USERPROFILE\.ssh\eternal_time_deploy",
  [string]$RemoteAppDir = "/opt/eternal-time",
  [string]$RemoteUser = "root",
  [switch]$SkipLocalChecks
)

$ErrorActionPreference = "Stop"

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found."
  }
}

function Invoke-CheckedNative($FilePath, [string[]]$Arguments) {
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "tar"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envLocalPath = Join-Path $repoRoot ".env.local"
if (-not (Test-Path $envLocalPath)) {
  throw ".env.local is required locally so production env can be prepared without printing secrets."
}
if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

if (-not $SkipLocalChecks) {
  Push-Location $repoRoot
  try {
    Invoke-CheckedNative "npm" @("run", "lint")
    Invoke-CheckedNative "npm" @("run", "typecheck")
    Invoke-CheckedNative "npm" @("test")
    Invoke-CheckedNative "npm" @("run", "build")
    Invoke-CheckedNative "npm" @("run", "secrets:scan")
    Invoke-CheckedNative "git" @("diff", "--check")
  } finally {
    Pop-Location
  }
}

$deployDir = Join-Path $repoRoot ".tmp\deploy-production"
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null
$releaseId = Get-Date -Format "yyyyMMddHHmmss"
$archivePath = Join-Path $deployDir "eternal-time-$releaseId.tar.gz"
$assetArchivePath = Join-Path $deployDir "catalog-image-assets-$releaseId.tar.gz"
$envProductionPath = Join-Path $deployDir ".env.production"
$remoteArchive = "/tmp/eternal-time-$releaseId.tar.gz"
$remoteAssetArchive = "/tmp/catalog-image-assets-$releaseId.tar.gz"
$remoteEnv = "/tmp/eternal-time-$releaseId.env"
$remoteScript = "/tmp/eternal-time-$releaseId-deploy.sh"

$requiredEnvKeys = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "CATALOG_READ_SOURCE",
  "CDEK_CLIENT_ID",
  "CDEK_CLIENT_SECRET",
  "CDEK_ORIGIN_CITY_CODE",
  "CDEK_PICKUP_TARIFF_CODE",
  "CDEK_COURIER_TARIFF_CODE",
  "CDEK_WIDGET_YANDEX_MAPS_API_KEY",
  "CDEK_WEBHOOK_TOKEN"
)

$envLines = Get-Content -LiteralPath $envLocalPath
$envMap = @{}
foreach ($line in $envLines) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $envMap[$Matches[1]] = $Matches[2]
  }
}

$missingRequired = @($requiredEnvKeys | Where-Object { -not $envMap.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($envMap[$_]) })
if ($missingRequired.Count -gt 0) {
  throw "Missing required production env keys: $($missingRequired -join ', ')"
}

if (-not $envMap.ContainsKey("YOOKASSA_SHOP_ID") -or -not $envMap.ContainsKey("YOOKASSA_SECRET_KEY")) {
  Write-Warning "YooKassa credentials are not present. Checkout payment creation must remain fail-closed until they are added on the server."
}

$safeLines = New-Object System.Collections.Generic.List[string]
$seenKeys = New-Object System.Collections.Generic.HashSet[string]
foreach ($line in $envLines) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $key = $Matches[1]
    if ($key -eq "NEXT_PUBLIC_APP_URL") {
      $safeLines.Add("NEXT_PUBLIC_APP_URL=https://$Domain")
    } elseif ($key -eq "CATALOG_READ_SOURCE") {
      $safeLines.Add("CATALOG_READ_SOURCE=database")
    } elseif ($key -eq "CATALOG_IMAGE_ASSET_ROOT") {
      $safeLines.Add("CATALOG_IMAGE_ASSET_ROOT=$RemoteAppDir/shared/catalog-image-assets")
    } elseif ($key -ne "NODE_ENV") {
      $safeLines.Add($line)
    }
    [void]$seenKeys.Add($key)
  } elseif (-not [string]::IsNullOrWhiteSpace($line)) {
    $safeLines.Add($line)
  }
}
if (-not $seenKeys.Contains("NEXT_PUBLIC_APP_URL")) {
  $safeLines.Add("NEXT_PUBLIC_APP_URL=https://$Domain")
}
if (-not $seenKeys.Contains("CATALOG_READ_SOURCE")) {
  $safeLines.Add("CATALOG_READ_SOURCE=database")
}
if (-not $seenKeys.Contains("CATALOG_IMAGE_ASSET_ROOT")) {
  $safeLines.Add("CATALOG_IMAGE_ASSET_ROOT=$RemoteAppDir/shared/catalog-image-assets")
}
$safeLines.Add("NEXT_TELEMETRY_DISABLED=1")
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envProductionPath, [string[]]$safeLines, $utf8NoBom)

Push-Location $repoRoot
try {
  Invoke-CheckedNative "tar" @(
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=.next",
    "--exclude=.env",
    "--exclude=.env.local",
    "--exclude=.env.production",
    "--exclude=.tmp",
    "--exclude=incoming",
    "--exclude=imports/raw",
    "--exclude=imports/tmp",
    "-czf",
    $archivePath,
    "."
  )

  $assetPaths = @(
    "incoming/casio_for_it_all_photos_UPDATED.zip",
    "incoming/orient_catalog_FULL_001-079.zip",
    "incoming/tissot_FULL_CATALOG_1-193.zip",
    "imports/raw/catalog",
    "imports/raw/home-hero/final",
    "imports/generated/catalog-import-preview.json",
    "imports/generated/catalog-image-upload-plan.json",
    ".tmp/casio-photo-import/manifest.json",
    ".tmp/orient-photo-import/manifest.json",
    ".tmp/tissot-photo-import/manifest.json",
    ".tmp/catalog-site-import-overlay/manifest.json"
  )
  $missingAssetPaths = @($assetPaths | Where-Object { -not (Test-Path (Join-Path $repoRoot $_)) })
  if ($missingAssetPaths.Count -gt 0) {
    throw "Missing catalog image asset paths: $($missingAssetPaths -join ', ')"
  }
  $assetTarArgs = @("-czf", $assetArchivePath) + $assetPaths
  Invoke-CheckedNative "tar" $assetTarArgs
} finally {
  Pop-Location
}

$remoteBash = @"
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="$RemoteAppDir"
DOMAIN="$Domain"
RELEASE_ID="$releaseId"
RELEASE_DIR="`$APP_DIR/releases/`$RELEASE_ID"
ASSET_DIR="`$APP_DIR/shared/catalog-image-assets"
APP_USER="eternaltime"

apt-get update
apt-get install -y ca-certificates curl gnupg nginx ufw

NODE_MAJOR="0"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="`$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
fi
if [ "`$NODE_MAJOR" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! swapon --show | grep -q '^'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    printf '%s\n' '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

timedatectl set-timezone Europe/Moscow || true

if ! id -u "`$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "`$APP_DIR" --shell /usr/sbin/nologin "`$APP_USER"
fi

install -d -m 0755 "`$APP_DIR/releases" "`$APP_DIR/shared"
install -d -m 0755 "`$RELEASE_DIR"
install -d -m 0755 "`$ASSET_DIR"
tar -xzf "$remoteArchive" -C "`$RELEASE_DIR"
rm -rf "`$ASSET_DIR/incoming" "`$ASSET_DIR/imports/raw/catalog" "`$ASSET_DIR/imports/raw/home-hero/final" "`$ASSET_DIR/imports/generated" "`$ASSET_DIR/.tmp/casio-photo-import" "`$ASSET_DIR/.tmp/orient-photo-import" "`$ASSET_DIR/.tmp/tissot-photo-import" "`$ASSET_DIR/.tmp/catalog-site-import-overlay"
tar -xzf "$remoteAssetArchive" -C "`$ASSET_DIR"
install -m 0640 -o root -g "`$APP_USER" "$remoteEnv" "`$APP_DIR/shared/.env.production"
ln -sfn "`$APP_DIR/shared/.env.production" "`$RELEASE_DIR/.env.production"

cd "`$RELEASE_DIR"
npm ci
npm run build
npm prune --omit=dev

chown -R root:"`$APP_USER" "`$RELEASE_DIR"
chown -R root:"`$APP_USER" "`$ASSET_DIR"
install -d -m 0755 "`$RELEASE_DIR/.next/cache/images"
chown -R "`$APP_USER":"`$APP_USER" "`$RELEASE_DIR/.next/cache"
ln -sfn "`$RELEASE_DIR" "`$APP_DIR/current"

cat >/etc/systemd/system/eternal-time.service <<'SERVICE'
[Unit]
Description=Eternal Time Next.js application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=eternaltime
Group=eternaltime
WorkingDirectory=/opt/eternal-time/current
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

CERT_PATH="/etc/letsencrypt/live/`$DOMAIN/fullchain.pem"
CERT_KEY_PATH="/etc/letsencrypt/live/`$DOMAIN/privkey.pem"
SSL_OPTIONS_PATH="/etc/letsencrypt/options-ssl-nginx.conf"
SSL_DHPARAMS_PATH="/etc/letsencrypt/ssl-dhparams.pem"

if [ -f "`$CERT_PATH" ] && [ -f "`$CERT_KEY_PATH" ] && [ -f "`$SSL_OPTIONS_PATH" ] && [ -f "`$SSL_DHPARAMS_PATH" ]; then
  cat >/etc/nginx/sites-available/eternal-time <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name `$DOMAIN www.`$DOMAIN 5.42.111.42 _;
  return 301 https://`$DOMAIN\`$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name `$DOMAIN www.`$DOMAIN;

  ssl_certificate `$CERT_PATH;
  ssl_certificate_key `$CERT_KEY_PATH;
  include `$SSL_OPTIONS_PATH;
  ssl_dhparam `$SSL_DHPARAMS_PATH;

  client_max_body_size 10m;

  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \`$host;
    proxy_set_header X-Real-IP \`$remote_addr;
    proxy_set_header X-Forwarded-For \`$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \`$scheme;
    proxy_set_header Upgrade \`$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass \`$http_upgrade;
  }
}
NGINX
else
  cat >/etc/nginx/sites-available/eternal-time <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name `$DOMAIN www.`$DOMAIN 5.42.111.42 _;

  client_max_body_size 10m;

  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \`$host;
    proxy_set_header X-Real-IP \`$remote_addr;
    proxy_set_header X-Forwarded-For \`$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \`$scheme;
    proxy_set_header Upgrade \`$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass \`$http_upgrade;
  }
}
NGINX
fi

ln -sfn /etc/nginx/sites-available/eternal-time /etc/nginx/sites-enabled/eternal-time
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable eternal-time
systemctl restart eternal-time
systemctl enable nginx
systemctl reload nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

sleep 2
curl -fsS http://127.0.0.1:3000/api/health >/dev/null
curl -fsS -H "Host: `$DOMAIN" http://127.0.0.1/api/health >/dev/null
if [ -f "`$CERT_PATH" ] && [ -f "`$CERT_KEY_PATH" ]; then
  curl -fsS "https://`$DOMAIN/api/health" >/dev/null
fi

rm -f "$remoteArchive" "$remoteAssetArchive" "$remoteEnv" "$remoteScript"
echo "deploy_ok release=`$RELEASE_ID"
"@

$remoteScriptPath = Join-Path $deployDir "deploy-$releaseId.sh"
[System.IO.File]::WriteAllText($remoteScriptPath, $remoteBash, $utf8NoBom)

$sshTarget = "$RemoteUser@$HostName"
Invoke-CheckedNative "scp" @("-i", $SshKey, "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4", $archivePath, "${sshTarget}:$remoteArchive")
Invoke-CheckedNative "scp" @("-i", $SshKey, "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4", $assetArchivePath, "${sshTarget}:$remoteAssetArchive")
Invoke-CheckedNative "scp" @("-i", $SshKey, "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4", $envProductionPath, "${sshTarget}:$remoteEnv")
Invoke-CheckedNative "scp" @("-i", $SshKey, "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4", $remoteScriptPath, "${sshTarget}:$remoteScript")
Invoke-CheckedNative "ssh" @("-i", $SshKey, "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=4", $sshTarget, "bash $remoteScript")

Write-Host "Deployment finished for release $releaseId."
Write-Host "HTTP smoke test: http://$HostName/api/health"
