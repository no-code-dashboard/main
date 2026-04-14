"use strict";

/**
 * Todo
 * make element entries as x:{y:...} instead {tag: "x", y:...}
 * changes required in this module and in dialog.js
 */

import {
  _,
  saveCounts,
  getCounts,
  setItem,
  getItem,
  getChartId,
  getChartContainer,
  getKey,
  clearCounts,
} from "../util.js";
import { Dialog } from "./dialog.js";
import { Counter } from "../counter.js";
import { Param } from "../param.js";

import {
  chartTypes,
  getChartCommon,
  validateChart,
  getCalloutOverlay,
  validateCallout,
} from "../chart-types/chart-types.js";

export {
  // showLayoutDialog,
  showChartMenus,
  showCalloutMenu,
  configChart,
};

const chartDescription = Counter.getChartDescription();

function getChartTypes() {
  return Object.keys(chartDescription).filter(
    (v) => chartDescription[v].isChart,
  );
}
function cannotFilter(chartType) {
  if (!chartType) return false;
  if (!chartDescription[chartType]) return false;
  return chartDescription[chartType].cannotFilter;
}
function getChartsWithFilter() {
  const allCounts = getCounts();
  const counts = allCounts.counts;
  const filters = [];
  for (const key in counts) {
    let hasFilter = false;
    const isFalse = (v) => v !== undefined && !v;
    const count = counts[key];
    for (const cat in count) if (isFalse(count[cat].include)) hasFilter = true;
    if (hasFilter) filters.push(key);
  }
  return filters;
}

function showChartMenus(chartID, reCreateCharts) {
  const key = getKey(chartID);
  const { chartType } = Param.getParam("chart-properties", key);
  const cannotFilterChart = cannotFilter(chartType);
  const buttons = [
    { tag: "button", label: "Filter chart" },
    { tag: "button", label: "Config chart", disableOnFilter: true },
    { tag: "button", label: "Remove chart", disableOnFilter: true },
    { tag: "button", label: "Clone chart", disableOnFilter: true },
    { tag: "button", label: "Add calllout", disableOnFilter: true },
    { tag: "button", label: "Close" },
  ];
  if (cannotFilterChart) {
    buttons[0].disabled = true;
    buttons[0].title = "Disabled as chart cannot be filtered";
  }
  const filters = getChartsWithFilter();
  if (filters.length > 0)
    buttons.forEach((button, i) => {
      if (!button.disableOnFilter) return;
      button.disabled = true;
      button.title = "Disabled as filters on";
    });

  Dialog.make(buttons, {
    callback,
    classes: "dialog small",
    legend: "",
  }).show();

  function callback({ type, target }) {
    if (type !== "click-button") return;
    const label = target.textContent;
    Dialog.close();
    if (label === "Filter chart") filterChart(chartID, reCreateCharts);
    if (label === "Config chart") configChart(chartID, reCreateCharts);
    if (label === "Remove chart") removeChart(chartID, reCreateCharts);
    if (label === "Clone chart") cloneChart(chartID, reCreateCharts);
    if (label === "Add calllout") addCallout(chartID, reCreateCharts);
  }
}
///////////////////////////////
async function removeChart(chartID, reCreateCharts) {
  const key = getKey(chartID);
  if (Param.getParam("chart-count") === 1) {
    await Dialog.alert(`Cannot remove only chart`, ["Close"]);
    return;
  }

  const callouts = Param.getParam("config").callouts;
  if (callouts) {
    const callOutsWithSameKey = callouts
      .map((v, i) => ({ chartNumber: v.chartNumber, position: i }))
      .filter((v) => v.chartNumber === key)
      .map((v) => Number(v.position) + 1);
    if (callOutsWithSameKey.length > 0) {
      const list =
        (callOutsWithSameKey.length === 1 ? " (" : "s (") +
        callOutsWithSameKey.join(", ") +
        ")";
      await Dialog.alert(
        `Remove dependent callout${list}, then remove this chart`,
        ["Close"],
      );
      return;
    }
  }
  const { chartTitle } = Param.getParam("chart-properties", key);
  const confirm = "Yes remove";
  const reply = await Dialog.alert(
    `Are you sure to remove chart: "${chartTitle}"?`,
    [confirm, "No keep"],
  );
  if (reply === confirm)
    if (Param.removeParam("chart", key)) reCreateCharts(key, true);
}
function cloneChart(chartID, reCreateCharts) {
  const key = getKey(chartID);
  if (Param.cloneParam("chart", key)) reCreateCharts(key, true);
}
function addCallout(chartId, reCreateCharts) {
  const key = getKey(chartId);
  showCalloutConfigDialog(key, reCreateCharts, true);
}
//////////////////////////////////////////////////////////////////// config dialog helpers
//// rules for validation
/// return true if OK
/// return false in error
///update Dialog.error is error
// function displayGrammarTemplate(e, grammar) {
//   const template = getTemplate(grammar);
//   if (e.value.trim() == "") e.value = template;
// }
//////////////////////////////////////////////////////////////////// config dialog
function updateInitialValues(elements, values) {
  if (!values) return elements;

  const elementsWithValue = elements.map((e) => {
    const name = e.name;
    const value = name ? values[name] : undefined;
    if (e.elements)
      return { ...e, value, elements: updateInitialValues(e.elements, values) };

    if (!name) return e;
    return { ...e, value };
  });
  
  return elementsWithValue;
}
function configChart(chartID, reCreateCharts) {
  const key = getKey(chartID);
  const config = Param.getParam("config");
  const { chartProperties } = config;
  const chartProps = chartProperties[key];
  const chartElements = getChartCommon({ config });
  const configDialog = updateInitialValues(chartElements, {
    ...chartProps,
    position: Number(key) + 1,
  });
  Dialog.make(configDialog, {
    callback,
    classes: "dialog medium",
    legend: "Configure Chart",
  });
  showDialogOptions(chartProps);
  Dialog.show();
  positionDialog(_.select("#" + chartID));

  function callback({ type, target }) {
    if (type === "click-button") {
      const label = target.textContent;
      if (label === "Cancel") Dialog.close();
      if (label === "Apply") configChartApply(chartID);
    }
    if (type === "change") {
      showDialogOptions(Dialog.data(), target);
    }
  }
  function configChartApply(chartID) {
    validateConfig();
    if (Dialog.hasErrors) return;
    const key = getKey(chartID);
    const properties = Dialog.data();
    Dialog.close();
    if (Param.setParam("chart-properties", { properties, index: key }))
      reCreateCharts(key, true);
  }
  function validateConfig() {
    Dialog.markErrors();
    const properties = Dialog.data();
    const { chartType } = properties;
    if (getChartTypes().includes(chartType)) {
      const { reportDate } = Param.getParam("config");
      const [errors, warnings, attributes] = validateChart(properties, {
        reportDate,
      });

      if (attributes) Dialog.setElementsAttrs(attributes);
      if (warnings) Dialog.markErrors(warnings);
      if (errors) Dialog.markErrors(errors);
      return;
    }
    Dialog.markErrors({ chartType: `Invalid value: ${chartType}` });
  }
  function showDialogOptions(dataSource, target) {
    const { chartType } = dataSource;
    const columns = Param.getParam("config").columnNames;
    Dialog.markErrors();

    const needsOverlay = target ? target.name === "chartType" : true;
    if (needsOverlay) {
      const overlay = updateInitialValues(getOverlay(chartType), dataSource);
      Dialog.overlay(overlay);
    }
    validateConfig();
    function getOverlay(chartType) {
      const config = Param.getParam("config");
      const columns = config.columnNames;
      const reportDate = config.reportDate;

      return chartTypes[chartType].chartOverlay({
        config,
        chartType,
        columns,
        reportDate,
      });
    }
  }
}

function getCategories(key) {
  if (!key) return [];
  const allCounts = getCounts();
  if (!allCounts.data[key]) return [];
  return allCounts.data[key].data;
}

function filterChart(chartID, reCreateCharts) {
  const key = getKey(chartID);
  const allCounts = getCounts();
  // const dataJson = _.select("#" + chartID + " data").getAttribute("json");
  // const data = JSON.parse(dataJson);
  const data = getCategories(key);
  // console.log({data})
  const oneCount = allCounts.counts[key];
  const categories = data.map((v) => ({
    tag: "checkbox",
    value: oneCount[v.x] ? oneCount[v.x].include : "disable",
    label: v.x,
    name: v.x,
  }));
  const filterDialog = [
    ...categories,
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: "Apply", class: "disable-on-error" },
  ];
  Dialog.make(filterDialog, {
    callback,
    classes: "dialog small",
    legend: "Filter chart",
  }).show();

  function callback({ type, target }) {
    if (type === "click-button") {
      const label = target.textContent;
      if (label === "Cancel") Dialog.close();
      if (label === "Apply") applyFilter(chartID);
    }
    if (type === "change") {
      isSomeChecked();
    }
  }
  async function applyFilter(chartID) {
    if (!isSomeChecked()) return;
    Dialog.close();
    const key = getKey(chartID);
    const allCounts = getCounts();
    const oneCount = allCounts.counts[key];
    const data = Dialog.data(true);
    for (const key in data) {
      if (oneCount[key] !== undefined) {
        oneCount[key].include = data[key];
      }
    }
    saveCounts(allCounts);
    reCreateCharts(key);
  }
  function isSomeChecked() {
    const data = Dialog.data();
    Dialog.markErrors();
    const someChecked = Object.keys(data).some((key) => data[key]);
    if (someChecked) return true;
    const keys = Object.keys(data);
    Dialog.markErrors({ [keys[keys.length - 1]]: "Required" });
    return false;
  }
}
function showCalloutMenu(key, reCreateCharts, scrollToChart) {
  const { chartNumber } = Param.getParam("callouts", key);
  const buttons = [
    { label: "Go to chart" },
    { label: "Config callout" },
    { label: "Remove callout" },
    { label: "Close" },
  ];
  const elements = buttons.map((b) => ({ tag: "button", label: b.label }));

  Dialog.make(elements, {
    callback,
    classes: "dialog small",
    legend: "",
  }).show();

  function callback({ type, target }) {
    if (type !== "click-button") return;
    Dialog.close();
    const label = target.textContent;
    if (label === buttons[0].label) scrollToChart(chartNumber);
    if (label === buttons[1].label)
      showCalloutConfigDialog(key, reCreateCharts);
    if (label === buttons[2].label) removeCallout(key);
  }
  async function removeCallout(key) {
    const confirm = "Yes, remove";
    const reply = await Dialog.alert("Sure to remove the callout?", [
      confirm,
      "No, keep",
    ]);
    if (reply !== confirm) return;
    if (Param.removeParam("callout", key)) reCreateCharts();
  }
}
//////////////////////////////////////////////////////////////////// callout config

function showCalloutConfigDialog(key, reCreateCharts, addNew = false) {
  const calloutProps = addNew
    ? { chartNumber: key, value: "max" }
    : Param.getParam("callouts", key);
  const { chartNumber, chartType, value, category, message } = calloutProps;

  // const dataJson = _.select(`#${getChartId(chartNumber)} data`);
  // const json = dataJson ? dataJson.getAttribute("json") : "[]";
  // const data = JSON.parse(json);

  const okButtonLabel = addNew ? "Add" : "Apply";
  const max = Param.getParam("callout-count");
  const calloutConfigDialog = [
    {
      tag: "number",
      value: addNew ? max + 1 : Number(key) + 1,
      min: 0,
      max: addNew ? max + 1 : max,
      name: "position",
      label: "Position ",
      disabled: addNew,
    },
    {
      tag: "number",
      value: Number(chartNumber) + 1,
      min: 0,
      max: Param.getParam("chart-count"),
      name: "chartNumber",
      label: "Chart number",
    },
    { tag: "hr" },
    { tag: "overlay", id: "callout-overlay" },
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: okButtonLabel, class: "disable-on-error" },
  ];

  Dialog.make(calloutConfigDialog, {
    callback,
    classes: "dialog medium",
    legend: "Config callout",
  });
  Dialog.show();
  overlayCallout(calloutProps);
  validateCalloutConfig();

  function callback({ type, target }) {
    if (type == "click-button") {
      const label = target.textContent;
      if (label === okButtonLabel) applyConfigCallout(key);
      if (label === "Cancel") Dialog.close();
    }

    if (type === "change") {
      if (target.name === "chartNumber") overlayCallout();
      validateCalloutConfig();
    }
  }
  function overlayCallout() {
    const { chartNumber, position } = Dialog.data();
    const { chartType, x_label, x_column, y_label, y_column } = Param.getParam(
      "chart-properties",
      chartNumber - 1,
    );
    // const { valueType, categories } = Dialog.data();
    const calloutProps = Param.getParam("callouts", position - 1);

    const xy = getCategories(chartNumber - 1);
    const x = [...new Set(xy.map((v) => v.x))];
    const y = [...new Set(xy.map((v) => v.y))];

    const calloutOverlay = updateInitialValues(
      getCalloutOverlay(chartType, {
        x,
        y,
        x_label: x_label ?? x_column,
        y_label: y_label ?? y_column,
      }),
      calloutProps,
    );

    Dialog.overlay(calloutOverlay, "callout-overlay");
  }
  function validateCalloutConfig() {
    Dialog.markErrors();
    const properties = Dialog.data();
    const chartNumber = Dialog.getElement("chartNumber").value;
    const chartProps = Param.getParam("chart-properties", chartNumber - 1);

    const [errors, warnings, attributes] = validateCallout(
      properties,
      chartProps,
    );

    Dialog.setElementsAttrs(attributes);
    Dialog.markErrors(errors);
    return { errors, output: properties };
  }
  function applyConfigCallout(key) {
    const xxx = validateCalloutConfig();
    console.log({ xxx, key });
    const { output, errors } = xxx; //validateCalloutConfig();

    if (errors && errors.length > 0) {
      console.log({ errors });

      for (const e in errors) Dialog.markErrors({ e: errors[e] });
      return;
    }

    const { chartNumber, position } = output;
    output.chartNumber = Number(chartNumber) - 1;
    Dialog.close();
    if (
      Param.setParam("callouts", {
        properties: { ...output },
        index: key,
      })
    )
      reCreateCharts();
  }
  function getDefaultCalloutMessage({
    value,
    category,
    chartType,
    x_column,
    y_column,
  }) {
    const cats = `${x_column} = ...` + y_column ? `, ${y_column} = ...` : "";

    return value === "max"
      ? "Maximum at " + cats
      : value === "min"
        ? "Minimum at " + cats
        : `Value for ... = ${category}`;
  }
  //////////////////////////////////////////////////////////////////// callout remove
}
function positionDialog(target) {
  return;
  // if (!target) return;
  // return
  // target.classList.add("shimmer");
  const rect = target.getBoundingClientRect();

  const dialog = _.select("dialog");
  dialog.style.position = "absolute";
  dialog.style.top = `${rect.top}px`;
  dialog.style.left = `${rect.left}px`;
  console.log({ rect, t: dialog.style.top, l: dialog.style.left });
  // dialog.style.width = `${rect.width}px`;
  // dialog.style.height = `${rect.height}px`;
}
