#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const projectRoot = path.resolve(__dirname, "..");

async function main() {
  const filePath = path.join(projectRoot, "public", "sample-spots.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`サンプルファイルが見つかりません: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`Importing ${raw.length} sample spots...`);

  for (const entry of raw) {
    const mapsQuery = buildMapsQuery(entry);

    const baseData = {
      title: entry.title,
      description: entry.description,
      address: entry.address ?? null,
      maps_query: mapsQuery,
      lat: entry.lat,
      lng: entry.lng,
      icon_type: entry.icon_type ?? "GENERIC",
      blur_radius_m: entry.blur_radius_m ?? 200,
      era_hint: entry.era_hint ?? null,
      status: "PUBLISHED",
      created_by: entry.created_by ?? "seed-script",
    };

    let spot = await prisma.spot.findFirst({
      where: { title: entry.title },
    });

    if (spot) {
      spot = await prisma.spot.update({
        where: { id: spot.id },
        data: baseData,
      });
      await prisma.source.deleteMany({ where: { spot_id: spot.id } });
    } else {
      spot = await prisma.spot.create({
        data: baseData,
      });
    }

    if (entry.sources?.length) {
      await prisma.source.createMany({
        data: entry.sources.map((source) => ({
          spot_id: spot.id,
          type: source.type,
          citation: source.citation,
          url: source.url ?? null,
        })),
      });
    }
  }

  console.log("Sample import completed.");
}

function buildMapsQuery(entry) {
  if (entry.maps_query) return entry.maps_query;
  try {
    const url = new URL(entry.search_url ?? "");
    const params = url.searchParams;
    if (!params.has("api")) params.set("api", "1");
    if (!params.has("query")) {
      params.set("query", entry.address ?? entry.title);
    }
    return params.toString();
  } catch {
    return new URLSearchParams({
      api: "1",
      query: entry.address ?? entry.title,
    }).toString();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
