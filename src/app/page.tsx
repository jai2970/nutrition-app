import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { outfit } from "./_landing/font";
import PortalGate from "./_landing/PortalGate";
import Content, { Front } from "./_landing/Content";
import "./_landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "Macroly — scan your plate, get your macros" },
  description: "Scan your plate, get your macros, fix your meal.",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className={outfit.className}>
      <PortalGate fontFamily={outfit.style.fontFamily} front={<Front />}>
        <Content />
      </PortalGate>
    </div>
  );
}
