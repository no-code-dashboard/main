"use strict";

import { _ } from "../util.js";
import { Dialog } from "./dialog.js";
import { Param } from "../param.js";

export { showLayoutDialog };

function showLayoutDialog(reCreateCharts) {
  const { reportTitle, reportDate, dates } = Param.getParam("config");
  const datesWithoutReportDate = dates.filter((_, i) => i > 1);
  const layoutDialog = [
    {
      tag: "text",
      name: "reportTitle",
      label: "Report title",
      value: reportTitle,
    },
    {
      tag: "date",
      name: "reportDate",
      label: "Report date",
      value: reportDate,
    },
    {
      tag: "table",
      label: "Preset dates",
      name: "dates",
      value: datesWithoutReportDate,
      item: "Preset date",
      elements: [
        { tag: "text", label: "Name", name: "label" },
        { tag: "date", label: "Value", name: "value" },
      ],
    },
    { tag: "hr" },
    { tag: "button", label: "Cancel", "data-action": "cancel" },
    {
      tag: "button",
      label: "Apply",
      "data-action": "apply",
      class: "disable-on-error",
    },
  ];

  //   if (!reportDate) return;
  Dialog.make(layoutDialog, {
    callback,
    classes: "dialog medium",
    legend: "Config dashboard",
  }).show();
  validateLayout();

  function callback({ type, target }) {
    if (type === "click-button") {
      const label = target.textContent;
      if (label === "Cancel") Dialog.close();
      if (label === "Apply") layoutApply(reCreateCharts);
      return;
    }
    if (type === "change") validateLayout();
  }

  function validateLayout() {
    const data = Dialog.data();
    const { reportTitle, reportDate, dates } = data;
    console.log({ data, dates });

    Dialog.markErrors();

    const errors = [],
      attributes = [
        { name: "dates_name_0", attrs: ["disabled", true] },
        { text: "Delete Preset date 1", attrs: ["disabled", true] },
      ];
    if (!_.isString(reportTitle)) {
      errors.push({ reportTitle: "Report title is equired" });
    }
    if (!_.isValidDate(reportDate)) {
      errors.push({ reportDate: "Invalid report date" });
    }
    validateDates(dates);
    if (errors.length > 0) Dialog.markErrors(errors);
    Dialog.setElementsAttrs(attributes);

    function validateDates(dates) {
      if (!dates) return;
      const _dates = _.toTuples(dates, 2);
      _dates.forEach(([label, value], i) => {
        if (!_.isString(label))
          errors.push({ [`dates_label_${i}`]: "Label required" });
        else if (label === "report-date")
          errors.push({
            [`dates_label_${i}`]: `Label must be different to "report-date"`,
          });

        if (!_.isValidDate(value))
          errors.push({ [`dates_value_${i}`]: "Valid date required" });
      });
    }
  }

  function layoutApply(reCreateCharts) {
    validateLayout();
    if (Dialog.hasErrors) return;
    const { reportTitle, reportDate, dates } = Dialog.data();
    console.log(Dialog.data());
    Param.setParam("config", {
      reportTitle,
      reportDate,
      dates: ["report-date", reportDate, ...dates],
    });
    Dialog.close();
    reCreateCharts();
  }
}
