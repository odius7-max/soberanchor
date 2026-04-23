import type { LucideIcon } from 'lucide-react';

interface SectionHeadingProps {
  icon: LucideIcon;
  children: React.ReactNode;
  id?: string;
}

export default function SectionHeading({ icon: Icon, children, id }: SectionHeadingProps) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 text-[22px] font-bold text-navy tracking-tight mb-5 mt-14 first:mt-0"
    >
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal/10 text-teal">
        <Icon size={20} strokeWidth={2.25} aria-hidden />
      </span>
      {children}
    </h2>
  );
}
