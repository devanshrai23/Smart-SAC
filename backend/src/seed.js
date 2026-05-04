import "dotenv/config";
import { prisma } from "./db/index.js";

const dummyRooms = [
  {
    name: "Drama Room",
    capacity: 30,
    status: "occupied",
    currentActivity: "Theater Practice",
    timeSlot: "4:00 PM - 6:00 PM",
  },
  {
    name: "Music Room",
    capacity: 15,
    status: "available",
  },
  {
    name: "Art Room",
    capacity: 20,
    status: "reserved",
    currentActivity: "Painting Workshop",
    timeSlot: "6:00 PM - 8:00 PM",
  },
  {
    name: "Dance Room",
    capacity: 25,
    status: "available",
  },
  {
    name: "TT Room",
    capacity: 4,
    status: "available",
  },
  {
    name: "AMS Room",
    capacity: 15,
    status: "available",
  }
];

const dummyAnnouncements = [
  {
    heading: "New Snooker Table Arrived!",
    content: "A brand new Snooker table is now available in the main hall. Come check it out!",
    footer: "Posted by Admin",
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  {
    heading: "SAC Maintenance this Friday",
    content: "The SAC will be closed for maintenance this Friday from 8 AM to 12 PM.",
    footer: "Posted by Admin",
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
];

// --- 2. The Seeder Function ---

const seedDatabase = async () => {
  try {
    console.log("Connecting to database...");

    // --- Clear Old Data ---
    console.log("Clearing old data...");
    await prisma.room.deleteMany({});
    await prisma.equipment.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.announcement.deleteMany({});

    // --- Seed Rooms ---
    await prisma.room.createMany({
      data: dummyRooms,
    });
    console.log("Rooms seeded.");

    // --- Seed Announcements ---
    await prisma.announcement.createMany({
      data: dummyAnnouncements,
    });
    console.log("Announcements seeded.");

    // --- Seed Games & Equipment (with relationships) ---
    console.log("Seeding Games and Equipment...");
    
    // Create Games & Equipments using nested writes
    await prisma.game.create({
      data: {
        name: "Table Tennis",
        equipments: {
          create: {
            name: "Table Tennis",
            status: "in_use"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Snooker",
        equipments: {
          create: {
            name: "Snooker Table",
            status: "available"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Badminton",
        equipments: {
          create: {
            name: "Badminton Set",
            status: "available"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Chess",
        equipments: {
          create: {
            name: "Chess Set",
            status: "available"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Cricket",
        equipments: {
          create: [
            { name: "Cricket Bat", status: "available" },
            { name: "Cricket Ball", status: "available" }
          ]
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Volleyball",
        equipments: {
          create: {
            name: "Volleyball",
            status: "available"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Basketball",
        equipments: {
          create: {
            name: "Basketball",
            status: "available"
          }
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Lawn Tennis",
        equipments: {
          create: [
            { name: "Lawn Tennis Racket", status: "available" },
            { name: "Lawn Tennis Ball", status: "available" }
          ]
        }
      }
    });

    await prisma.game.create({
      data: {
        name: "Football",
        equipments: {
          create: {
            name: "Football",
            status: "available"
          }
        }
      }
    });

    console.log("Games and Equipment seeded.");

    console.log("✅ Database seeding successful!");
    process.exit(0);

  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedDatabase();