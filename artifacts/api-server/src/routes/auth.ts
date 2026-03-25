import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const router: IRouter = Router();

const APP_PASSWORD = process.env.APP_PASSWORD;

function makeToken(timestamp: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${hmac}`;
}

export function verifyToken(token: string): boolean {
  if (!APP_PASSWORD) return true; // No password set = no auth required
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const timestamp = token.slice(0, dot);
  const expected = makeToken(timestamp, APP_PASSWORD);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

router.post("/auth/verify", (req, res): void => {
  const { password } = req.body ?? {};

  if (!APP_PASSWORD) {
    res.json({ token: "no-auth-required" });
    return;
  }

  if (typeof password !== "string" || password !== APP_PASSWORD) {
    res.status(401).json({ error: "Password errata" });
    return;
  }

  const timestamp = Date.now().toString();
  const token = makeToken(timestamp, APP_PASSWORD);
  res.json({ token });
});

router.get("/auth/check", (req, res): void => {
  if (!APP_PASSWORD) {
    res.json({ valid: true });
    return;
  }

  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token || !verifyToken(token)) {
    res.status(401).json({ valid: false });
    return;
  }

  res.json({ valid: true });
});

export default router;
