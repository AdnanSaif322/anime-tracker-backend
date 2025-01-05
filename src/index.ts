import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "dotenv";
import auth from "./routes/auth";
import anime from "./routes/anime";
import { isAppError } from "./utils/errors";

// Load environment variables
config();

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "https://anime-tracker-adnansaif322.vercel.app",
    ],
    credentials: true,
  })
);

// Increase timeout middleware
app.use("*", async (c, next) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), 60000); // 60 seconds
  });

  try {
    await Promise.race([next(), timeout]);
  } catch (e) {
    if (e instanceof Error && e.message === "Request timeout") {
      return c.json({ error: "Request timeout" }, 504);
    }
    throw e;
  }
});

// Routes
app.route("/auth", auth);
app.route("/anime", anime);

// Health check route
app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Anime Tracker API is running",
  });
});

// Add global error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);

  if (isAppError(err)) {
    return c.json(
      {
        error: err.message,
        code: err.code,
      },
      err.statusCode
    );
  }

  // Handle other errors
  const statusCode = err instanceof Error ? 400 : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";

  return c.json({ error: message }, statusCode);
});

// Add validation error handling
app.onError((err, c) => {
  if (err instanceof Error && err.message.includes("JSON")) {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }
  throw err;
});

// Start server
const port = Number(process.env.PORT) || 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
