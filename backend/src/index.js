import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { startCleanupJobs } from "./jobs/cleanup.js";

dotenv.config();

connectDB().then(() => {
    startCleanupJobs();
    app.listen(process.env.PORT || 8000, () => {
        console.log(` server running at port : ${process.env.PORT || 8000}`);
    })
})
    .catch((err) => {
        console.log("postgres db connection failed in app listen thing", err);
    });