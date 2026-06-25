export const DEV_PREVIEWS = [
  { kind: "cup-setup", label: "Copa setup", hash: "#preview-cup-setup" },
  { kind: "cup-draft", label: "Copa draft", hash: "#preview-cup-draft" },
  { kind: "cup-prematch", label: "Pré-jogo", hash: "#preview-cup-prematch" },
  { kind: "cup-match", label: "Jogo", hash: "#preview-cup-match" },
  { kind: "cup-victory", label: "Vitória", hash: "#preview-cup-victory" },
  { kind: "cup-gameover", label: "Derrota", hash: "#preview-cup-gameover" },
  { kind: "penalty-modal", label: "Pênaltis", hash: "#preview-penalty-modal" },
  {
    kind: "substitution-modal",
    label: "Substituições",
    hash: "#preview-substitution-modal",
  },
] as const;

export type DevPreviewKind = (typeof DEV_PREVIEWS)[number]["kind"];

export function devPreviewFromHash(hash: string): DevPreviewKind | null {
  return DEV_PREVIEWS.find((preview) => preview.hash === hash)?.kind ?? null;
}
