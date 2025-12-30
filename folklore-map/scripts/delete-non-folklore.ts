import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 削除対象のスポットID（民俗学に関係のないもの）
const deleteTargets = [
  // 観光地・自然景観
  'cmhraul2c00183oiaypalrpox', // 三春滝桜
  'cmhraumgp00503oiapsg7oq2u', // 四万十川
  'cmhraumdl004u3oiacf751y02', // 小豆島の二十四の瞳
  'cmhraum82004g3oias5hcu2k8', // 尾道の猫の細道
  'cmhraumoh005o3oiat2x0ssum', // 屋久島の縄文杉
  'cmhraum77004e3oiaqaqi9587', // 岡山後楽園
  'cmhraumml005g3oiavcyqarfz', // 由布院温泉
  'cmhraulfy00263oiahro8pk0u', // 草津温泉の湯畑
  'cmhraum1o003w3oiabk0yc75v', // 道後温泉
  'cmhraum9n004k3oia8hcs0jmk', // 秋芳洞
  'cmhrauml9005c3oiacsbtb4o4', // グラバー園
  'cmhraulbt001y3oiakk1kzl6s', // 犬吠埼の人魚伝説（人魚伝説なので本来残すべきだが重複）

  // 建築物・城郭
  'cmhraulfe00243oiat3svjiz3', // 川越の時の鐘
  'cmhraulws003i3oiaroq8xs3y', // 大阪城と豊臣秀吉
  'cmhraulxx003k3oia9vwe8i12', // 姫路城の白鷺城
  'cmhraulpd002u3oiayi1d1ikh', // 犬山城
  'cmhraultg00363oiargrwaipm', // 彦根城と井伊家
  'cmhraum5y004a3oiabqg2ry17', // 松江城と堀尾吉晴
  'cmhraul68001i3oiazkigphpu', // 江戸城の天守
  'cmhraulqs002y3oiayaqkswix', // 白川郷合掌造り
  'cmhraum8s004i3oiaa08h8ljz', // 錦帯橋
  'cmhraum4100443oiayiuuqoew', // 首里城
  'cmhraumpa005q3oia0oj3kbn2', // 琉球王国の守礼門

  // 寺社建築（民俗学的伝承がないもの）
  'cmhraulrf00303oiaor0dyigw', // 伊勢神宮
  'cmhraum0j003s3oiafze3kkre', // 厳島神社
  'cmhraulh3002a3oiazza65cwj', // 善光寺
  'cmhraulch00203oiafpu36deq', // 榛名山の榛名神社
  'cmhraulty00383oia0da5yru8', // 比叡山延暦寺
  'cmhraul5r001g3oia5p8i1aof', // 浅草寺の雷門
  'cmhraulv8003c3oiac0rzgi62', // 清水寺
  'cmhraulyk003m3oia0dz0ila4', // 東大寺の大仏
  'cmhraulav001w3oiax4ubw7yv', // 香取神宮
  'cmhraul7h001m3oiaodpnc0pi', // 鎌倉大仏
  'cmhraulwb003g3oiaormpsz6i', // 金閣寺
  'cmhraulkp002k3oiamd2o4ar6', // 身延山久遠寺
  'cmhraul9g001s3oiaplg11dgy', // 日光東照宮と眠り猫

  // 歴史上の人物・歴史的事件
  'cmhrau6kx000w3o02emc0met8', // 伊達政宗と独眼竜
  'cmhraukwi000w3oiarok2ykpp', // 伊達政宗と独眼竜
  'cmhraul0500143oia8x2y5ez3', // 会津白虎隊
  'cmhraumd3004s3oia3trwysbz', // 屋島の源平合戦
  'cmhrau6j1000q3o02o6950mbz', // 津軽為信と弘前城
  'cmhraukug000q3oia1o5p46u2', // 津軽為信と弘前城
  'cmhraumff004y3oiayr7i7aob', // 桂浜と坂本龍馬
  'cmhraumo6005m3oia1xjr0zks', // 西郷隆盛と城山

  // 産業遺産・工芸
  'cmhraumk100583oia3sysk4fq', // 佐賀の有田焼
  'cmhraum6o004c3oiat0sbjet2', // 石見銀山
  'cmhraumkn005a3oia0crppw2g', // 長崎の軍艦島

  // 祭り・行事（民俗学的背景が薄いもの）
  'cmhraumha00523oiagfek7gy0', // 博多祇園山笠
  'cmhrauldn00223oialzk2vm14', // 秩父夜祭
  'cmhraulpz002w3oia608mzbve', // 高山祭

  // その他
  'cmhraulo0002s3oiahsroit31', // 名古屋城の金鯱
  'cmhrauls200323oiarhxw84m9', // 鳥羽の海女
  'cmhraumjd00563oia05yi9cw8', // 吉野ヶ里遺跡
];

async function main() {
  console.log(`削除対象: ${deleteTargets.length}件\n`);

  for (let i = 0; i < deleteTargets.length; i++) {
    const id = deleteTargets[i];

    try {
      // スポット情報を取得
      const spot = await prisma.spot.findUnique({
        where: { id },
        select: { title: true }
      });

      if (!spot) {
        console.log(`[${i + 1}/${deleteTargets.length}] ID: ${id} - スポットが見つかりません（スキップ）`);
        continue;
      }

      console.log(`[${i + 1}/${deleteTargets.length}] 削除中: ${spot.title} (ID: ${id})`);

      // 関連するSource, Flagも自動的にCascade削除される
      await prisma.spot.delete({
        where: { id }
      });

      console.log(`  ✓ 削除完了\n`);
    } catch (error) {
      console.error(`  ✗ エラー:`, error);
    }
  }

  // 残ったスポット数を確認
  const remainingCount = await prisma.spot.count();
  console.log('=' .repeat(50));
  console.log(`削除完了`);
  console.log(`削除件数: ${deleteTargets.length}件`);
  console.log(`残存件数: ${remainingCount}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
