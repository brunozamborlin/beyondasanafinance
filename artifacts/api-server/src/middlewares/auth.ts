import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";

const PUBLIC_PATHS = ["/auth/verify", "/auth/check"];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!process.env.APP_PASSWORD) {
    next();
    return;
  }

  if (PUBLIC_PATHS.some((p) => req.path === p)) {
    next();
    return;
  }

  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: "Non autorizzato" });
    return;
  }

  next();
}
