import { toBlob } from "html-to-image";

/**
 * Captures a DOM node to a PNG Blob without clipping.
 *
 * The node is expected to be an offscreen, fixed-width container with no
 * framer-motion transforms (see the `*-share-capture` wrappers). We measure
 * `scrollWidth`/`scrollHeight` so the full content is captured even if it
 * overflows the viewport, and wait for fonts/images so nothing renders blank.
 */
export async function captureNodeToBlob(
  node: HTMLElement,
  options: { backgroundColor?: string; pixelRatio?: number } = {},
): Promise<Blob | null> {
  const { backgroundColor = "#07131c", pixelRatio = 2 } = options;

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : img.decode().catch(() => {}),
    ),
  );

  const width = Math.ceil(node.scrollWidth);
  const height = Math.ceil(node.scrollHeight);

  return toBlob(node, {
    width,
    height,
    pixelRatio,
    cacheBust: true,
    backgroundColor,
    style: { transform: "none", margin: "0" },
  });
}
