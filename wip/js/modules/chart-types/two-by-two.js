//19-jul labels added to elements
"use strict";
import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import { ChartFilterUi, CountTypeUi, AxisUi } from "./uis.js";

export { risk, twoByTwo, stateChange };

const ENABLE = ["disabled", false];
const DISABLE = ["disabled", true];
const calloutValueOptions = ["Max", "Min", "Categories"];

const callout = {
  calloutOverlay: (options) => [
    {
      tag: "select",
      name: "value",
      label: "Value type",
      options: calloutValueOptions,
    },
    {
      tag: "select",
      label: options?.x_label,
      name: "x_category",
      options: options?.x,
    },
    {
      tag: "select",
      label: options?.y_label,
      name: "y_category",
      options: options?.y,
    },
    { tag: "text", label: "Message", name: "message" },
    // { tag: "hr" },
    // {
    //   tag: "select",
    //   name: "format",
    //   options: ["Donut", "Number"],
    //   label: "Format",
    // },
  ],

  getCallout: (calloutPtops, chartPtops, data, presets) => {
    const { x_column, y_column } = chartPtops;
    const { value, x_category, y_category, message } = calloutPtops;
    if (!calloutValueOptions.includes(value)) return { value: "ERR", message };
    const { calloutMessage } = presets(chartPtops, calloutPtops);

    if (value === "Categories") {
      const cat = data.find(
        (v) => v.x.trim() === x_category && v.y.trim() === y_category,
      );
      const val = cat?.v ?? "NA";
      return { value: val, message: message ?? calloutMessage };
    }
    const msg = message ?? calloutMessage;
    if (!msg.includes("...")) return { value: val, message: msg };
    const extent = d3Extent(data, (d) => d.v);
    const val = value === "Max" ? extent[1] : extent[0];
    const cats = data
      .filter((v) => v.v === val)
      .map((v) => `${x_column} = ${v.x} & ${y_column} = ${v.y}`);
    const cat =
      cats.length === 0
        ? "NA"
        : cats.length === 1
          ? cats[0]
          : `${cats[0]} & ${cats.length} others`;

    return { value: val, message: msg.replace("...", cat) };
  },
  presets: (chartPtops, calloutPtops, type) => {

    const { x_label, x_column, y_label, y_column } = chartPtops;
    const x = x_label ? x_label : x_column;
    const y = y_label ? y_label : y_column;
    const description = CountTypeUi.description(chartPtops);
    const title = `${description} of ${type}`.toLowerCase();

    return {
      x_label: x_column,
      y_label: y_column,
      chartTitle: title.toUpperCase(),
      calloutMessage: getCallOutMessage(),
    };
    function getCallOutMessage() {
      if (!calloutPtops) return;
      const { value, x_category, y_category } = calloutPtops;

      if (!calloutValueOptions.includes(value))
        return `Invalid value type: ${value}`;

      if (value === "Categories") {
        return _.capitaliseFirstLetter(
          `${title} at ${x} = ${x_category} & ${y} = ${y_category}`,
        );
      }

      return (value === "Max" ? "Maximum " : "Minimum ") + `${title} (...)`;
    }
  },
};
const risk = {
  cannotFilter: true,
  chartOverlay: ({ config, chartType }) => {
    const columns = config.columnNames;
    const axis = (prefix) => [
      {
        tag: "select",
        options: columns,
        name: prefix + "column",
        label: "Column",
      },
      { tag: "text", label: "Label", name: prefix + "label" },
      { tag: "text", label: "Map", name: prefix + "labels" },
    ];
    return [
      { tag: "details", legend: "Horizontal axis", elements: [...axis("x_")] },
      { tag: "details", legend: "Vertical axis", elements: [...axis("y_")] },
      { tag: "text", label: "Count labels", name: "countLabels" },
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
      ...TestCallback.elements(),
    ];
  },
  validateChart: (chartPtops) => {
    const [e1, w1, a1] = ChartFilterUi.validate(chartPtops);
    const [e2, w2, a2] = CountTypeUi.validate(chartPtops);
    const errors = [...e1, ...e2];
    const warnings = [...w1, ...w2];
    const attributes = [...a1, ...a2];

    const { x_column, y_column, countLabels } = chartPtops;
    if (x_column === y_column) {
      errors.push({
        name: "y_column",
        message: "Must be different to " + x_column,
      });
    }

    const checkArray = (name, length) => {
      const str = chartPtops[name] ?? "";
      const array = str
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
      if (array.length != length) {
        errors.push({ name, message: `Required ${length} values` });
      }
    };
    checkArray("x_labels", 10);
    checkArray("y_labels", 10);
    if (countLabels) checkArray("countLabels", 5);
    // AxisUi.validate(chartPtops, errors, attributes, "x_");
    // AxisUi.validate(chartPtops, errors, attributes, "y_");

    // CountTypeUi.validate(chartPtops, errors, attributes);
    // ChartFilterUi.validate(chartPtops, errors, attributes);
    const placeholders = risk.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    TestCallback.validate(chartPtops, attributes, risk.presets);
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutPtops) => ({
    ...callout.presets(chartPtops, calloutPtops, "risks"),
    countLabels: "VL, L, M. H, VH",
  }),

  calloutOverlay: (options) => callout.calloutOverlay(options),
  validateCallout: (calloutPtops, chartPtops) => {
    const { value } = calloutPtops;
    const { calloutMessage } = risk.presets(chartPtops, calloutPtops);
    const attributes = [
      { names: ["x_category", "y_category"], attrs: DISABLE },
    ];
    if (value === "Categories")
      attributes.push({ names: ["x_category", "y_category"], attrs: ENABLE });
    attributes.push({
      name: "message",
      attrs: ["placeholder", calloutMessage],
    });
    return [[], [], attributes];
  },
  getCallout: (chartPtops, calloutPtops, data) =>
    callout.getCallout(chartPtops, calloutPtops, data, risk.presets),
};
const twoByTwo = {
  cannotFilter: true,
  chartOverlay: ({ config, chartType }) => {
    const columns = config.columnNames;
    return [
      ...AxisUi.elements({
        config,
        prefix: "x_",
        legend: "Horizontal axis",
        dataTypes: ["String"],
      }),
      ...AxisUi.elements({
        config,
        prefix: "y_",
        legend: "Vertical axis",
        dataTypes: ["String"],
      }),
      {
        tag: "text",
        placeHolder: "VL, L, M. H, VH",
        name: "countLabels",
        label: "Count labels",
      },
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
      ...TestCallback.elements(),
      ,
    ];
  },
  validateChart: (chartPtops) => {
    const [e0, w0, a0] = AxisUi.validate(chartPtops, "x_");
    const [e1, w1, a1] = AxisUi.validate(chartPtops, "y_");
    const [e2, w2, a2] = ChartFilterUi.validate(chartPtops);
    const [e3, w3, a3] = CountTypeUi.validate(chartPtops);
    const errors = [...e0, ...e1, ...e2, ...e3];
    const warnings = [...w0, ...w1, ...w2, ...w3];
    const attributes = [...a0, ...a1, ...a2, ...a3];

    const { x_column, y_column, x_label, y_label } = chartPtops;
    if (x_column === y_column)
      errors.push({ y_column: "Must be dirrent to X axis" });

    const placeholders = twoByTwo.presets(chartPtops, null);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    TestCallback.validate(chartPtops, attributes, twoByTwo.presets);
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutPtops) =>
    callout.presets(chartPtops, calloutPtops, "2x2"),

  validateCallout: (chartPtops) => {
    const { value } = chartPtops;
    const attributes = [
      { names: ["x_category", "y_category"], attrs: DISABLE },
    ];
    if (value === "Categories")
      attributes.push({ names: ["x_category", "y_category"], attrs: ENABLE });
    return [[], [], attributes];
  },
  getCallout: (chartPtops, calloutPtops, data) =>
    callout.getCallout(chartPtops, calloutPtops, data, twoByTwo.presets),
};
const stateChange = {
  cannotFilter: true,
  chartOverlay: ({ config, chartType }) => {
    const columns = config.columnNames;
    const cols = { tag: "select", options: columns };
    const axisElements = (prefix) => [
      { ...cols, label: "Column", name: prefix + "column" },
      { tag: "text", label: "Label", name: prefix + "label" },
      { tag: "text", label: "Order", name: prefix + "labels" },
    ];
    return [
      { ...cols, label: "Id column", name: "idCol" },
      { ...cols, label: "Timestamp column", name: "timestampCol" },
      {
        tag: "details",
        legend: "Horizontal axis",
        elements: axisElements("x_"),
      },
      { tag: "details", legend: "Vertical axis", elements: axisElements("y_") },
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config, hasColOver: false }),
      ...TestCallback.elements(),
    ];
  },
  validateChart: (chartPtops) => {
    const [errors, warnings, attributes] = ChartFilterUi.validate(chartPtops);

    const checkDistinct = (col1, col2) => {
      if (chartPtops[col1] === chartPtops[col2])
        errors.push({ name: col2, message: "Must be different to " + col1 });
    };

    checkDistinct("idCol", "timestampCol");
    checkDistinct("timestampCol", "y_column");
    checkDistinct("timestampCol", "x_column");
    checkDistinct("idCol", "y_column");
    checkDistinct("idCol", "x_column");
    checkDistinct("x_column", "y_column");

    const placeholders = stateChange.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    TestCallback.validate(chartPtops, attributes, stateChange.presets);
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutPtops) => {
    const preset = callout.presets(chartPtops, calloutPtops, "transitions");
    const formatTransition = (str) =>
      str.toLowerCase().includes("count of transitions")
        ? str
        : str.toLowerCase().replace("transitions", "transition times");

    return {
      ...preset,
      chartTitle: formatTransition(preset.chartTitle).toUpperCase(),
      calloutMessage: preset.calloutMessage
        ? _.capitaliseFirstLetter(formatTransition(preset.calloutMessage))
        : undefined,
    };
  },
  calloutOverlay: (options) => callout.calloutOverlay(options),
  validateCallout: (chartPtops) => {
    const { value } = chartPtops;
    const attributes = [
      { names: ["x_category", "y_category"], attrs: DISABLE },
    ];
    if (value === "Categories")
      attributes.push({ names: ["x_category", "y_category"], attrs: ENABLE });
    attributes.push({ name: "message", attrs: ["placeholder", "statechange"] });
    return [[], [], attributes];
  },

  getCallout: (chartPtops, calloutPtops, data) =>
    callout.getCallout(chartPtops, calloutPtops, data, stateChange.presets),
};
class TestCallback {
  static elements() {
    return [{ tag: "textarea", label: "Test callout messages", name: "xxx" }];
  }
  static validate(chartPtops, attributes, presets) {
    const testCallout = [
      presets(chartPtops, { value: "Max" }).calloutMessage,
      "\n",
      presets(chartPtops, {
        value: "Categories",
        x_category: "x",
        y_category: "y",
      }).calloutMessage,
    ].join("");
    attributes.push({ name: "xxx", attrs: ["placeHolder", testCallout] });
    return;
  }
}
