import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrainSearch } from "@/components/trains/TrainSearch";

export const metadata = { title: "Trains — SkyRoute Travels" };

export default function TrainsPage() {
  return (
    <>
      <Header />
      <TrainSearch />
      <Footer />
    </>
  );
}
