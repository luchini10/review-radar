import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: {
      NEXT_PUBLIC_REVIEW_RADAR_DIRECT_TERRA: "false",
      NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA: "false",
      OPENAI_API_KEY: "",
      REVIEW_RADAR_DIRECT_TERRA: "off",
      REVIEW_RADAR_JOB_TOKEN_SECRET: "",
      REVIEW_RADAR_PIPELINE_MODE: "legacy",
      REVIEW_RADAR_STAGED_TERRA: "off",
      SEARCHAPI_API_KEY: "",
      SERPER_API_KEY: "",
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
