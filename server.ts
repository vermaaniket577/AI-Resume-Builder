import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import admin from "firebase-admin";
import fs from "fs";

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
if (firebaseConfig.firestoreDatabaseId) {
  // Use specific database if provided
  // Note: In newer versions of firebase-admin, you can specify the databaseId in initializeApp or use getFirestore(databaseId)
  // For simplicity, we assume the default database or the one configured in the project
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing
  app.use(express.json());

  // API: Create Razorpay Order
  app.post("/api/razorpay/order", async (req, res) => {
    try {
      const { amount, currency = "INR" } = req.body;
      const options = {
        amount: amount * 100, // Amount in paise
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay Order Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook: Handle Razorpay Payment Success
  app.post("/api/webhook/razorpay", async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const signature = req.headers["x-razorpay-signature"] as string;

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest === signature) {
      console.log("Razorpay Webhook Verified");
      const event = req.body.event;

      if (event === "payment.captured") {
        const payload = req.body.payload.payment.entity;
        const userId = payload.notes?.userId;

        if (userId) {
          try {
            await db.collection("users").doc(userId).update({
              isPremium: true,
              premiumSince: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`User ${userId} upgraded to Premium via Webhook`);
          } catch (error) {
            console.error("Error updating user premium status:", error);
          }
        }
      }
      res.json({ status: "ok" });
    } else {
      console.error("Razorpay Webhook Signature Mismatch");
      res.status(400).send("Invalid signature");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
