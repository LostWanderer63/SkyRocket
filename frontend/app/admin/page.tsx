import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = { title: "Admin — SkyRoute Travels" };

export default function AdminPage() {
  return (
    <>
      <Header />
      <AdminDashboard />
      <Footer />
    </>
  );
}
