"use strict";
import { _ } from "../util.js";

export { dataTable, dataDescription };
const dataTable = {
  cannotFilter: true,
  chartOverlay: () => [
    {
      tag: "number",
      label: "Rows to display",
      value: 10,
      max: 100,
      min: 1,
      name: "maxEntries",
    },
  ],
  validateChart: (chartPtops) => {
    const attributes = [];
    const placeholders = dataTable.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }

    return [[], [], attributes]
  },
  presets: (chartPtops) => {
    return { chartTitle: "DATA TABLE" };
  },
};
const dataDescription = {
  cannotFilter: true,
  chartOverlay: () => [],
  validateChart: (chartPtops) => {
    const attributes = [];
    const placeholders = dataDescription.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    // return { errors, attributes };
    return [[], [], attributes]
  },
  presets: (chartPtops) => {
    return { chartTitle: "DATA DESCRIPTION" };
  },
};
