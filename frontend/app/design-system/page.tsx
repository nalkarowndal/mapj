import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/ui/DesignSystemShowcase";

export const metadata: Metadata = {
  title: "디자인 시스템",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}

