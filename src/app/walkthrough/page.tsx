import type { Metadata } from "next";
import { WalkthroughClient } from "@/components/walkthrough/WalkthroughClient";

export const metadata: Metadata = {
  title: "Guided walkthrough | StoneCraft",
  description: "Your private StoneCraft photo walkthrough.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default function Page() {
  const enabled = process.env.WALKTHROUGH_ENABLED !== "false";
  return (
    <section className="min-h-[70vh] bg-cream py-6 sm:py-10">
      <div className="container-sc max-w-2xl">
        {enabled ? <WalkthroughClient /> : <p className="py-20 text-center">The guided walkthrough isn&apos;t available right now. Email photos to <a className="underline" href="mailto:info@stonecraftpros.com">info@stonecraftpros.com</a>.</p>}
      </div>
    </section>
  );
}
