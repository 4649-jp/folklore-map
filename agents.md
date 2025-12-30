# agents.md（日本語）
**対象読者**：Sechack365 に参加する情報系大学1年生（女学生）を想定。Ubuntu（VirtualBox）環境、`codex CLI` を前提。  
**目的**：民俗学版「大島てる」— 伝説・民話・神社仏閣の由来を Google マップ上に可視化し、明治30年頃の古地図と現代地図を比較できる学習・発表用サイトを構築する。  
**開発スタイル**：PHPは使わず、**Node.js + TypeScript（Next.js）** と **Python** を併用。初学者にやさしい手順・コメント重視。

---

## 1. 全体像（エージェント構成）
本プロジェクトでは「AIエージェント」を**役割ごと**に分け、`codex CLI` から個別に呼び出せるようにします。最初は**手動実行**で動作確認→慣れたら**ワークフロー連携**に進みます。

1. **Harvester（収集）**: 伝承・民話・神社縁起のテキスト収集（Python）。
2. **Curator（整理・要約）**: 収集テキストを要約・重複排除・根拠付け（Python）。
3. **Safety & Ethics Gate（倫理・安全）**: 差別助長・誹謗中傷・個人情報の自動検出（Python）。
4. **Geocoder（位置付与）**: 地名から緯度経度を付与、粒度（±100〜300mのぼかし）設定（Node.js/TS）。
5. **Icon Tagger（カテゴリ付与）**: 鬼・狐・動物・寺社等のアイコンカテゴリ分類（Python/Node.js）。
6. **Publisher（公開）**: データベース（Supabase/PostgreSQL）へ登録、Next.js で地図に反映（Node.js/TS）。
7. **Moderator Console（運用補助）**: 通報・差し戻し・証跡管理、承認フロー（Node.js/TS）。

> はじめは 1→2→3→4→5→6 を**小規模データ**で1本流す。動いたら 7（運用）を足す。

---

## 2. ツールと前提
- **OS**: Ubuntu（VirtualBox 上）
- **フロント**: Next.js 15 + React 18 + TypeScript + Tailwind CSS + shadcn/ui（任意）
- **地図**: まずは **Google Maps JavaScript API**（後で古地図レイヤは TileOverlay で拡張）
- **サーバ/API**: Next.js Route Handlers（または Express）
- **DB**: Supabase（PostgreSQL + RLS）※学習しやすく拡張性高い / ローカルは SQLite でも可
- **認証**: Supabase Auth（匿名/メールリンク）
- **AI処理**: Python 3.11（要約・分類・NG判定）
- **スキーマ管理**: Prisma（PostgreSQL/SQLite どちらもOK）
- **パッケージ**: Node.js 20 LTS / pnpm 推奨

環境変数例（`.env.local`）
```
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SITE_NAME="民俗学マップ"
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://user:pass@host:5432/db
```

---

## 3. データモデル（最小）
- **spots**: 1地点=1コンテンツ
  - id, title, description, lat, lng, icon_type, era_hint, blur_radius_m (100–300), status(draft/review/published), created_by, source_ids[]
- **sources**: 出典情報（URL/書籍/現地聞き取り）
  - id, type(url/book/interview), citation, url
- **flags**: 通報（不適切/誤り/差別/プライバシー）
  - id, spot_id, reason(enum), note, created_by, status(open/closed)
- **audits**: 承認・履歴（誰がいつ何をしたか）
  - id, entity, entity_id, action, by, at

> 初期は `spots` と `sources` だけでもOK。後から `flags/audits` を追加。

---

## 4. エージェント詳細設計

### 4.1 Harvester（収集）— Python
**役割**: 参考サイトや公開データから伝承テキストを収集。著作権・引用ルールを遵守し、URLや出典を必ず保持。  
**入出力**: URL/テキスト → JSON（title, body, place_hint, source）。  
**実装ヒント**:
- requests + BeautifulSoup / trafilatura で本文抽出
- robots.txt を守る・過剰クローリング禁止
- 書籍や口承は**手入力フォーム**（CSV/Google スプレッドシート経由でも可）

**codex CLI 実行例（擬似）**
```bash
codex run harvester --input inputs/seed_urls.txt --out tmp/harvest.jsonl
```

---

### 4.2 Curator（整理・要約）— Python
**役割**: 収集結果を要約、重複排除、メタ情報（時代・登場生物）抽出。  
**入出力**: harvest.jsonl → curated.jsonl（summary, tags, era_hint 等）。  
**注意**: 要約は**元出典**と照らし合わせて**誤解を生まない**表現に。

```bash
codex run curator --in tmp/harvest.jsonl --out tmp/curated.jsonl
```

---

### 4.3 Safety & Ethics Gate（倫理・安全）— Python
**役割**: 差別助長・誹謗中傷・個人情報（住所氏名・電話）等を検出。危険度スコアと根拠を付与。  
**ポリシー**（例）:
- 「被差別部落」「同和地区」等、**歴史的差別に直結する地名紐付け**は**地図表示しない**
- 具体住所・個人特定可能な記述は**匿名化/丸め**（町丁目レベル + ぼかし）
- 真偽未確定は **status=draft/review** に留め、公開不可

```bash
codex run ethics-gate --in tmp/curated.jsonl --out tmp/safe.jsonl
```

---

### 4.4 Geocoder（位置付与）— Node.js/TypeScript
**役割**: 地名・神社名から座標を取得（Google Geocoding API）。精度に応じて **±100〜300m のぼかし**。  
**実装**: Next.js API Route `/api/geocode` で1件ずつ/バッチ処理。  
**出力**: `lat`, `lng`, `blur_radius_m`。

```bash
codex run geocode --in tmp/safe.jsonl --out tmp/geo.jsonl
```

---

### 4.5 Icon Tagger（カテゴリ付与）— Python/TS
**役割**: 鬼/狐/犬/龍/寺/社 などの**アイコン種別**を付与。未確定は `generic`。  
**UI**: 管理画面で手動修正も可能に。

```bash
codex run icon-tagger --in tmp/geo.jsonl --out tmp/iconed.jsonl
```

---

### 4.6 Publisher（公開）— Node.js/TS
**役割**: DBに保存し、地図へ反映。公開は `published` のみ。承認フローは audits に記録。  
**実装**: Prisma 経由で `spots/sources` にINSERT、Next.js ページでマーカー描画。

```bash
codex run publish --in tmp/iconed.jsonl --db $DATABASE_URL
```

---

### 4.7 Moderator Console（運用）— Node.js/TS
**機能**:
- 通報（flag）一覧、ワンクリック対応（非公開化/修正）
- 承認前レビュー（差別・プライバシー・虚偽）
- 変更履歴（audits）

---

## 5. フロント画面（最小機能）
- **トップ/地図**：Google Maps、マーカーにアイコン、クリックで詳細カード。
- **検索**：地域名・キーワード。地図移動でリストが変わる。
- **詳細**：伝承要約、出典リンク、時代ヒント、「古地図を重ねる」トグル。
- **投稿**：ログイン後に下書き投稿（画像は任意）。承認後に公開。

**古地図（明治30年頃）の扱い**：最初は**外部タイル**を重ねるUIだけ用意し、後から安定した出典に切替。

---

## 6. セットアップ手順（超初心者向け）
```bash
# 1) Node.js と pnpm
sudo apt update && sudo apt install -y curl git build-essential python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm

# 2) Next.js プロジェクト
pnpm create next-app folklore-map --ts
cd folklore-map
pnpm add -D prisma
pnpm add @prisma/client @supabase/supabase-js zod
pnpm add google-map-react

# 3) Prisma 初期化
npx prisma init --datasource-provider postgresql

# 4) 開発起動
pnpm dev
```

> まずは**地図にピン1個**出す → DBに1レコード入れて一覧に出す → 投稿フォームを付ける、の順でOK。

---

## 7. プロンプト雛形（例）
**Curator**：  
「次のテキストを300字以内で中立的に要約し、固有名詞と時代の手がかりを列挙してください。出典URLを保持してください。真偽不明点は『未確定』と明記。」

**Safety & Ethics Gate**：  
「次のテキストから、差別助長・個人情報・誹謗中傷の恐れを検出し、根拠と改善案を出力。閾値を超える場合は status=review とする。」

---

## 8. 学習・就活での推しポイント
- Next.js + TypeScript：**モダンかつ就職で通用**。  
- Supabase：Auth/DB/ストレージが一体で**実装が速い**。  
- Python：要約・分類など**AI前処理**が得意。  
- Google Maps：**最初に動かしやすい**（APIキーだけでOK）。

---

## 9. 途中経過の記録（Decision Log）
- 2025-11-03: 地図は Google Maps を先行採用。古地図は外部タイルの重ね合わせ方針。
- 2025-11-03: DB は Supabase（本番）/ SQLite（ローカル簡易）を想定。Prisma で両対応。
- 2025-11-03: 差別助長リスク回避のため、地点は **±100〜300mのぼかし**を必須。

---

## 10. リスクと回避
- 誤情報：出典必須、未確定は `draft/review` 止め。
- 差別・偏見：ポリシーに基づき**地図掲載を制限**。学習教材として**抽象化**。
- プライバシー：個人特定情報を**削除/丸め**。通報窓口と迅速対応。