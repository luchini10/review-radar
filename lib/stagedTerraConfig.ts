export const STAGED_TERRA_SERVER_FLAG = "REVIEW_RADAR_STAGED_TERRA";
export const STAGED_TERRA_CLIENT_FLAG =
  "NEXT_PUBLIC_REVIEW_RADAR_STAGED_TERRA";

export function stagedTerraServerEnabled(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment[STAGED_TERRA_SERVER_FLAG] === "on";
}

export function stagedTerraClientEnabled(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment[STAGED_TERRA_CLIENT_FLAG] === "true";
}
