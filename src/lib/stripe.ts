import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export const STRIPE_PRICE_MAP: Record<string, { credits: number; name: string }> = {
  starter: { credits: 50, name: "Štarter – 50 kreditov" },
  standard: { credits: 150, name: "Štandard – 150 kreditov" },
  premium: { credits: 500, name: "Prémiový – 500 kreditov" },
};
