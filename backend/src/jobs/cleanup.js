import cron from "node-cron";
import { prisma } from "../db/index.js";

export const startCleanupJobs = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("🧹 Running TTL cleanup job for expired records...");
    try {
      const now = new Date();

      // Delete expired Announcements
      const deletedAnnouncements = await prisma.announcement.deleteMany({
        where: {
          expireAt: {
            lte: now,
          },
        },
      });

      // Delete expired EquipmentHistory
      const deletedHistory = await prisma.equipmentHistory.deleteMany({
        where: {
          expireAt: {
            lte: now,
          },
        },
      });

      console.log(`✅ Cleanup complete. Deleted ${deletedAnnouncements.count} announcements and ${deletedHistory.count} equipment history records.`);
    } catch (error) {
      console.error("❌ Error during TTL cleanup job:", error);
    }
  });
};
