import 'dotenv/config';
import { prisma } from './src/db/index.js';

const roomNames = ['drama room', 'dance room', 'music room', 'literacy room', 'arts room', 'media room'];

async function seed() {
  // 1. Ensure rooms exist in Room table
  for (const name of roomNames) {
    try {
      await prisma.room.upsert({
        where: { name },
        update: {},
        create: { name, status: 'available' }
      });
      console.log('Room ensured:', name);
    } catch (e) {
      console.log('Error with room:', name, e.message);
    }
  }

  // 2. Delete rooms from Equipment table (they don't belong there)
  for (const name of roomNames) {
    try {
      await prisma.equipment.delete({ where: { name } });
      console.log('Removed from equipment:', name);
    } catch (e) {
      // doesn't exist in equipment, that's fine
    }
  }
  // Also remove creatives room if it exists
  try { await prisma.equipment.delete({ where: { name: 'creatives room' } }); } catch(e) {}

  // 3. Verify
  const rooms = await prisma.room.findMany({ select: { name: true, status: true } });
  console.log('\nRooms in Room table:');
  rooms.forEach(r => console.log(`  "${r.name}" -> ${r.status}`));

  const eq = await prisma.equipment.findMany({ select: { name: true } });
  console.log('\nEquipment in Equipment table:');
  eq.forEach(e => console.log(`  "${e.name}"`));

  await prisma.$disconnect();
}

seed();
