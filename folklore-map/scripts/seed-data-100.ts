import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedDataItem = {
  title: string;
  description: string;
  address: string;
  icon_type: "ONI" | "KITSUNE" | "DOG" | "DRAGON" | "TEMPLE" | "SHRINE" | "ANIMAL" | "GENERIC";
  era_hint: string;
  sources: Array<{
    type: "URL" | "BOOK";
    citation: string;
    url?: string;
  }>;
};

const seedData: SeedDataItem[] = [
  // 既存データ（10件）
  {
    title: "酒呑童子の伝説",
    description: "一条天皇の時代、京の若者や姫君が次々と神隠しに遭った。安倍晴明に占わせたところ、大江山に住む鬼・酒呑童子の仕業とわかった。源頼光と藤原保昌らが山伏を装い鬼の居城を訪ね、毒酒を飲ませて退治した。大江山には鬼の岩窟、鬼見の滝、鬼の足跡石など、鬼が残したという痕跡が今も残る。\n\n※伝承の舞台：大江山一帯。ピンは日本の鬼の交流博物館に設置しています（関連施設）。",
    address: "京都府福知山市大江町仏性寺909",
    icon_type: "ONI",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "YAMAP MAGAZINE「京都大江山 酒呑童子」", url: "https://yamap.com/magazine/11300" }],
  },
  {
    title: "九尾の狐と殺生石",
    description: "絶世の美女・玉藻前は実は九尾の狐で、天皇を病に陥れた。陰陽師・安倍泰成により正体を暴かれ、上総介広常と三浦之助義純により討伐された。狐は那須の巨大な石に姿を変え、近づく人や家畜を害する毒気を放った。後に玄翁和尚が石を打ち砕き、3つに割れた石の1つがこの地に残る。\n\n※伝承の舞台：那須温泉郷。ピンは殺生石（那須湯本温泉）に設置しています（伝説の石が残る場所）。",
    address: "栃木県那須郡那須町湯本181",
    icon_type: "KITSUNE",
    era_hint: "平安時代末期",
    sources: [{ type: "URL", citation: "那須町「国指定名勝 殺生石と九尾の狐」", url: "https://www.town.nasu.lg.jp/" }],
  },
  {
    title: "鞍馬天狗と牛若丸",
    description: "鞍馬山の僧正ヶ谷に住む大天狗・鞍馬天狗は、幼い牛若丸（後の源義経）に剣術を教えたという。護法魔王尊は650万年前に金星から降臨したとされ、全ての天狗の長とされる。魔王殿は義経が修行した場所として知られ、鞍馬寺は京都屈指のパワースポット。\n\n※伝承の舞台：鞍馬山一帯。ピンは鞍馬寺本殿に設置しています（伝承の中心地）。",
    address: "京都府京都市左京区鞍馬本町1074",
    icon_type: "SHRINE",
    era_hint: "平安時代末期",
    sources: [{ type: "URL", citation: "京都誘致実行委員会「鞍馬寺」", url: "https://www.kic-kyoto.jp/kuramaji/" }],
  },
  {
    title: "筑後川の河童伝説",
    description: "筑後川には西日本随一の河童・九千坊とその一族九千匹が棲んでいたという。田主丸地区は「河童の町」として全国的に知られ、JR田主丸駅の駅舎も河童の顔をかたどっている。久留米市の水天宮では河童が御護り役として領民を水害から守ることを誓った。\n\n※伝承の舞台：筑後川流域。ピンは水天宮（久留米市）に設置しています（河童伝説の中心地）。",
    address: "福岡県久留米市瀬下町265-1",
    icon_type: "ANIMAL",
    era_hint: "江戸時代以前",
    sources: [{ type: "URL", citation: "久留米市「なぜ河童なの!?」", url: "https://www.kurumepr.com/main/170.html" }],
  },
  {
    title: "桃太郎と温羅退治",
    description: "桃太郎のモデルとされる吉備津彦命が、百済の王子で身長4.2メートル・目が輝き赤髪の温羅を退治した伝説。温羅は鬼ノ城に拠点を構え人々を苦しめていた。吉備津神社には矢置石や釜殿など伝説にまつわる史跡が残る。\n\n※伝承の舞台：吉備地方一帯。ピンは吉備津神社に設置しています（伝説ゆかりの神社）。",
    address: "岡山県岡山市北区吉備津931",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "楽天トラベル「吉備津神社ガイド」", url: "https://travel.rakuten.co.jp/" }],
  },
  {
    title: "座敷わらしの緑風荘",
    description: "約670年前の南北朝時代、落ち延びる途中で病死した6歳の亀麿が「末代まで一族を守り続ける」と言い残し、奥座敷「槐の間」に座敷わらしとして現れるようになった。2009年に全焼したが2016年に再建され、現在も多くの人が訪れる。\n\n※伝承の舞台：緑風荘。ピンは緑風荘（座敷わらしが出る旅館）に設置しています。",
    address: "岩手県二戸市金田一字長川41",
    icon_type: "GENERIC",
    era_hint: "南北朝時代",
    sources: [{ type: "URL", citation: "緑風荘公式サイト", url: "https://www.zashiki-warashi.co.jp/" }],
  },
  {
    title: "雪女の伝説",
    description: "雪女の最古の記録は室町時代の「宗祇諸国物語」で、越後国（現・新潟県）の僧が目撃した。新潟県小千谷地方では、独身男性の元を訪れた美女が妻となるが、無理に風呂に入れると氷の欠片だけ残して消えてしまう「つらら女」伝説がある。\n\n※伝承の舞台：新潟県小千谷地方一帯。ピンは小千谷市中心部に設置しています（伝承が残る地域）。正確な場所は特定されていません。",
    address: "新潟県小千谷市城内1-13-20",
    icon_type: "GENERIC",
    era_hint: "室町時代以前",
    sources: [{ type: "URL", citation: "note「新潟県の雪女伝説」", url: "https://note.com/" }],
  },
  {
    title: "ヤマタノオロチ退治",
    description: "高天原を追放された須佐之男命が出雲国の斐伊川上流に降り立ち、8つの頭と8つの尾を持つ大蛇・ヤマタノオロチを退治した。オロチは毎年娘を食べており、最後に残った奇稲田姫も狙われていた。スサノオは8つの酒樽を用意してオロチを酔わせ、剣で切り倒し、体内から天叢雲剣（草薙剣）を得た。\n\n※伝承の舞台：斐伊川上流域。ピンは須我神社（スサノオとクシナダヒメが新居を構えたとされる地）に設置しています。",
    address: "島根県雲南市大東町須賀260",
    icon_type: "DRAGON",
    era_hint: "神話時代",
    sources: [{ type: "URL", citation: "島根浪漫旅「ヤマタノオロチ伝説」", url: "https://www.izumo-shinwa.com/" }],
  },
  {
    title: "天の岩戸伝説",
    description: "太陽神・天照大御神が弟の須佐之男命の乱暴に怒り、天の岩戸に隠れて世界が闇に包まれた。八百万の神々が天安河原に集まって相談し、天鈿女命が踊り、玉祖命が鏡を作り、天照大御神を岩戸から引き出すことに成功した。天岩戸神社は岩戸川を挟んで西本宮と東本宮が鎮座。\n\n※伝承の舞台：天岩戸神社一帯。ピンは天岩戸神社西本宮に設置しています（天岩戸がある場所）。",
    address: "宮崎県西臼杵郡高千穂町岩戸1073-1",
    icon_type: "SHRINE",
    era_hint: "神話時代",
    sources: [{ type: "URL", citation: "天岩戸神社公式サイト", url: "https://amanoiwato-jinja.jp/" }],
  },
  {
    title: "牛若丸と弁慶の出会い",
    description: "武蔵坊弁慶が千本の刀を奪う誓いを立て、999本目まで集めた時、五条大橋で牛若丸（後の源義経）と出会い、敗れて主従関係を結んだという伝説。実際には義経記によれば五条天神社と清水寺で2度出会ったとされる。五条大橋と河原町五条の間の中央分離帯には、対決する義経と弁慶の石像が建つ。\n\n※伝承の舞台：五条大橋。ピンは五条大橋（義経と弁慶が出会ったとされる橋）に設置しています。",
    address: "京都府京都市下京区五条通",
    icon_type: "GENERIC",
    era_hint: "平安時代末期",
    sources: [{ type: "URL", citation: "京都トリビア「義経と弁慶」", url: "https://www.cyber-world.jp.net/" }],
  },

  // 北海道・東北（15件）
  {
    title: "義経北行伝説",
    description: "源義経は平泉で死なず、北海道に渡りアイヌの英雄オキクルミとなったという伝説。青森の三厩から北海道の松前、江差、平取など各地に義経ゆかりの地が点在する。義経神社や判官館など、北海道には義経を祀る神社が多数存在し、アイヌ文化との融合を示す貴重な民俗資料となっている。",
    address: "北海道沙流郡平取町本町119-1",
    icon_type: "SHRINE",
    era_hint: "平安時代末期",
    sources: [{ type: "BOOK", citation: "北海道義経伝説研究会「義経北行伝説の研究」" }],
  },
  {
    title: "アイヌコタンの神話",
    description: "阿寒湖畔のアイヌコタンでは、マリモを守護する神「トゥラシノカムイ」の伝説が語り継がれている。昔、美しいチュウルイという娘と若者の悲恋の涙が湖に落ち、マリモとなったという。アイヌの人々は自然の全てに神が宿ると信じ、カムイノミ（神への祈り）を通じて感謝を捧げてきた。",
    address: "北海道釧路市阿寒町阿寒湖温泉4-7-19",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "阿寒湖アイヌコタン公式", url: "https://www.akanainu.jp/" }],
  },
  {
    title: "恐山のイタコ",
    description: "恐山は日本三大霊場の一つで、死者の魂が集まる場所とされる。イタコと呼ばれる巫女が口寄せで死者の言葉を伝える。硫黄の臭いが立ち込める地獄のような風景と、美しい宇曽利湖が広がる極楽浜のコントラストが印象的。7月と10月の大祭には全国から多くの人が訪れる。",
    address: "青森県むつ市田名部字宇曽利山",
    icon_type: "SHRINE",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "恐山菩提寺公式サイト", url: "http://simokita.org/osore/" }],
  },
  {
    title: "津軽為信と弘前城",
    description: "戦国時代、津軽為信が南部氏から独立して津軽統一を果たした。弘前城は為信の子・信枚が築城し、現存天守12城の一つとして知られる。為信は農民から身を起こし大名となった立志伝中の人物で、「津軽独立記」には数々の謀略と戦いが記されている。",
    address: "青森県弘前市下白銀町1",
    icon_type: "SHRINE",
    era_hint: "戦国時代",
    sources: [{ type: "URL", citation: "弘前市「弘前城」", url: "https://www.hirosakipark.jp/" }],
  },
  {
    title: "遠野物語のカッパ淵",
    description: "民俗学者・柳田国男が著した「遠野物語」に登場するカッパ淵。ここには今でもカッパが棲むとされ、カッパを釣るためのキュウリ付きの竿が置かれている。常堅寺のカッパ狛犬や、カッパ捕獲許可証など、遠野はカッパの里として町おこしを行っている。",
    address: "岩手県遠野市土淵町土淵7-59",
    icon_type: "ANIMAL",
    era_hint: "江戸時代",
    sources: [{ type: "BOOK", citation: "柳田国男「遠野物語」" }],
  },
  {
    title: "安寿と厨子王",
    description: "森鴎外の小説「山椒大夫」の元になった伝説。姉の安寿と弟の厨子王が人買いに売られ、姉は弟を逃がすため入水した。厨子王は後に母を探し当て、姉の供養のため安寿塚を建てた。山椒大夫の館跡とされる場所が由利本荘市に残り、哀切な物語が語り継がれている。",
    address: "秋田県由利本荘市岩城内道川",
    icon_type: "GENERIC",
    era_hint: "平安時代",
    sources: [{ type: "BOOK", citation: "森鴎外「山椒大夫」" }],
  },
  {
    title: "伊達政宗と独眼竜",
    description: "幼少期に右目を失った伊達政宗は「独眼竜」と呼ばれ、東北を統一した戦国大名。黒装束に金の三日月前立ての兜、片倉小十郎や伊達成実らの重臣を従え「遅れてきた英雄」として天下取りの夢を追った。仙台城跡の騎馬像は仙台のシンボルとなっている。",
    address: "宮城県仙台市青葉区川内1",
    icon_type: "SHRINE",
    era_hint: "戦国時代",
    sources: [{ type: "URL", citation: "仙台市「仙台城跡」", url: "https://www.sentabi.jp/" }],
  },
  {
    title: "なまはげ",
    description: "大晦日の晩、「泣く子はいねがー、悪い子はいねがー」と叫びながら鬼の面をかぶったなまはげが家々を訪れる男鹿半島の伝統行事。怠け者を戒め、災いを祓い、豊作・豊漁・吉事をもたらす来訪神として2018年にユネスコ無形文化遺産に登録された。",
    address: "秋田県男鹿市北浦真山字水喰沢",
    icon_type: "ONI",
    era_hint: "江戸時代以前",
    sources: [{ type: "URL", citation: "男鹿市「なまはげ館」", url: "https://www.namahage.co.jp/" }],
  },
  {
    title: "羽黒山の山伏",
    description: "出羽三山の一つ羽黒山は修験道の聖地。険しい山道を登る山伏の修行「秋の峰入り」は今も続く。国宝の五重塔や、樹齢1000年の爺杉、2446段の石段など見どころが多い。山伏は山岳信仰と仏教・道教が融合した独特の宗教者で、祈祷や加持祈禱を行う。",
    address: "山形県鶴岡市羽黒町手向字手向7",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "出羽三山神社公式", url: "https://www.dewasanzan.jp/" }],
  },
  {
    title: "即身仏",
    description: "山形県には日本で最も多い6体の即身仏が安置されている。僧侶が生きたまま土中に入り、読経を続けながら入定する究極の修行。飢饉の際、衆生救済を願い即身仏となった行者が多い。湯殿山注連寺の鉄門海上人、大日坊の真如海上人などが有名。",
    address: "山形県鶴岡市大網字中台92-1",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "注連寺「即身仏について」", url: "http://churenji.jp/" }],
  },
  {
    title: "会津白虎隊",
    description: "戊辰戦争の際、16〜17歳の少年たちで編成された白虎隊。飯盛山から鶴ヶ城が炎上していると誤認し、城の陥落と思い込んだ20名が自刃した。実際には城は健在だったため悲劇となった。飯盛山には白虎隊士の墓があり、多くの人が慰霊に訪れる。",
    address: "福島県会津若松市一箕町大字八幡字弁天下",
    icon_type: "SHRINE",
    era_hint: "江戸時代末期",
    sources: [{ type: "URL", citation: "会津若松市「白虎隊」", url: "https://www.aizukanko.com/" }],
  },
  {
    title: "安達ヶ原の鬼婆",
    description: "平兼盛の娘の病を治すため、妊婦の生き肝が必要と聞いた乳母・岩手が旅の妊婦を殺したところ、それが自分の娘だと知り狂って鬼婆になった。真弓山の岩屋に住み旅人を襲っていたが、東光坊祐慶により成仏させられた。現在も安達ヶ原の岩屋が残る。",
    address: "福島県二本松市安達ヶ原4-126",
    icon_type: "ONI",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "二本松市「安達ヶ原の鬼婆」", url: "https://www.city.nihonmatsu.lg.jp/" }],
  },
  {
    title: "三春滝桜",
    description: "樹齢1000年を超える紅枝垂桜で、日本三大桜の一つ。滝が流れ落ちるような姿から「滝桜」と呼ばれる。戦国時代から江戸時代にかけて、三春藩主や領民に大切にされてきた。国の天然記念物に指定され、毎年春には全国から20万人以上が訪れる。",
    address: "福島県田村郡三春町大字滝字桜久保",
    icon_type: "GENERIC",
    era_hint: "平安時代以前",
    sources: [{ type: "URL", citation: "三春町「三春滝桜」", url: "https://miharukoma.com/" }],
  },
  {
    title: "相馬野馬追",
    description: "1000年以上の歴史を持つ相馬地方の伝統行事。甲冑を身にまとった騎馬武者約400騎が疾走し、神旗争奪戦を繰り広げる。元は相馬氏の軍事訓練だったが、現在は国の重要無形民俗文化財。毎年7月に3日間にわたり開催され、戦国絵巻さながらの勇壮な姿が見られる。",
    address: "福島県南相馬市原町区中太田字舘腰143",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "相馬野馬追執行委員会", url: "http://soma-nomaoi.jp/" }],
  },
  {
    title: "猪苗代湖の天鏡湖",
    description: "磐梯山の噴火により形成された猪苗代湖は、その水の透明度から「天鏡湖」と称される。会津藩主・保科正之は「会津の宝」と称え、領民に大切にするよう命じた。湖畔には野口英世記念館があり、英世が幼少期を過ごした生家が保存されている。",
    address: "福島県耶麻郡猪苗代町",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "猪苗代観光協会", url: "https://www.bandaisan.or.jp/" }],
  },

  // 関東（15件）- 続く
  {
    title: "平将門の首塚",
    description: "平安時代の武将・平将門は関東で乱を起こし、京都で処刑された。首は京都で晒されたが、胴体を求めて空を飛び、現在の大手町に落下したという。首塚は江戸時代から「祟り」で知られ、移転や工事で事故が相次いだため丁重に祀られている。",
    address: "東京都千代田区大手町1-2-1",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "BOOK", citation: "将門記研究会「平将門の乱」" }],
  },
  {
    title: "浅草寺の雷門",
    description: "628年、隅田川で漁をしていた兄弟が観音像を引き上げ、これを祀ったのが浅草寺の始まり。雷門の正式名称は風雷神門で、風神・雷神が守護する。江戸時代には「浅草観音」として庶民の信仰を集め、現在も年間約3000万人が訪れる東京随一の観光地。",
    address: "東京都台東区浅草2-3-1",
    icon_type: "SHRINE",
    era_hint: "飛鳥時代",
    sources: [{ type: "URL", citation: "浅草寺公式サイト", url: "https://www.senso-ji.jp/" }],
  },
  {
    title: "江戸城の天守",
    description: "徳川家康が築いた江戸城は、最盛期には世界最大級の城郭だった。寛永度天守（1638年）は高さ約51メートルで日本最大だったが、1657年の明暦の大火で焼失し、以後再建されなかった。現在は皇居となり、二重橋や桜田門など江戸時代の遺構が残る。",
    address: "東京都千代田区千代田1-1",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "宮内庁「皇居」", url: "https://www.kunaicho.go.jp/" }],
  },
  {
    title: "富士山の浅間神社",
    description: "富士山は古来より霊峰として崇められ、浅間大神（木花之佐久夜毘売命）を祀る浅間神社が各地に建立された。富士山本宮浅間大社は全国約1300社の浅間神社の総本宮。富士山信仰は修験道と結びつき、江戸時代には富士講が盛んになった。",
    address: "静岡県富士宮市宮町1-1",
    icon_type: "SHRINE",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "富士山本宮浅間大社", url: "http://fuji-hongu.or.jp/" }],
  },
  {
    title: "鎌倉大仏",
    description: "高徳院の本尊である阿弥陀如来坐像は、高さ約11.3メートル、重さ約121トン。1252年に鋳造が始まったとされる。かつては大仏殿に安置されていたが、1498年の大津波で堂が流失し、以後露座の大仏として親しまれている。鎌倉時代の仏教文化を代表する国宝。",
    address: "神奈川県鎌倉市長谷4-2-28",
    icon_type: "SHRINE",
    era_hint: "鎌倉時代",
    sources: [{ type: "URL", citation: "高徳院公式", url: "https://www.kotoku-in.jp/" }],
  },
  {
    title: "江の島の弁財天",
    description: "欽明天皇の時代、江の島に突然島が隆起し、天女が現れて悪龍を改心させたという伝説がある。この天女が弁財天として祀られ、江島神社となった。江戸時代には「江の島詣」が流行し、弁財天は音楽・芸能・財福の神として庶民の信仰を集めた。",
    address: "神奈川県藤沢市江の島2-3-8",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "江島神社公式", url: "http://enoshimajinja.or.jp/" }],
  },
  {
    title: "箱根の九頭龍神社",
    description: "芦ノ湖に住む九つの頭を持つ毒龍が村人を苦しめていたが、奈良時代の高僧・万巻上人が法力で調伏し、龍は改心して守護神となった。九頭龍神社本宮は芦ノ湖畔の聖域にあり、縁結びの神として若い女性に人気。毎月13日の月次祭には参拝船が運航される。",
    address: "神奈川県足柄下郡箱根町元箱根防ケ沢",
    icon_type: "DRAGON",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "箱根神社公式", url: "http://hakonejinja.or.jp/" }],
  },
  {
    title: "日光東照宮と眠り猫",
    description: "徳川家康を神格化した東照大権現を祀る日光東照宮は、三代将軍・家光が現在の豪華な社殿を造営した。「見ざる聞かざる言わざる」の三猿、左甚五郎作と伝わる「眠り猫」など彫刻が有名。陽明門は「日暮門」とも呼ばれ、一日中見ていても飽きないほど美しい。",
    address: "栃木県日光市山内2301",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "日光東照宮公式", url: "http://www.toshogu.jp/" }],
  },
  {
    title: "筑波山のガマ仙人",
    description: "筑波山に住んでいた永禄という若者が、ガマガエルから仙術を学び、ガマ仙人となった伝説。筑波山神社には「ガマ石」という巨岩があり、ガマガエルに似ていることから名付けられた。江戸時代、筑波山のガマの油売りは大道芸として人気を博し、現在も実演が行われている。",
    address: "茨城県つくば市筑波1",
    icon_type: "SHRINE",
    era_hint: "室町時代",
    sources: [{ type: "URL", citation: "筑波山神社公式", url: "https://www.tsukubasanjinja.jp/" }],
  },
  {
    title: "香取神宮",
    description: "日本三大神宮の一つで、武神・経津主大神を祀る。神武天皇の時代に創建されたと伝わる古社で、『日本書紀』にも登場する。武術の神として崇敬され、剣道や柔道の大会が開催される。本殿・楼門は国の重要文化財で、境内の森は「神宮の森」として県の天然記念物に指定。",
    address: "千葉県香取市香取1697",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "香取神宮公式", url: "https://katori-jingu.or.jp/" }],
  },
  {
    title: "犬吠埼の人魚伝説",
    description: "犬吠埼には人魚が打ち上げられたという伝説がある。漁師が傷ついた人魚を助けると、人魚は「津波が来る」と警告して海に帰った。数日後、実際に大津波が襲来したが、村人は避難していたため助かったという。犬吠埼灯台は日本を代表する灯台の一つ。",
    address: "千葉県銚子市犬吠埼9576",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "BOOK", citation: "銚子市史「犬吠埼の伝説」" }],
  },
  {
    title: "榛名山の榛名神社",
    description: "榛名山の中腹に鎮座する榛名神社は、1400年以上の歴史を持つ古社。境内には奇岩怪石が点在し、御姿岩と呼ばれる巨岩の下に社殿が建つ。火の神・火産霊神と土の神・埴山毘売神を祀り、開運・商売繁盛・縁結びの神として信仰を集める。",
    address: "群馬県高崎市榛名山町849",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "榛名神社公式", url: "http://www.haruna.or.jp/" }],
  },
  {
    title: "秩父夜祭",
    description: "秩父神社の例大祭で、京都祇園祭、飛騨高山祭と並ぶ日本三大曳山祭の一つ。12月2日・3日に開催され、豪華な屋台・笠鉾が曳き回される。祭りのクライマックスでは花火が打ち上げられ、冬の夜空を彩る。300年以上の歴史があり、ユネスコ無形文化遺産に登録。",
    address: "埼玉県秩父市番場町1-3",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "秩父神社公式", url: "http://www.chichibu-jinja.or.jp/" }],
  },
  {
    title: "川越の時の鐘",
    description: "川越のシンボルとして親しまれる時の鐘は、江戸時代初期に川越城主・酒井忠勝が建立した鐘楼。火災で4度焼失し、現在の鐘楼は明治時代に再建された4代目。今も1日4回（午前6時、正午、午後3時、午後6時）、時を告げる鐘の音が小江戸の街に響く。",
    address: "埼玉県川越市幸町15-7",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "川越市「時の鐘」", url: "https://www.city.kawagoe.saitama.jp/" }],
  },
  {
    title: "草津温泉の湯畑",
    description: "日本三名泉の一つ草津温泉の中心に湧く湯畑は、毎分約4000リットルもの温泉が湧出する。「草津よいとこ一度はおいで、お湯の中にも花が咲く」と草津節で歌われる。江戸時代の医師・後藤艮山は「万病に効く」と称賛し、温泉番付では常に東の横綱にランク。",
    address: "群馬県吾妻郡草津町草津",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "草津温泉観光協会", url: "https://www.kusatsu-onsen.ne.jp/" }],
  },

  // 中部（20件）
  {
    title: "立山の地獄谷",
    description: "立山は古くから霊山として崇められ、地獄谷は噴気と硫黄の臭いが立ち込める。立山曼荼羅には極楽浄土と地獄が描かれ、山岳信仰の聖地として栄えた。立山黒部アルペンルートは世界的な山岳観光ルートとして知られる。",
    address: "富山県中新川郡立山町芦峅寺",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "立山黒部アルペンルート", url: "https://www.alpen-route.com/" }],
  },
  {
    title: "善光寺",
    description: "一光三尊阿弥陀如来を本尊とする善光寺は、「牛に引かれて善光寺参り」の諺で知られる。創建は約1400年前で、「一生に一度は善光寺詣り」と言われる信州随一の霊場。7年に一度の御開帳には数百万人が訪れる。",
    address: "長野県長野市元善町491",
    icon_type: "SHRINE",
    era_hint: "飛鳥時代",
    sources: [{ type: "URL", citation: "善光寺公式", url: "https://www.zenkoji.jp/" }],
  },
  {
    title: "諏訪大社と御柱祭",
    description: "日本最古の神社の一つで、建御名方神を祀る。7年に一度の御柱祭では、樹齢200年のモミの大木を山から曳き、境内四隅に建てる勇壮な祭り。木落としは最大傾斜35度の坂を巨木が滑り落ちる命がけの神事。",
    address: "長野県諏訪市中洲宮山1",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "諏訪大社公式", url: "http://suwataisha.or.jp/" }],
  },
  {
    title: "戸隠神社と天狗伝説",
    description: "天の岩戸を投げ飛ばした天手力雄命を祀る戸隠神社。戸隠山には天狗が住むと伝えられ、修験道の聖地として栄えた。樹齢400年の杉並木が続く参道は神秘的で、奥社は巨大な戸隠山の岩壁の下に鎮座する。",
    address: "長野県長野市戸隠3506",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "戸隠神社公式", url: "https://www.togakushi-jinja.jp/" }],
  },
  {
    title: "木曽の寝覚の床",
    description: "浦島太郎が竜宮城から帰り、玉手箱を開けて老人になった時、ここで目覚めたという伝説がある。巨岩・奇岩が木曽川の清流に削られてできた自然の造形美。国の名勝に指定され、中山道の名所として知られる。",
    address: "長野県木曽郡上松町小川",
    icon_type: "GENERIC",
    era_hint: "奈良時代",
    sources: [{ type: "BOOK", citation: "木曽町史「寝覚の床伝説」" }],
  },
  {
    title: "富士講の富士塚",
    description: "江戸時代、富士山信仰が庶民に広がり富士講が盛んになった。富士山に登れない人のため、各地に富士塚が築かれた。江戸だけで200以上あったとされ、浅間神社を勧請して富士登山を模した小山を巡拝する。",
    address: "山梨県富士吉田市上吉田5558",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "富士吉田市「富士講」", url: "https://www.city.fujiyoshida.yamanashi.jp/" }],
  },
  {
    title: "身延山久遠寺",
    description: "日蓮宗の総本山で、日蓮聖人が晩年の9年間を過ごした霊場。287段の菩提梯を登ると本堂に至る。樹齢400年のしだれ桜は見事で、春には多くの参拝者が訪れる。日蓮聖人の墓所・御廟所には今も信者が絶えない。",
    address: "山梨県南巨摩郡身延町身延3567",
    icon_type: "SHRINE",
    era_hint: "鎌倉時代",
    sources: [{ type: "URL", citation: "身延山久遠寺公式", url: "https://www.kuonji.jp/" }],
  },
  {
    title: "静岡の龍宮窟",
    description: "天窓から光が差し込む神秘的な海食洞で、ハート型に見えることから恋愛のパワースポットとして人気。古来より龍神が住むと伝えられ、漁師たちは航海安全を祈願した。伊豆半島ジオパークの代表的な景観。",
    address: "静岡県下田市田牛",
    icon_type: "DRAGON",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "下田市観光協会", url: "https://www.shimoda-city.info/" }],
  },
  {
    title: "三保の松原と羽衣伝説",
    description: "天女が松の枝に掛けた羽衣を漁師が見つけ、返す条件として天女の舞を見せてもらったという伝説。三保の松原は富士山の眺望で知られ、世界文化遺産の構成資産。羽衣の松は今も御穂神社に祀られる。",
    address: "静岡県静岡市清水区三保",
    icon_type: "GENERIC",
    era_hint: "奈良時代",
    sources: [{ type: "BOOK", citation: "謡曲「羽衣」" }],
  },
  {
    title: "熱田神宮と草薙剣",
    description: "三種の神器の一つ・草薙剣を祀る熱田神宮。ヤマタノオロチの体内から出た天叢雲剣が草薙剣と呼ばれるようになった。織田信長が桶狭間の戦いの前に必勝祈願したことでも有名。初詣には毎年約230万人が参拝する。",
    address: "愛知県名古屋市熱田区神宮1-1-1",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "熱田神宮公式", url: "https://www.atsutajingu.or.jp/" }],
  },
  {
    title: "名古屋城の金鯱",
    description: "徳川家康が天下統一の象徴として築いた名古屋城。大天守の屋根を飾る金の鯱は名古屋のシンボル。鯱は想像上の動物で、水を吹いて火災を防ぐとされる。金鯱は雌雄一対で、合計約215kgの金が使われた。",
    address: "愛知県名古屋市中区本丸1-1",
    icon_type: "ANIMAL",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "名古屋城公式", url: "https://www.nagoyajo.city.nagoya.jp/" }],
  },
  {
    title: "犬山城",
    description: "現存天守12城の一つで、国宝五城の一つ。織田信長の叔父・織田信康が築城した。木曽川のほとりに建つ天守は、中国の長江に臨む白帝城になぞらえて「白帝城」とも呼ばれる。室町時代の古い天守建築様式を残す。",
    address: "愛知県犬山市犬山北古券65-2",
    icon_type: "SHRINE",
    era_hint: "戦国時代",
    sources: [{ type: "URL", citation: "犬山城公式", url: "https://inuyama-castle.jp/" }],
  },
  {
    title: "高山祭",
    description: "春の山王祭と秋の八幡祭の総称で、日本三大曳山祭の一つ。豪華絢爛な屋台（山車）が曳き回され、「動く陽明門」と称される。からくり人形の奉納やライトアップされた夜祭も見どころ。ユネスコ無形文化遺産に登録。",
    address: "岐阜県高山市城山156",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "高山市「高山祭」", url: "https://www.city.takayama.lg.jp/" }],
  },
  {
    title: "白川郷合掌造り",
    description: "豪雪地帯の厳しい自然に適応した合掌造りの集落。茅葺き屋根が合掌するように三角形で、養蚕のため2〜3階建て。250年前の建物も現存し、生活文化と景観が世界遺産に登録された。冬のライトアップは幻想的。",
    address: "岐阜県大野郡白川村荻町",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "白川郷観光協会", url: "https://shirakawa-go.gr.jp/" }],
  },
  {
    title: "伊勢神宮",
    description: "天照大御神を祀る皇大神宮（内宮）と豊受大御神を祀る豊受大神宮（外宮）の総称。日本人の心のふるさとと称され、「お伊勢参り」として江戸時代には庶民の憧れだった。20年に一度の式年遷宮で社殿を建て替える伝統が1300年続く。",
    address: "三重県伊勢市宇治館町1",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "伊勢神宮公式", url: "https://www.isejingu.or.jp/" }],
  },
  {
    title: "鳥羽の海女",
    description: "鳥羽・志摩地方は海女漁の伝統が今も続く。素潜りで鮑や伊勢海老を獲る海女は、古事記にも記録がある古い職業。白い磯着姿で潜る海女の姿は、観光資源としても人気。海女小屋で獲れたての海鮮を味わえる。",
    address: "三重県鳥羽市相差町1238",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "鳥羽市観光協会", url: "https://www.toba.gr.jp/" }],
  },
  {
    title: "赤目四十八滝の百丈岩",
    description: "赤目四十八滝は修験道の行場として知られ、役行者が修行した霊地。百丈岩は高さ約25メートルの巨岩で、滝と渓谷が織りなす景観は絶景。赤目の名は、役行者が不動明王に出会った時、赤い目の牛が現れたことに由来する。",
    address: "三重県名張市赤目町長坂861-1",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "赤目四十八滝公式", url: "https://www.akame48taki.com/" }],
  },
  {
    title: "彦根城と井伊家",
    description: "井伊直継・直孝が築いた彦根城は、国宝天守を持つ名城。井伊家は徳川四天王の一つで、幕末の大老・井伊直弼を輩出。直弼は桜田門外の変で暗殺された。城内の玄宮園は大名庭園として知られ、琵琶湖を望む景観が美しい。",
    address: "滋賀県彦根市金亀町1-1",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "彦根城公式", url: "https://hikonecastle.com/" }],
  },
  {
    title: "比叡山延暦寺",
    description: "最澄が開いた天台宗の総本山。東塔・西塔・横川の三塔からなる広大な山岳寺院で、千日回峰行など厳しい修行で知られる。「日本仏教の母山」と称され、法然・親鸞・栄西・道元など多くの名僧を輩出した。",
    address: "滋賀県大津市坂本本町4220",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "比叡山延暦寺公式", url: "https://www.hieizan.or.jp/" }],
  },
  {
    title: "白山比咩神社",
    description: "白山を御神体とする白山信仰の総本宮。白山は富士山、立山と並ぶ日本三霊山の一つ。養老元年（717年）に泰澄大師が開山し、修験道の聖地として栄えた。白山の女神・白山比咩大神は縁結びの神として信仰される。",
    address: "石川県白山市三宮町ニ105-1",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "白山比咩神社公式", url: "http://www.shirayama.or.jp/" }],
  },

  // 関西（10件）
  {
    title: "清水寺",
    description: "京都を代表する寺院で、音羽の滝から湧き出る清水が寺名の由来。本堂の舞台は釘を使わない懸造りで、高さ約13メートルの崖にせり出す。「清水の舞台から飛び降りる」という諺の由来となった。年間約600万人が訪れる京都屈指の観光地。",
    address: "京都府京都市東山区清水1-294",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "清水寺公式", url: "https://www.kiyomizudera.or.jp/" }],
  },
  {
    title: "伏見稲荷大社",
    description: "全国約3万社の稲荷神社の総本宮。千本鳥居で有名で、稲荷山全体が神域。商売繁盛・五穀豊穣の神として篤い信仰を集める。711年に創建され、平安時代には朝廷の崇敬を受けた。外国人観光客にも人気のスポット。",
    address: "京都府京都市伏見区深草薮之内町68",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "伏見稲荷大社公式", url: "http://inari.jp/" }],
  },
  {
    title: "金閣寺",
    description: "正式名称は鹿苑寺で、舎利殿「金閣」が特に有名。室町幕府3代将軍・足利義満が建立した北山殿が起源。金箔で覆われた三層の楼閣は極楽浄土を表現し、鏡湖池に映る姿が美しい。1950年に放火で焼失したが1955年に再建。",
    address: "京都府京都市北区金閣寺町1",
    icon_type: "SHRINE",
    era_hint: "室町時代",
    sources: [{ type: "URL", citation: "金閣寺公式", url: "https://www.shokoku-ji.jp/kinkakuji/" }],
  },
  {
    title: "大阪城と豊臣秀吉",
    description: "豊臣秀吉が天下統一の拠点として築いた大坂城。五層の天守は当時日本最大級で、黄金の茶室や豪華な装飾で知られた。大坂の陣で焼失したが、徳川幕府が再建。現在の天守閣は昭和に再建されたもので、博物館として公開。",
    address: "大阪府大阪市中央区大阪城1-1",
    icon_type: "SHRINE",
    era_hint: "安土桃山時代",
    sources: [{ type: "URL", citation: "大阪城天守閣", url: "https://www.osakacastle.net/" }],
  },
  {
    title: "姫路城の白鷺城",
    description: "白漆喰の城壁が美しく「白鷺城」と呼ばれる姫路城は、現存天守12城の一つで国宝・世界遺産。池田輝政が大改修し、現在の姿になった。螺旋式縄張りと複雑な迷路構造で防御を固め、戦国の名城として名高い。",
    address: "兵庫県姫路市本町68",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "姫路城公式", url: "https://www.city.himeji.lg.jp/castle/" }],
  },
  {
    title: "東大寺の大仏",
    description: "奈良時代、聖武天皇が国家安泰を願い造立した盧舎那仏。高さ約15メートル、重さ約250トンの青銅製。大仏殿は世界最大級の木造建築。二度の戦火で焼失したが、その都度再建され、奈良のシンボルとして親しまれている。",
    address: "奈良県奈良市雑司町406-1",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "東大寺公式", url: "http://www.todaiji.or.jp/" }],
  },
  {
    title: "熊野古道",
    description: "熊野三山（熊野本宮大社・熊野速玉大社・熊野那智大社）への参詣道。平安時代から皇族・貴族が参詣し、「蟻の熊野詣」と称されるほど庶民にも人気だった。2004年に世界遺産登録。熊野は再生・蘇りの聖地として信仰される。",
    address: "和歌山県田辺市本宮町本宮1110",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "熊野本宮大社公式", url: "http://www.hongutaisha.jp/" }],
  },
  {
    title: "出雲大社",
    description: "大国主大神を祀る出雲大社は、縁結びの神として全国的に有名。古代には高さ48メートルの巨大神殿があったとされる。神在月（旧暦10月）には全国の神々が出雲に集まり、人々の縁を決める神議が行われるという。",
    address: "島根県出雲市大社町杵築東195",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "出雲大社公式", url: "https://izumooyashiro.or.jp/" }],
  },
  {
    title: "厳島神社",
    description: "海上に浮かぶ朱塗りの大鳥居で知られる厳島神社。593年に創建され、平清盛が現在の規模に造営した。満潮時には社殿が海に浮かんでいるように見え、「安芸の宮島」として日本三景の一つ。世界遺産にも登録。",
    address: "広島県廿日市市宮島町1-1",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "厳島神社公式", url: "http://www.itsukushimajinja.jp/" }],
  },
  {
    title: "金刀比羅宮",
    description: "「こんぴらさん」の愛称で親しまれる金刀比羅宮は、海の守り神として信仰される。本宮まで785段、奥社まで1368段の石段を登る。江戸時代には「一生に一度はこんぴら参り」と言われるほど人気の参詣地だった。",
    address: "香川県仲多度郡琴平町892-1",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "金刀比羅宮公式", url: "http://www.konpira.or.jp/" }],
  },
  {
    title: "道後温泉",
    description: "日本最古の温泉の一つで、『日本書紀』にも登場。道後温泉本館は1894年建築の木造三層楼で、夏目漱石「坊っちゃん」の舞台としても有名。皇室専用の又新殿があり、格式高い温泉として知られる。",
    address: "愛媛県松山市道後湯之町5-6",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "道後温泉公式", url: "https://dogo.jp/" }],
  },
  {
    title: "太宰府天満宮",
    description: "学問の神・菅原道真公を祀る太宰府天満宮。道真公は左遷されて太宰府で没し、死後天神として崇敬されるようになった。受験シーズンには全国から多くの参拝者が訪れる。梅の名所としても知られ、飛梅伝説が残る。",
    address: "福岡県太宰府市宰府4-7-1",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "太宰府天満宮公式", url: "https://www.dazaifutenmangu.or.jp/" }],
  },
  {
    title: "阿蘇山",
    description: "世界最大級のカルデラを持つ阿蘇山は、古来より霊山として崇められてきた。阿蘇神社では健磐龍命が祀られ、国造りの神話が伝わる。中岳火口は今も活発な火山活動を続け、壮大な自然のパワーを感じられる。",
    address: "熊本県阿蘇市黒川",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "阿蘇火山博物館", url: "http://www.asomuse.jp/" }],
  },
  {
    title: "桜島",
    description: "鹿児島のシンボル・桜島は今も活発に噴煙を上げる活火山。かつては島だったが、1914年の大正大噴火で大隅半島と陸続きになった。古くから信仰の対象で、月読神社や黒神埋没鳥居など、噴火の歴史を伝える史跡が点在する。",
    address: "鹿児島県鹿児島市桜島",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "桜島ビジターセンター", url: "http://www.sakurajima.gr.jp/" }],
  },
  {
    title: "首里城",
    description: "琉球王国の王城として栄えた首里城は、中国と日本の文化が融合した独特の建築様式。1945年の沖縄戦で焼失したが1992年に復元。2019年に再び火災で焼失し、現在再建中。琉球の歴史と文化を伝える重要な遺産。",
    address: "沖縄県那覇市首里金城町1-2",
    icon_type: "SHRINE",
    era_hint: "室町時代",
    sources: [{ type: "URL", citation: "首里城公園公式", url: "http://oki-park.jp/shurijo/" }],
  },

  // 中国地方（8件）
  {
    title: "鳥取砂丘と砂の妖怪",
    description: "日本最大級の砂丘で、強風が吹く日には「砂かけ婆」が現れるという伝説がある。鬼太郎の作者・水木しげるの出身地が近く、境港市には「水木しげるロード」があり、妖怪ブロンズ像が並ぶ。砂丘は国の天然記念物。",
    address: "鳥取県鳥取市福部町湯山2164-661",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "鳥取砂丘ビジターセンター", url: "https://www.sakyu-vc.com/" }],
  },
  {
    title: "三徳山三佛寺投入堂",
    description: "断崖絶壁に建つ投入堂は、役行者が法力で建物ごと投げ入れたという伝説がある。標高900メートルの断崖に建つ懸造りの建築で、国宝に指定。参拝には険しい登山が必要で、「日本一危険な国宝」とも呼ばれる。",
    address: "鳥取県東伯郡三朝町三徳1010",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "三徳山三佛寺公式", url: "http://www.mitokusan.jp/" }],
  },
  {
    title: "松江城と堀尾吉晴",
    description: "堀尾吉晴が築いた松江城は、現存天守12城の一つで国宝。別名「千鳥城」と呼ばれ、宍道湖を望む景観が美しい。城下町には小泉八雲記念館があり、八雲が愛した怪談や民俗学の世界が紹介される。",
    address: "島根県松江市殿町1-5",
    icon_type: "SHRINE",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "松江城公式", url: "https://www.matsue-castle.jp/" }],
  },
  {
    title: "石見銀山",
    description: "戦国時代から江戸時代にかけて日本最大の銀山として栄えた。最盛期には世界の銀の約3分の1を産出したとされ、大内氏・毛利氏・徳川幕府が争奪戦を繰り広げた。2007年に世界遺産登録。銀山で働く人々の暮らしが今も残る。",
    address: "島根県大田市大森町",
    icon_type: "GENERIC",
    era_hint: "戦国時代",
    sources: [{ type: "URL", citation: "石見銀山世界遺産センター", url: "https://ginzan.city.ohda.lg.jp/" }],
  },
  {
    title: "岡山後楽園",
    description: "岡山藩主・池田綱政が築いた日本三名園の一つ。約300年前の姿を今に伝え、四季折々の景観が楽しめる。後楽園の名は「先憂後楽」（民の憂いを先にして、楽しみを後にする）に由来。岡山城と一体となった景観が美しい。",
    address: "岡山県岡山市北区後楽園1-5",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "岡山後楽園公式", url: "https://okayama-korakuen.jp/" }],
  },
  {
    title: "尾道の猫の細道",
    description: "尾道は坂の町として知られ、細い路地に猫が多く住む。「猫の細道」には猫をモチーフにした石や置物が点在し、猫好きの聖地となっている。古寺巡りと坂道散策、瀬戸内海の眺望が人気の観光地。",
    address: "広島県尾道市東土堂町",
    icon_type: "ANIMAL",
    era_hint: "江戸時代より",
    sources: [{ type: "URL", citation: "尾道市観光協会", url: "https://www.onomichi-cb.jp/" }],
  },
  {
    title: "錦帯橋",
    description: "日本三名橋の一つで、5連のアーチが美しい木造橋。1673年に岩国藩主・吉川広嘉が架けた。何度も流失したが、その度に架け替えられ、「流されない橋」を目指して独特のアーチ構造が生まれた。伝統技術で今も架け替えが行われる。",
    address: "山口県岩国市岩国1-1",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "岩国市「錦帯橋」", url: "https://kintaikyo.iwakuni-city.net/" }],
  },
  {
    title: "秋芳洞",
    description: "日本最大級の鍾乳洞で、総延長約10キロ。洞内には「百枚皿」「千町田」など自然が作り出した造形美が広がる。カルスト台地の秋吉台の地下を流れる地底川が、数億年かけて作り上げた。洞内は年中17度で、夏は涼しく冬は暖かい。",
    address: "山口県美祢市秋芳町秋吉",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "秋芳洞公式", url: "https://karusuto.com/" }],
  },

  // 四国（8件）
  {
    title: "四国八十八ヶ所霊場",
    description: "弘法大師空海ゆかりの88の寺院を巡礼する四国遍路。総距離約1400キロの道のりを歩く「お遍路さん」は、江戸時代から続く伝統。白装束に菅笠、金剛杖を持ち、煩悩を払い悟りを開くための修行の旅。第一番札所・霊山寺から始まる。",
    address: "徳島県鳴門市大麻町板東字塚鼻126",
    icon_type: "SHRINE",
    era_hint: "平安時代",
    sources: [{ type: "URL", citation: "四国八十八ヶ所霊場会", url: "https://88shikokuhenro.jp/" }],
  },
  {
    title: "鳴門の渦潮",
    description: "鳴門海峡に発生する世界最大級の渦潮。春と秋の大潮時には直径20メートルにも達する。古くから「鳴門の渦」として恐れられ、多くの伝説が残る。渦潮は月の引力による潮の満ち引きで発生し、自然の神秘を体感できる。",
    address: "徳島県鳴門市鳴門町",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "鳴門市観光協会", url: "https://naruto-kankou.jp/" }],
  },
  {
    title: "祖谷のかずら橋",
    description: "シラクチカズラで編まれた吊り橋で、平家の落人が追手を防ぐため切り落とせるように作ったという伝説がある。長さ45メートル、水面からの高さ14メートル。3年ごとに架け替えられ、800年の歴史を持つ秘境の名所。",
    address: "徳島県三好市西祖谷山村善徳162-2",
    icon_type: "GENERIC",
    era_hint: "平安時代末期",
    sources: [{ type: "URL", citation: "三好市観光協会", url: "https://miyoshi-tourism.jp/" }],
  },
  {
    title: "屋島の源平合戦",
    description: "源平合戦の舞台となった屋島。那須与一が扇の的を射抜いた「扇の的」の逸話で有名。屋島寺は四国八十八ヶ所第84番札所で、源平合戦の史跡が点在する。山上からは瀬戸内海の絶景が広がる。",
    address: "香川県高松市屋島東町1808",
    icon_type: "SHRINE",
    era_hint: "平安時代末期",
    sources: [{ type: "URL", citation: "屋島寺公式", url: "http://www.yashimaji.com/" }],
  },
  {
    title: "小豆島の二十四の瞳",
    description: "壺井栄の小説「二十四の瞳」の舞台となった小豆島。映画のロケ地となった岬の分教場が今も残り、昭和初期の小学校の雰囲気を伝える。オリーブ栽培発祥の地としても知られ、地中海を思わせる風景が広がる。",
    address: "香川県小豆郡小豆島町田浦",
    icon_type: "GENERIC",
    era_hint: "昭和時代",
    sources: [{ type: "URL", citation: "小豆島観光協会", url: "https://shodoshima.or.jp/" }],
  },
  {
    title: "石鎚山",
    description: "西日本最高峰（標高1982メートル）の霊山で、古くから山岳信仰の聖地。石鎚神社の御神体として崇められ、7月の「お山開き」には白装束の信者が鎖場を登る。日本七霊山の一つで、修験道の行場として知られる。",
    address: "愛媛県西条市西之川甲",
    icon_type: "SHRINE",
    era_hint: "奈良時代",
    sources: [{ type: "URL", citation: "石鎚神社公式", url: "http://ishizuchisan.jp/" }],
  },
  {
    title: "桂浜と坂本龍馬",
    description: "月の名所として知られる桂浜には、坂本龍馬の銅像が太平洋を見つめて立つ。龍馬は土佐藩出身で、幕末の志士として薩長同盟を仲介し、大政奉還に貢献した。桂浜は「よさこい節」にも歌われる高知の名勝。",
    address: "高知県高知市浦戸桂浜",
    icon_type: "GENERIC",
    era_hint: "江戸時代末期",
    sources: [{ type: "URL", citation: "高知市観光協会", url: "https://welcome-kochi.jp/" }],
  },
  {
    title: "四万十川",
    description: "「日本最後の清流」と呼ばれる四万十川。沈下橋（欄干のない橋）が点在し、昔ながらの風景を残す。アユ・ウナギ・川エビなど豊かな水産資源に恵まれ、川漁師の伝統が今も続く。全長196キロの四国最長の川。",
    address: "高知県四万十市",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "四万十市観光協会", url: "https://www.shimanto-kankou.com/" }],
  },

  // 九州・沖縄（追加13件）
  {
    title: "博多祇園山笠",
    description: "博多の夏の風物詩で、770年以上の歴史を持つ祭り。7月1日から15日まで開催され、最終日の「追い山」では男衆が舁き山を担いで博多の街を疾走する。「オイサ、オイサ」の掛け声と共に、重さ1トンの山笠が駆け抜ける勇壮な祭り。",
    address: "福岡県福岡市博多区上川端町1-41",
    icon_type: "SHRINE",
    era_hint: "鎌倉時代",
    sources: [{ type: "URL", citation: "櫛田神社公式", url: "https://www.hakatayamakasa.com/" }],
  },
  {
    title: "宗像大社",
    description: "天照大御神の三柱の娘神を祀る宗像三女神の総本宮。沖ノ島は「神宿る島」として古代から信仰され、島全体が御神体。女人禁制が守られ、2017年に世界遺産登録。約8万点の国宝が出土し、「海の正倉院」と呼ばれる。",
    address: "福岡県宗像市田島2331",
    icon_type: "SHRINE",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "宗像大社公式", url: "http://www.munakata-taisha.or.jp/" }],
  },
  {
    title: "吉野ヶ里遺跡",
    description: "弥生時代の大規模な環濠集落跡で、日本最大級の遺跡。物見櫓や竪穴住居が復元され、邪馬台国の候補地の一つとされる。弥生時代の暮らしや「クニ」の成り立ちを知ることができる貴重な史跡。",
    address: "佐賀県神埼郡吉野ヶ里町田手1843",
    icon_type: "GENERIC",
    era_hint: "弥生時代",
    sources: [{ type: "URL", citation: "吉野ヶ里歴史公園", url: "https://www.yoshinogari.jp/" }],
  },
  {
    title: "佐賀の有田焼",
    description: "日本で初めて磁器が焼かれた地で、400年の歴史を持つ。朝鮮人陶工・李参平が1616年に白磁の原料を発見し、有田焼が誕生した。江戸時代にはヨーロッパに輸出され、「IMARI」の名で世界的に有名になった。",
    address: "佐賀県西松浦郡有田町戸杓乙3100-1",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "有田観光協会", url: "https://www.arita.jp/" }],
  },
  {
    title: "長崎の軍艦島",
    description: "正式名称は端島。海底炭鉱で栄え、最盛期には5000人以上が暮らした。1974年に閉山し無人島となり、廃墟となった高層アパート群が軍艦のように見えることから「軍艦島」と呼ばれる。2015年に世界遺産登録。",
    address: "長崎県長崎市高島町端島",
    icon_type: "GENERIC",
    era_hint: "明治時代",
    sources: [{ type: "URL", citation: "長崎市「軍艦島」", url: "https://www.gunkanjima-museum.jp/" }],
  },
  {
    title: "グラバー園",
    description: "幕末の長崎で活躍したスコットランド商人トーマス・グラバーの旧邸。坂本龍馬や伊藤博文と親交があり、日本の近代化に貢献した。洋館からは長崎港を一望でき、「蝶々夫人」の舞台のモデルとしても知られる。",
    address: "長崎県長崎市南山手町8-1",
    icon_type: "GENERIC",
    era_hint: "江戸時代末期",
    sources: [{ type: "URL", citation: "グラバー園公式", url: "https://www.glover-garden.jp/" }],
  },
  {
    title: "雲仙地獄",
    description: "雲仙温泉の中心部に広がる硫黄の噴気地帯。「地獄」の名の通り、噴気と硫黄の臭いが立ち込める。江戸時代初期のキリシタン殉教の地としても知られ、多くの信者が熱湯責めの刑に処された悲しい歴史がある。",
    address: "長崎県雲仙市小浜町雲仙320",
    icon_type: "GENERIC",
    era_hint: "江戸時代",
    sources: [{ type: "URL", citation: "雲仙観光局", url: "https://www.unzen.org/" }],
  },
  {
    title: "由布院温泉",
    description: "別府と並ぶ大分の名湯で、由布岳の麓に広がる。源泉数・湧出量ともに全国2位で、「山の温泉」として親しまれる。朝霧に包まれる早朝の由布院盆地は幻想的で、金鱗湖では湖面から湯煙が立ち上る不思議な光景が見られる。",
    address: "大分県由布市湯布院町川上",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "由布院温泉観光協会", url: "https://www.yufuin.gr.jp/" }],
  },
  {
    title: "別府地獄めぐり",
    description: "別府には「地獄」と呼ばれる温泉噴出口が点在する。海地獄・血の池地獄・白池地獄など、色や形が異なる8つの地獄を巡る観光コースが人気。湧出量・源泉数ともに日本一の別府温泉は、「温泉のデパート」とも称される。",
    address: "大分県別府市鉄輪559-1",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "別府地獄組合", url: "http://www.beppu-jigoku.com/" }],
  },
  {
    title: "高千穂峡",
    description: "阿蘇山の噴火による火砕流が冷え固まってできた峡谷。高さ約80メートルの断崖が7キロにわたり続き、真名井の滝が流れ落ちる景観は絶景。天孫降臨の地として知られ、神話の里・高千穂には多くの神社が点在する。",
    address: "宮崎県西臼杵郡高千穂町三田井御塩井",
    icon_type: "GENERIC",
    era_hint: "古代",
    sources: [{ type: "URL", citation: "高千穂町観光協会", url: "https://takachiho-kanko.info/" }],
  },
  {
    title: "西郷隆盛と城山",
    description: "明治維新の立役者・西郷隆盛が最期を遂げた城山。西南戦争で政府軍に敗れた西郷は、1877年9月24日にこの地で自刃した。城山展望台からは桜島と鹿児島市街を一望でき、西郷洞窟など西南戦争の史跡が残る。",
    address: "鹿児島県鹿児島市城山町",
    icon_type: "GENERIC",
    era_hint: "明治時代",
    sources: [{ type: "URL", citation: "鹿児島市「城山」", url: "https://www.kagoshima-kankou.com/" }],
  },
  {
    title: "屋久島の縄文杉",
    description: "樹齢7200年とも言われる（科学的には2000〜3000年）屋久島最大の杉。「もののけ姫」の舞台のモデルとなった太古の森には、樹齢1000年以上の屋久杉が群生する。世界自然遺産に登録され、自然の神秘を体感できる島。",
    address: "鹿児島県熊毛郡屋久島町",
    icon_type: "GENERIC",
    era_hint: "古代より",
    sources: [{ type: "URL", citation: "屋久島観光協会", url: "https://yakukan.jp/" }],
  },
  {
    title: "琉球王国の守礼門",
    description: "首里城の第二の門で、「守礼之邦」の扁額が掲げられている。琉球王国は中国と日本の間で独自の文化を育み、首里城を中心に栄えた。守礼門は二千円札の図柄にも採用され、沖縄のシンボルとなっている。",
    address: "沖縄県那覇市首里金城町1",
    icon_type: "SHRINE",
    era_hint: "室町時代",
    sources: [{ type: "URL", citation: "首里城公園公式", url: "http://oki-park.jp/shurijo/" }],
  },
];

async function main() {
  console.log(`データベースに${seedData.length}件の伝承データを登録します...`);

  for (const data of seedData) {
    try {
      console.log(`\n「${data.title}」を登録中...`);

      const mockGeocode = getMockCoordinates(data.address);
      const blurRadius = selectBlurRadius(mockGeocode.confidence);
      const blurred = applyBlur(mockGeocode.lat, mockGeocode.lng, blurRadius);

      const spot = await prisma.spot.create({
        data: {
          title: data.title,
          description: data.description,
          address: data.address,
          lat: blurred.lat,
          lng: blurred.lng,
          icon_type: data.icon_type,
          era_hint: data.era_hint,
          status: "PUBLISHED",
          created_by: "seed-script-100",
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

  console.log(`\n\n登録完了！合計${seedData.length}件のデータを登録しました。`);
}

function getMockCoordinates(address: string): { lat: number; lng: number; confidence: number } {
  const coordinatesMap: { [key: string]: { lat: number; lng: number } } = {
    // 北海道・東北
    "北海道沙流郡平取町": { lat: 42.5422, lng: 142.0611 },
    "北海道釧路市阿寒": { lat: 43.4394, lng: 144.0978 },
    "青森県むつ市": { lat: 41.2919, lng: 141.1831 },
    "青森県弘前市": { lat: 40.6033, lng: 140.4639 },
    "岩手県遠野市": { lat: 39.3294, lng: 141.5342 },
    "秋田県由利本荘市": { lat: 39.3856, lng: 140.0536 },
    "宮城県仙台市": { lat: 38.2682, lng: 140.8694 },
    "秋田県男鹿市": { lat: 39.8856, lng: 139.8472 },
    "山形県鶴岡市": { lat: 38.7269, lng: 139.8267 },
    "福島県会津若松市": { lat: 37.4953, lng: 139.9303 },
    "福島県二本松市": { lat: 37.5833, lng: 140.4322 },
    "福島県田村郡三春町": { lat: 37.4403, lng: 140.4939 },
    "福島県南相馬市": { lat: 37.6422, lng: 140.9567 },
    "福島県耶麻郡猪苗代町": { lat: 37.5569, lng: 140.1061 },

    // 関東
    "東京都千代田区": { lat: 35.6892, lng: 139.6917 },
    "東京都台東区": { lat: 35.7119, lng: 139.7769 },
    "静岡県富士宮市": { lat: 35.2189, lng: 138.6200 },
    "神奈川県鎌倉市": { lat: 35.3119, lng: 139.5461 },
    "神奈川県藤沢市": { lat: 35.3419, lng: 139.4892 },
    "神奈川県足柄下郡箱根町": { lat: 35.2323, lng: 139.0236 },
    "栃木県日光市": { lat: 36.7197, lng: 139.6989 },
    "茨城県つくば市": { lat: 36.0836, lng: 140.0767 },
    "千葉県香取市": { lat: 35.8981, lng: 140.4994 },
    "千葉県銚子市": { lat: 35.7347, lng: 140.8267 },
    "群馬県高崎市": { lat: 36.3219, lng: 139.0036 },
    "埼玉県秩父市": { lat: 35.9917, lng: 139.0858 },
    "埼玉県川越市": { lat: 35.9253, lng: 139.4856 },
    "群馬県吾妻郡草津町": { lat: 36.6203, lng: 138.5975 },

    // 中部
    "富山県中新川郡立山町": { lat: 36.5767, lng: 137.4306 },
    "石川県白山市": { lat: 36.5158, lng: 136.5656 },
    "長野県長野市": { lat: 36.6513, lng: 138.1811 },
    "長野県諏訪市": { lat: 36.0394, lng: 138.1142 },
    "長野県木曽郡上松町": { lat: 35.7831, lng: 137.6414 },
    "山梨県富士吉田市": { lat: 35.4861, lng: 138.8103 },
    "山梨県南巨摩郡身延町": { lat: 35.4658, lng: 138.4406 },
    "静岡県下田市": { lat: 34.6789, lng: 138.9472 },
    "静岡県静岡市清水区": { lat: 35.0156, lng: 138.4889 },
    "愛知県名古屋市熱田区": { lat: 35.1278, lng: 136.9089 },
    "愛知県名古屋市中区": { lat: 35.1681, lng: 136.9066 },
    "愛知県犬山市": { lat: 35.3781, lng: 136.9444 },
    "岐阜県高山市": { lat: 36.1461, lng: 137.2525 },
    "岐阜県大野郡白川村": { lat: 36.2578, lng: 136.9061 },
    "三重県伊勢市": { lat: 34.4872, lng: 136.7253 },
    "三重県鳥羽市": { lat: 34.4814, lng: 136.8444 },
    "三重県名張市": { lat: 34.6278, lng: 136.1086 },
    "滋賀県彦根市": { lat: 35.2764, lng: 136.2514 },
    "滋賀県大津市": { lat: 35.0044, lng: 135.8686 },

    // 関西
    "京都府京都市東山区": { lat: 34.9947, lng: 135.7853 },
    "京都府京都市伏見区": { lat: 34.9667, lng: 135.7722 },
    "京都府京都市北区": { lat: 35.0394, lng: 135.7292 },
    "大阪府大阪市中央区": { lat: 34.6869, lng: 135.5258 },
    "兵庫県姫路市": { lat: 34.8392, lng: 134.6939 },
    "奈良県奈良市": { lat: 34.6850, lng: 135.8050 },
    "和歌山県田辺市": { lat: 33.7306, lng: 135.3761 },

    // 中国地方
    "島根県出雲市": { lat: 35.3667, lng: 132.7561 },
    "広島県廿日市市": { lat: 34.3464, lng: 132.3231 },
    "鳥取県鳥取市": { lat: 35.5014, lng: 134.2361 },
    "鳥取県東伯郡三朝町": { lat: 35.4053, lng: 133.8781 },
    "島根県松江市": { lat: 35.4722, lng: 133.0506 },
    "島根県大田市": { lat: 35.1942, lng: 132.5022 },
    "岡山県岡山市北区": { lat: 34.6617, lng: 133.9350 },
    "岡山県岡山市北区表町": { lat: 34.6628, lng: 133.9194 },
    "岡山県瀬戸内市牛窓町牛窓": { lat: 34.6426, lng: 134.1889 },
    "広島県尾道市": { lat: 34.4086, lng: 133.2044 },
    "山口県岩国市": { lat: 34.1658, lng: 132.2200 },
    "山口県下関市阿弥陀寺町": { lat: 33.9577, lng: 130.9416 },
    "山口県美祢市": { lat: 34.1661, lng: 131.2042 },

    // 四国
    "徳島県鳴門市": { lat: 34.1775, lng: 134.6089 },
    "徳島県三好市": { lat: 34.0244, lng: 133.8067 },
    "香川県高松市": { lat: 34.3428, lng: 134.0433 },
    "香川県小豆郡小豆島町": { lat: 34.4894, lng: 134.2686 },
    "香川県仲多度郡琴平町": { lat: 34.1861, lng: 133.8158 },
    "愛媛県西条市": { lat: 33.9203, lng: 133.1817 },
    "愛媛県松山市": { lat: 33.8392, lng: 132.7669 },
    "高知県高知市": { lat: 33.5597, lng: 133.5311 },
    "高知県四万十市": { lat: 32.9922, lng: 132.9294 },
    "兵庫県淡路市多賀": { lat: 34.5175, lng: 134.9247 },

    // 九州・沖縄
    "福岡県福岡市博多区": { lat: 33.5958, lng: 130.4017 },
    "福岡県宗像市": { lat: 33.8039, lng: 130.5389 },
    "福岡県太宰府市": { lat: 33.5133, lng: 130.5214 },
    "福岡県久留米市": { lat: 33.3194, lng: 130.5081 },
    "福岡県飯塚市": { lat: 33.6457, lng: 130.6918 },
    "佐賀県神埼郡吉野ヶ里町": { lat: 33.3297, lng: 130.3906 },
    "佐賀県佐賀市城内": { lat: 33.2494, lng: 130.2997 },
    "佐賀県西松浦郡有田町": { lat: 33.1842, lng: 129.8808 },
    "長崎県長崎市": { lat: 32.7503, lng: 129.8778 },
    "長崎県雲仙市": { lat: 32.7233, lng: 130.2139 },
    "熊本県阿蘇市": { lat: 32.9522, lng: 131.1236 },
    "大分県由布市": { lat: 33.1808, lng: 131.4269 },
    "大分県別府市": { lat: 33.2844, lng: 131.4911 },
    "宮崎県西臼杵郡高千穂町": { lat: 32.7133, lng: 131.3056 },
    "鹿児島県鹿児島市": { lat: 31.5656, lng: 130.5578 },
    "鹿児島県熊毛郡屋久島町": { lat: 30.3383, lng: 130.5350 },
    "沖縄県那覇市": { lat: 26.2125, lng: 127.6789 },
    "新潟県東蒲原郡阿賀町津川": { lat: 37.6330, lng: 139.4667 },
    "新潟県佐渡市": { lat: 38.0189, lng: 138.3683 },
    "岐阜県飛騨市古川町": { lat: 36.2376, lng: 137.1873 },
    "三重県亀山市関町": { lat: 34.8564, lng: 136.4306 },
    "愛知県豊田市": { lat: 35.0844, lng: 137.1563 },
    "兵庫県淡路市多賀": { lat: 34.5175, lng: 134.9247 },
    "奈良県天理市": { lat: 34.5970, lng: 135.8330 },
    "京都府京都市上京区": { lat: 35.0285, lng: 135.7525 },

    // 既存データ（更新済み正確な住所）
    "京都府福知山市大江町仏性寺": { lat: 35.2815, lng: 135.0753 },  // 日本の鬼の交流博物館
    "栃木県那須郡那須町湯本181": { lat: 37.1230, lng: 139.9660 },  // 殺生石
    "京都府京都市左京区鞍馬本町": { lat: 35.1218, lng: 135.7681 },  // 鞍馬寺
    "福岡県久留米市瀬下町": { lat: 33.3206, lng: 130.5167 },  // 水天宮
    "岡山県岡山市北区吉備津": { lat: 34.6728, lng: 133.8042 },  // 吉備津神社
    "岩手県二戸市金田一": { lat: 40.2703, lng: 141.3055 },  // 緑風荘
    "新潟県小千谷市城内": { lat: 37.3111, lng: 138.7969 },  // 小千谷市役所
    "島根県雲南市大東町須賀": { lat: 35.2500, lng: 132.8667 },  // 須我神社
    "宮崎県西臼杵郡高千穂町岩戸": { lat: 32.7133, lng: 131.3056 },  // 天岩戸神社
    "京都府京都市下京区五条通": { lat: 34.9922, lng: 135.7681 },  // 五条大橋

    // レガシー（後方互換性のため残す）
    "京都府福知山市": { lat: 35.2978, lng: 135.1289 },
    "栃木県那須郡那須町": { lat: 37.0392, lng: 139.9838 },
    "京都府京都市左京区": { lat: 35.1218, lng: 135.7681 },
    "岡山県岡山市": { lat: 34.6672, lng: 133.9164 },
    "岩手県二戸市": { lat: 40.2703, lng: 141.3055 },
    "新潟県小千谷市": { lat: 37.3111, lng: 138.7969 },
    "島根県雲南市": { lat: 35.2889, lng: 132.9019 },
    "京都府京都市下京区": { lat: 34.9922, lng: 135.7681 },
  };

  for (const [key, coords] of Object.entries(coordinatesMap)) {
    if (address.includes(key)) {
      return { ...coords, confidence: 0.85 };
    }
  }

  return { lat: 35.6812, lng: 139.7671, confidence: 0.5 };
}

function selectBlurRadius(confidence: number): 100 | 200 | 300 {
  if (confidence >= 0.9) return 300;
  if (confidence >= 0.6) return 200;
  return 100;
}

function applyBlur(lat: number, lng: number, radiusMeters: number): { lat: number; lng: number } {
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
