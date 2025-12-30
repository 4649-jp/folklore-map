import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 民俗学に関連するスポットのタイトルキーワード
const folkloreKeywords = [
  // 妖怪・怪異
  '妖怪', '鬼', '天狗', '河童', 'カッパ', '狐', 'キツネ', '龍', '竜', 'なまはげ',
  '座敷わらし', '雪女', '人魚', '鬼婆', '酒呑童子', 'ガマ仙人', '狐火',

  // 神話・伝説
  '神話', '伝説', 'オロチ', '岩戸', '羽衣', '浦島', '桃太郎', '牛若丸', '弁慶',
  '安寿', '厨子王', '義経', '将門', '怨霊',

  // 民間信仰・霊場
  'イタコ', '即身仏', '山伏', '修験', '霊場', '巡礼', '遠野物語',

  // 神事・儀式
  '神馬', '御柱',
];

// 削除対象（観光地・建築物・歴史上の人物など）
const nonFolkloreKeywords = [
  // 建築物・城郭
  '城', '園', '橋', '温泉', '湯', '大仏', '寺', '宮',

  // 歴史上の人物
  '政宗', '秀吉', '龍馬', '西郷', '白虎隊',

  // 自然・景観
  '川', '山', '島', '滝桜', '砂丘', '渦潮', '杉', '峡', '洞',

  // 産業・文化
  '焼', '海女', '軍艦島', '銀山', '祭',

  // その他観光
  '猫の細道', '時の鐘', '二十四の瞳',
];

async function main() {
  const spots = await prisma.spot.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`総スポット数: ${spots.length}\n`);
  console.log('=' .repeat(80));

  const folklore: typeof spots = [];
  const nonFolklore: typeof spots = [];
  const ambiguous: typeof spots = [];

  for (const spot of spots) {
    const titleLower = spot.title.toLowerCase();
    const descLower = spot.description.toLowerCase();

    // 民俗学キーワードチェック
    const hasFolklore = folkloreKeywords.some(keyword =>
      titleLower.includes(keyword.toLowerCase()) ||
      descLower.includes(keyword.toLowerCase())
    );

    // 非民俗学キーワードチェック
    const hasNonFolklore = nonFolkloreKeywords.some(keyword =>
      titleLower.includes(keyword.toLowerCase())
    );

    if (hasFolklore && !hasNonFolklore) {
      folklore.push(spot);
    } else if (hasNonFolklore && !hasFolklore) {
      nonFolklore.push(spot);
    } else {
      ambiguous.push(spot);
    }
  }

  console.log(`\n【民俗学関連（残す）】 ${folklore.length}件\n`);
  folklore.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title} (ID: ${s.id})`);
  });

  console.log(`\n${'=' .repeat(80)}`);
  console.log(`\n【民俗学外（削除候補）】 ${nonFolklore.length}件\n`);
  nonFolklore.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title} (ID: ${s.id})`);
  });

  console.log(`\n${'=' .repeat(80)}`);
  console.log(`\n【要確認（手動判定必要）】 ${ambiguous.length}件\n`);
  ambiguous.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title} (ID: ${s.id})`);
    console.log(`   説明: ${s.description.substring(0, 100)}...`);
  });

  console.log(`\n${'=' .repeat(80)}`);
  console.log(`\n統計:`);
  console.log(`  民俗学関連: ${folklore.length}件`);
  console.log(`  削除候補: ${nonFolklore.length}件`);
  console.log(`  要確認: ${ambiguous.length}件`);
  console.log(`  合計: ${spots.length}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
