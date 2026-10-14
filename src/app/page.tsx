"use client";

import { useState, useRef } from "react";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalLookupHero } from "@/components/portal/PortalLookupHero";
import { QuickActionGrid } from "@/components/portal/QuickActionGrid";
import { ProcessSteps } from "@/components/portal/ProcessSteps";
import { PortalFaq } from "@/components/portal/PortalFaq";
import { RequirementsModal } from "@/components/portal/RequirementsModal";
import { StartFormModal } from "@/components/portal/StartFormModal";
import { PortalFooter } from "@/components/portal/PortalFooter";

export default function HomePage() {
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const scrollToLookup = () => {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const input = heroRef.current?.querySelector("input");
    if (input) {
      setTimeout(() => input.focus(), 400);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      {/* Top Navigation */}
      <PortalHeader
        onOpenStartModal={() => setStartModalOpen(true)}
        onOpenRequirementsModal={() => setReqModalOpen(true)}
        onScrollToLookup={scrollToLookup}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* Hero Section with Glowing Ambient Mesh & Live Status Lookup */}
        <div ref={heroRef}>
          <PortalLookupHero
            onOpenStartModal={() => setStartModalOpen(true)}
            onOpenRequirementsModal={() => setReqModalOpen(true)}
          />
        </div>

        {/* Quick Action Grid (Inspired by Reference Images 1 & 2) */}
        <QuickActionGrid
          onOpenStartModal={() => setStartModalOpen(true)}
          onOpenRequirementsModal={() => setReqModalOpen(true)}
          onScrollToLookup={scrollToLookup}
        />

        {/* 4-Step Numbered Process (Inspired by Reference Image 3) */}
        <div id="proceso" className="scroll-mt-20">
          <ProcessSteps
            onOpenStartModal={() => setStartModalOpen(true)}
            onOpenRequirementsModal={() => setReqModalOpen(true)}
          />
        </div>

        {/* Frequently Asked Questions */}
        <PortalFaq />
      </main>

      {/* Institutional Corporate Footer */}
      <PortalFooter />

      {/* Modals */}
      <RequirementsModal
        open={reqModalOpen}
        onClose={() => setReqModalOpen(false)}
      />

      <StartFormModal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
      />
    </div>
  );
}