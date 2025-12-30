import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type SourceItem = {
  type: "URL" | "BOOK";
  citation: string;
  url?: string | null;
};

type FolkloreItem = {
  title: string;
  description: string;
  address: string;
  icon_type: "ONI" | "KITSUNE" | "DOG" | "DRAGON" | "TEMPLE" | "SHRINE" | "ANIMAL" | "GENERIC";
  era_hint: string;
  sources: SourceItem[];
};

const prisma = new PrismaClient();

function loadData(): FolkloreItem[] {
  const file = path.join(process.cwd(), "scripts", "new-folklore-data.json");
  const raw = readFileSync(file, "utf-8");
  return JSON.parse(raw) as FolkloreItem[];
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

function getMockCoordinates(address: string): { lat: number; lng: number; confidence: number } {
  const map: Record<string, { lat: number; lng: number }> = {
    "岡山県瀬戸内市牛窓町牛窓": { lat: 34.6426, lng: 134.1889 },
    "佐賀県佐賀市城内": { lat: 33.2494, lng: 130.2997 },
    "岡山県岡山市北区表町": { lat: 34.6628, lng: 133.9194 },
    "岐阜県飛騨市古川町": { lat: 36.2376, lng: 137.1873 },
    "福岡県飯塚市": { lat: 33.6457, lng: 130.6918 },
    "奈良県天理市": { lat: 34.597, lng: 135.833 },
    "新潟県東蒲原郡阿賀町津川": { lat: 37.633, lng: 139.4667 },
    "山口県下関市阿弥陀寺町": { lat: 33.9577, lng: 130.9416 },
    "兵庫県姫路市本町": { lat: 34.8392, lng: 134.6939 },
    "岩手県遠野市土淵町": { lat: 39.347, lng: 141.545 },
    "三重県亀山市関町": { lat: 34.8564, lng: 136.4306 },
    "愛知県豊田市": { lat: 35.0844, lng: 137.1563 },
    "鹿児島県熊毛郡屋久島町": { lat: 30.3383, lng: 130.535 },
    "新潟県佐渡市": { lat: 38.0189, lng: 138.3683 },
    "兵庫県淡路市多賀": { lat: 34.5175, lng: 134.9247 },
    "京都府京都市上京区": { lat: 35.0285, lng: 135.7525 },
  };

  for (const [key, coords] of Object.entries(map)) {
    if (address.includes(key)) {
      return { ...coords, confidence: 0.85 };
    }
  }

  // 最低限のフォールバック（東京駅周辺）
  return { lat: 35.6812, lng: 139.7671, confidence: 0.5 };
}

async function main() {
  const data = loadData();
  console.log(`新規フォークロアデータ ${data.length} 件をインポートします`);

  for (const item of data) {
    try {
      const mock = getMockCoordinates(item.address);
      const blur = selectBlurRadius(mock.confidence);
      const blurred = applyBlur(mock.lat, mock.lng, blur);

      const existing = await prisma.spot.findFirst({ where: { title: item.title } });

      if (existing) {
        const updated = await prisma.spot.update({
          where: { id: existing.id },
          data: {
            description: item.description,
            address: item.address,
            lat: blurred.lat,
            lng: blurred.lng,
            icon_type: item.icon_type,
            era_hint: item.era_hint,
            status: "PUBLISHED",
            sources: {
              deleteMany: {},
              create: item.sources.map((s) => ({ ...s, url: s.url ?? undefined })),
            },
          },
        });
        console.log(`→ 更新: ${updated.title}`);
      } else {
        const created = await prisma.spot.create({
          data: {
            title: item.title,
            description: item.description,
            address: item.address,
            lat: blurred.lat,
            lng: blurred.lng,
            icon_type: item.icon_type,
            era_hint: item.era_hint,
            status: "PUBLISHED",
            created_by: "seed-script-new-folklore",
            sources: { create: item.sources.map((s) => ({ ...s, url: s.url ?? undefined })) },
          },
        });
        console.log(`✓ 登録: ${created.title}`);
      }
    } catch (err) {
      console.error(`✗ エラー: ${item.title}`, err);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
