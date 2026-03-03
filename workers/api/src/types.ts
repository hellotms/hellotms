export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string; // comma-separated list of allowed origins
}

export type Variables = {
  userId: string;
  userEmail: string;
  userRole: string;
  userPermissions: Record<string, boolean>;
};
