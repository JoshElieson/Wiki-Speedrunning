import Image from "next/image";
import brandMark from "@/app/icon-source.png";
import { cn } from "@/utils/cn";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={brandMark}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
        priority
      />
      <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Wiki Speedrunning</span>
    </span>
  );
}
