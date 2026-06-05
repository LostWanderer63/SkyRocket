import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PnrLookup } from "@/components/PnrLookup";

export const metadata = { title: "Manage booking / PNR — SkyRoute Travels" };

export default function PnrPage() {
  return (
    <>
      <Header />
      <PnrLookup />
      <Footer />
    </>
  );
}
