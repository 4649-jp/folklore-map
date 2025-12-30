import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedData = [
  {
    title: "酒呑童子の伝説",
    description:
      "一条天皇の時代、京の若者や姫君が次々と神隠しに遭った。安倍晴明に占わせたところ、大江山に住む鬼・酒呑童子の仕業とわかった。源頼光と藤原保昌らが山伏を装い鬼の居城を訪ね、毒酒を飲ませて退治した。大江山には鬼の岩窟、鬼見の滝、鬼の足跡石など、鬼が残したという痕跡が今も残る。日本の鬼の交流博物館では、この伝説について詳しく学ぶことができる。",
    address: "京都府福知山市大江町",
    icon_type: "ONI" as const,
    era_hint: "平安時代",
    sources: [
      {
        type: "URL" as const,
        citation: "YAMAP MAGAZINE「京都大江山 酒呑童子」",
        url: "https://yamap.com/magazine/11300",
      },
    ],
  },
  {
    title: "九尾の狐と殺生石",
    description:
      "絶世の美女・玉藻前は実は九尾の狐で、天皇を病に陥れた。陰陽師・安倍泰成により正体を暴かれ、上総介広常と三浦之助義純により討伐された。狐は那須の巨大な石に姿を変え、近づく人や家畜を害する毒気を放った。後に玄翁和尚が石を打ち砕き、3つに割れた石の1つがこの地に残る。現在も殺生石として国の名勝に指定され、毎年5月には御神火祭が開催される。",
    address: "栃木県那須郡那須町湯本182",
    icon_type: "KITSUNE" as const,
    era_hint: "平安時代末期",
    sources: [
      {
        type: "URL" as const,
        citation: "那須町「国指定名勝 殺生石と九尾の狐」",
        url: "https://www.town.nasu.lg.jp/0224/info-0000000398-1.html",
      },
    ],
  },
  {
    title: "鞍馬天狗と牛若丸",
    description:
      "鞍馬山の僧正ヶ谷に住む大天狗・鞍馬天狗は、幼い牛若丸（後の源義経）に剣術を教えたという。護法魔王尊は650万年前に金星から降臨したとされ、全ての天狗の長とされる。魔王殿は義経が修行した場所として知られ、鞍馬寺は京都屈指のパワースポットとなっている。木の根道には修行の痕跡が今も残り、多くの参拝者が訪れる。",
    address: "京都府京都市左京区鞍馬本町1074",
    icon_type: "SHRINE" as const,
    era_hint: "平安時代末期",
    sources: [
      {
        type: "URL" as const,
        citation: "京都誘致実行委員会「鞍馬寺」",
        url: "https://www.kic-kyoto.jp/kuramaji/",
      },
    ],
  },
  {
    title: "筑後川の河童伝説",
    description:
      "筑後川には西日本随一の河童・九千坊とその一族九千匹が棲んでいたという。田主丸地区は「河童の町」として全国的に知られ、JR田主丸駅の駅舎も河童の顔をかたどっている。久留米市の水天宮では河童が御護り役として領民を水害から守ることを誓った。北野天満宮には河童の手のミイラが保管され、25年に一度公開される。筑後川の支流・巨瀬川には平清盛が河童になったという伝説も残る。",
    address: "福岡県久留米市田主丸町",
    icon_type: "ANIMAL" as const,
    era_hint: "江戸時代以前",
    sources: [
      {
        type: "URL" as const,
        citation: "久留米市「なぜ河童なの!?」",
        url: "https://www.kurumepr.com/main/170.html",
      },
    ],
  },
  {
    title: "桃太郎と温羅退治",
    description:
      "桃太郎のモデルとされる吉備津彦命が、百済の王子で身長4.2メートル・目が輝き赤髪の温羅を退治した伝説。温羅は鬼ノ城に拠点を構え人々を苦しめていた。吉備津神社には矢置石や釜殿など伝説にまつわる史跡が残る。本殿と拝殿は「吉備津造」という独特の建築様式で国宝に指定され、360メートルの美しい回廊も見どころ。2018年に日本遺産「桃太郎伝説の生まれたまち おかやま」に認定された。",
    address: "岡山県岡山市北区吉備津931",
    icon_type: "SHRINE" as const,
    era_hint: "古代",
    sources: [
      {
        type: "URL" as const,
        citation: "楽天トラベル「吉備津神社ガイド」",
        url: "https://travel.rakuten.co.jp/mytrip/howto/kibitujinja-guide",
      },
    ],
  },
  {
    title: "座敷わらしの緑風荘",
    description:
      "約670年前の南北朝時代、落ち延びる途中で病死した6歳の亀麿が「末代まで一族を守り続ける」と言い残し、奥座敷「槐の間」に座敷わらしとして現れるようになった。1971年に作家・三浦哲郎が「ゆうたと不思議な仲間たち」を発表し全国的に有名になった。2009年に全焼したが2016年に再建され、現在も座敷わらしに会って幸運を授かりたいと多くの人が訪れる。",
    address: "岩手県二戸市金田一字長川41",
    icon_type: "GENERIC" as const,
    era_hint: "南北朝時代",
    sources: [
      {
        type: "URL" as const,
        citation: "緑風荘公式サイト",
        url: "https://www.zashiki-warashi.co.jp/",
      },
    ],
  },
  {
    title: "雪女の伝説",
    description:
      "雪女の最古の記録は室町時代の「宗祇諸国物語」で、越後国（現・新潟県）の僧が目撃した。新潟県小千谷地方では、独身男性の元を訪れた美女が妻となるが、無理に風呂に入れると氷の欠片だけ残して消えてしまう「つらら女」伝説がある。山形県上山地方では、雪の夜に訪れた雪女の手が驚くほど冷たく、煙となって煙突から消える話が伝わる。青森、岩手、福島、長野、和歌山、愛媛、大分にも類似の伝説が確認されている。",
    address: "新潟県小千谷市",
    icon_type: "GENERIC" as const,
    era_hint: "室町時代以前",
    sources: [
      {
        type: "URL" as const,
        citation: "note「新潟県の雪女伝説」",
        url: "https://note.com/echigosado/n/ncda1d66b5149",
      },
    ],
  },
  {
    title: "ヤマタノオロチ退治",
    description:
      "高天原を追放された須佐之男命が出雲国の斐伊川上流に降り立ち、8つの頭と8つの尾を持つ大蛇・ヤマタノオロチを退治した。オロチは毎年娘を食べており、最後に残った奇稲田姫も狙われていた。スサノオは8つの酒樽を用意してオロチを酔わせ、剣で切り倒し、体内から天叢雲剣（草薙剣）を得た。船通山、斐伊川、須我神社、稲田神社、須佐神社など、多くの伝承地が雲南市周辺に点在している。",
    address: "島根県雲南市大東町須賀260",
    icon_type: "DRAGON" as const,
    era_hint: "神話時代",
    sources: [
      {
        type: "URL" as const,
        citation: "島根浪漫旅「ヤマタノオロチ伝説とゆかりの地」",
        url: "https://www.izumo-shinwa.com/yamatanoorochi.html",
      },
    ],
  },
  {
    title: "天の岩戸伝説",
    description:
      "太陽神・天照大御神が弟の須佐之男命の乱暴に怒り、天の岩戸に隠れて世界が闇に包まれた。八百万の神々が天安河原に集まって相談し、天鈿女命が踊り、玉祖命が鏡を作り、天照大御神を岩戸から引き出すことに成功した。天岩戸神社は岩戸川を挟んで西本宮と東本宮が鎮座し、天の岩戸と呼ばれる洞窟を御神体として祀る。川上の天安河原は日本屈指のパワースポットとして知られる。",
    address: "宮崎県西臼杵郡高千穂町岩戸1073-1",
    icon_type: "SHRINE" as const,
    era_hint: "神話時代",
    sources: [
      {
        type: "URL" as const,
        citation: "天岩戸神社公式サイト",
        url: "https://amanoiwato-jinja.jp/",
      },
    ],
  },
  {
    title: "牛若丸と弁慶の出会い",
    description:
      "武蔵坊弁慶が千本の刀を奪う誓いを立て、999本目まで集めた時、五条大橋で牛若丸（後の源義経）と出会い、敗れて主従関係を結んだという伝説。実際には義経記によれば五条天神社と清水寺で2度出会ったとされ、橋での出会いは後の創作とされる。現在の五条大橋は1590年に豊臣秀吉によって南に移されたもので、元の位置は現在の松原橋付近。五条大橋と河原町五条の間の中央分離帯には、対決する義経と弁慶の石像が建つ。",
    address: "京都府京都市下京区五条大橋",
    icon_type: "GENERIC" as const,
    era_hint: "平安時代末期",
    sources: [
      {
        type: "URL" as const,
        citation: "京都トリビア「義経と弁慶は本当に五条の橋の上で出会ったのか!?」",
        url: "https://www.cyber-world.jp.net/yoshitsune-benkei-deai/",
      },
    ],
  },
];

async function main() {
  console.log("データベースに伝承データを登録します...");

  for (const data of seedData) {
    try {
      console.log(`\n「${data.title}」を登録中...`);

      // ジオコーディング（簡易版：実際にはGoogle Maps APIを使用）
      // ここでは仮の座標を使用
      const mockGeocode = getMockCoordinates(data.address);

      // ぼかし処理を適用
      const blurRadius = selectBlurRadius(mockGeocode.confidence);
      const blurred = applyBlur(mockGeocode.lat, mockGeocode.lng, blurRadius);

      // スポットを作成
      const spot = await prisma.spot.create({
        data: {
          title: data.title,
          description: data.description,
          lat: blurred.lat,
          lng: blurred.lng,
          icon_type: data.icon_type,
          era_hint: data.era_hint,
          blur_radius_m: blurRadius,
          status: "PUBLISHED", // デモ用に直接公開
          created_by: "seed-script", // システムユーザー
          sources: {
            create: data.sources,
          },
        },
        include: {
          sources: true,
        },
      });

      console.log(`✓ 登録完了: ${spot.title} (ID: ${spot.id})`);
    } catch (error) {
      console.error(`✗ エラー: ${data.title}`, error);
    }
  }

  console.log("\n\n登録完了！");
}

// 簡易的な座標取得（実際の住所から推定）
function getMockCoordinates(address: string): {
  lat: number;
  lng: number;
  confidence: number;
} {
  const coordinatesMap: { [key: string]: { lat: number; lng: number } } = {
    京都府福知山市: { lat: 35.2978, lng: 135.1289 },
    栃木県那須郡那須町: { lat: 37.0392, lng: 139.9838 },
    京都府京都市左京区: { lat: 35.1218, lng: 135.7681 },
    福岡県久留米市: { lat: 33.3194, lng: 130.5081 },
    岡山県岡山市: { lat: 34.6672, lng: 133.9164 },
    岩手県二戸市: { lat: 40.2703, lng: 141.3055 },
    新潟県小千谷市: { lat: 37.3111, lng: 138.7969 },
    島根県雲南市: { lat: 35.2889, lng: 132.9019 },
    宮崎県西臼杵郡高千穂町: { lat: 32.7133, lng: 131.3056 },
    京都府京都市下京区: { lat: 34.9922, lng: 135.7681 },
  };

  for (const [key, coords] of Object.entries(coordinatesMap)) {
    if (address.includes(key)) {
      return { ...coords, confidence: 0.85 };
    }
  }

  // デフォルト（東京駅）
  return { lat: 35.6812, lng: 139.7671, confidence: 0.5 };
}

function selectBlurRadius(confidence: number): 100 | 200 | 300 {
  if (confidence >= 0.9) return 300;
  if (confidence >= 0.6) return 200;
  return 100;
}

function applyBlur(
  lat: number,
  lng: number,
  radiusMeters: number
): { lat: number; lng: number } {
  const earthRadius = 6_378_137;
  const dn = (Math.random() * 2 - 1) * radiusMeters;
  const de = (Math.random() * 2 - 1) * radiusMeters;
  const dLat = dn / earthRadius;
  const dLng = de / (earthRadius * Math.cos((Math.PI * lat) / 180));

  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
