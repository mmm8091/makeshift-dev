import powershell from "highlight.js/lib/languages/powershell";
import { common } from "lowlight";
import type { Options } from "rehype-highlight";

export const markdownHighlightOptions = {
  detect: false,
  languages: { ...common, powershell },
  aliases: {
    powershell: ["ps1", "pwsh"],
    bash: ["shell"],
  },
  plainText: ["console", "terminal", "text", "txt", "plaintext"],
} satisfies Options;
