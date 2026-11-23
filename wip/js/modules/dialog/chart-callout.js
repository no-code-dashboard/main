"use strict";

/**
 * Todo
 * 1 make element entries as x:{y:...} instead {tag: "x", y:...}
 * or
 * 2 cange element entries as ["x", {y...}] where first entry is tag and second is props
 * or
 * 3 change all not standard (in html) props as _tag, _label, etc
 * finally
 * combine 2 and 3?
 *
 * changes required in this module and in dialog.js
 */

import {
  _,
  saveCounts,
  getCounts,
  setItem,
  getItem,
  getChartId,
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

function showChartMenus(key, reCreateCharts) {
  const { chartType } = Param.getParam("chart-properties", key);
  const cannotFilterChart = cannotFilter(chartType);
  const tag = "button";
  const buttons = [
    { tag, label: "Filter chart" },
    { tag, label: "Config chart", disableOnFilter: true },
    { tag, label: "Remove chart", disableOnFilter: true },
    { tag, label: "Clone chart", disableOnFilter: true },
    { tag, label: "Add calllout", disableOnFilter: true },
    { tag, label: "Close" },
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
    if (label === "Remove chart") {
      target.textContent = "Definitely remove";
      target.classList.add("t-red");
      if (typeof target.onblur !== "function")
        target.addEventListener("blur", () => {
          target.textContent = "Remove chart";
          target.classList.remove("t-red");
        });
      return;
    }
    Dialog.close();
    if (label === "Filter chart") filterChart(key, reCreateCharts);
    if (label === "Config chart") configChart(key, reCreateCharts);
    if (label === "Definitely remove") removeChart(key, reCreateCharts);
    if (label === "Clone chart") cloneChart(key, reCreateCharts);
    if (label === "Add calllout") addCallout(key, reCreateCharts);
  }
}
///////////////////////////////
async function removeChart(key, reCreateCharts) {
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
  // const confirm = "Yes remove";
  // const reply = await Dialog.alert(
  //   `Are you sure to remove chart: "${chartTitle}"?`,
  //   [confirm, "No keep"],
  // );
  // if (reply === confirm)
  if (Param.removeParam("chart", key)) reCreateCharts(key, true);
}
function cloneChart(key, reCreateCharts) {
  if (Param.cloneParam("chart", key)) reCreateCharts(key, true);
}
function addCallout(key, reCreateCharts) {
  showCalloutConfig(key, reCreateCharts, true);
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
function configChart(key, reCreateCharts) {
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

  function callback({ type, target }) {
    if (type === "click-button") {
      const label = target.textContent;
      if (label === "Cancel") Dialog.close();
      if (label === "Apply") configChartApply(key);
    }
    if (type === "change") {
      showDialogOptions(Dialog.data(), target);
    }
  }
  function configChartApply(key) {
    validateConfig();
    if (Dialog.hasErrors) return;
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
      const config = Param.getParam("config");
      const [errors, warnings, attributes] = validateChart(properties, config);

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

function filterChart(key, reCreateCharts) {
  const allCounts = getCounts();
  // const dataJson = _.select("#" + chartID + " data").getAttribute("json");
  // const data = JSON.parse(dataJson);
  const data = getCategories(key);
  const oneCount = allCounts.counts[key];
  const categories = data.map((v) => ({
    tag: "checkbox",
    value: Boolean(oneCount[v.x]?.include), // ?? true,
    disabled: oneCount[v.x]?.include ? "" : "disable",
    label: v.x,
    name: v.x,
  }));
  const filterDialog = [
    { tag: "button", label: "Select all" },
    { tag: "button", label: "Clear all" },
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
  console.log({ d: Dialog.data() });

  function callback({ type, target }) {
    if (type === "click-button") {
      const label = target.textContent;
      if (label === "Cancel") Dialog.close();
      if (label === "Clear all") clear(key);
      if (label === "Select all") clear(key, true);
      if (label === "Apply") applyFilter(key);
    }
    if (type === "change") {
      isSomeChecked();
    }
  }
  function clear(key, select = false) {
    const names = _.selectAll("input[name]");
    names.forEach((name) => (name.checked = select));
    isSomeChecked();
  }
  async function applyFilter(key) {
    if (!isSomeChecked()) return;
    Dialog.close();
    const allCounts = getCounts();
    const oneCount = allCounts.counts[key];
    const data = Dialog.data(true);

    for (const key in oneCount) oneCount[key].include = false;
    for (const key in data) {
      if (oneCount[key] !== undefined) {
        oneCount[key].include = true;
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
    Dialog.markErrors({ [keys[0]]: "At least one check required" });
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
  const elements = buttons.map((b) => ({ tag: "button", ...b }));

  Dialog.make(elements, {
    callback,
    classes: "dialog small",
    legend: "",
  }).show();

  function callback({ type, target }) {
    if (type !== "click-button") return;
    const label = target.textContent;
    if (label === "Remove callout") {
      target.textContent = "Definitely remove";
      target.classList.add("t-red");
      if (typeof target.onblur !== "function")
        target.addEventListener("blur", () => {
          target.textContent = "Remove callout";
          target.classList.remove("t-red");
        });
      return;
    }

    Dialog.close();
    if (label === "Go to chart") scrollToChart(chartNumber);
    if (label === "Config callout") showCalloutConfig(key, reCreateCharts);
    if (label === "Definitely remove") removeCallout(key);
  }
  async function removeCallout(key) {
    // const confirm = "Yes, remove";
    // const reply = await Dialog.alert("Sure to remove the callout?", [
    //   confirm,
    //   "No, keep",
    // ]);
    // if (reply !== confirm) return;
    if (Param.removeParam("callout", key)) reCreateCharts();
  }
}
//////////////////////////////////////////////////////////////////// callout config

function showCalloutConfig(key, reCreateCharts, add = false) {
  const calloutProps = add
    ? { chartNumber: key, value: "max" }
    : Param.getParam("callouts", key);
  const { chartNumber, chartType, value, category, message } = calloutProps;

  // const dataJson = _.select(`#${getChartId(chartNumber)} data`);
  // const json = dataJson ? dataJson.getAttribute("json") : "[]";
  // const data = JSON.parse(json);

  const submitText = add ? "Add" : "Apply";
  const max = Param.getParam("callout-count");
  const calloutConfigDialog = [
    {
      tag: "number",
      value: add ? max + 1 : Number(key) + 1,
      min: add ? max + 1 : 1,
      max: add ? max + 1 : max,
      name: "position",
      label: "Position ",
      //disabled: addNew,
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
    { tag: "overlay" },
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: submitText, class: "disable-on-error" },
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
      if (label === submitText) applyConfigCallout(key, submitText);
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
        x_label: x_label || x_column,
        y_label: y_label || y_column,
      }),
      calloutProps,
    );
    Dialog.overlay(calloutOverlay, "callout-overlay");
  }
  function validateCalloutConfig() {
    Dialog.markErrors();
    const calloutProperties = Dialog.data();
    const chartNumber = Dialog.getElement("chartNumber").value;
    const chartProps = Param.getParam("chart-properties", chartNumber - 1);
    const config = Param.getParam("config");

    // const x = validateCallout(
    //   calloutProperties,
    //   chartProps,
    //   config,
    // );
    // console.log({x})
    const [errors, warnings, attributes, output] = validateCallout(
      calloutProperties,
      chartProps,
      config,
    );
    Dialog.setElementsAttrs(attributes);
    Dialog.markErrors(errors);
    return { errors, output };
  }
  function applyConfigCallout(key, submitText) {
    // const [errors, , , output] = validateCalloutConfig();
    const { errors, output } = validateCalloutConfig();
    if (errors && errors.length > 0) {
      // for (const e in errors) Dialog.markErrors({ e: errors[e] });
      return;
    }

    const { chartNumber, position } = output;
    output.chartNumber = Number(chartNumber) - 1;
    Dialog.close();
    const properties = { ...output };
    if (
      Param.setParam("callouts", {
        properties,
        index: submitText === "Apply" ? key : undefined,
      })
    )
      reCreateCharts();
  }
  // function getDefaultCalloutMessage({
  //   value,
  //   category,
  //   chartType,
  //   x_column,
  //   y_column,
  // }) {
  //   const cats = `${x_column} = ...` + y_column ? `, ${y_column} = ...` : "";

  //   return value === "max"
  //     ? "Maximum at " + cats
  //     : value === "min"
  //       ? "Minimum at " + cats
  //       : `Value for ... = ${category}`;
  // }
  //////////////////////////////////////////////////////////////////// callout remove
}
