import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SERVICE_CATEGORIES = [
  { name: 'Plumbing',         slug: 'plumbing',         description: 'Pipe repairs, leakage fixes, tap & shower installation',  iconName: 'Droplets' },
  { name: 'Electrical',       slug: 'electrical',       description: 'Wiring, switchboard repair, appliance connections',         iconName: 'Zap' },
  { name: 'Cleaning',         slug: 'cleaning',         description: 'Deep house cleaning, bathroom & kitchen sanitization',      iconName: 'Sparkles' },
  { name: 'Carpentry',        slug: 'carpentry',        description: 'Furniture assembly, wood repairs, custom woodwork',          iconName: 'Hammer' },
  { name: 'Appliance Repair', slug: 'appliance-repair', description: 'Washing machine, AC, refrigerator & microwave repairs',     iconName: 'Settings' },
  { name: 'Painting',         slug: 'painting',         description: 'Interior & exterior wall painting, waterproofing',           iconName: 'Paintbrush' },
  { name: 'Tutoring',         slug: 'tutoring',         description: 'Home tutoring for school, college & competitive exams',      iconName: 'BookOpen' },
];

async function seed() {
  console.log('🌱 Seeding service categories...');
  let created = 0;
  for (const cat of SERVICE_CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    created++;
    console.log(`  ✔ ${cat.name}`);
  }
  console.log(`\n✅ Seed complete: ${created} service categories ready.`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
