# GitHub移植ガイド - 民俗学マップ

**作成日**: 2025年12月12日
**移行元**: VirtualBox Linux（開発環境）
**移行先**: Ubuntu 25.04サーバー
**方法**: GitHub経由

---

## 📋 目次

1. [移植前の準備](#移植前の準備)
2. [GitHubへのPush手順](#githubへのpush手順)
3. [Ubuntu 25.04へのデプロイ手順](#ubuntu-2504へのデプロイ手順)
4. [環境変数の設定](#環境変数の設定)
5. [トラブルシューティング](#トラブルシューティング)

---

## 移植前の準備

### ⚠️ 重要: 機密情報の確認

以下のファイルには**機密情報**が含まれており、**絶対にGitHubにpushしてはいけません**:

```
folklore-map/.env.local          ← Google Maps API Key等
folklore-map/.env                ← データベース接続情報
.envrc                           ← 削除済み（念のため確認）
```

### Step 1: .gitignoreファイルの作成

現在の`.gitignore`は不完全です。以下の内容で上書きしてください。

**ルートディレクトリの`.gitignore`**:

```gitignore
# 環境変数（機密情報）
.env
.env*.local
.envrc
*.env

# Next.js
folklore-map/.next/
folklore-map/out/
folklore-map/build/
folklore-map/dist/

# 依存関係
node_modules/
folklore-map/node_modules/
.pnp
.pnp.js

# テスト
coverage/
.nyc_output/

# キャッシュ
.turbo/
.cache/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db
*~

# IDE
.vscode/
.idea/
*.swp
*.swo
*.sublime-*

# Prisma
folklore-map/prisma/*.db
folklore-map/prisma/*.db-journal

# Supabase
.supabase/
supabase/.branches/
supabase/.temp/

# Docker
*.log
docker-compose.override.yml

# ビルド成果物
*.tsbuildinfo
next-env.d.ts

# テスト一時ファイル
/tmp/
/temp/
*.tmp

# バックアップ
*.backup
*.bak
*.old

# ローカルのみのドキュメント（オプション）
# 必要に応じてコメントアウト
# scratch/
# notes.md
```

### Step 2: .env.exampleファイルの確認

GitHub上では、環境変数の**テンプレート**のみを公開します。

**確認: `folklore-map/.env.example` の内容**:

```bash
# Google Maps API Keys
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Site Configuration
NEXT_PUBLIC_SITE_NAME=民俗学マップ
```

**実際の値は含めないこと！**

### Step 3: 不要なファイルの削除

```bash
cd /home/test/codex-test

# ビルド成果物を削除（再生成可能）
rm -rf folklore-map/.next
rm -rf folklore-map/node_modules

# 一時ファイルを削除
rm -rf /tmp/claude
find . -name "*.log" -delete

# 確認
du -sh folklore-map/
# 結果: 数MB程度になるはず（ビルド成果物なし）
```

### Step 4: 重要ファイルのチェックリスト

**GitHubにpushすべきファイル**:

```
✅ folklore-map/
   ├── src/                     ← ソースコード全体
   ├── public/                  ← 静的ファイル
   ├── prisma/schema.prisma     ← データベーススキーマ
   ├── package.json             ← 依存関係定義
   ├── pnpm-lock.yaml           ← ロックファイル
   ├── tsconfig.json            ← TypeScript設定
   ├── next.config.mjs          ← Next.js設定
   ├── tailwind.config.ts       ← Tailwind設定
   ├── .env.example             ← 環境変数テンプレート
   └── README.md                ← 説明書

✅ ドキュメント
   ├── README.md
   ├── basic_design.md
   ├── detailed_design.md
   ├── db_design.md
   ├── api_design.md
   ├── security_audit.md        ← セキュリティ監査
   ├── security_fixes.md        ← 修正レポート
   ├── test_report.md           ← テスト結果
   ├── SESSION_REPORT.md        ← セッション報告
   └── GITHUB_MIGRATION_GUIDE.md ← 本ドキュメント

✅ テストスクリプト
   └── tests/
       ├── comprehensive_test.mjs
       ├── load_test.mjs
       └── README.md

✅ 設定ファイル
   ├── .gitignore
   └── .env.example
```

**GitHubにpushしてはいけないファイル**:

```
❌ folklore-map/.env
❌ folklore-map/.env.local
❌ folklore-map/.next/
❌ folklore-map/node_modules/
❌ .envrc
❌ *.log
❌ .supabase/ (ローカルSupabaseデータ)
```

---

## GitHubへのPush手順

### Step 1: Gitリポジトリの初期化

```bash
cd /home/test/codex-test

# Gitリポジトリを初期化
git init

# ブランチ名をmainに設定
git branch -M main

# 現在のユーザー設定を確認（必要に応じて設定）
git config user.name
git config user.email

# 未設定の場合は設定
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 2: .gitignoreの配置

```bash
# 上記の.gitignore内容を作成
cat > .gitignore << 'EOF'
# 環境変数（機密情報）
.env
.env*.local
.envrc
*.env

# Next.js
folklore-map/.next/
folklore-map/out/
folklore-map/build/
folklore-map/dist/

# 依存関係
node_modules/
folklore-map/node_modules/
.pnp
.pnp.js

# テスト
coverage/
.nyc_output/

# キャッシュ
.turbo/
.cache/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db
*~

# IDE
.vscode/
.idea/
*.swp
*.swo
*.sublime-*

# Prisma
folklore-map/prisma/*.db
folklore-map/prisma/*.db-journal

# Supabase
.supabase/
supabase/.branches/
supabase/.temp/

# Docker
*.log
docker-compose.override.yml

# ビルド成果物
*.tsbuildinfo
next-env.d.ts

# テスト一時ファイル
/tmp/
/temp/
*.tmp

# バックアップ
*.backup
*.bak
*.old
EOF
```

### Step 3: 機密情報のチェック

```bash
# .envファイルが無視されることを確認
git status

# 以下が表示されないことを確認:
# - folklore-map/.env
# - folklore-map/.env.local
# - .envrc

# もし表示される場合は、.gitignoreを再確認
```

### Step 4: ファイルをステージング

```bash
# 全ファイルを追加
git add .

# 追加されたファイルを確認
git status

# 機密情報が含まれていないか最終確認
git diff --cached --name-only | grep -E "\\.env"

# 何も出力されなければOK
```

### Step 5: 初回コミット

```bash
# コミット
git commit -m "Initial commit: 民俗学マップ - セキュリティ強化版

- Next.js 16 + React 19 + TypeScript
- Supabase認証・データベース
- Prisma ORM
- Google Maps統合
- セキュリティスコア: 7.5/10
- P0脆弱性修正済み (6件)
- レート制限実装
- DoS対策実装
- 包括的ドキュメント整備
"
```

### Step 6: GitHubリポジトリの作成

**ブラウザで操作**:

1. https://github.com にアクセス
2. 右上の「+」→「New repository」
3. 設定:
   ```
   Repository name: folklore-map
   Description: 民俗学・伝説マッピングシステム - Next.js + Supabase
   Privacy: Private（推奨）または Public
   ✅ Add a README: NO（既にある）
   ✅ Add .gitignore: NO（既にある）
   ✅ Choose a license: MIT License（推奨）
   ```
4. 「Create repository」をクリック

### Step 7: リモートリポジトリの追加とPush

GitHubのリポジトリページに表示されるコマンドを実行:

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/folklore-map.git

# または SSH を使う場合:
# git remote add origin git@github.com:YOUR_USERNAME/folklore-map.git

# プッシュ
git push -u origin main
```

**認証方法**:
- **HTTPS**: GitHub Personal Access Token が必要
  - Settings → Developer settings → Personal access tokens → Generate new token
  - スコープ: `repo` をチェック
- **SSH**: SSH鍵の設定が必要
  - https://docs.github.com/ja/authentication/connecting-to-github-with-ssh

### Step 8: Push完了の確認

```bash
# リモートリポジトリを確認
git remote -v

# ブラウザでGitHubリポジトリを確認
# https://github.com/YOUR_USERNAME/folklore-map

# 以下が表示されることを確認:
# - folklore-map/ ディレクトリ
# - ドキュメント類
# - .gitignore
# - README.md
```

---

## Ubuntu 25.04へのデプロイ手順

### 前提条件

**サーバースペック（最小）**:
- OS: Ubuntu 25.04 LTS
- CPU: 1 vCPU以上
- RAM: 2 GB以上（推奨4GB）
- ストレージ: 20 GB以上
- ネットワーク: 固定IP推奨

### Phase 1: サーバーの準備

```bash
# Ubuntu 25.04サーバーにSSH接続
ssh user@your-server-ip

# システムアップデート
sudo apt update && sudo apt upgrade -y

# 必要なパッケージのインストール
sudo apt install -y \
  git \
  curl \
  wget \
  build-essential \
  ca-certificates \
  gnupg \
  lsb-release
```

### Phase 2: Node.js 22のインストール

```bash
# Node.js 22 のインストール（公式リポジトリから）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認
node --version  # v22.x.x
npm --version   # 10.x.x
```

### Phase 3: pnpmのインストール

```bash
# pnpm のインストール
npm install -g pnpm

# バージョン確認
pnpm --version  # 9.x.x
```

### Phase 4: PostgreSQLのインストール

```bash
# PostgreSQL 17 のインストール
sudo apt install -y postgresql-17 postgresql-contrib-17

# PostgreSQL サービスの起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# パスワード設定
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"

# データベース作成
sudo -u postgres psql -c "CREATE DATABASE folklore_map;"

# 接続確認
sudo -u postgres psql -c "\l"
```

### Phase 5: アプリケーションのクローン

```bash
# アプリケーション用ディレクトリ作成
sudo mkdir -p /var/www
cd /var/www

# GitHubからクローン（HTTPS）
sudo git clone https://github.com/YOUR_USERNAME/folklore-map.git

# または SSH:
# sudo git clone git@github.com:YOUR_USERNAME/folklore-map.git

# 所有権の変更
sudo chown -R $USER:$USER /var/www/folklore-map
cd /var/www/folklore-map/folklore-map
```

### Phase 6: 依存関係のインストール

```bash
cd /var/www/folklore-map/folklore-map

# 依存関係のインストール
pnpm install

# インストール確認
ls node_modules/  # 大量のパッケージが表示される
```

### Phase 7: 環境変数の設定

```bash
cd /var/www/folklore-map/folklore-map

# .env.exampleをコピー
cp .env.example .env.local

# エディタで編集
nano .env.local
```

**`.env.local` に設定する内容**:

```bash
# Google Maps API Keys
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy... # 本番用APIキー
GOOGLE_MAPS_API_KEY=AIzaSy... # 本番用APIキー

# Supabase（本番環境）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # 本番用Anonキー
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # 本番用Serviceキー

# Database（ローカルPostgreSQL）
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/folklore_map

# Site Configuration
NEXT_PUBLIC_SITE_NAME=民俗学マップ
```

**重要**: 開発環境と本番環境で**別のAPIキー**を使用すること！

### Phase 8: データベースのセットアップ

```bash
cd /var/www/folklore-map/folklore-map

# Prismaクライアント生成
pnpm prisma generate

# データベーススキーマの適用
pnpm prisma db push

# 確認
pnpm prisma studio &
# ブラウザで http://server-ip:5555 にアクセス
# Ctrl+C で終了
```

### Phase 9: 本番ビルド

```bash
cd /var/www/folklore-map/folklore-map

# 本番ビルド
pnpm build

# ビルド確認
ls .next/  # ビルド成果物が生成される
```

### Phase 10: PM2でプロセス管理

```bash
# PM2のインストール
sudo npm install -g pm2

# アプリケーションの起動
cd /var/www/folklore-map/folklore-map
pm2 start pnpm --name "folklore-map" -- start

# 自動起動設定
pm2 startup
pm2 save

# 状態確認
pm2 status
pm2 logs folklore-map

# 停止・再起動
pm2 stop folklore-map
pm2 restart folklore-map
```

### Phase 11: Nginxのインストールと設定

```bash
# Nginxのインストール
sudo apt install -y nginx

# Nginx設定ファイル作成
sudo nano /etc/nginx/sites-available/folklore-map
```

**Nginx設定内容**:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.jsへのプロキシ
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # 静的ファイルのキャッシュ
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # アップロードサイズ制限
    client_max_body_size 10M;
}
```

**Nginx有効化**:

```bash
# シンボリックリンク作成
sudo ln -s /etc/nginx/sites-available/folklore-map /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Phase 12: SSL証明書の設定（Let's Encrypt）

```bash
# Certbotのインストール
sudo apt install -y certbot python3-certbot-nginx

# SSL証明書の取得
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新の確認
sudo certbot renew --dry-run
```

### Phase 13: ファイアウォールの設定

```bash
# UFWのインストールと設定
sudo apt install -y ufw

# ルール設定
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# 有効化
sudo ufw enable

# 状態確認
sudo ufw status
```

### Phase 14: 動作確認

```bash
# サービス状態確認
sudo systemctl status nginx
pm2 status

# アプリケーションログ確認
pm2 logs folklore-map

# ブラウザでアクセス
# http://your-domain.com または https://your-domain.com
```

---

## 環境変数の設定

### 必要な環境変数一覧

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API（公開用） | Google Cloud Console |
| `GOOGLE_MAPS_API_KEY` | Google Maps API（サーバー用） | Google Cloud Console |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | Supabase Dashboard（機密） |
| `DATABASE_URL` | PostgreSQL接続文字列 | ローカルまたはSupabase |

### Google Maps API Keyの取得

1. https://console.cloud.google.com/ にアクセス
2. プロジェクト作成
3. 「APIとサービス」→「認証情報」
4. 「認証情報を作成」→「APIキー」
5. **重要**: APIキーの制限を設定
   ```
   アプリケーションの制限:
   - HTTPリファラー: https://your-domain.com/*

   API制限:
   - Maps JavaScript API
   - Geocoding API
   ```

### Supabaseプロジェクトの作成

1. https://supabase.com/ にアクセス
2. 「New Project」をクリック
3. 設定:
   ```
   Name: folklore-map-production
   Database Password: （強力なパスワード）
   Region: Northeast Asia (Tokyo) ← 日本の場合
   ```
4. プロジェクト作成後、「Settings」→「API」から:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`（機密！）

### データベース接続の選択肢

#### オプション1: ローカルPostgreSQL
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/folklore_map
```

#### オプション2: Supabase PostgreSQL
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

Supabase Dashboardの「Settings」→「Database」から接続文字列を取得

---

## トラブルシューティング

### 問題1: pnpm install が失敗する

**症状**:
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@.../-/....tgz: Not Found - 404
```

**解決策**:
```bash
# pnpm キャッシュをクリア
pnpm store prune

# 再インストール
rm -rf node_modules
pnpm install
```

### 問題2: Prisma接続エラー

**症状**:
```
Error: P1001: Can't reach database server
```

**解決策**:
```bash
# PostgreSQLが起動しているか確認
sudo systemctl status postgresql

# 接続テスト
psql -U postgres -h localhost -d folklore_map

# DATABASE_URLを確認
echo $DATABASE_URL
cat .env.local | grep DATABASE_URL
```

### 問題3: Next.jsビルドエラー

**症状**:
```
Error: Cannot find module 'next'
```

**解決策**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules .next
pnpm install
pnpm build
```

### 問題4: ポート3000が使用中

**症状**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決策**:
```bash
# ポートを使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
PORT=3001 pnpm start
```

### 問題5: Nginxが起動しない

**症状**:
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

**解決策**:
```bash
# ポート80を使用しているプロセスを確認
sudo lsof -i :80

# Apacheなど他のWebサーバーを停止
sudo systemctl stop apache2

# Nginx再起動
sudo systemctl restart nginx
```

### 問題6: 環境変数が読み込まれない

**症状**:
アプリケーションが環境変数を認識しない

**解決策**:
```bash
# .env.local の配置場所を確認
ls -la /var/www/folklore-map/folklore-map/.env.local

# PM2の環境変数を確認
pm2 env folklore-map

# PM2を環境変数付きで再起動
pm2 delete folklore-map
pm2 start ecosystem.config.js
```

**ecosystem.config.js の作成**:
```javascript
module.exports = {
  apps: [{
    name: 'folklore-map',
    script: 'pnpm',
    args: 'start',
    cwd: '/var/www/folklore-map/folklore-map',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## デプロイ後のチェックリスト

### セキュリティ確認

```bash
# ✅ ファイアウォールが有効
sudo ufw status

# ✅ SSL証明書が有効
sudo certbot certificates

# ✅ 不要なポートが閉じている
sudo netstat -tulpn

# ✅ PostgreSQLが外部公開されていない
sudo netstat -tulpn | grep 5432
# 127.0.0.1:5432 のみ表示されることを確認

# ✅ .envファイルが保護されている
ls -la /var/www/folklore-map/folklore-map/.env*
# .env.local のパーミッションが 600 または 640 であること

# ✅ 環境変数に機密情報が含まれている
cat /var/www/folklore-map/folklore-map/.env.local | grep -E "API_KEY|SECRET"
# 実際の値が設定されていることを確認
```

### 機能確認

```
✅ トップページが表示される
✅ 地図が正しく表示される
✅ スポット一覧が取得できる
✅ スポット詳細が表示される
✅ 検索機能が動作する
✅ ログイン機能が動作する
✅ レート制限が機能する（100req/minで制限）
✅ エラーページが適切に表示される
```

### パフォーマンス確認

```bash
# レスポンスタイム計測
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://your-domain.com/

# レート制限テスト
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/spots; done | sort | uniq -c
# 200が約75件、429が約30件表示されることを確認
```

---

## 継続的デプロイ（オプション）

### GitHub Actionsの設定

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/folklore-map
            git pull origin main
            cd folklore-map
            pnpm install
            pnpm build
            pm2 restart folklore-map
```

**GitHub Secrets設定**:
- `SERVER_HOST`: サーバーのIPアドレス
- `SERVER_USER`: SSH接続ユーザー名
- `SSH_PRIVATE_KEY`: SSH秘密鍵

---

## まとめ

### 移植の流れ

```
1. 開発環境（VirtualBox）
   ↓
2. .gitignore作成・機密情報除外
   ↓
3. GitHubへPush
   ↓
4. Ubuntu 25.04サーバーで Clone
   ↓
5. 環境変数設定
   ↓
6. ビルド・デプロイ
   ↓
7. 本番稼働
```

### 所要時間（目安）

- GitHub準備: 30分
- Ubuntu環境構築: 1時間
- アプリケーションデプロイ: 1時間
- SSL・セキュリティ設定: 30分
- **合計: 約3時間**

### サポート

問題が発生した場合:
1. このドキュメントのトラブルシューティングを確認
2. ログを確認: `pm2 logs folklore-map`
3. GitHub Issuesで質問

---

**ドキュメント作成日**: 2025年12月12日
**最終更新**: 2025年12月12日
**バージョン**: 1.0
