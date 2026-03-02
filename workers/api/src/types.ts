export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  ENVIRONMENT: string;
}

export type Variables = {
  userId: string;
  userEmail: string;
  userRole: string;
  userPermissions: Record<string, boolean>;
};
