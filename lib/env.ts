export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
  paymentsUrl: (import.meta.env.VITE_MSF_PAYMENTS_URL as string | undefined) ?? "",
} as const;
