import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TourDetail } from "@/components/tours/TourDetail";
import { getTour } from "@/lib/api";
import type { Tour } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const tour = await getTour(id);
    return { title: `${tour.title} — SkyRoute Travels` };
  } catch {
    return { title: "Tour — SkyRoute Travels" };
  }
}

export default async function TourPage({ params }: PageProps) {
  const { id } = await params;
  let tour: Tour;
  try {
    tour = await getTour(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <TourDetail tour={tour!} />
      <Footer />
    </>
  );
}
