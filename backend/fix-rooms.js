import 'dotenv/config';
import { prisma } from './src/db/index.js';

const requiredRooms = [
  'drama room',
  'dance room',
  'music room',
  'literacy room',
  'arts room',
  'media room'
];

async function fixRooms() {
  try {
    const allRooms = await prisma.room.findMany();
    
    for (const room of allRooms) {
      if (!requiredRooms.includes(room.name)) { // Exact match check
        await prisma.room.delete({ where: { id: room.id } });
        console.log(`Deleted room: ${room.name}`);
      }
    }

    const finalRooms = await prisma.room.findMany();
    console.log('\nFinal Room List:');
    finalRooms.forEach(r => console.log(`- ${r.name}`));

  } catch (error) {
    console.error('Error fixing rooms:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRooms();
