import type { Metadata } from "next";
import { connection } from "next/server";
import AdminDashboard from "@/components/AdminDashboard";
import AdminLogin from "@/components/AdminLogin";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  await connection();
  return (await isAdmin()) ? <AdminDashboard /> : <AdminLogin />;
}
