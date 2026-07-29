import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// ─── DB connection ─────────────────────────────────────────────────

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// ─── Seed data ──────────────────────────────────────────────────────

interface SeedMemory {
  title: string;
  place: string;
  date: string;
  lat: number;
  lng: number;
  color: string;
  symbol: string;
  city: string;
  country: string;
  tags: string[];
  image: string;
  media: string[];
}

const MEMORIES: SeedMemory[] = [
  {
    title: "Shibuya crossing at midnight",
    place: "Shibuya, Tokyo",
    date: "2026-03-15",
    lat: 35.6595,
    lng: 139.7004,
    color: "#ef766b",
    symbol: "star",
    city: "Tokyo",
    country: "Japan",
    tags: ["city", "night", "travel"],
    image: "https://picsum.photos/seed/tokyo-shibuya/800/600",
    media: [
      "https://picsum.photos/seed/tokyo-1/800/600",
      "https://picsum.photos/seed/tokyo-2/800/600",
    ],
  },
  {
    title: "Sunrise over the temples",
    place: "Bagan",
    date: "2026-02-10",
    lat: 21.1722,
    lng: 94.86,
    color: "#f4a261",
    symbol: "pin",
    city: "Bagan",
    country: "Myanmar",
    tags: ["nature", "sunrise", "travel"],
    image: "https://picsum.photos/seed/bagan-sunrise/800/600",
    media: [
      "https://picsum.photos/seed/bagan-1/800/600",
      "https://picsum.photos/seed/bagan-2/800/600",
      "https://picsum.photos/seed/bagan-3/800/600",
    ],
  },
  {
    title: "Lost in the medina",
    place: "Marrakech",
    date: "2025-11-20",
    lat: 31.6295,
    lng: -7.9811,
    color: "#e76f51",
    symbol: "pin",
    city: "Marrakech",
    country: "Morocco",
    tags: ["city", "culture", "market"],
    image: "https://picsum.photos/seed/marrakech-medina/800/600",
    media: [
      "https://picsum.photos/seed/marrakech-1/800/600",
    ],
  },
  {
    title: "Hiking the Inca Trail",
    place: "Machu Picchu",
    date: "2025-09-05",
    lat: -13.1631,
    lng: -72.545,
    color: "#2a9d8f",
    symbol: "flag",
    city: "Machu Picchu",
    country: "Peru",
    tags: ["nature", "hiking", "adventure"],
    image: "https://picsum.photos/seed/machupicchu/800/600",
    media: [
      "https://picsum.photos/seed/machu-1/800/600",
      "https://picsum.photos/seed/machu-2/800/600",
    ],
  },
  {
    title: "Northern lights dance",
    place: "Reykjavik",
    date: "2025-12-28",
    lat: 64.1466,
    lng: -21.9426,
    color: "#6a4c93",
    symbol: "star",
    city: "Reykjavik",
    country: "Iceland",
    tags: ["nature", "night", "aurora"],
    image: "https://picsum.photos/seed/aurora/800/600",
    media: [
      "https://picsum.photos/seed/iceland-1/800/600",
    ],
  },
  {
    title: "Gondola ride at golden hour",
    place: "Venice",
    date: "2026-04-08",
    lat: 45.4408,
    lng: 12.3155,
    color: "#f4a261",
    symbol: "heart",
    city: "Venice",
    country: "Italy",
    tags: ["romantic", "city", "water"],
    image: "https://picsum.photos/seed/venice-golden/800/600",
    media: [
      "https://picsum.photos/seed/venice-1/800/600",
      "https://picsum.photos/seed/venice-2/800/600",
    ],
  },
  {
    title: "Street food crawl",
    place: "Yaowarat Road, Bangkok",
    date: "2026-01-14",
    lat: 13.7399,
    lng: 100.5073,
    color: "#e9c46a",
    symbol: "pin",
    city: "Bangkok",
    country: "Thailand",
    tags: ["food", "city", "night"],
    image: "https://picsum.photos/seed/bangkok-food/800/600",
    media: [
      "https://picsum.photos/seed/bangkok-1/800/600",
      "https://picsum.photos/seed/bangkok-2/800/600",
      "https://picsum.photos/seed/bangkok-3/800/600",
    ],
  },
  {
    title: "Table Mountain hike",
    place: "Cape Town",
    date: "2025-10-12",
    lat: -33.9628,
    lng: 18.4098,
    color: "#2a9d8f",
    symbol: "flag",
    city: "Cape Town",
    country: "South Africa",
    tags: ["nature", "hiking", "adventure"],
    image: "https://picsum.photos/seed/capetown/800/600",
    media: [
      "https://picsum.photos/seed/cape-1/800/600",
    ],
  },
  {
    title: "Sunset in Oia",
    place: "Santorini",
    date: "2026-06-22",
    lat: 36.4616,
    lng: 25.3753,
    color: "#ef766b",
    symbol: "heart",
    city: "Santorini",
    country: "Greece",
    tags: ["sunset", "romantic", "travel"],
    image: "https://picsum.photos/seed/santorini-sunset/800/600",
    media: [
      "https://picsum.photos/seed/santorini-1/800/600",
      "https://picsum.photos/seed/santorini-2/800/600",
    ],
  },
  {
    title: "Cherry blossom picnic",
    place: "Ueno Park, Tokyo",
    date: "2026-04-02",
    lat: 35.7148,
    lng: 139.773,
    color: "#ffb5c2",
    symbol: "heart",
    city: "Tokyo",
    country: "Japan",
    tags: ["nature", "spring", "cherry-blossom"],
    image: "https://picsum.photos/seed/cherry-blossom/800/600",
    media: [
      "https://picsum.photos/seed/cherry-1/800/600",
      "https://picsum.photos/seed/cherry-2/800/600",
    ],
  },
  {
    title: "Surfing at Uluwatu",
    place: "Bali",
    date: "2025-08-17",
    lat: -8.8291,
    lng: 115.0849,
    color: "#264653",
    symbol: "pin",
    city: "Bali",
    country: "Indonesia",
    tags: ["beach", "surf", "adventure"],
    image: "https://picsum.photos/seed/bali-surf/800/600",
    media: [
      "https://picsum.photos/seed/bali-1/800/600",
      "https://picsum.photos/seed/bali-2/800/600",
    ],
  },
  {
    title: "Night market in Taipei",
    place: "Shilin, Taipei",
    date: "2026-05-30",
    lat: 25.0898,
    lng: 121.5255,
    color: "#e76f51",
    symbol: "pin",
    city: "Taipei",
    country: "Taiwan",
    tags: ["food", "night", "city"],
    image: "https://picsum.photos/seed/taipei-night/800/600",
    media: [
      "https://picsum.photos/seed/taipei-1/800/600",
      "https://picsum.photos/seed/taipei-2/800/600",
    ],
  },
  {
    title: "Glacier lagoon kayaking",
    place: "Jökulsárlón, Iceland",
    date: "2025-12-30",
    lat: 64.0789,
    lng: -16.2386,
    color: "#457b9d",
    symbol: "star",
    city: "Jökulsárlón",
    country: "Iceland",
    tags: ["nature", "adventure", "ice"],
    image: "https://picsum.photos/seed/glacier-lagoon/800/600",
    media: [
      "https://picsum.photos/seed/glacier-1/800/600",
    ],
  },
  {
    title: "Wandering through lavender fields",
    place: "Provence",
    date: "2026-07-05",
    lat: 43.9493,
    lng: 5.1473,
    color: "#9b5de5",
    symbol: "heart",
    city: "Provence",
    country: "France",
    tags: ["nature", "summer", "flowers"],
    image: "https://picsum.photos/seed/lavender/800/600",
    media: [
      "https://picsum.photos/seed/provence-1/800/600",
      "https://picsum.photos/seed/provence-2/800/600",
    ],
  },
  {
    title: "Riding the Trans-Siberian",
    place: "Trans-Siberian Railway",
    date: "2025-07-20",
    lat: 55.7558,
    lng: 37.6176,
    color: "#1d3557",
    symbol: "diamond",
    city: "Moscow → Vladivostok",
    country: "Russia",
    tags: ["train", "adventure", "landscape"],
    image: "https://picsum.photos/seed/transsiberian/800/600",
    media: [
      "https://picsum.photos/seed/train-1/800/600",
      "https://picsum.photos/seed/train-2/800/600",
    ],
  },
];

interface SeedThread {
  indices: number[]; // indices into MEMORIES array
}

const THREADS: SeedThread[] = [
  { indices: [0, 9] },    // Tokyo (Shibuya → Cherry blossom)
  { indices: [4, 12] },   // Iceland (Reykjavik → Glacier lagoon)
  { indices: [1, 3, 7] }, // South-East Asia (Bagan → Machu Picchu → Cape Town... actually let's make it Japan→Myanmar)
  { indices: [5, 8] },    // Italy → Greece
];

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Create a .env file.");
    process.exit(1);
  }

  const prisma = createClient();
  console.log("🌱 Seeding Life Trace…\n");

  // Clear existing data
  await prisma.memoryThread.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.unlockedAchievement.deleteMany();
  await prisma.memory.deleteMany();
  // Reset profile
  const existingProfile = await prisma.profile.findUnique({
    where: { id: "singleton" },
  });
  if (existingProfile) {
    await prisma.profile.update({
      where: { id: "singleton" },
      data: {
        name: "Explorer",
        locale: "en",
        knownTags: [],
        selectedTitle: null,
        avatarPath: "https://picsum.photos/seed/avatar/200/200",
      },
    });
  } else {
    await prisma.profile.create({
      data: {
        id: "singleton",
        name: "Explorer",
        locale: "en",
        avatarPath: "https://picsum.photos/seed/avatar/200/200",
      },
    });
  }

  // Create memories
  const createdIds: string[] = [];
  for (const m of MEMORIES) {
    const year = new Date(m.date).getFullYear().toString();
    const memory = await prisma.memory.create({
      data: {
        ...m,
        year,
        kind: "memory",
        description: `A memory from ${m.city}, ${m.country}.`,
        favorite: m.title.includes("Shibuya") || m.title.includes("Sunset in Oia"),
      },
    });
    createdIds.push(memory.id);
    console.log(`  ✓ ${m.title}`);
  }

  // Create threads
  for (const t of THREADS) {
    const ids = t.indices.map((i) => createdIds[i]);
    await prisma.memoryThread.create({
      data: { memoryIds: ids },
    });
    const names = t.indices.map((i) => MEMORIES[i].title);
    console.log(`  ~ Thread: ${names.join(" → ")}`);
  }

  // Unlock some achievements (first 5 for the seed)
  const ACHIEVEMENT_IDS = [1, 2, 3, 4, 5];
  for (const id of ACHIEVEMENT_IDS) {
    await prisma.unlockedAchievement.create({
      data: {
        achievementId: id,
        unlockedAt: new Date("2026-01-01"),
      },
    });
  }
  // Unlock a couple more
  const MORE_ACHIEVEMENTS = [8, 10, 15, 20];
  for (const id of MORE_ACHIEVEMENTS) {
    await prisma.unlockedAchievement.create({
      data: {
        achievementId: id,
        unlockedAt: new Date("2026-03-15"),
      },
    });
  }
  console.log(`  🏆 ${ACHIEVEMENT_IDS.length + MORE_ACHIEVEMENTS.length} achievements unlocked`);

  console.log(`\n✅ Done! ${MEMORIES.length} memories, ${THREADS.length} threads seeded.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
