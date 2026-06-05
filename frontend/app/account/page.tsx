import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AccountView } from "@/components/auth/AccountView";

export const metadata = { title: "My bookings — SkyRoute Travels" };

export default function AccountPage() {
  return (
    <>
      <Header />
      <AccountView />
      <Footer />
    </>
  );
}
