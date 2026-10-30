import Image from "next/image";
import { STORE_CONFIG } from "@/config/store";

type StoreLogoProps = {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
};

const sizes = {
  sm: { image: 34, text: "text-[13px]", sub: "text-[8px]" },
  md: { image: 44, text: "text-[16px]", sub: "text-[9px]" },
  lg: { image: 60, text: "text-[21px]", sub: "text-[9px]" },
} as const;

export function StoreLogo({
  size = "md",
  showName = true,
  className = "",
}: StoreLogoProps) {
  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={STORE_CONFIG.logo}
        alt={`${STORE_CONFIG.name} logo`}
        width={config.image}
        height={config.image}
        priority={size !== "sm"}
        className="h-auto w-auto object-contain"
      />

      {showName ? (
        <div className="leading-none">
          <div
            className={`${config.text} font-black uppercase tracking-[-0.045em] text-[#111]`}
          >
            {STORE_CONFIG.shortName}
          </div>
          <div
            className={`${config.sub} mt-1 font-bold uppercase tracking-[0.22em] text-[#d71920]`}
          >
            Trading
          </div>
        </div>
      ) : null}
    </div>
  );
}
