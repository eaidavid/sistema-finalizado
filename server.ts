import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/api.js";
import { seedDatabase } from "./server/seed.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // JSON request body parser
  app.use(express.json());

  // Security headers middleware (CORS, Clickjacking & XSS Protection)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    // Standard secure SaaS headers
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // Automatic database execution seeding on server startup
  try {
    await seedDatabase();
  } catch (err) {
    console.error("Critical error during database seed execution:", err);
  }

  // Bind REST api routes
  app.use("/api", apiRouter);

  // Health-check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // Vite middleware for development vs static build folder for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode under Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static frontend assets
    app.use(express.static(distPath));
    
    // SPA fallback route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Full-stack server actively listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
