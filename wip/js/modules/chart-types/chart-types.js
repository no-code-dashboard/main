//19-jul labels added to elements
"use strict";
import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import {
  DISPLAY_OTHERS,
  DISPLAY_INVALID,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID_DATE,
  DISPLAY_SPACES,
  DISPLAY_LESS,
  DISPLAY_MORE,
  isInvalidDisplay,
  displayOrder,
  MONTHS,
  WEEKDAYS,
  WORKDAYS,
  MAX_BAR_CATS,
  MAX_2X2_CATS,
} from "../common.js";
import { bar } from "./bar.js";
import { note } from "./note.js";
import { noChart } from "./nochart.js";
import { trend } from "./trend.js";
import { plan } from "./plan.js";
import { risk, twoByTwo, stateChange } from "./two-by-two.js";
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
  getParsedValue,
};

const chartTypes = {
  Note: { ...note },
  Risk: { ...risk },
  "2X2": { ...twoByTwo },
  "State Change": { ...stateChange },
  "Data Table": { ...dataTable },
  "Data Description": { ...dataDescription },
  Trend: { ...trend },
  "Trend OC": { ...trend },
  Bar: { ...bar },
  Plan: { ...plan },
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
function validateChart(chartPtops, { reportDate }) {
  const { chartType } = chartPtops;
  if (!chartTypes[chartType]) return {};
  if (!chartTypes[chartType].validateChart) return {};
  const [errors, warnings, attributes] = chartTypes[chartType].validateChart(
    chartPtops,
    { reportDate },
  );
  return [errors, warnings, attributes];
}

function getCalloutOverlay(chartType, options) {
  const validChartType = chartTypesList().includes(chartType);

  if (!validChartType)
    return [
      { tag: "p", label: `Chart type: None` },
      ...noChart.calloutOverlay(),
    ];

  const calloutOvelay = chartTypes[chartType].calloutOverlay;
  return [
    { tag: "p", label: `Chart type: ${chartType}` },
    ...(calloutOvelay
      ? calloutOvelay(options)
      : [{ tag: "p", label: "No call out for this chart" }]),
  ];
}
function validateCallout(calloutPtops, chartPtops) {
  const { chartType } = chartPtops;

  if (!chartType) return noChart.validateCallout(calloutPtops, chartPtops);

  if (chartTypes[chartType].validateCallout)
    return chartTypes[chartType].validateCallout(calloutPtops, chartPtops);

  return [[], [], []];
}
function getCallout(calloutPtops, chartPtops, data, config) {
  const { chartNumber } = calloutPtops;
  if (chartNumber === undefined)
    return { value: "ERR", message: `Chart number missing` };

  if (chartNumber === "-1")
    return noChart.getCallout(calloutPtops, chartPtops, data, config); //{ value: "ERR", message: `Chart number missing` };

  if (!chartPtops)
    return {
      value: "ERR",
      message: `No chart for chart number: ${chartNumber}`,
    };

  const { chartType } = chartPtops;
  if (!chartType)
    return {
      value: "ERR",
      message: `No chart type for chart number: ${chartNumber}`,
    };

  return chartTypes[chartType].getCallout
    ? chartTypes[chartType].getCallout(calloutPtops, chartPtops, data)
    : {
        value: "ERR",
        message: `No callout for chart number: ${chartNumber}`,
      };
}

function getParsedValue(type, unpasedValue) {
  if (!_.isPresent(type)) return;
  if (!_.isPresent(unpasedValue)) return;
  const uis = {
    plan: PlanUi,
    forecast: ForecastUi,
    annotations: AnnotationUi,
  };
  const elements = uis[type];
  if (!elements) return;
  //to add other uis ChartFilter CountType
  const [, , , value] = elements.validate(
    { [type]: unpasedValue },
    /*errors,
    attributes,*/
  );
  console.assert(value, `Type: ${type}, value: ${unpasedValue}`);
  return value;
}

function isArray(input, options) {
  const array = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : undefined;
  if (!array) return false;
  if (!options) return true;
  let x = true;

  if (options.length && array.length !== options.length) x = false;
  if (options.multiples && array.length % options.multiples !== 0) x = false;
  if (options.numbers && array.filter((v) => isNaN(v)).length > 0) x = false;
  if (options.noSpaces && array.filter((v) => v.trim() === "").length > 0)
    x = false;
  if (
    options.acsending &&
    array.filter((v, i) =>
      i > 0
        ? options.numbers
          ? Number(v) > Number(array[i - 1])
          : v > array[i - 1]
        : true,
    ).length > 0
  )
    x = false;

  return x;
}
