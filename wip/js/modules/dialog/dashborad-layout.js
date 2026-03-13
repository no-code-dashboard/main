"use strict";

// import {
//   _,
//   saveCounts,
//   getCounts,
//   setItem,
//   getItem,
//   getChartId,
//   getChartContainer,
//   getKey,
//   clearCounts,
// } from "../util.js";
import { Dialog } from "./dialog.js";
// import { Counter } from "../counter.js";
import { Param } from "../param.js";

// import {
//   chartTypes,
//   getChartCommon,
//   validateChart,
//   getCalloutOverlay,
//   validateCallout,
// } from "../chart-types.js";

export { showLayoutDialog };

function showLayoutDialog(reCreateCharts) {
  const { reportTitle, reportDate, presetValues } = Param.getParam("config");
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
    // Todo: preset values
    {
      tag: "table",
      label: "Preset values",
      name: "presetValues",
      value: presetValues,
      elements: [
        {
          tag: "select",
          options: ["Date", "Text"],
          label: "Type",
          name: "type",
        },
        {
          tag: "text",
          label: "Name",
          name: "name",
        },
        //   { tag: "text", label: "Value", name: "valueText" },
        { tag: "date", label: "Value", name: "value" },
      ],
    },
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: "Apply", class: "disable-on-error" },
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
    const { reportTitle, reportDate } = data;
    console.log({ data, type: data["presetValues-type"] });

    Dialog.markErrors();

    const errors = [],
      attributes = [
        { names: ["valueText", "valueDate"], attrs: ["disabled", true] },
      ];
    if (reportTitle.trim() === "") {
      errors.push({ reportTitle: "Required" });
    }
    if (reportDate.trim() === "") {
      errors.push({ reportDate: "Required" });
    }

    if (data["presetValues--"]) {
      const name = data["presetValues-name"];
      const type = data["presetValues-type"];
      const value = data["presetValues-value"];
      const input = Dialog.getElement("presetValues-value");
      input.type = type === "Text" ? "text" : "date";
      if (value && !name) errors.push({ "presetValues-name": "Required" });
      if (!value && name) errors.push({ "presetValues-value": "Required" });
    }

    if (errors.length > 0) Dialog.markErrors(errors);
    Dialog.setElementsAttrs(attributes);
  }

  function layoutApply(reCreateCharts) {
    validateLayout();
    if (Dialog.hasErrors) return;
    const { reportTitle, reportDate, presetValues } = Dialog.data();
    // const config = Param.getParam("config");
    // config.reportTitle = reportTitle.trim();
    // config.reportDate = reportDate;
    console.log(Dialog.data());
    Param.setParam("config", { reportTitle, reportDate, presetValues });
    Dialog.close();
    reCreateCharts();
  }
}
