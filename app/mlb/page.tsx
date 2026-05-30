import type { Metadata } from "next";
import MlbApp from "@/components/mlb/MlbApp";

export const metadata: Metadata = {
  title: "Le Monde de MLB",
  description: "Votre studio d'écriture — Plume réécrit vos idées, Margaux les édite.",
};

export default function MlbPage() {
  return <MlbApp />;
}
