"use strict";
import { _ } from "../util.js";
import { AnnotationUi, ChartFilterUi } from "./uis.js";
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
export { plan };
const plan = {
  cannotFilter: true,
  chartOverlay: ({ config, chartType }) => {
    const columns = config.columnNames;
    return [
      {
        tag: "select",
        options: columns,
        label: "Description column",
        name: "descriptionCol",
      },
      {
        tag: "details",
        legend: "First set of dates",
        elements: [
          {
            tag: "select",
            options: columns,
            label: "Start date column",
            name: "startDateCol",
          },
          {
            tag: "select",
            options: columns,
            label: "End date column",
            name: "endDateCol",
          },
          { tag: "text", label: "Label", name: "firstLabel" },
        ],
      },

      {
        tag: "details",
        legend: "Second set of dates (optional)",
        elements: [
          {
            tag: "select",
            options: ["", ...columns],
            label: "Start date column",
            name: "secondStartDateCol",
          },
          {
            tag: "select",
            options: ["", ...columns],
            label: "End date column",
            name: "secondEndDateCol",
          },
          { tag: "text", label: "Label", name: "secondLabel" },
        ],
      },
      {
        tag: "details",
        legend: "RAG ",
        elements: [
          {
            tag: "select",
            options: ["", ...columns],
            label: "RAG column",
            name: "ragCol",
          },
          { tag: "text", label: "RAG map", name: "ragMap" },
        ],
      },
      ...ChartFilterUi.elements({ config }),
      ...AnnotationUi.elements({ config }),
    ];
  },
  validateChart: (chartProps, config) => {
    const [e1, w1, a1] = ChartFilterUi.validate(chartProps, config);
    const [e2, w2, a2] = AnnotationUi.validate(chartProps, config);
    const [e3] = validatePlanProp(chartProps, config.columnNames)
    const errors = [...e1, ...e2, ...e3];
    const warnings = [...w1, ...w2];
    const attributes = [...a1, ...a2];

    // const different = (col1, col2) => {
    //   const c1 = chartPtops[col1];
    //   const c2 = chartPtops[col2];
    //   if (c1 === chartPtops[col2]) errors.push({ [col2]: "Must be different" });
    // };
    // const { descriptionCol } = chartProps;

    // if (!descriptionCol)
    //   errors.push({ descriptionCol: "Description-column is required" });

    // const { startDateCol, endDateCol } = chartProps;
    // if (!startDateCol || !endDateCol) {
    //   if (!startDateCol)
    //     errors.push({ startDateCol: "Start-date-column is required" });
    //   if (!endDateCol)
    //     errors.push({ endDateCol: "End-date-column is required" });
    // }

    // const { secondStartDateCol, secondEndDateCol } = chartProps;
    // if (!secondStartDateCol || !secondEndDateCol) {
    //   if (!secondStartDateCol)
    //     errors.push({ secondStartDateCol: "Start-date-column is required" });
    //   if (!secondEndDateCol)
    //     errors.push({ secondEndDateCol: "End-date-column is required" });
    // }
    // const columns = [
    //   ["descriptionCol", "Description-column"],
    //   ["startDateCol", "Start-date-column"],
    //   ["endDateCol", "End-date-column"],
    //   ["secondStartDateCol", "Start-date-column"],
    //   ["secondEndDateCol", "End-date-column"],
    //   ["ragCol", "RAG-column"],
    // ];

    // const seen = {};
    // const duplicates = [];

    // for (const [colname, msg] of columns) {
    //   const col = chartProps[colname];
    //   if (col)
    //     if (seen[col]) {
    //       duplicates.push({ [colname]: `${msg} must be different` }); // Add to duplicates if we've seen it before
    //     } else {
    //       seen[col] = msg; // First time seeing it
    //     }
    // }
    // duplicates.forEach((v) => errors.push(v));
    const placeholders = plan.presets(chartProps);

    for (const name in placeholders) {
      const value = placeholders[name];
      attributes.push({ name, attrs: ["placeholder", value] });
    }
    return [errors, warnings, attributes];
  },
  presets: (chartPtops, calloutProps) => {
    return { firstLabel: "Plan", secondLabel: "Actuals", chartTitle: "PLAN" };
  },
};
