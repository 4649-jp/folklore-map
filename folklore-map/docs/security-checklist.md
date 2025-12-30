# セキュリティチェックリスト

民俗学マッププロジェクトのセキュリティ対策実装状況と確認事項

## 実装済みセキュリティ対策

### 1. HTTPセキュリティヘッダー ✅

**実装場所**: `next.config.ts`

#### Content Security Policy (CSP)
- ✅ `default-src 'self'` - デフォルトは同一オリジンのみ
- ✅ `script-src` - Google Maps API許可、unsafe-eval/unsafe-inline（Next.js要件）
- ✅ `style-src` - Google Fonts許可、unsafe-inline（スタイル要件）
- ✅ `img-src` - データURL、HTTPS、blob許可（地図画像）
- ✅ `connect-src` - Google Maps API、Supabase接続許可
- ✅ `frame-src` - Google Maps埋め込み許可
- ✅ `object-src 'none'` - Flash等のオブジェクト禁止
- ✅ `base-uri 'self'` - ベースURL固定
- ✅ `form-action 'self'` - フォーム送信先制限
- ✅ `frame-ancestors 'none'` - iframe埋め込み禁止
- ✅ `upgrade-insecure-requests` - HTTP→HTTPS自動アップグレード

#### その他セキュリティヘッダー
- ✅ **Strict-Transport-Security**: HTTPS強制（1年間、サブドメイン含む）
- ✅ **X-Frame-Options**: DENY（クリックジャッキング対策）
- ✅ **X-Content-Type-Options**: nosniff（MIMEスニッフィング防止）
- ✅ **X-XSS-Protection**: 1; mode=block（XSS保護）
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin（リファラー制限）
- ✅ **Permissions-Policy**: カメラ/マイク無効、位置情報は自身のみ

### 2. レート制限 ✅

**実装場所**: `src/lib/rate-limit.ts`

#### 実装内容
- ✅ インメモリベースのレート制限（開発環境）
- ✅ IPアドレスベースの制限
- ✅ カスタマイズ可能なウィンドウ時間と上限値
- ✅ Retry-Afterヘッダー対応
- ✅ X-RateLimit-* ヘッダー対応

#### 適用済みエンドポイント
- ✅ **GET/POST /api/geocode**: 30 req/min/IP
- ✅ **POST /api/spots**: 10 req/min/user
- ✅ **POST /api/flags**: 5 req/min/IP
- ✅ **一般API**: 100 req/min/IP

#### 本番環境での推奨
⚠️ Redisベースのレート制限への移行を推奨
- 複数サーバー間での共有
- 永続化による確実な制限
- より高度な制限ロジック

### 3. 入力サニタイゼーション ✅

**実装場所**: `src/lib/sanitize.ts`

#### 実装済み機能
- ✅ **HTML エスケープ**: `escapeHtml()` - XSS対策
- ✅ **HTML タグ除去**: `stripHtml()` - 不要なマークアップ削除
- ✅ **URL サニタイゼーション**: `sanitizeUrl()` - javascript:等の危険なプロトコル除外
- ✅ **NULL バイト除去**: `removeNullBytes()` - NULL バイト攻撃対策
- ✅ **ホワイトスペース正規化**: `normalizeWhitespace()` - 不要な空白除去
- ✅ **テキスト切り詰め**: `truncateText()` - 長すぎる入力の制限
- ✅ **包括的サニタイゼーション**: `sanitizeUserContent()` - すべての対策を統合
- ✅ **オブジェクトサニタイゼーション**: `sanitizeObject()` - JSON/フォームデータ用
- ✅ **XSS パターン検出**: `containsXssPatterns()` - 危険なパターン検出
- ✅ **ファイル名サニタイゼーション**: `sanitizeFilename()` - パストラバーサル対策

#### 適用推奨箇所
- ⚠️ スポット投稿（title, description）
- ⚠️ 出典情報（citation, url）
- ⚠️ 通報コメント（memo）
- ⚠️ 検索クエリ

### 4. Zodバリデーション ✅

**実装場所**: `src/lib/schemas/*.ts`

#### 実装済みスキーマ
- ✅ **SpotCreateSchema**: スポット作成時の厳密な型チェック
- ✅ **SpotUpdateSchema**: スポット更新時のバリデーション
- ✅ **GeocodeRequestSchema**: ジオコーディングリクエスト検証
- ✅ **FlagCreateSchema**: 通報作成時の検証

#### バリデーション内容
- ✅ 文字列長の制限（title: 2-80文字、description: ≤3000文字）
- ✅ 必須フィールドチェック（出典1件以上必須）
- ✅ enum値の検証（icon_type, status, reason等）
- ✅ URL形式の検証
- ✅ 緯度経度の範囲チェック

### 5. 認証・認可 ✅

**実装場所**: `src/lib/auth.ts`, `supabase/policies.sql`

#### 実装内容
- ✅ **Supabase Auth**: JWT トークンベース認証
- ✅ **ロールベース権限**: viewer/editor/reviewer/admin
- ✅ **Row Level Security (RLS)**: データベースレベルのアクセス制御
- ✅ **APIレベル権限チェック**: 各エンドポイントで権限確認

#### RLSポリシー
- ✅ 公開スポットは誰でも閲覧可能
- ✅ 編集者は自分のDRAFT/REVIEWスポットのみ編集可能
- ✅ レビュワーは全スポット編集可能、通報管理可能
- ✅ 管理者は全データアクセス・削除可能

### 6. Prisma ORM ✅

#### セキュリティ利点
- ✅ **SQLインジェクション対策**: パラメータ化クエリ自動生成
- ✅ **型安全**: TypeScriptによるコンパイル時チェック
- ✅ **トランザクション**: データ整合性保証

## 未実装・要検討項目

### 1. 画像アップロード対策 ⚠️

現在、画像アップロード機能は実装されていませんが、将来実装する場合:

- [ ] EXIF データ削除（位置情報漏洩防止）
- [ ] ファイルタイプ検証（MIME type偽装防止）
- [ ] ファイルサイズ制限
- [ ] ウイルススキャン
- [ ] 画像最適化・リサイズ
- [ ] CDN配信

### 2. ログ・監視 ⚠️

- [ ] セキュリティイベントログ記録
  - 認証失敗
  - レート制限超過
  - 権限エラー
  - XSSパターン検出
- [ ] 異常検知・アラート
- [ ] アクセスログ分析
- [ ] PII（個人識別情報）のログ除外

### 3. CSRF対策 ⚠️

Next.jsのデフォルト対策:
- ✅ SameSite Cookie属性
- ✅ Origin/Referer ヘッダーチェック（ブラウザ実装）

追加検討事項:
- [ ] CSRF トークン明示的実装（高セキュリティ要件の場合）

### 4. APIキー管理 ⚠️

現状:
- ✅ 環境変数での管理（`.env.local`）
- ✅ クライアント公開キーとサーバー専用キーの分離

改善案:
- [ ] キーローテーション手順の確立
- [ ] Secrets Manager使用（AWS/GCP/Azure）
- [ ] キー漏洩検知

### 5. DDoS対策 ⚠️

現状:
- ✅ レート制限（アプリケーションレベル）

本番環境での推奨:
- [ ] Cloudflare/AWS WAF導入
- [ ] CDN活用
- [ ] ロードバランサー設定
- [ ] Auto-scaling設定

### 6. セッション管理 ⚠️

Supabase Authが管理:
- ✅ HTTPOnly Cookie（XSS対策）
- ✅ Secure Cookie（HTTPS通信）
- ✅ SameSite属性（CSRF対策）

追加検討:
- [ ] セッションタイムアウト設定
- [ ] 多重ログイン制御
- [ ] セッション無効化API

## セキュリティテスト項目

### 手動テスト

- [ ] XSS攻撃テスト
  - `<script>alert('XSS')</script>` をフォームに入力
  - `javascript:alert('XSS')` をURL欄に入力
- [ ] SQLインジェクションテスト
  - `' OR '1'='1` を検索欄に入力
- [ ] CSRF攻撃テスト
  - 外部サイトからのPOSTリクエスト
- [ ] レート制限テスト
  - 短時間での大量リクエスト
- [ ] 権限テスト
  - 異なるロールでのアクセス試行
- [ ] セッションテスト
  - ログアウト後の認証状態確認

### 自動テスト（T09で実装予定）

- [ ] ユニットテスト: サニタイゼーション関数
- [ ] 統合テスト: 認証フロー
- [ ] E2Eテスト: セキュリティシナリオ

## セキュリティインシデント対応

### 発見した場合の手順

1. **即座の対応**
   - 影響範囲の特定
   - 攻撃の遮断（IPブロック、APIキー無効化等）
   - サービス一時停止の判断

2. **調査**
   - ログ分析
   - 影響を受けたデータの特定
   - 攻撃手法の解析

3. **復旧**
   - 脆弱性修正
   - データ復元
   - サービス再開

4. **事後対応**
   - ユーザーへの通知（必要な場合）
   - 再発防止策の実施
   - インシデントレポート作成

## 定期的なセキュリティレビュー

### 月次チェック

- [ ] 依存関係の脆弱性スキャン（`npm audit`）
- [ ] アクセスログレビュー
- [ ] レート制限の適切性確認

### 四半期チェック

- [ ] セキュリティヘッダーの有効性確認
- [ ] 認証・認可ロジックのレビュー
- [ ] サニタイゼーション実装の監査

### 年次チェック

- [ ] 包括的なペネトレーションテスト
- [ ] サードパーティライブラリの全面見直し
- [ ] セキュリティポリシーの更新

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js セキュリティガイド](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Supabase セキュリティベストプラクティス](https://supabase.com/docs/guides/platform/security)
- [Prisma セキュリティガイド](https://www.prisma.io/docs/concepts/components/prisma-client/security)

---

**最終更新**: 2025-11-11
**次回レビュー予定**: 2025-12-11
