import { type RefObject, useState } from "react";

interface ShareResultButtonProps {
  title: string;
  text: string;
  targetRef?: RefObject<HTMLElement | null>;
  imageFactory?: () => Promise<Blob | null>;
  className?: string;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Tempo esgotado.")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function hasPaint(color: string) {
  return Boolean(color) && color !== "transparent" && !color.endsWith(", 0)") && !color.endsWith(" 0)");
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function elementRadius(style: CSSStyleDeclaration) {
  const radius = Number.parseFloat(style.borderTopLeftRadius);
  return Number.isFinite(radius) ? radius : 0;
}

function drawElementText(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  bounds: DOMRect,
  rootRect: DOMRect,
  style: CSSStyleDeclaration,
  yShift: number,
) {
  if (element.children.length > 0) return;
  const text = element.textContent?.replace(/\s+/g, " ").trim();
  if (!text || !hasPaint(style.color)) return;

  const x = bounds.left - rootRect.left;
  const y = bounds.top - rootRect.top - yShift;
  const width = bounds.width;
  const height = bounds.height;
  const fontSize = Number.parseFloat(style.fontSize) || 14;
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.25;
  const textAlign = style.textAlign;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const maxWidth = Math.max(0, width - paddingLeft - paddingRight);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  ctx.save();
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.fillStyle = style.color;
  ctx.textBaseline = "middle";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  let cursorY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (const textLine of lines) {
    let cursorX = x + paddingLeft;
    if (textAlign === "center") cursorX = x + width / 2;
    if (textAlign === "right" || textAlign === "end") cursorX = x + width - paddingRight;
    ctx.textAlign =
      textAlign === "center"
        ? "center"
        : textAlign === "right" || textAlign === "end"
          ? "right"
          : "left";
    ctx.fillText(textLine, cursorX, cursorY, maxWidth);
    cursorY += lineHeight;
  }
  ctx.restore();
}

function paintElement(
  ctx: CanvasRenderingContext2D,
  element: Element,
  rootRect: DOMRect,
  pass: "box" | "image" | "text",
  shiftForTop: (top: number) => number,
) {
  if (!(element instanceof HTMLElement)) return;
  if (element.closest("[data-share-ignore='true']")) return;

  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
    return;

  const x = bounds.left - rootRect.left;
  const yShift = shiftForTop(bounds.top);
  const y = bounds.top - rootRect.top - yShift;
  const radius = elementRadius(style);

  if (pass === "box" && hasPaint(style.backgroundColor)) {
    ctx.save();
    roundedRect(ctx, x, y, bounds.width, bounds.height, radius);
    ctx.fillStyle = style.backgroundColor;
    ctx.fill();
    ctx.restore();
  }

  const borderWidth = Number.parseFloat(style.borderTopWidth) || 0;
  if (pass === "box" && borderWidth > 0 && hasPaint(style.borderTopColor)) {
    ctx.save();
    roundedRect(ctx, x + borderWidth / 2, y + borderWidth / 2, bounds.width - borderWidth, bounds.height - borderWidth, radius);
    ctx.strokeStyle = style.borderTopColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
    ctx.restore();
  }

  if (pass === "image" && element instanceof HTMLImageElement) {
    const image = element;
    if (image.complete && image.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = Number.parseFloat(style.opacity) || 1;
      ctx.drawImage(image, x, y, bounds.width, bounds.height);
      ctx.restore();
    }
  }

  if (pass === "text") drawElementText(ctx, element, bounds, rootRect, style, yShift);
}

async function waitForImages(target: HTMLElement) {
  const images = Array.from(target.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

async function elementImageBlob(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  await waitForImages(target);

  const ignoredRects = Array.from(
    target.querySelectorAll<HTMLElement>("[data-share-ignore='true']"),
  )
    .map((element) => element.getBoundingClientRect())
    .filter((ignored) => ignored.width > 0 && ignored.height > 0);
  const shiftForTop = (top: number) =>
    ignoredRects.reduce(
      (sum, ignored) => (ignored.bottom <= top ? sum + ignored.height : sum),
      0,
    );
  const ignoredHeight = ignoredRects.reduce((sum, ignored) => sum + ignored.height, 0);
  const outputHeight = Math.max(1, rect.height - ignoredHeight);

  const scale = 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width * scale);
  canvas.height = Math.ceil(outputHeight * scale);
  canvas.style.width = `${Math.ceil(rect.width)}px`;
  canvas.style.height = `${Math.ceil(outputHeight)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  const background = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  background.addColorStop(0, "#002216");
  background.addColorStop(0.5, "#08131d");
  background.addColorStop(1, "#000706");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, rect.width, outputHeight);
  const elements = [target, ...Array.from(target.querySelectorAll("*"))].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      !element.closest("[data-share-ignore='true']"),
  );
  for (const element of elements) paintElement(ctx, element, rect, "box", shiftForTop);
  for (const element of elements) paintElement(ctx, element, rect, "image", shiftForTop);
  for (const element of elements) paintElement(ctx, element, rect, "text", shiftForTop);
  return canvasBlob(canvas);
}

export function ShareResultButton({
  title,
  text,
  targetRef,
  imageFactory,
  className = "primary alt big",
}: ShareResultButtonProps) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">("idle");

  const copyImage = async () => {
    if (copyState === "copying") return;
    setCopyState("copying");
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const blob =
        (imageFactory ? await imageFactory() : null) ??
        (targetRef?.current ? await elementImageBlob(targetRef.current) : null);
      if (blob && "ClipboardItem" in window && navigator.clipboard?.write) {
        await withTimeout(
          navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]),
          2500,
        );
      } else {
        await navigator.clipboard?.writeText(`${title}\n${text}`);
      }
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1400);
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") {
        setCopyState("idle");
        return;
      }
      await navigator.clipboard?.writeText(`${title}\n${text}`).catch(() => {});
      setCopyState("idle");
    }
  };
  const label = copyState === "copied" ? "Imagem copiada!" : "Copiar imagem";

  return (
    <button
      type="button"
      className={`${className} min-w-[14rem] text-center`}
      onClick={copyImage}
      aria-disabled={copyState === "copying"}
    >
      <span className="inline-block min-w-[10.5rem]">{label}</span>
    </button>
  );
}
