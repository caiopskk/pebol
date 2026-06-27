import { createElement, Fragment } from "react";
import { DEV_PREVIEWS, type DevPreviewKind } from "./devPreviews.js";
import { liveStore } from "./lib/liveStore.js";

export interface DevPreviewXpNotice {
  amount: number;
  reason: string;
  level: number;
  title: string;
}

interface DevPreviewChromeProps {
  active: DevPreviewKind;
  onHome: () => void;
  onAchievement: (id: string) => void;
  onXp: (notice: DevPreviewXpNotice) => void;
}

export function DevPreviewChrome({
  active,
  onHome,
  onAchievement,
  onXp,
}: DevPreviewChromeProps) {
  const current = DEV_PREVIEWS.find((preview) => preview.kind === active);
  return createElement(
    Fragment,
    null,
    createElement(
      "div",
      { className: "dev-preview-chrome" },
      createElement(
        "button",
        {
          type: "button",
          className: "dev-preview-home",
          onClick: onHome,
        },
        "Tela inicial",
      ),
      createElement(
        "div",
        { className: "dev-preview-current" },
        createElement("span", null, "Preview"),
        createElement("strong", null, current?.label ?? active),
      ),
      createElement(
        "div",
        { className: "dev-preview-links" },
        DEV_PREVIEWS.map((preview) =>
          createElement(
            "button",
            {
              key: preview.kind,
              type: "button",
              className: preview.kind === active ? "active" : "",
              onClick: () => {
                location.hash = preview.hash;
              },
            },
            preview.label,
          ),
        ),
      ),
    ),
    createElement(PreviewNoticeControls, { onAchievement, onXp }),
  );
}

let previewAlertTimer: number | undefined;
export const GOAL_ALERT_HIDE_MS = 1250;
export const CARD_ALERT_HIDE_MS = 1200;

function triggerPreviewAlert(kind: "goal" | "yellow" | "red") {
  clearTimeout(previewAlertTimer);
  liveStore.hideGoal();
  liveStore.hideCard();

  const feedBase = { minute: 64, pos: "88-38" };
  if (kind === "goal") {
    liveStore.setBall({ left: 90, top: 48, transitionMs: 420, goal: true });
    liveStore.showGoal("Messi");
    liveStore.prependFeed({
      ...feedBase,
      type: "goal",
      text: "Gol do Seu time! Messi bate colocado no canto.",
    });
    previewAlertTimer = window.setTimeout(() => liveStore.hideGoal(), GOAL_ALERT_HIDE_MS);
    return;
  }

  const cardKind = kind === "red" ? "red" : "yellow";
  liveStore.showCard(
    cardKind,
    `${cardKind === "red" ? "Vermelho" : "Amarelo"}: Zidane`,
  );
  liveStore.prependFeed({
    ...feedBase,
    type: "card",
    text: `${cardKind === "red" ? "Cartão vermelho" : "Cartão amarelo"} para Zidane por falta dura.`,
    cardKind,
  });
  previewAlertTimer = window.setTimeout(() => liveStore.hideCard(), CARD_ALERT_HIDE_MS);
}

interface PreviewNoticeControlsProps {
  onAchievement: (id: string) => void;
  onXp: (notice: DevPreviewXpNotice) => void;
}

function triggerPreviewNotice(
  kind: "achievement" | "xp" | "combo",
  { onAchievement, onXp }: PreviewNoticeControlsProps,
) {
  if (kind === "achievement" || kind === "combo") {
    onAchievement(kind === "combo" ? "world_champion" : "first_win");
  }
  if (kind === "xp" || kind === "combo") {
    onXp({
      amount: kind === "combo" ? 150 : 45,
      reason: kind === "combo" ? "Título da Copa do Mundo" : "Preview de progresso",
      level: kind === "combo" ? 12 : 4,
      title: kind === "combo" ? "Capitão" : "Aspirante",
    });
  }
}

function PreviewNoticeControls(callbacks: PreviewNoticeControlsProps) {
  const buttons: Array<[string, Parameters<typeof triggerPreviewNotice>[0]]> = [
    ["Conquista", "achievement"],
    ["XP", "xp"],
    ["Combo", "combo"],
  ];
  return createElement(
    "div",
    {
      className: "preview-alert-controls",
      "aria-label": "Disparar conquistas do preview",
    },
    createElement("span", null, "Conquistas"),
    ...buttons.map(([label, kind]) =>
      createElement(
        "button",
        {
          key: kind,
          type: "button",
          onClick: () => triggerPreviewNotice(kind, callbacks),
        },
        label,
      ),
    ),
  );
}

export function PreviewAlertControls() {
  const buttons: Array<[string, Parameters<typeof triggerPreviewAlert>[0]]> = [
    ["Gol", "goal"],
    ["Amarelo", "yellow"],
    ["Vermelho", "red"],
  ];
  return createElement(
    "div",
    { className: "preview-alert-controls", "aria-label": "Disparar alertas do preview" },
    createElement("span", null, "Alertas"),
    ...buttons.map(([label, kind]) =>
      createElement(
        "button",
        {
          key: kind,
          type: "button",
          onClick: () => triggerPreviewAlert(kind),
        },
        label,
      ),
    ),
  );
}
