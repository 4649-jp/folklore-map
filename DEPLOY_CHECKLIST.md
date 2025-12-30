# デプロイチェックリスト - 民俗学マップ

**目的**: Ubuntu 25.04サーバーへの迅速なデプロイ
**所要時間**: 約3時間

---

## 📦 Phase 1: GitHub準備（30分）

### ✅ 開発環境で実行

```bash
cd /home/test/codex-test

# 1. ビルド成果物を削除
rm -rf folklore-map/.next
rm -rf folklore-map/node_modules

# 2. .gitignoreを配置
cat > .gitignore << 'EOF'
.env
.env*.local
.envrc
*.env
folklore-map/.next/
node_modules/
folklore-map/node_modules/
.supabase/
*.log
EOF

# 3. 機密情報が除外されることを確認
ls -la folklore-map/.env*
# .env と .env.local が存在することを確認

# 4. Gitリポジトリ初期化
git init
git branch -M main
git config user.name "Your Name"
git config user.email "your@email.com"

# 5. コミット
git add .
git status  # .envファイルがないことを確認！
git commit -m "Initial commit: 民俗学マップ"

# 6. GitHubにPush
# ブラウザでGitHubリポジトリを作成してから:
git remote add origin https://github.com/YOUR_USERNAME/folklore-map.git
git push -u origin main
```

**⚠️ 重要確認**:
- [ ] `.env` と `.env.local` がGitHubにpushされていない
- [ ] `node_modules/` がGitHubにpushされていない
- [ ] `.next/` がGitHubにpushされていない

---

## 🚀 Phase 2: Ubuntu 25.04サーバー構築（2.5時間）

### ステップ1: システム準備（10分）

```bash
# サーバーにSSH接続
ssh user@your-server-ip

# アップデート
sudo apt update && sudo apt upgrade -y

# 基本パッケージ
sudo apt install -y git curl wget build-essential
```

### ステップ2: Node.js 22インストール（5分）

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm
node --version  # v22確認
```

### ステップ3: PostgreSQLインストール（10分）

```bash
sudo apt install -y postgresql-17 postgresql-contrib-17
sudo systemctl start postgresql
sudo systemctl enable postgresql

# データベース作成
sudo -u postgres psql << EOF
ALTER USER postgres PASSWORD 'your_secure_password';
CREATE DATABASE folklore_map;
\q
EOF
```

### ステップ4: アプリクローン（5分）

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/folklore-map.git
sudo chown -R $USER:$USER /var/www/folklore-map
```

### ステップ5: 環境変数設定（15分）

```bash
cd /var/www/folklore-map/folklore-map
cp .env.example .env.local
nano .env.local
```

**設定内容**:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=本番用APIキー
GOOGLE_MAPS_API_KEY=本番用APIキー
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=本番用Anonキー
SUPABASE_SERVICE_ROLE_KEY=本番用Serviceキー
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/folklore_map
```

### ステップ6: ビルド（20分）

```bash
cd /var/www/folklore-map/folklore-map

# 依存関係インストール
pnpm install

# Prismaセットアップ
pnpm prisma generate
pnpm prisma db push

# 本番ビルド
pnpm build
```

### ステップ7: PM2起動（5分）

```bash
sudo npm install -g pm2

cd /var/www/folklore-map/folklore-map
pm2 start pnpm --name "folklore-map" -- start
pm2 startup
pm2 save
pm2 status
```

### ステップ8: Nginx設定（20分）

```bash
# インストール
sudo apt install -y nginx

# 設定ファイル作成
sudo nano /etc/nginx/sites-available/folklore-map
```

**設定内容**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 有効化
sudo ln -s /etc/nginx/sites-available/folklore-map /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### ステップ9: SSL証明書（10分）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### ステップ10: ファイアウォール（5分）

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## ✅ 動作確認チェックリスト

### サービス状態

```bash
# PM2
pm2 status
# 表示: folklore-map | online

# Nginx
sudo systemctl status nginx
# 表示: active (running)

# PostgreSQL
sudo systemctl status postgresql
# 表示: active (running)
```

### ブラウザ確認

- [ ] https://your-domain.com でトップページが表示される
- [ ] 地図が正しく表示される
- [ ] スポット一覧が取得できる
- [ ] ログイン機能が動作する

### レート制限確認

```bash
# 105リクエスト送信
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/spots; done | sort | uniq -c

# 期待結果:
#  約75 200  ← 成功
#  約30 429  ← レート制限
```

### セキュリティ確認

```bash
# SSL証明書
sudo certbot certificates
# 表示: 有効期限が表示される

# ファイアウォール
sudo ufw status
# 表示: 80/tcp, 443/tcp, 22/tcp のみ許可

# PostgreSQL外部公開確認
sudo netstat -tulpn | grep 5432
# 表示: 127.0.0.1:5432 のみ（外部非公開）
```

---

## 🔧 よくある問題と解決

### 問題: ビルドエラー

```bash
rm -rf node_modules .next
pnpm install
pnpm build
```

### 問題: Prisma接続エラー

```bash
# PostgreSQL起動確認
sudo systemctl status postgresql

# DATABASE_URL確認
cat .env.local | grep DATABASE_URL

# 再接続
pnpm prisma generate
pnpm prisma db push
```

### 問題: ポート競合

```bash
# ポート3000使用確認
lsof -i :3000

# プロセス終了
kill -9 <PID>

# PM2再起動
pm2 restart folklore-map
```

### 問題: 環境変数未反映

```bash
# PM2を完全再起動
pm2 delete folklore-map
cd /var/www/folklore-map/folklore-map
pm2 start pnpm --name "folklore-map" -- start
pm2 save
```

---

## 📊 システム要件まとめ

| 項目 | 最小 | 推奨 |
|------|------|------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| ストレージ | 20 GB | 40 GB |
| OS | Ubuntu 25.04 | Ubuntu 25.04 LTS |

**月額コスト目安**:
- VPS: $10-20/月（Hetzner, Contabo等）
- クラウド: $20-40/月（AWS, GCP等）

---

## 📝 デプロイ後のメンテナンス

### 定期タスク

```bash
# 週次: システムアップデート
sudo apt update && sudo apt upgrade -y
pm2 restart folklore-map

# 月次: SSL証明書更新確認
sudo certbot renew --dry-run

# 月次: ログローテーション確認
pm2 flush
```

### モニタリング

```bash
# リアルタイムログ
pm2 logs folklore-map

# メモリ使用量
pm2 monit

# システムリソース
htop
```

---

**完成！** 🎉

システムが正常に動作していることを確認したら、デプロイ完了です。

**サポートドキュメント**:
- 詳細手順: `GITHUB_MIGRATION_GUIDE.md`
- セキュリティ: `security_audit.md`, `security_fixes.md`
- テスト: `test_report.md`
