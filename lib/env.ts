const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export function getServerEnv() {
  return {
    xClientId: required("X_CLIENT_ID"),
    xRedirectUri: required("X_REDIRECT_URI"),
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
    encryptionKey: required("XGA_ENCRYPTION_KEY"),
  };
}

export function getOptionalServerEnv() {
  return {
    xClientSecret: process.env.X_CLIENT_SECRET,
  };
}
