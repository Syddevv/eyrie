type EnvConfig = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_KEY: string;
  GROQ_API_KEY: string;
};

function normalizeEnvValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export const ENV: EnvConfig = {
  SUPABASE_URL: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_PUBLISHABLE_KEY: normalizeEnvValue(
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  SUPABASE_KEY:
    normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  GROQ_API_KEY: normalizeEnvValue(process.env.EXPO_PUBLIC_GROQ_API_KEY),
};

const envIssues: string[] = [];

if (!ENV.SUPABASE_URL) {
  envIssues.push("Missing EXPO_PUBLIC_SUPABASE_URL.");
}

if (!ENV.SUPABASE_KEY) {
  envIssues.push(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const envConfigError =
  envIssues.length > 0 ? new Error(envIssues.join(" ")) : null;

console.log("SUPABASE URL:", ENV.SUPABASE_URL || "(missing)");
console.log("SUPABASE KEY EXISTS:", Boolean(ENV.SUPABASE_KEY));
console.log("GROQ API KEY EXISTS:", Boolean(ENV.GROQ_API_KEY));

export function getEnvErrorMessage(feature = "This feature") {
  if (!envConfigError) {
    return null;
  }

  return `${feature} is unavailable because the app environment is incomplete. ${envConfigError.message}`;
}

export function assertEnvReady(feature = "This feature") {
  const message = getEnvErrorMessage(feature);

  if (message) {
    throw new Error(message);
  }
}

