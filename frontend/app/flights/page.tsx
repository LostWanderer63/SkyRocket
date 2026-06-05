import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TransportSearch } from "@/components/TransportSearch";

export const metadata = { title: "Flights — SkyRoute Travels" };

export default function FlightsPage() {
  return (
    <>
      <Header />
      <TransportSearch mode="flight" />
      <Footer />
    </>
  );
}
