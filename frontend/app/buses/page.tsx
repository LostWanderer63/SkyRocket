import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TransportSearch } from "@/components/TransportSearch";

export const metadata = { title: "Buses — SkyRoute Travels" };

export default function BusesPage() {
  return (
    <>
      <Header />
      <TransportSearch mode="bus" />
      <Footer />
    </>
  );
}
