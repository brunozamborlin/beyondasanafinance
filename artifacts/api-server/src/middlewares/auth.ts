import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";

const PUBLIC_PATHS = ["/auth/verify", "/auth/check"];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ENV_KEY = "APP_PASSWORD";
  if (!process.env[ENV_KEY]) {
    next();
    return;
  }

  if (PUBLIC_PATHS.some((p) => req.path === p)) {
    next();
    return;
  }

  const auth = req.headers.authorization;
  // Support token via query param for direct browser navigations (e.g. CSV export)
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : queryToken;

  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: "Non autorizzato" });
    return;
  }

  next();
}
