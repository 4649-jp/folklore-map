# 要件定義（サイトコンセプト：民俗学版「大島てる」）

## 1. 目的・背景
- 伝承・民話・神社仏閣の由来を**地図で可視化**し、**明治30年頃の古地図**と比較して地域の歴史的文脈を学べる場を提供。
- 学生でも運営できる**投稿・承認**ワークフローを備え、**無料で閲覧**可能。

## 2. ターゲット
- 一般の学習者・観光客・地域住民、Sechack365 の来場者。
- 初学者の運営者（大学1年生）。

## 3. 主要機能（MVP）
1. **地図表示（Google Maps）**  
   - カスタムアイコン（鬼/狐/犬/寺/社 等）
   - マーカークリックで詳細カード
   - 明治30年頃の古地図レイヤの ON/OFF（外部タイル → 将来MapLibre対応）
2. **検索/閲覧**  
   - 地域名・キーワード検索、地図移動に連動した一覧
3. **投稿/承認**  
   - ログイン後の下書き投稿（タイトル、本文、出典、画像任意）
   - 承認フロー：`draft -> review -> published`
4. **通報/修正**  
   - 不適切・誤り通報、ワンクリック非公開
5. **AI前処理（任意）**  
   - Pythonで要約・カテゴリ推定・安全チェック
6. **座標ぼかし**  
   - 精度とリスクに応じて ±100〜300m

## 4. 非対応/後回し（MVP外）
- 多言語展開（将来 i18n 対応）
- 高度な推薦/レコメンド
- 完全自動収集（まずは手動を基本）

## 5. 技術スタック（採用方針）
- **フロント**: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- **地図**: Google Maps JS API（まずは）→ 将来 MapLibre/古地図タイル強化
- **API/サーバ**: Next.js Route Handlers（または軽量 Express）
- **DB**: Supabase(PostgreSQL) + Prisma（ローカル学習は SQLite 代替）
- **認証**: Supabase Auth
- **AI処理**: Python 3.11（要約・分類・NG判定）
- **CI**: GitHub Actions（lint, test, build）
- **デプロイ**: Vercel（フロント） + Supabase（DB）/ Fly.io も可

## 6. データ項目（MVP）
**spots**: `id, title, description, lat, lng, icon_type, era_hint, blur_radius_m, status, created_by`  
**sources**: `id, type, citation, url`  
**flags**: `id, spot_id, reason, note, created_by, status`  
**audits**: `id, entity, entity_id, action, by, at`

## 7. 画面要件（MVP）
- 地図ページ（トップ）/ 詳細モーダル / 検索バー / 投稿フォーム / レビュー承認画面 / 通報一覧

## 8. 運用要件
- 投稿は**出典必須**。真偽不明は `review` 止め。
- 差別助長・個人情報・誹謗中傷は**非掲載**。匿名化・丸め処理。
- 変更履歴と通報対応の**証跡**を残す。

## 9. セットアップ要件（Ubuntu）
- Node.js 20 / pnpm / Python 3.11 / Git
- Google Maps API キー、Supabase プロジェクト（URL/Anon Key）
- `.env.local` に各値を設定

## 10. 成果物/発表
- Sechack365 で動作デモ（地図に数件のスポット）
- 学習プロセス（Decision Log）をポスター/スライド化