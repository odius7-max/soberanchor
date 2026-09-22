"use client";
import { createContext, useCallback, useContext, useState } from "react";
import GuidedDiscovery from "@/components/GuidedDiscovery";

/**
 * Holds the guided-discovery toggle for the homepage.
 *
 * The homepage itself is a server component (it exports metadata and reads
 * live counts), but two places on it open GuidedDiscovery in place of the
 * page: the hero's "Not sure where to start?" link and the directory band's
 * "Talk to AI search" button. This shell keeps that single piece of state
 * above both and renders the server-rendered page as `children`.
 *
 * Behavior is unchanged from the previous client page: opening discovery
 * replaces the whole page, closing restores it.
 */
const OpenDiscoveryContext = createContext<() => void>(() => {});

export function useOpenDiscovery() {
  return useContext(OpenDiscoveryContext);
}

export default function DiscoveryShell({ children }: { children: React.ReactNode }) {
  const [showDiscovery, setShowDiscovery] = useState(false);
  const open = useCallback(() => setShowDiscovery(true), []);

  if (showDiscovery) {
    return <GuidedDiscovery onClose={() => setShowDiscovery(false)} />;
  }

  return (
    <OpenDiscoveryContext.Provider value={open}>
      {children}
    </OpenDiscoveryContext.Provider>
  );
}
