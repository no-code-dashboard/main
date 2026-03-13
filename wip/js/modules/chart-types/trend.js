"use strict";
// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import {
  AnnotationUi,
  PlanUi,
  ChartFilterUi,
  ForecastUi,
  CountTypeUi,
  AxisUi,
} from "./uis.js";
export { trend };
const trend = {
  cannotFilter: true,
  orderedValues: (chartProps, trendEndDate) => {
    // return chartTypes["Trend OC"].orderedValues(chartProps, trendEndDate);
    const { trendStartDate } = chartProps;

    const datePoints = [];
    const dateDifference = _.dateTimeDiff(trendStartDate, trendEndDate, "Days"); //+ 1
    const maxDataPoints = 30;
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const deltaMilliseconds =
      millisecondsInDay * Math.max(1.0, dateDifference / maxDataPoints);

    let date = new Date(trendEndDate);
    let YYYYMMDD = date.toISOString().substring(0, 10);

    while (YYYYMMDD >= trendStartDate) {
      datePoints.unshift(YYYYMMDD);
      date.setMilliseconds(date.getMilliseconds() - deltaMilliseconds);
      YYYYMMDD = date.toISOString().substring(0, 10);
    }

    return datePoints;
  },
  chartOverlay: ({ config, chartType }) => {
    const { reportDate, columnNames } = config;
    const cols = { tag: "select", options: columnNames };

    return [
      {
        tag: "date",
        value: _.addDays(reportDate, -28),
        label: "Trend start date",
        name: "trendStartDate",
      },
      {
        tag: "details",
        legend: "Horizontal axis",
        elements: [
          ...(chartType === "Trend"
            ? [{ ...cols, label: "Date column", name: "x_column" }]
            : [
                { ...cols, label: "Open date column", name: "openDateCol" },
                { ...cols, label: "Close date column", name: "closeDateCol" },
              ]),
          { tag: "text", label: "Label", name: "x_label" },
        ],
      },
      ...ChartFilterUi.elements({ config }),
      ...AnnotationUi.elements(),
      ...PlanUi.elements(),
      ...ForecastUi.elements(),
    ];
  },
  validateChart: (chartPtops, { reportDate }) => {
    const { trendStartDate } = chartPtops;
    
    // if (x_label.trim() === "") err("x_label", "Mandatory", errors)

    const [e1, w1, a1] = ChartFilterUi.validate(chartPtops);
    const [e2, w2, a2] = AnnotationUi.validate(chartPtops);
    const [e3, w3, a3] = PlanUi.validate(chartPtops);
    const [e4, w4, a4] = ForecastUi.validate(chartPtops);
    const errors = [...e1, ...e2,...e3,...e4];
    const warnings = [...w1, ...w2,...w3,...w4];
    const attributes = [...a1, ...a2,...a3,...a4];

    if (!(trendStartDate < reportDate))
      errors.push({ trendStartDate: "Must be < report date" });
    
    const placeholders = trend.presets(chartPtops);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    return [ errors, warnings, attributes ];
  },
  presets: (chartPtops, calloutProps) => {
    const { x_label, x_column } = chartPtops;
    const x = x_label ? x_label : x_column;
    return {
      x_label: x_column,
      chartTitle: `${x} over time`.toUpperCase(),
    };
  },

};
