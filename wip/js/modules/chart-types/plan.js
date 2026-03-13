"use strict";
import { _ } from "../util.js";
import { AnnotationUi, ChartFilterUi } from "./uis.js";
export { plan };
const plan = {
  cannotFilter: true,
  chartOverlay: ({ config, chartType }) => {
    const columns = config.columnNames;
    const col = { tag: "select", options: columns };
    const colSpace = { tag: "select", options: ["", ...columns] };
    return [
      { ...col, label: "Description column", name: "descriptionCol" },
      {
        tag: "details",
        legend: "First set of dates",
        elements: [
          { ...col, label: "Start date column", name: "startDateCol" },
          { ...col, label: "End date column", name: "endDateCol" },
          { tag: "text", label: "Label", name: "firstLabel" },
        ],
      },

      {
        tag: "details",
        legend: "Second set of dates",
        elements: [
          {
            ...colSpace,
            label: "Start date column",
            name: "secondStartDateCol",
          },
          { ...colSpace, label: "End date column", name: "secondEndDateCol" },
          { tag: "text", label: "Label", name: "secondLabel" },
        ],
      },
      {
        tag: "details",
        legend: "RAG ",
        elements: [
          { ...colSpace, label: "RAG column", name: "ragCol" },
          { tag: "text", label: "RAG map", name: "ragMap" },
        ],
      },
      ...ChartFilterUi.elements({ config }),
      ...AnnotationUi.elements(),
    ];
  },
  validateChart: (chartPtops) => {
    // const errors = [];
    // const attributes = [];
    const errWarnAttr = [
      ...ChartFilterUi.validate(chartPtops),
      ...AnnotationUi.validate(chartPtops),
    ];

    const [errors, warnings, attributes] = [[], [], []];
    errWarnAttr.forEach((list, i) => {
      const target = [errors, warnings, attributes][i % 3];
      target.push(...list.filter(Boolean));
    });

    // AnnotationUi.validate(chartPtops, errors, attributes);

    const different = (col1, col2) => {
      if (chartPtops[col1] === chartPtops[col2])
        errors.push({ [col2]: "Must be different" });
    };
    const {
      secondStartDateCol,
      secondEndDateCol,
      secondLabel,
      chartFilter,
      ragCol,
    } = chartPtops;

    // different("descriptionCol", "startDateCol");
    // different("descriptionCol", "endDateCol");
    different("startDateCol", "endDateCol");
    // if (!firstLabel) err("firstLabel", "Required", errors);

    if (secondStartDateCol) {
      // if (!secondLabel) err("secondLabel", "Required");
      // different("descriptionCol", "secondStartDateCol");
      // different("endDateCol", "secondStartDateCol");
      // different("secondStartDateCol", "secondEndDateCol");
      if (!secondEndDateCol) errors.push({ secondEndtDateCol: "Required" });
    }
    if (secondEndDateCol) {
      if (!secondLabel) err("secondLabel", "Required");
      // different("descriptionCol", "secondEndDateCol");
      // different("endDateCol", "secondEndDateCol");
      // different("startDateCol", "secondEndDateCol");
      // different("secondStartDateCol", "secondEndDateCol");
      if (!secondStartDateCol) errors.push({ secondStartDateCol: "Required" });
    }
    if (secondStartDateCol && secondEndDateCol)
      different("secondStartDateCol", "secondEndDateCol");

    if (ragCol) {
      different("descriptionCol", "ragCol");
      different("endDateCol", "ragCol");
      different("startDateCol", "ragCol");
      different("secondStartDateCol", "ragCol");
      different("secondEndDateCol", "ragCol");
      //map with eight entries B, R A G
    }

    const placeholders = plan.presets(chartPtops);
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
