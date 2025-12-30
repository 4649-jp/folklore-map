# 運用・監視・デプロイ（詳細）

## 監視
- Vercel Analytics or Umami：PV、滞在時間、検索数、通報数
- エラーログ：Sentry（任意）/ Supabase Logs

## バックアップ
- Supabase自動バックアップ + 月1回エクスポート（.sql）

## CI例（GitHub Actions）
```yaml
name: CI
on:
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm i --frozen-lockfile
      - run: pnpm lint && pnpm test && pnpm build
```

## Docker（学習用ローカル）
- Next.js：`node:20` ベース、ポート 3000
- Python：`python:3.11-slim`、スクリプト実行用