//19-jul labels added to elements
"use strict";
// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import { bar } from "./bar.js";
import { note } from "./note.js";
import { noChart } from "./nochart.js";
import { trend } from "./trend.js";
import { plan } from "./plan.js";
// import { risk, twoByTwo, stateChange } from "./two-by-two.js";
import { risk, twoByTwo, stateChange } from "./heatmaps.js";
import { dataTable, dataDescription } from "./data.js";
import {
  AnnotationUi,
  PlanUi,
  ChartFilterUi,
  ForecastUi,
  CountTypeUi,
  AxisUi,
} from "./uis.js";

export {
  chartTypes,
  // noChart,
  getChartCommon,
  validateChart,
  getCalloutOverlay,
  validateCallout,
  getCallout,
  // getParsedValue,
};

const chartTypes = {
  Note: { ...note },
  Bar: { ...bar },
  Trend: { ...trend },
  Plan: { ...plan },
  Risk: { ...risk },
  "2X2": { ...twoByTwo },
  "State Change": { ...stateChange },
  "Data Table": { ...dataTable },
  "Data Description": { ...dataDescription },
};
function chartTypesList() {
  return Object.keys(chartTypes);
}
function getChartCommon({ config }) {
  const { chartProperties } = config;
  const maxCharts = chartProperties.length;
  return [
    {
      tag: "number",
      min: 1,
      max: maxCharts,
      label: "Position",
      name: "position",
    },
    { tag: "text", label: "Chart title", name: "chartTitle" },
    {
      tag: "select",
      options: ["Small", "Medium", "Large"],
      label: "Chart size",
      name: "chartSize",
    },
    {
      tag: "select",
      options: Object.keys(chartTypes),
      label: "Chart type",
      name: "chartType",
    },
    { tag: "hr" },
    { tag: "overlay" },
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: "Apply", class: "disable-on-error" },
  ];
}
function validateChart(chartProps, config) {
  // const { chartType } = chartProps;
  // if (!chartTypes[chartType]) return [];
  // if (!chartTypes[chartType].validateChart) return [];
  // const [errors, warnings, attributes] = chartTypes[chartType].validateChart(
  //   chartProps,
  //   config,
  // );
  // return [errors, warnings, attributes];
  const validator = chartTypes[chartProps?.chartType]?.validateChart;
  return validator ? validator(chartProps, config) : [];
}

/////////////////////////////// callouts


function getCalloutOverlay(chartType, options) {
  const validChartType = chartTypesList().includes(chartType);

  if (!validChartType)
    return [
      { tag: "p", text: `Chart type: None` },
      ...noChart.calloutOverlay(),
    ];

  const calloutOvelay = chartTypes[chartType].calloutOverlay;
  return [
    { tag: "p", text: `Chart type: ${chartType}` },
    ...(calloutOvelay
      ? calloutOvelay(options)
      : [{ tag: "p", text: "No call out for this chart" }]),
  ];
}
function validateCallout(calloutProps, chartProps) {
  // const { chartType } = chartProps;

  // if (!chartType) return noChart.validateCallout(calloutPtops, chartProps);

  // if (chartTypes[chartType].validateCallout)
  //   return chartTypes[chartType].validateCallout(calloutPtops, chartProps);

  // return [[], [], []];
  const chartType = chartProps?.chartType;
  const validator = chartType
    ? chartTypes[chartType]?.validateCallout
    : noChart.validateCallout;

  return validator?.(calloutProps, chartProps) ?? [[], [], []];
}
function getCallout(calloutProps, chartProps, data, config) {
  const { chartNumber } = calloutProps;
  if (chartNumber === undefined)
    return { value: "ERR", message: `Chart number missing` };

  if (chartNumber === "-1")
    return noChart.getCallout(calloutProps, chartProps, data, config); //{ value: "ERR", message: `Chart number missing` };

  if (!chartProps)
    return {
      value: "ERR",
      message: `No chart for chart number: ${chartNumber}`,
    };

  const { chartType } = chartProps;
  if (!chartType)
    return {
      value: "ERR",
      message: `No chart type for chart number: ${chartNumber}`,
    };

  return chartTypes[chartType].getCallout
    ? chartTypes[chartType].getCallout(calloutProps, chartProps, data)
    : {
        value: "ERR",
        message: `No callout for chart number: ${chartNumber}`,
      };
}

// function getParsedValue(type, unpasedValue) {
//   if (!_.isString(type)) return;
//   if (!_.isString(unpasedValue)) return;
//   const uis = {
//     plan: PlanUi,
//     forecast: ForecastUi,
//     annotations: AnnotationUi,
//   };
//   const elements = uis[type];
//   if (!elements) return;
//   //to add other uis ChartFilter CountType
//   const [, , , value] = elements.validate(
//     { [type]: unpasedValue },
//     /*errors,
//     attributes,*/
//   );
//   console.assert(value, `Type: ${type}, value: ${unpasedValue}`);
//   return value;
// }

// function isArray(input, options) {
//   const array = _.isArray(input)
//     ? input
//     : typeof input === "string"
//       ? input.split(",")
//       : undefined;
//   if (!array) return false;
//   if (!options) return true;
//   let x = true;

//   if (options.length && array.length !== options.length) x = false;
//   if (options.multiples && array.length % options.multiples !== 0) x = false;
//   if (options.numbers && array.filter((v) => isNaN(v)).length > 0) x = false;
//   if (options.noSpaces && array.filter((v) => v.trim() === "").length > 0)
//     x = false;
//   if (
//     options.acsending &&
//     array.filter((v, i) =>
//       i > 0
//         ? options.numbers
//           ? Number(v) > Number(array[i - 1])
//           : v > array[i - 1]
//         : true,
//     ).length > 0
//   )
//     x = false;

//   return x;
// }
