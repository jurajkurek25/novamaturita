"use client";

import { redirect } from "next/navigation";

// Register is handled by Google OAuth on login page
export default function RegisterPage() {
  redirect("/login");
}
