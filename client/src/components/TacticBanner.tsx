import type { ReactNode } from "react";

export type BannerKind = "good" | "bad" | "tip" | "hardcore";

export function TacticBanner({
  kind,
  children,
}: {
  kind: BannerKind;
  children: ReactNode;
}) {
  return <div className={`tactic-banner ${kind} text-center`}>{children}</div>;
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
