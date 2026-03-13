"use strict";
// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
// import { AxisUi, ChartFilterUi, CountTypeUi } from "./uis.js";
export { noChart };
const noChart = {
  cannotFilter: true,
  validateChart: (chartProps) => {
    const [errors, warnings, attributes] = [[], [], []];
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutProps) => {
    // return { chartTitle: "DATA TABLE" };
  },
  validateCallout: (calloutProps ) => {
    const errors = [],
      attributes = [];
    const { targetDate, value } = calloutProps;
    if (!_.isValidDate(targetDate))
      errors.push({ name: "targetDate", message: "Invalid date" });

    attributes.push({ name: "message", attrs: ["placeholder", value] });
    return [errors,[],attributes]; 
  },
  calloutOverlay: (options) => [
    {
      tag: "select",
      name: "value",
      label: "Value type",
      options: ["Days-to-date", "Workdays-to-date"],
    },
    { tag: "date", label: "Target date", name: "targetDate" },
    { tag: "text", label: "Message", name: "xmessage" },
  ],
  getCallout: (calloutProps, chartProps, data, config) => {
    const { reportDate } = config;
    // return { value: "ERR", message: "No report date" };
    if (!reportDate) return { value: "ERR", message: "No report date" };
    const { value, targetDate, message } = calloutProps;
    const msg = message ?? "Get palceholder";
    if (!value) return { value: "ERR", message: "No type" };
    // if (value === "report-date")
    //   return { value: _.formatDate(reportDate, "DD-MMM-YY"), message: msg };
    if (!targetDate) return { value: "ERR", message: "No target date" };
    if (value === "Days-to-date")
      return {
        value: _.dateTimeDiff(reportDate, targetDate, "days"),
        message: msg,
      };
    if (value === "Workdays-to-date")
      return {
        value: _.dateTimeDiff(reportDate, targetDate, "workdays"),
        message: msg,
      };
    return { value: "ERR", message: `Invalid value: ${value}` };
  },
};
