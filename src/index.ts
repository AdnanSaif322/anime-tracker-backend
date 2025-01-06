import { serve } from "@hono/node-server";
import { Hono, Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "dotenv";
import auth from "./routes/auth";
import anime from "./routes/anime";
import { isAppError } from "./utils/errors";
import { getCookie, setCookie } from "hono/cookie";
import { CookieOptions } from "hono/utils/cookie";

// Load environment variables
config();

type CustomContext = {
  Variables: {
    cookie: typeof setCookie;
    getCookie: typeof getCookie;
  };
};

const app = new Hono<CustomContext>();

// Middleware
app.use("*", logger());
app.use("*", async (c: Context<CustomContext>, next) => {
  c.set("cookie" as keyof CustomContext["Variables"], setCookie);
  c.set("getCookie" as keyof CustomContext["Variables"], getCookie);
  await next();
});
app.use(
  "*",
  cors({
    origin: "https://anime-tracker-frontend.vercel.app",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Set-Cookie", "Authorization"],
    maxAge: 86400,
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

// Add this before routes
app.use("*", async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  await next();
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
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
