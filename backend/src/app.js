import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import cors from "cors";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import authRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
connectToSocket(server); 

const port = 8000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Response");
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected");

    server.listen(port, () => {   
      console.log(`Server running on ${port}`);
    });

  } catch (err) {
    console.log(err.message);
  }
};

start();  
