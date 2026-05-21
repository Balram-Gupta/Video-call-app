import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import { createServer } from "http";
import cors from "cors";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketmanager.js";
import authRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
connectToSocket(server); 

const port = process.env.PORT || 8000;

const requiredEnvVars = ["MONGO_URL", "EMAIL", "EMAIL_PASS", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]?.trim());

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const normalizeOrigin = (origin) => origin?.replace(/\/$/, "");
const allowedOrigins = [
  "https://video-call-app-frontend-l30w.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
]
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
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
