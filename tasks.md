# 実行タスク一覧（大項目）

| ID | タスク | 概要 | 状態 | 備考 |
|----|--------|------|------|------|
| T01 | 開発環境セットアップ | Node.js 20 / pnpm / Prisma / Supabase CLI / Python 3.11 の導入および `.env` 雛形作成 | 完了 | Node v20.19.5, pnpm 10.20.0, Supabase CLI 2.54.11 を整備。`setup.md` と `.env.example` を追加。 |
| T02 | Next.js プロジェクト初期化 | Next.js 15 + Tailwind + shadcn/ui のベースアプリ作成、基本レイアウトと共通設定 | 完了 | `folklore-map/` を作成。Next.js 16 + React 19 で初期化（最新版のため仕様との差異あり）。shadcn CLI 初期化、トップページを日本語化。 |
| T03 | Prisma スキーマ実装 | `db_design.md` に基づく `schema.prisma` 作成とマイグレーション（PostgreSQL/SQLite両対応） | 完了 | Spot/Source/Flag/Audit モデルと enum を定義。Prisma CLI/スクリプトを追加（プロバイダ切替は手動要）。 |
| T04 | 認証・RLS 設定 | Supabase Auth 連携、ロール（viewer/editor/reviewer/admin）と RLS ポリシー整備 | 完了 | Supabase クライアント/ロール判定ヘルパーを実装。`supabase/policies.sql` と `supabase/README.md` を追加し、設定手順を明文化。 |
| T05 | API 実装 | `/api/spots` `/api/geocode` `/api/flags` の Route Handlers 実装とバリデーション | 完了 | `/api/spots` 全体、`/api/geocode`、`/api/flags` POST/PATCH を実装。Zod 検証・権限チェックを組み込み。座標ぼかし処理は削除（ユーザー要望により）。 |
| T06 | フロント機能実装 | 地図表示・検索・投稿フォーム・レビューパネル・通報一覧の UI/UX 実装 | 完了 | 地図＋スポット一覧 UI（検索・詳細表示付き）、投稿フォーム `/post`、レビュー `/review`（履歴差分表示機能付き）、通報一覧 `/flags`、管理者サイト `/admin` を実装。高度検索機能（タグ・時代・エリア絞り込み）実装済み。2025-11-12完了。 |
| T07 | Python エージェント整備 | Harvester/Curator/Ethics Gate/Icon Tagger スクリプト作成とワークフロー確認 | 未着手 | `agents.md` §4 |
| T08 | セキュリティ対策 | CSP/ヘッダ設定、入力検証、レート制限、セキュリティチェックリスト適用 | 完了 | CSPヘッダー（next.config.ts）、セキュリティヘッダー全般実装。レート制限（rate-limit.ts）、入力サニタイゼーション（sanitize.ts）実装済み。セキュリティチェックリスト（docs/security-checklist.md）作成。コードレビュー実施、ビルド検証完了。 |
| T09 | テスト & CI | ユニット/UI/API テスト追加、GitHub Actions で lint/test/build 実行 | 完了 | Vitest環境構築、ユニットテスト26件実装（Zodスキーマ、auth、sanitize）、GitHub Actions CI/CD設定完了。2025-11-12完了。 |
| T10 | デプロイ & 運用 | Vercel + Supabase デプロイ、監視・バックアップ設定、運用手順書整備 | 完了 | DEPLOYMENT.md作成（Vercel + Supabase本番環境セットアップ手順、監視・バックアップ、トラブルシューティング、コスト見積もり）。vercel.json設定完了。2025-11-12完了。 |
| T11 | ドキュメント更新 | 開発ログ・Decision Log・README 整備、成果物サマリー作成 | 完了 | README.md作成（プロジェクト概要、技術スタック、セットアップ手順、ドキュメント索引）。development-log.md更新（T06, T09の作業記録）。2025-11-12完了。 |

> 各タスクの着手・完了時は本ファイルの「状態」および「備考」を更新し、実行結果を記録してください。
