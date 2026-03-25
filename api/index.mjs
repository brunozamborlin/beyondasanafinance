// Vercel serverless function adapter
// Uses .mjs to skip Vercel's TypeScript recompilation
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
