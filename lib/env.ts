const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export function getServerEnv() {
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseSecretKey) throw new Error("Missing environment variable: SUPABASE_SECRET_KEY");

  return {
    xClientId: required("X_CLIENT_ID"),
    xRedirectUri: required("X_REDIRECT_URI"),
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseSecretKey,
    encryptionKey: required("XGA_ENCRYPTION_KEY"),
  };
}

export function getOptionalServerEnv() {
  return {
    xClientSecret: process.env.X_CLIENT_SECRET,
  };
}
