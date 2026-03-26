import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import authRouter from "./routes/auth";
import { authMiddleware } from "./middlewares/auth";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache GET responses for 60 seconds
app.use("/api", (req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  }
  next();
});

app.use("/api", authRouter);
app.use("/api", authMiddleware, router);

export default app;
