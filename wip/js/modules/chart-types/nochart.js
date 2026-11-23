"use strict";
// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
// import { AxisUi, ChartFilterUi, CountTypeUi } from "./uis.js";
export { noChart };
const options = ["Days-to-date", "Workdays-to-date", "Bespoke"];

const noChart = {
  cannotFilter: true,
  validateChart: (chartProps) => {
    const [errors, warnings, attributes] = [[], [], []];
    return [errors, warnings, attributes];
  },
  // presets: (chartPtops, calloutProps) => {
  //   // return { chartTitle: "DATA TABLE" };
  // },
  validateCallout: (calloutProps) => {
    const errors = [],
      attributes = [
        {
          name: ["targetDate", "targetValue"],
          attrs: ["class-add", "hide"],
          applyTo: "wrapper",
        },
      ];

    const { targetDate, targetValue, value, message } = calloutProps;
    if (!options.includes(value))
      errors.push({ name: "value", message: "Invalid value" });
    else {
      if (value === options[2]) checkBespoke();
      else checkDate();
    }
    const placeholder = value.replaceAll("-", " ").replace("date", targetDate);
    attributes.push({ name: "message", attrs: ["placeholder", placeholder] });
    return [
      errors,
      [],
      attributes,
      { ...calloutProps, message: message ?? placeholder },
    ];
    function checkBespoke() {
      attributes.push({
        name: "targetValue",
        attrs: ["class-remove", "hide"],
        applyTo: "wrapper",
      });
      if (!_.isString(targetValue))
        errors.push({ name: "targetValue", message: "Required" });
    }
    function checkDate() {
      attributes.push({
        name: "targetDate",
        attrs: ["class-remove", "hide"],
        applyTo: "wrapper",
      });
      if (!_.isValidDate(targetDate))
        errors.push({ name: "targetDate", message: "Invalid date" });
    }
  },
  calloutOverlay: () => [
    {
      tag: "select",
      name: "value",
      label: "Value type",
      options,
    },
    { tag: "date", label: "Target date", name: "targetDate" },
    { tag: "text", label: "Value", name: "targetValue" },
    { tag: "text", label: "Message", name: "message" },
  ],
  getCallout: (calloutProps, chartProps, data, config) => {
    const [err, , , { value, targetDate, targetValue, message }] =
      noChart.validateCallout(calloutProps);
    if (err.length > 0) {
      console.error("Invalid properties", e);
      return { value: "ERR", message: "Invalid properties" };
    }

    const { reportDate } = config;
    if (!reportDate) return { value: "ERR", message: "No report date" };

    return {
      value:
        value === options[2]
          ? targetValue
          : _.dateTimeDiff(
              reportDate,
              targetDate,
              value === options[0] ? "days" : "workdays",
            ),
      message,
    };
  },
};
