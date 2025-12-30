# テストスクリプト

このディレクトリには、民俗学マップの自動テストスクリプトが含まれています。

## テストスクリプト一覧

### 1. comprehensive_test.mjs

包括的な機能テストスイート。

**実施項目**:
- 認証フロー（サインアップ、サインイン、ログアウト）
- スポットCRUD操作
- 検索・フィルター機能
- インタラクション機能（いいね、保存、シェア、閲覧）
- 通報機能
- エラーハンドリング
- セキュリティヘッダー

**実行方法**:
```bash
# プロジェクトルートから
node tests/comprehensive_test.mjs

# または開発サーバーが起動している状態で
cd /home/test/codex-test
node tests/comprehensive_test.mjs
```

**期待される結果**:
- 合計28項目のテスト実施
- 成功率80%以上（B評価）
- 実行時間: 約30-40秒

---

### 2. load_test.mjs

パフォーマンスと負荷テストスイート。

**実施項目**:
- 軽負荷テスト（10並行）
- 中負荷テスト（50並行）
- 重負荷テスト（100並行）
- 大量データ取得テスト
- 検索負荷テスト
- レート制限テスト

**実行方法**:
```bash
# プロジェクトルートから
node tests/load_test.mjs
```

**期待される結果**:
- 全テストで100%成功率
- 平均レスポンスタイム: 200ms以下（軽負荷時）
- P95レスポンスタイム: 1300ms以下（重負荷時）
- スループット: 40-75 req/s

---

## 前提条件

### システム起動確認

テストを実行する前に、以下のサービスが起動していることを確認してください:

```bash
# 1. Supabaseローカル環境
supabase status

# 2. Next.js開発サーバー
# 別ターミナルで実行
cd folklore-map
pnpm dev

# 3. アプリケーションの動作確認
curl http://localhost:3000/api/spots
```

---

## テスト結果の確認

### 成功例

```
╔═══════════════════════════════════════════════════════════╗
║      民俗学マップ - 包括的システムテスト                 ║
╚═══════════════════════════════════════════════════════════╝

============================================================
  テスト結果サマリー
============================================================

合計テスト数: 28
✅ 成功: 23 (82.1%)
❌ 失敗: 5 (17.9%)
⏱️  実行時間: 38.78秒

総合評価: B (82.1%)
```

### 失敗時の対応

#### 1. 認証テスト失敗

```
❌ 1.1 サインアップ
   理由: {"error":{"code":"SIGNUP_ERROR","message":"fetch failed"}}
```

**原因**: Supabaseローカル環境が起動していない

**対処法**:
```bash
supabase start
```

---

#### 2. レート制限テスト失敗

```
❌ レート制限が検出されない
```

**原因**: レート制限が実装されていないエンドポイント

**対処法**: これは既知の問題です（`security_audit.md`参照）

---

## 継続的インテグレーション（CI）

GitHub Actionsで自動テストを実行する場合:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Start Supabase
        run: supabase start

      - name: Install dependencies
        run: cd folklore-map && pnpm install

      - name: Run tests
        run: |
          cd folklore-map
          pnpm dev &
          sleep 10
          cd ..
          node tests/comprehensive_test.mjs
          node tests/load_test.mjs
```

---

## トラブルシューティング

### エラー: "fetch failed"

**症状**: 認証テストやAPIリクエストが失敗

**原因**:
1. 開発サーバーが起動していない
2. Supabaseが起動していない
3. ポート3000が使用中

**解決策**:
```bash
# サーバー起動確認
lsof -i :3000

# Supabase起動確認
supabase status

# 開発サーバー再起動
cd folklore-map
pkill -f 'next dev'
pnpm dev
```

---

### エラー: "Connection refused"

**症状**: データベース接続エラー

**原因**: PostgreSQLが起動していない

**解決策**:
```bash
# Supabase再起動
supabase stop
supabase start
```

---

## カスタムテストの追加

新しいテストを追加する場合:

```javascript
// tests/custom_test.mjs
const BASE_URL = 'http://localhost:3000';

async function testMyFeature() {
  console.log('Testing my feature...');

  const res = await fetch(`${BASE_URL}/api/my-endpoint`);
  const data = await res.json();

  if (res.status === 200) {
    console.log('✅ Test passed');
  } else {
    console.log('❌ Test failed');
  }
}

testMyFeature();
```

---

## ベンチマーク基準

### レスポンスタイム

| 評価 | 範囲 |
|------|------|
| ⭐⭐⭐⭐⭐ 優秀 | <200ms |
| ⭐⭐⭐⭐ 良好 | 200-500ms |
| ⭐⭐⭐ 普通 | 500-1000ms |
| ⭐⭐ 改善必要 | 1000-2000ms |
| ⭐ 問題 | >2000ms |

### スループット

| 評価 | 範囲 |
|------|------|
| ⭐⭐⭐⭐⭐ 優秀 | >100 req/s |
| ⭐⭐⭐⭐ 良好 | 50-100 req/s |
| ⭐⭐⭐ 普通 | 25-50 req/s |
| ⭐⭐ 改善必要 | 10-25 req/s |
| ⭐ 問題 | <10 req/s |

---

## 関連ドキュメント

- **総合テストレポート**: `../test_report.md`
- **セキュリティ診断**: `../security_audit.md`
- **API設計書**: `../api_design.md`
- **タスク管理**: `../tasks.md`

---

**最終更新**: 2025年12月12日
