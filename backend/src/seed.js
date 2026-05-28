import "dotenv/config";
import connectDB from "./db/index.js";
import mongoose from "mongoose";
import { Room } from "./models/room.model.js";
import { Equipment } from "./models/equipment.model.js";
import { Game } from "./models/game.model.js";
import { Announcement } from "./models/announcement.model.js";

const dummyRooms = [
  {
    name: "Drama Room",
    capacity: 30,
    status: "in-use",
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
    status: "available",
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

const seedDatabase = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Clearing old data...");
    await Room.deleteMany({});
    await Equipment.deleteMany({});
    await Game.deleteMany({});
    await Announcement.deleteMany({});

    await Room.insertMany(dummyRooms);
    console.log("Rooms seeded.");

    await Announcement.insertMany(dummyAnnouncements);
    console.log("Announcements seeded.");

    console.log("Seeding Games and Equipment...");
    
    // Create Games & Equipments
    const gamesData = [
      {
        name: "Table Tennis",
        equipments: [{ name: "Table Tennis", status: "in-use" }]
      },
      {
        name: "Snooker",
        equipments: [{ name: "Snooker Table", status: "available" }]
      },
      {
        name: "Badminton",
        equipments: [{ name: "Badminton Set", status: "available" }]
      },
      {
        name: "Chess",
        equipments: [{ name: "Chess Set", status: "available" }]
      },
      {
        name: "Cricket",
        equipments: [
          { name: "Cricket Bat", status: "available" },
          { name: "Cricket Ball", status: "available" }
        ]
      },
      {
        name: "Volleyball",
        equipments: [{ name: "Volleyball", status: "available" }]
      },
      {
        name: "Basketball",
        equipments: [{ name: "Basketball", status: "available" }]
      },
      {
        name: "Lawn Tennis",
        equipments: [
          { name: "Lawn Tennis Racket", status: "available" },
          { name: "Lawn Tennis Ball", status: "available" }
        ]
      },
      {
        name: "Football",
        equipments: [{ name: "Football", status: "available" }]
      }
    ];

    for (const gd of gamesData) {
      const game = await Game.create({ name: gd.name.toLowerCase() });
      for (const eq of gd.equipments) {
        await Equipment.create({ name: eq.name.toLowerCase(), status: eq.status });
      }
    }

    console.log("Games and Equipment seeded.");
    console.log("✅ Database seeding successful!");
    process.exit(0);

  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();