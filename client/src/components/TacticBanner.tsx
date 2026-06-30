import type { ReactNode } from "react";

export type BannerKind = "good" | "bad" | "tip" | "hardcore";

const KIND_CLASSES: Record<BannerKind, string> = {
  good: "text-[color:var(--accent)] border-[rgba(31,199,125,0.5)] bg-[rgba(31,199,125,0.1)]",
  bad: "text-[#ff7676] border-[rgba(229,72,72,0.5)] bg-[rgba(229,72,72,0.1)]",
  tip: "text-[color:var(--gold)] border-[rgba(255,206,84,0.4)] bg-[rgba(255,206,84,0.08)]",
  hardcore:
    "text-[color:var(--muted)] border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)]",
};

export function TacticBanner({
  kind,
  children,
  compact = false,
}: {
  kind: BannerKind;
  children: ReactNode;
  /** Tighter layout used inside the halftime card (matches its container styling). */
  compact?: boolean;
}) {
  const radius = compact ? "rounded-lg" : kind === "hardcore" ? "rounded-none" : "rounded-[10px]";
  const layout = compact
    ? "mx-auto mt-4 mb-[0.9rem] max-w-[min(34rem,100%)] text-left"
    : "mx-auto mb-3.5 max-w-[540px] text-center";
  return (
    <div
      className={`${layout} ${radius} border py-2.5 px-3.5 text-[13px] font-bold ${KIND_CLASSES[kind]}`}
    >
      {children}
    </div>
  );
}

export interface BannerSpec {
  kind: BannerKind;
  text: ReactNode;
}

export function TacticBannerList({ banners }: { banners: BannerSpec[] }) {
  return (
    <>
      {banners.map((b, i) => (
        <TacticBanner key={i} kind={b.kind}>
          {b.text}
        </TacticBanner>
      ))}
    </>
  );
}
