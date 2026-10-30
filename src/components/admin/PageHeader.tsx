import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  eyebrow = "Overview",
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d71920]">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[clamp(2rem,3.2vw,3rem)] font-semibold tracking-[-0.055em] text-[#111111]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-black/43">
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
}
