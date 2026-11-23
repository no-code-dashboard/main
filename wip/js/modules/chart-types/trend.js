"use strict";
import { DISPLAY_INVALID_DATE } from "../common.js";
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
  orderedValues: (chartProps, trendEndDate, config) => {
    const { trendStartDate } = chartProps;
    const { reportDate } = config;
    const trendStartTry = _.getDate(trendStartDate, config);
    const trendStart =
      trendStartTry === DISPLAY_INVALID_DATE
        ? _.addDays(reportDate, -42) // 42 === six weeks
        : trendStartTry;

    const dateDifference = _.dateTimeDiff(trendStart, trendEndDate, "Days");
    const deltaMs = 86_400_000 * Math.max(1, dateDifference / 30); // 86400000 ms in a day
    const datePoints = [];
    const currDate = new Date(trendEndDate);

    while (_.formatDate(currDate) >= trendStart) {
      datePoints.unshift(_.formatDate(currDate));
      currDate.setTime(currDate.getTime() - deltaMs);
    }

    return datePoints;
  },
  chartOverlay: ({ config, chartType }) => {
    const { reportDate, columnNames } = config;
    return [
      {
        tag: "date",
        value: _.addDays(reportDate, -28),
        label: "Trend start date",
        name: "trendStartDate",
        options: config.dates ?? [],
      },
      {
        tag: "details",
        legend: "Horizontal axis",
        elements: [
          {
            tag: "select",
            options: columnNames,
            label: "First date column",
            name: "x_column",
          },
          {
            tag: "select",
            options: ["", ...columnNames],
            label: "Second date column",
            name: "x1_column",
          },
          {
            tag: "select", //"radio"
            name: "aggrateType",
            label: "Aggregate type",
            options: ["cumulative", "non-cumulative"],
          },
          { tag: "text", label: "Axis label", name: "x_label" },
        ],
      },
      ...ChartFilterUi.elements({ config }),
      ...AnnotationUi.elements({ config }),
      ...PlanUi.elements({ config }),
      ...ForecastUi.elements({ config }),
    ];
  },
  validateChart: (chartProps, config) => {
    const { trendStartDate } = chartProps;
    const { reportDate } = config;
    // if (x_label.trim() === "") err("x_label", "Mandatory", errors)
    const [e1, w1, a1] = ChartFilterUi.validate(chartProps, config);
    const [e2, w2, a2] = AnnotationUi.validate(chartProps, config);
    const [e3, w3, a3] = PlanUi.validate(chartProps, config);
    const [e4, w4, a4] = ForecastUi.validate(chartProps, config);
    const errors = [...e1, ...e2, ...e3, ...e4];
    const warnings = [...w1, ...w2, ...w3, ...w4];
    const attributes = [...a1, ...a2, ...a3, ...a4];

    const trendStart = _.getDate(trendStartDate, config);

    if (trendStart === DISPLAY_INVALID_DATE)
      errors.push({ trendStartDate: "Trend start must be a date" });
    else if (trendStart >= reportDate)
      errors.push({ trendStartDate: "Trend start must be < report date" });

    const placeholders = trend.presets(chartProps);
    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    return [
      errors,
      warnings,
      attributes,
      { ...chartProps, trendStartDate: trendStart },
    ];
  },
  presets: (chartProps, calloutProps) => {
    const { x_label, x_column } = chartProps;
    const x = x_label ? x_label : x_column;
    return {
      x_label: x_column,
      chartTitle: `${x} over time`.toUpperCase(),
    };
  },
};
