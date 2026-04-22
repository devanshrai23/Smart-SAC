import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config();

connectDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(` server runnig at port : ${process.env.PORT || 8000}`);
    })
})
    .catch((err) => {
        console.log("mongo db connection failed in app listend thing", err);
    });

console.log("ENV CHECK:", process.env.MONGODB_URL);