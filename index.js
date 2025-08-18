import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import cors from 'cors'
import dotenv from 'dotenv';

dotenv.config();

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cors())

// Health check endpoint
app.get("/health", (req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);

mongoose
  .connect(
    process.env.MONGODB_URL
  )
  .then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`listening at ${process.env.PORT}`);
      });
    console.log("connected");
  })
  .catch((err) => {
    console.log("connection failed", err); 
  });