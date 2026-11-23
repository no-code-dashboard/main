"use strict";
import { _ } from "../util.js";

export { note };

const note = {
  cannotFilter: true,
  chartOverlay: () => [
    { tag: "textarea", rows: 10, name: "message", label: "Text" },
  ],
  validateChart: (chartPtops) => {
    const [errors, warnings, attributes] =[[],[],[]]
    if (chartPtops["message"].trim() == "")
      errors.push({ message: `Text is required` });

    const placeholders = note.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }

    return [errors, warnings, attributes]
  },
  presets: (chartPtops, calloutProps) => {
    return { chartTitle: "NOTE" };
  },
};
