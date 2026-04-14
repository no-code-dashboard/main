"use strict";
import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import { AxisUi, ChartFilterUi, CountTypeUi } from "./uis.js";
export { bar };

const ENABLE = ["disabled", false];
const DISABLE = ["disabled", true];

const bar = {
  chartOverlay: ({ config, chartType }) => {
    return [
      ...AxisUi.elements({ config, prefix: "x_", legend: "Horizontal axis" }),
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
      { tag: "date-input", label: "New date", list:"a,b"},
    ];
  },
  validateChart: (chartPtops) => {
    const [e1, w1, a1] = AxisUi.validate(chartPtops, "x_");
    const [e2, w2, a2] = ChartFilterUi.validate(chartPtops);
    const [e3, w3, a3] = CountTypeUi.validate(chartPtops);
    const errors = [...e1, ...e2, ...e3];
    const warnings = [...w1, ...w2, ...w3];
    const attributes = [...a1, ...a2, ...a3];

    const placeholders = bar.presets(chartPtops, { value: "category" });

    for (const name in placeholders) {
      if (name in chartPtops) {
        const value = placeholders[name];
        attributes.push({ name, attrs: ["placeholder", value] });
      }
    }
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutPtops) => {
    const { countType, colOver, x_label, x_column, x_bin, x_dataType } =
      chartPtops;
    const x = (x_label, x_column);
    const description = CountTypeUi.description(chartPtops);
    const binned = x_dataType === "Number" && x_bin ? "binned " : "";
    //todo fix list
    // const list = chartType === "List" ? "Members in " : ""
    // const list = chartType === "List Members"? "Members in " : ""
    // const title = `${binned}${description} ${
    //   description === "count" ? "" : "distribution"
    // } by ${x}`;
    const title = `${description} of ${binned}${x}`;
    const chartTitle = title.toUpperCase();

    return { chartTitle, calloutMessage: getCallOutMessage() };

    function getCallOutMessage() {
      if (!calloutPtops) return;
      const { value, x_category } = calloutPtops;
      if (value === "Category") {
        const message = `${title} = ${x_category}`;
        return _.capitaliseFirstLetter(message);
      } else
        return (
          (value === "Max" ? "Maximum" : "Minimum") + " " + `${title} (...)`
        );
    }
  },
  calloutOverlay: (options) => [
    {
      tag: "select",
      name: "value",
      label: "Value type",
      options: ["Max", "Min", "Category"],
    },
    {
      tag: "select",
      label: options?.x_label, //"X category",
      name: "x_category",
      options: options?.x,
    },
    // { tag: "select", label: "Y category", name: "y-category", options: ["1", "2"] },
    { tag: "text", label: "Message", name: "message" },
    // { tag: "hr" },
    // {
    //   tag: "select",
    //   name: "format",
    //   options: ["donut", "number"],
    //   label: "Format",
    // },
  ],
  validateCallout: (calloutPtops, chartPtops) => {
    const { value, category, valueType } = calloutPtops;
    const { calloutMessage } = bar.presets(chartPtops, calloutPtops);
    const attributes = [{ name: "x_category", attrs: DISABLE }];

    attributes.push({
      name: "message",
      attrs: ["placeholder", calloutMessage],
    });
    if (value === "Category")
      attributes.push({ name: "x_category", attrs: ENABLE });

    return [[], [], attributes];
  },
  getCallout: (calloutPtops, chartPtops, data) => {
    const { value, x_category, message } = calloutPtops;

    if (typeof value === "undefined") return { value: "ERR", message };

    const msg =
      message ?? bar.presets(chartPtops, calloutPtops).calloutMessage;

    if (value === "Category") {
      const d = data.find((v) => v.x === x_category);
      const val = d?.v ?? "NA";
      return { value: val, message: msg };
    }
    const extent = d3Extent(data, (d) => d.v);
    const val = value === "Max" ? extent[1] : extent[0];
    const cats = data.filter((v) => v.v === val).map((v) => v.x);
    const cat = cats[0] + (cats.length > 1 ? ` & ${cats.length} more` : "");
    return { value: val, message: msg.replace(/\.\.\./, cat) };
  },
};
