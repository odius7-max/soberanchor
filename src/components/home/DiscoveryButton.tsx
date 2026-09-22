"use client";
import { useOpenDiscovery } from "./DiscoveryShell";

/** Button that swaps the homepage for GuidedDiscovery. Styling comes from the caller. */
export default function DiscoveryButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const open = useOpenDiscovery();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
