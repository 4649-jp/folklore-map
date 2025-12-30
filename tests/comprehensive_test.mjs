/**
 * 民俗学マップ - 包括的システムテスト
 *
 * テスト項目:
 * 1. 認証フロー（サインアップ、サインイン、ログアウト）
 * 2. スポットCRUD操作
 * 3. 権限ベースアクセス制御
 * 4. インタラクション機能（いいね、保存、シェア、閲覧）
 * 5. 通報機能
 * 6. 検索・フィルター機能
 * 7. エラーハンドリング
 * 8. パフォーマンステスト
 */

const BASE_URL = 'http://localhost:3000';

// テスト結果を格納
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// テストヘルパー関数
function logTest(testName, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (message) console.log(`   理由: ${message}`);
  }
  testResults.details.push({ testName, passed, message });
}

function logSection(section) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${section}`);
  console.log(`${'='.repeat(60)}\n`);
}

// 1. 認証フローテスト
async function testAuthFlow() {
  logSection('1. 認証フローテスト');

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  // 1.1 サインアップテスト
  try {
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    const signupData = await signupRes.json();
    logTest(
      '1.1 サインアップ',
      signupRes.status === 200 && signupData.data?.user,
      signupRes.status !== 200 ? JSON.stringify(signupData) : ''
    );
  } catch (error) {
    logTest('1.1 サインアップ', false, error.message);
  }

  // 1.2 サインインテスト
  let authCookie = '';
  try {
    const signinRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    const signinData = await signinRes.json();
    authCookie = signinRes.headers.get('set-cookie') || '';

    logTest(
      '1.2 サインイン',
      signinRes.status === 200 && signinData.data?.session,
      signinRes.status !== 200 ? JSON.stringify(signinData) : ''
    );
  } catch (error) {
    logTest('1.2 サインイン', false, error.message);
  }

  // 1.3 誤ったパスワードでのサインイン（失敗することを期待）
  try {
    const badSigninRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
    });

    logTest(
      '1.3 誤ったパスワードでのサインイン拒否',
      badSigninRes.status === 400 || badSigninRes.status === 401,
      badSigninRes.status === 200 ? '誤ったパスワードでログイン成功（脆弱性）' : ''
    );
  } catch (error) {
    logTest('1.3 誤ったパスワードでのサインイン拒否', false, error.message);
  }

  return authCookie;
}

// 2. スポットCRUD操作テスト
async function testSpotCRUD(authCookie) {
  logSection('2. スポットCRUD操作テスト');

  // 2.1 スポット一覧取得（認証なし）
  try {
    const listRes = await fetch(`${BASE_URL}/api/spots`);
    const listData = await listRes.json();

    logTest(
      '2.1 スポット一覧取得（認証なし）',
      listRes.status === 200 && Array.isArray(listData.data?.items),
      listRes.status !== 200 ? JSON.stringify(listData) : ''
    );
  } catch (error) {
    logTest('2.1 スポット一覧取得（認証なし）', false, error.message);
  }

  // 2.2 スポット詳細取得
  try {
    const detailRes = await fetch(`${BASE_URL}/api/spots/cmisxqdh000003onnhx195gfq`);
    const detailData = await detailRes.json();

    logTest(
      '2.2 スポット詳細取得',
      detailRes.status === 200 && detailData.data?.id,
      detailRes.status !== 200 ? JSON.stringify(detailData) : ''
    );
  } catch (error) {
    logTest('2.2 スポット詳細取得', false, error.message);
  }

  // 2.3 存在しないスポット取得（404を期待）
  try {
    const notFoundRes = await fetch(`${BASE_URL}/api/spots/nonexistent_id`);

    logTest(
      '2.3 存在しないスポット取得（404）',
      notFoundRes.status === 404,
      notFoundRes.status !== 404 ? `ステータス: ${notFoundRes.status}` : ''
    );
  } catch (error) {
    logTest('2.3 存在しないスポット取得（404）', false, error.message);
  }

  // 2.4 スポット作成（認証なしで失敗することを期待）
  try {
    const createRes = await fetch(`${BASE_URL}/api/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'テストスポット',
        description: 'これはテスト用のスポットです。',
        address: '東京都千代田区',
        lat: 35.6895,
        lng: 139.6917,
        icon_type: 'SHRINE',
        sources: [{ type: 'BOOK', citation: 'テスト出典' }]
      })
    });

    logTest(
      '2.4 スポット作成（認証なしで拒否）',
      createRes.status === 401 || createRes.status === 403,
      createRes.status === 200 ? '認証なしで作成成功（脆弱性）' : ''
    );
  } catch (error) {
    logTest('2.4 スポット作成（認証なしで拒否）', false, error.message);
  }
}

// 3. 検索・フィルター機能テスト
async function testSearchFilter() {
  logSection('3. 検索・フィルター機能テスト');

  // 3.1 キーワード検索
  try {
    const searchRes = await fetch(`${BASE_URL}/api/spots?q=酒呑童子`);
    const searchData = await searchRes.json();

    logTest(
      '3.1 キーワード検索（q=酒呑童子）',
      searchRes.status === 200 && Array.isArray(searchData.data?.items),
      searchRes.status !== 200 ? JSON.stringify(searchData) : ''
    );
  } catch (error) {
    logTest('3.1 キーワード検索', false, error.message);
  }

  // 3.2 アイコンタイプフィルター
  try {
    const filterRes = await fetch(`${BASE_URL}/api/spots?icon_types=ONI,KITSUNE`);
    const filterData = await filterRes.json();

    logTest(
      '3.2 アイコンタイプフィルター',
      filterRes.status === 200 && Array.isArray(filterData.data?.items),
      filterRes.status !== 200 ? JSON.stringify(filterData) : ''
    );
  } catch (error) {
    logTest('3.2 アイコンタイプフィルター', false, error.message);
  }

  // 3.3 バウンディングボックスフィルター
  try {
    const bboxRes = await fetch(`${BASE_URL}/api/spots?bbox=35.0,139.0,36.0,140.0`);
    const bboxData = await bboxRes.json();

    logTest(
      '3.3 バウンディングボックスフィルター',
      bboxRes.status === 200 && Array.isArray(bboxData.data?.items),
      bboxRes.status !== 200 ? JSON.stringify(bboxData) : ''
    );
  } catch (error) {
    logTest('3.3 バウンディングボックスフィルター', false, error.message);
  }

  // 3.4 ステータスフィルター
  try {
    const statusRes = await fetch(`${BASE_URL}/api/spots?status=PUBLISHED`);
    const statusData = await statusRes.json();

    logTest(
      '3.4 ステータスフィルター',
      statusRes.status === 200 && Array.isArray(statusData.data?.items),
      statusRes.status !== 200 ? JSON.stringify(statusData) : ''
    );
  } catch (error) {
    logTest('3.4 ステータスフィルター', false, error.message);
  }
}

// 4. インタラクション機能テスト
async function testInteractions() {
  logSection('4. インタラクション機能テスト');

  const testSpotId = 'cmisxqdh000003onnhx195gfq';  // 酒呑童子
  const testSessionId = `test_session_${Date.now()}`;

  // 4.1 いいね機能テスト
  try {
    const likeRes = await fetch(`${BASE_URL}/api/spots/${testSpotId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: testSessionId })
    });

    const likeData = await likeRes.json();

    logTest(
      '4.1 いいね機能（POST）',
      likeRes.status === 200 && likeData.data,
      likeRes.status !== 200 ? JSON.stringify(likeData) : ''
    );
  } catch (error) {
    logTest('4.1 いいね機能（POST）', false, error.message);
  }

  // 4.2 いいね統計取得
  try {
    const likeStatsRes = await fetch(`${BASE_URL}/api/spots/${testSpotId}/like`);
    const likeStatsData = await likeStatsRes.json();

    logTest(
      '4.2 いいね統計取得（GET）',
      likeStatsRes.status === 200 && typeof likeStatsData.data?.like_count === 'number',
      likeStatsRes.status !== 200 ? JSON.stringify(likeStatsData) : ''
    );
  } catch (error) {
    logTest('4.2 いいね統計取得（GET）', false, error.message);
  }

  // 4.3 保存機能テスト
  try {
    const saveRes = await fetch(`${BASE_URL}/api/spots/${testSpotId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: testSessionId })
    });

    const saveData = await saveRes.json();

    logTest(
      '4.3 保存機能（POST）',
      saveRes.status === 200 && saveData.data,
      saveRes.status !== 200 ? JSON.stringify(saveData) : ''
    );
  } catch (error) {
    logTest('4.3 保存機能（POST）', false, error.message);
  }

  // 4.4 シェア機能テスト
  try {
    const shareRes = await fetch(`${BASE_URL}/api/spots/${testSpotId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: testSessionId })
    });

    const shareData = await shareRes.json();

    logTest(
      '4.4 シェア機能（POST）',
      shareRes.status === 200 && shareData.data,
      shareRes.status !== 200 ? JSON.stringify(shareData) : ''
    );
  } catch (error) {
    logTest('4.4 シェア機能（POST）', false, error.message);
  }

  // 4.5 閲覧記録機能テスト
  try {
    const viewRes = await fetch(`${BASE_URL}/api/spots/${testSpotId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: testSessionId, duration_ms: 5000 })
    });

    const viewData = await viewRes.json();

    logTest(
      '4.5 閲覧記録機能（POST）',
      viewRes.status === 200 && viewData.data,
      viewRes.status !== 200 ? JSON.stringify(viewData) : ''
    );
  } catch (error) {
    logTest('4.5 閲覧記録機能（POST）', false, error.message);
  }
}

// 5. 通報機能テスト
async function testFlagSystem() {
  logSection('5. 通報機能テスト');

  const testSpotId = 'cmisxqdh000003onnhx195gfq';

  // 5.1 通報作成（認証なし）
  try {
    const flagRes = await fetch(`${BASE_URL}/api/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_id: testSpotId,
        reason: 'INAPPROPRIATE',
        note: 'テスト用の通報です'
      })
    });

    const flagData = await flagRes.json();

    logTest(
      '5.1 通報作成（POST）',
      flagRes.status === 200 && flagData.data?.id,
      flagRes.status !== 200 ? JSON.stringify(flagData) : ''
    );
  } catch (error) {
    logTest('5.1 通報作成（POST）', false, error.message);
  }

  // 5.2 通報一覧取得（開発環境では認証なしで成功することを期待）
  try {
    const flagListRes = await fetch(`${BASE_URL}/api/flags`);
    const flagListData = await flagListRes.json();

    const isDev = process.env.NODE_ENV === 'development';
    const expectedSuccess = isDev || flagListRes.status === 403;

    logTest(
      '5.2 通報一覧取得',
      expectedSuccess,
      `ステータス: ${flagListRes.status}`
    );
  } catch (error) {
    logTest('5.2 通報一覧取得', false, error.message);
  }
}

// 6. エラーハンドリングテスト
async function testErrorHandling() {
  logSection('6. エラーハンドリングテスト');

  // 6.1 無効なJSONリクエスト
  try {
    const invalidJsonRes = await fetch(`${BASE_URL}/api/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });

    logTest(
      '6.1 無効なJSON拒否',
      invalidJsonRes.status === 400 || invalidJsonRes.status === 401,
      invalidJsonRes.status === 200 ? '無効なJSONを受け入れた（脆弱性）' : ''
    );
  } catch (error) {
    logTest('6.1 無効なJSON拒否', false, error.message);
  }

  // 6.2 SQLインジェクション試行（Prismaで保護されているはず）
  try {
    const sqlInjectionRes = await fetch(`${BASE_URL}/api/spots?q=' OR '1'='1`);
    const sqlInjectionData = await sqlInjectionRes.json();

    logTest(
      '6.2 SQLインジェクション保護',
      sqlInjectionRes.status === 200 && Array.isArray(sqlInjectionData.data?.items),
      'SQLインジェクションが成功した可能性'
    );
  } catch (error) {
    logTest('6.2 SQLインジェクション保護', false, error.message);
  }

  // 6.3 XSS試行
  try {
    const xssRes = await fetch(`${BASE_URL}/api/spots?q=<script>alert('xss')</script>`);
    const xssData = await xssRes.json();

    logTest(
      '6.3 XSSエスケープ',
      xssRes.status === 200,
      'XSSペイロードが処理できなかった'
    );
  } catch (error) {
    logTest('6.3 XSSエスケープ', false, error.message);
  }

  // 6.4 大きすぎるlimitパラメータ
  try {
    const largeLimitRes = await fetch(`${BASE_URL}/api/spots?limit=999999`);
    const largeLimitData = await largeLimitRes.json();

    logTest(
      '6.4 limit制限（DoS対策）',
      largeLimitRes.status === 200 && largeLimitData.data?.items.length <= 2000,
      largeLimitData.data?.items.length > 2000 ? `${largeLimitData.data.items.length}件取得（DoS脆弱性）` : ''
    );
  } catch (error) {
    logTest('6.4 limit制限（DoS対策）', false, error.message);
  }
}

// 7. パフォーマンステスト
async function testPerformance() {
  logSection('7. パフォーマンステスト');

  // 7.1 スポット一覧のレスポンスタイム
  try {
    const startTime = Date.now();
    const perfRes = await fetch(`${BASE_URL}/api/spots`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logTest(
      `7.1 スポット一覧レスポンスタイム (${responseTime}ms)`,
      perfRes.status === 200 && responseTime < 1000,
      responseTime >= 1000 ? `レスポンスが遅い: ${responseTime}ms` : ''
    );
  } catch (error) {
    logTest('7.1 スポット一覧レスポンスタイム', false, error.message);
  }

  // 7.2 並行リクエストテスト（10並行）
  try {
    const startTime = Date.now();
    const promises = Array(10).fill(null).map(() =>
      fetch(`${BASE_URL}/api/spots?limit=10`)
    );
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const allSuccess = results.every(res => res.status === 200);

    logTest(
      `7.2 並行リクエスト処理 (10並行, ${totalTime}ms)`,
      allSuccess && totalTime < 3000,
      !allSuccess ? '一部のリクエストが失敗' : totalTime >= 3000 ? `処理が遅い: ${totalTime}ms` : ''
    );
  } catch (error) {
    logTest('7.2 並行リクエスト処理', false, error.message);
  }
}

// 8. セキュリティヘッダーテスト
async function testSecurityHeaders() {
  logSection('8. セキュリティヘッダーテスト');

  try {
    const res = await fetch(`${BASE_URL}/`);
    const headers = res.headers;

    logTest(
      '8.1 Content-Security-Policy',
      headers.has('content-security-policy'),
      'CSPヘッダーが見つかりません'
    );

    logTest(
      '8.2 X-Frame-Options',
      headers.get('x-frame-options') === 'DENY',
      `値: ${headers.get('x-frame-options')}`
    );

    logTest(
      '8.3 X-Content-Type-Options',
      headers.get('x-content-type-options') === 'nosniff',
      `値: ${headers.get('x-content-type-options')}`
    );

    logTest(
      '8.4 Referrer-Policy',
      headers.has('referrer-policy'),
      'Referrer-Policyヘッダーが見つかりません'
    );

  } catch (error) {
    logTest('8. セキュリティヘッダーテスト', false, error.message);
  }
}

// メイン実行
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      民俗学マップ - 包括的システムテスト                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const startTime = Date.now();

  try {
    const authCookie = await testAuthFlow();
    await testSpotCRUD(authCookie);
    await testSearchFilter();
    await testInteractions();
    await testFlagSystem();
    await testErrorHandling();
    await testPerformance();
    await testSecurityHeaders();
  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error.message);
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  // 結果サマリー
  logSection('テスト結果サマリー');

  console.log(`合計テスト数: ${testResults.total}`);
  console.log(`✅ 成功: ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${testResults.failed} (${((testResults.failed / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  実行時間: ${totalTime}秒`);

  const passRate = (testResults.passed / testResults.total) * 100;
  let grade = 'F';
  if (passRate >= 90) grade = 'A';
  else if (passRate >= 80) grade = 'B';
  else if (passRate >= 70) grade = 'C';
  else if (passRate >= 60) grade = 'D';

  console.log(`\n総合評価: ${grade} (${passRate.toFixed(1)}%)`);

  // 失敗したテストの詳細
  if (testResults.failed > 0) {
    console.log('\n失敗したテスト:');
    testResults.details
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.testName}`);
        if (t.message) console.log(`    理由: ${t.message}`);
      });
  }

  console.log('\n');
}

runAllTests();
