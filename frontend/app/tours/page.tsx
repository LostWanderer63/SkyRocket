import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToursApp } from "@/components/tours/ToursApp";

export const metadata = { title: "Tour packages — SkyRoute Travels" };

export default function ToursPage() {
  return (
    <>
      <Header />
      <ToursApp />
      <Footer />
    </>
  );
}
