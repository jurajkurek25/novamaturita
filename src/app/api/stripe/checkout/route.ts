import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_MAP } from "@/lib/stripe";
import { CREDIT_PACKAGES } from "@/types/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packageId } = await request.json();
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: pkg.price,
          product_data: {
            name: `NovaMaturita – ${pkg.name}`,
            description: `${pkg.credits} kreditov (= ${pkg.credits / 10} skúšaní)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      packageId: pkg.id,
      credits: pkg.credits.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}
