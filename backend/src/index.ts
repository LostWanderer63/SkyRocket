import express from "express";
import cors from "cors";
import { locationsRouter } from "./routes/locations.js";
import { transportRouter } from "./routes/transport.js";
import { trainsRouter } from "./routes/trains.js";
import { toursRouter } from "./routes/tours.js";
import { bookingsRouter } from "./routes/bookings.js";
import { authRouter } from "./routes/auth.js";
import { travelersRouter } from "./routes/travelers.js";
import { fareTrendRouter } from "./routes/fareTrend.js";
import { alertsRouter } from "./routes/alerts.js";
import { paymentsRouter } from "./routes/payments.js";
import { dealsRouter } from "./routes/deals.js";
import { adminRouter } from "./routes/admin.js";
import { counts } from "./lib/locations.js";
import { trainStationCount } from "./lib/trains.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.CORS_ORIGIN ?? "*";

app.use(cors({ origin: ORIGIN === "*" ? true : ORIGIN.split(",") }));
app.use(express.json());

// Simple request log.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "skyroute-backend",
    locations: { ...counts(), train: trainStationCount() },
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/flights", transportRouter("flight"));
app.use("/api/trains", trainsRouter); // IRCTC-style Indian rail engine
app.use("/api/buses", transportRouter("bus"));
app.use("/api/tours", toursRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/travelers", travelersRouter);
app.use("/api/fare-trend", fareTrendRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/admin", adminRouter);

// 404 + error handlers.
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  const c = counts();
  console.log(`SkyRoute backend on http://localhost:${PORT}`);
  console.log(`Locations loaded — airports:${c.flight} trains:${c.train} buses:${c.bus}`);
});
