/** Copy text without assuming the modern Clipboard API is available. */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Browsers can expose this API while denying it by permissions policy.
    }
  }

  if (typeof document === "undefined") throw new Error("Clipboard is unavailable.");

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "-9999px auto auto -9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Clipboard permission was denied.");
  } finally {
    textarea.remove();
  }
}
