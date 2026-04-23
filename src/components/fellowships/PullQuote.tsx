interface PullQuoteProps {
  children: React.ReactNode;
}

export default function PullQuote({ children }: PullQuoteProps) {
  return (
    <blockquote className="my-10 border-l-[3px] border-teal pl-6 py-2 text-[22px] leading-[1.45] font-light italic text-navy tracking-[-0.2px]">
      <p>{children}</p>
    </blockquote>
  );
}
