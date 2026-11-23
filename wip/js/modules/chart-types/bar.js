"use strict";
// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import { AxisUi, ChartFilterUi, CountTypeUi } from "./uis.js";
import {
  validatePlan,
  validateForecast,
  validateChartFilter,
  validateAnnotations,
  validateNoteProp,
  validate2x2Prop,
  validateRiskProp,
  validateStateChangeProp,
  validatePlanProp,
  validateTrendProp,
  validateDataDescriptionProp,
  validateDataTableProp,
} from "../validation.js";
export { bar };

const ENABLE = ["disabled"];
const DISABLE = ["disabled", "disabled"];
const options = ["Max", "Min", "Category"];
const bar = {
  chartOverlay: ({ config, chartType }) => {
    return [
      ...AxisUi.elements({ config, prefix: "x_", legend: "Horizontal axis" }),
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
      { tag: "date-input", label: "New date", list: "a,b" },
    ];
  },
  validateChart: (chartProps) => {
    const [e1, w1, a1] = AxisUi.validate(chartProps, "x_");
    const [e2, w2, a2] = ChartFilterUi.validate(chartProps);
    const [e3, w3, a3] = CountTypeUi.validate(chartProps);
    const errors = [...e1, ...e2, ...e3];
    const warnings = [...w1, ...w2, ...w3];
    const attributes = [...a1, ...a2, ...a3];

    const placeholders = bar.presets(chartProps, { value: "category" });

    for (const name in placeholders) {
      if (name in chartProps) {
        const value = placeholders[name];
        attributes.push({ name, attrs: ["placeholder", value] });
      }
    }
    return [errors, warnings, attributes];
  },
  presets: (chartProps, calloutProps) => {
    const { countType, colOver, x_label, x_column, x_bin, x_dataType } =
      chartProps;
    const x = (x_label, x_column);
    const description = CountTypeUi.description(chartProps);
    const binned = x_dataType === "Number" && x_bin ? "binned " : "";
    //todo fix list
    // const list = chartType === "List" ? "Members in " : ""
    // const list = chartType === "List Members"? "Members in " : ""
    // const title = `${binned}${description} ${
    //   description === "count" ? "" : "distribution"
    // } by ${x}`;
    const title = `${description} by ${binned}${x}`;
    const chartTitle = title.toUpperCase();

    return { chartTitle, calloutMessage: getCallOutMessage() };

    function getCallOutMessage() {
      if (!calloutProps) return;
      const { valueType, x_category } = calloutProps;
      if (valueType === "Category") {
        const message = `${title} (${x_category})`;
        return _.capitalise(message);
      } else return _.capitalise(valueType) + "imum " + `${title} (...)`;
    }
  },
  calloutOverlay: ({ x, x_label }) => [
    {
      tag: "select",
      name: "valueType",
      label: "Value type",
      options,
    },
    {
      tag: "select",
      label: x_label, //"X category",
      name: "x_category",
      options: x ?? [],
    },
    // { tag: "select", label: "Y category", name: "y-category", options: ["1", "2"] },
    { tag: "text", label: "Message", name: "message" },
    {
      tag: "select",
      name: "format",
      options: ["donut", "number"],
      label: "Callout format",
    },
  ],
  validateCallout: (calloutProps, chartProps) => {
    const { valueType, message } = calloutProps;
    const { calloutMessage } = bar.presets(chartProps, calloutProps);
    const attributes = [{ name: "x_category", attrs: DISABLE }];
    const errors = [];
    attributes.push({
      name: "message",
      attrs: ["placeholder", calloutMessage],
    });
    if (!options.includes(valueType)) {
      errors.push({ valueType: "Invalid value type" });
    }
    if (valueType === "Category")
      attributes.push({ name: "x_category", attrs: ENABLE });
    return [
      errors,
      [],
      attributes,
      { ...calloutProps, message: message ?? calloutMessage },
    ];
  },
  getCallout: (calloutProps, chartProps, data) => {
    // const { value, x_category, message } = calloutProps;
    const { x_label, x_column } = chartProps;
    const [err, , , { valueType, x_category, message }] = bar.validateCallout(
      calloutProps,
      chartProps,
    );
    if (err.length > 0) {
      console.error("Invalid properties", err);
      return {
        ...calloutProps,
        value: "ERR",
        message: "Invalid callout properties",
      };
    }
    
    if (!data)
      return { ...calloutProps, value: "ERR", message: "No data in chart" };
    
    const [total, min, max] = _.tmm(data, (d) => d.v);
    // const total = data.reduce((t, d) => t + d.v, 0);

    if (valueType === "Category") {
      const d = data.find((v) => v.x === x_category);
      const value = d?.v ?? "NA";
      return { ...calloutProps, value, message, total };
    }
    // const extent = d3Extent(data, (d) => d.v);
    const value = valueType === "Max" ? max : min;
    const cats = data.filter((v) => v.v === value).map((v) => `${v.x}`);
    const cat =
      (x_label || x_column) +
      " = " +
      cats[0] +
      (cats.length > 1 ? ` & ${cats.length - 1} more` : "");

    return {
      ...calloutProps,
      value,
      message: message.replace(/\.\.\./, cat),
      // valueType,
      total,
    };
  },
};
