/**
 * 負荷テスト - 民俗学マップ
 */

const BASE_URL = 'http://localhost:3000';

// 負荷テスト: 同時リクエスト
async function loadTest(concurrent, endpoint, label) {
  console.log(`\n[${label}] 負荷テスト開始...`);
  console.log(`  同時接続数: ${concurrent}`);
  console.log(`  エンドポイント: ${endpoint}`);

  const startTime = Date.now();
  const promises = [];
  const results = {
    success: 0,
    failed: 0,
    responseTimes: []
  };

  for (let i = 0; i < concurrent; i++) {
    const reqStartTime = Date.now();
    const promise = fetch(`${BASE_URL}${endpoint}`)
      .then(res => {
        const reqEndTime = Date.now();
        const responseTime = reqEndTime - reqStartTime;
        results.responseTimes.push(responseTime);

        if (res.status === 200) {
          results.success++;
        } else {
          results.failed++;
        }
        return res;
      })
      .catch(err => {
        results.failed++;
        return null;
      });

    promises.push(promise);
  }

  await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // 統計計算
  const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const minResponseTime = Math.min(...results.responseTimes);
  const maxResponseTime = Math.max(...results.responseTimes);
  const p95ResponseTime = results.responseTimes.sort((a, b) => a - b)[Math.floor(results.responseTimes.length * 0.95)];

  console.log(`\n結果:`);
  console.log(`  総実行時間: ${totalTime}ms`);
  console.log(`  成功: ${results.success}/${concurrent} (${((results.success / concurrent) * 100).toFixed(1)}%)`);
  console.log(`  失敗: ${results.failed}/${concurrent}`);
  console.log(`  平均レスポンスタイム: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  最小レスポンスタイム: ${minResponseTime}ms`);
  console.log(`  最大レスポンスタイム: ${maxResponseTime}ms`);
  console.log(`  P95レスポンスタイム: ${p95ResponseTime}ms`);
  console.log(`  リクエスト/秒: ${((concurrent / totalTime) * 1000).toFixed(2)} req/s`);

  return results;
}

// レート制限テスト
async function rateLimitTest() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  レート制限テスト`);
  console.log(`${'='.repeat(60)}`);

  // ジオコーディングAPI（30 req/min = 0.5 req/s）
  console.log(`\n[ジオコーディングAPI] レート制限テスト`);
  console.log(`  制限: 30 req/min (0.5 req/s)`);
  console.log(`  テスト: 35リクエストを送信`);

  const results = {
    success: 0,
    rateLimited: 0,
    failed: 0
  };

  for (let i = 0; i < 35; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '東京都千代田区' })
      });

      if (res.status === 200) {
        results.success++;
      } else if (res.status === 429) {
        results.rateLimited++;
      } else if (res.status === 401) {
        // 認証が必要
        break;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }

    // 少し待つ（100ms）
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n結果:`);
  console.log(`  成功: ${results.success}`);
  console.log(`  レート制限: ${results.rateLimited}`);
  console.log(`  失敗: ${results.failed}`);
  console.log(`  評価: ${results.rateLimited > 0 ? '✅ レート制限が機能している' : '⚠️ レート制限が検出されない'}`);
}

// メイン実行
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           民俗学マップ - 負荷テスト                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // 1. 軽負荷テスト (10並行)
  await loadTest(10, '/api/spots?limit=10', '軽負荷テスト');

  // 2. 中負荷テスト (50並行)
  await loadTest(50, '/api/spots?limit=10', '中負荷テスト');

  // 3. 重負荷テスト (100並行)
  await loadTest(100, '/api/spots?limit=10', '重負荷テスト');

  // 4. 大量データ取得テスト
  await loadTest(10, '/api/spots?limit=1000', '大量データ取得テスト');

  // 5. 検索負荷テスト
  await loadTest(20, '/api/spots?q=酒呑童子', '検索負荷テスト');

  // 6. レート制限テスト
  await rateLimitTest();

  console.log('\n負荷テスト完了\n');
}

main();
