// Vercel serverless function adapter
// Imports the pre-built Express app bundle (built by esbuild during build step)
export { default } from "../artifacts/api-server/dist/app.mjs";
