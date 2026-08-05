/**
 * Copy text to the clipboard.
 *
 * navigator.clipboard only exists in a "secure context" — https:// or
 * localhost. Testing over wifi means plain http://192.168.x.x, where it
 * is undefined. The textarea + execCommand trick is deprecated but still
 * works in every browser, so it covers that case.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the older method
    }
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";

    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
