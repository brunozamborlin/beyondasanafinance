// Vercel serverless function adapter
// Uses .js to avoid Vercel's TypeScript recompilation which conflicts
// with the project's bundler-mode moduleResolution
export { default } from "../artifacts/api-server/src/app.ts";
