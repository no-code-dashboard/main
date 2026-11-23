"use strict";
import { Param } from "./modules/param.js";
import { Counter } from "./modules/counter.js";
import {
  _,
  saveCounts,
  getCounts,
  setItem,
  getItem,
  getChartId,
  clearCounts,
} from "./modules/util.js";

import {
  getPresetConfig,
  validateConfigs,
  validateConfig,
} from "./modules/preset.js";
import { Logger } from "./modules/logger.js";
import {
  drawChart,
  createCallout,
  destroyAllCharts,
  // amimateChart,
} from "./modules/chart.js";
import {
  showChartMenus,
  showCalloutMenu,
} from "./modules/dialog/chart-callout.js";
import { showLoadFileDialog } from "./modules/dialog/loadfile.js";
import { showLayoutDialog } from "./modules/dialog/dashborad-layout.js";
import { Dialog } from "./modules/dialog/dialog.js";
import { smokeTest } from "./modules/smoke-test.js";

window.addEventListener("load", (event) => {
  addMenuListeners();
  const url = new URL(window.location.toLocaleString());
  const search = url.search;
  if (!search) {
    showInitialChoice({ url, loadNewData });
    return;
  }
  const preset = search.replace("?", "").trim();
  const presets = {
    demo: `./jsons/demo.json`,
  };
  if (preset in presets) loadConfigFile(presets[preset]);
  else loadConfigFile(preset);
});
window.addEventListener("click", (e) => {
  const div = e.target.closest(".callout, .chart");
  if (!div) return;
  const id = div.id;
  selectDiv("#" + id);
});
window.addEventListener("error", (event) => {
  const message = `Unhandled error. ${event.type}: ${event.message}`;
  console.trace(message);
  showErrorInDash(message);
  Dialog.close();
});
window.__smokeTest = (duration) =>
  smokeTest(loadConfigFile, loadPresetFile, scrollToChart, duration);

function addMenuListeners() {
  const menus = _.selectAll(".menu");
  for (const m of menus) {
    const id = m.id;
    m.tabindex = 0;
    m.addEventListener("click", () => menu(id));
  }
}
function adjustMenusDisplay(ids = [], display = "") {
  ids.forEach((id) => (_.select("#" + id).style.display = display));
}

function setLoader(action) {
  const progress = _.select("#loader-wrapper");
  progress.style.visibility = action === "show-progress" ? "visible" : "hidden";
  const show = action === "show" || action === "show-progress";
  const main = _.select("main");
  // main.style.visibility = show ? "hidden" : "visible";
  main.style.display = show ? "none" : "block";
  const loader = _.select("#loader-wrapper");
  loader.style.display = show ? "block" : "none";
}

function readyDashboard() {
  _.clearHTML("#severe-error");
  _.clearHTML("#data-source");
  _.clearHTML("#log");
  const reportTitles = _.select("#report-titles");
  _.select("h1", reportTitles).textContent = "";
  _.select("h2", reportTitles).textContent = "";
  clearCounts();
  destroyAllCharts();
}

async function loadPresetFile(presetType) {
  if (!presetType) {
    showErrorInDash(`presetType missing`);
    return;
  }
  highlightPresetMenu(presetType);
  const [config, error] = getPresetConfig(presetType);
  if (error) {
    showErrorInDash(error);
    return;
  }
  loadAConfig(config, true);
}

async function showInitialChoice({ url, loadNewData }) {
  //to do get first row and compare
  const response = await Dialog.alert(
    "Select to proceed...",
    ["Load file", "Show demo", "Cancel"],
    "Welcome to no-code-dashboard",
  );
  // const action = await Dialog.alert(
  //     "Select to proceed...",
  //     ["Keep Config", "Reset Config", "Abort Load"],
  //     "A config is already present",
  //   );
  if (response == "Show demo") {
    window.open("index.html?demo", "_self");
  }
  if (response == "Load file") {
    loadFile();
  }
  return;
}
async function countNow(filter) {
  Logger.startLogs();
  const config = Param.getParam("config");
  const json = JSON.stringify({ filter, config });
  const allCounts = await Counter.getCountsFromFile(json);

  saveCounts(allCounts);
  showCharts();
  showFilters();
  Logger.showLogs();
  setLoader("hide");
}

function createTag(text, colorClass, tooltip) {
  const title = tooltip ? `data-title="${tooltip}"` : "";
  return _.createElements(
    `<span class="${colorClass}" ${title}>${text}</span>`,
  );
}

function showFilters() {
  const allCounts = getCounts();
  if (!allCounts.memo.global) return;
  const { totalRowCounts, filteredRowCounts } = allCounts.memo.global;

  const label =
    filteredRowCounts != totalRowCounts
      ? `${filteredRowCounts} out of ${totalRowCounts} rows of data shown`
      : `All ${totalRowCounts} rows of data shown`;

  Logger.logValues(label, "info");
  // filterValueDiv.appendChild(createTag(label, "tag-info"));

  for (const [key, value] of Object.entries(allCounts.counts)) {
    const excluded = [],
      included = [];

    for (const [k, v] of Object.entries(allCounts.counts[key])) {
      v.include ? included.push(k) : excluded.push(k);
    }

    if (excluded.length > 0) {
      const isMember = "=",
        isNotMember = "\u2260";
      let filterValue = "Filter";
      // Param.getParam("chart-properties", key).chartTitleWithIndex + " ";
      if (included.length <= excluded.length)
        filterValue += isMember + " [" + included.join(", ") + "] ";
      else filterValue += isNotMember + " [" + excluded.join(", ") + "] ";

      // filterValueDiv.appendChild(createTag(filterValue, "tag-info"));
      Logger.logValues(filterValue, "info", key);
    }
  }
}

function showCharts() {
  const mainTitle = _.select("#main-title");
  const { reportDate, reportTitle, reportSubtitle } = Param.getParam("config");
  mainTitle.textContent = reportTitle;
  const subTitle = _.select("#sub-title");
  subTitle.textContent =
    reportSubtitle ??
    "Data as of: " + _.formatDate(reportDate, "DDD DD-MMM-YYYY");

  const calloutContainer = _.clearHTML(".callout-container");
  const wrapper = _.clearHTML(".chart-container");
  const toc = _.clearHTML("#toc");
  const dropdownTOC = _.clearHTML("#dropdown-toc");
  dropdownTOC.addEventListener("click", () => toggleDropdown());
  const allCounts = getCounts();
  const button = `<button tabindex="0">&#8942;</button>`;

  for (const key in allCounts.callouts) {
    const div = _.createElements(
      `<article class="callout" id="callout-${key}">
        ${button}
        <div id="value"></div>
        <hr style="margin:0.5rem">
        <p id="message"></p>
      </article>`,
    );

    _.select("button", div).addEventListener("click", () => {
      // selectDiv(`#callout-${key}`);
      showCalloutMenu(key, reCreateCharts, scrollToChart);
    });

    calloutContainer.append(div);
    createCallout(key, allCounts.callouts[key], scrollToChart);
  }

  for (const key in allCounts.counts) {
    const { chartType, chartTitleWithIndex, chartSize } = Param.getParam(
      "chart-properties",
      key,
      true,
    );
    const spanClass = "" + chartSize.toLowerCase();

    // const chartTemplate = _.select("#wrapper-loader .chart");
    // const chartTemplate = _.select("#chart-template");
    createChartPlaceholder();
    createTOCentry();

    const data = allCounts.data[key];
    // const memo = allCounts.memo[key]
    drawChart(key, data, chartClick);

    function createChartPlaceholder() {
      const containerId = getChartId(key);
      const div = _.createElements(`
      <article class="chart ${spanClass}" data-chart-type="${chartType}" id="${containerId}">
        ${button}
        <h4>${chartTitleWithIndex}</h4>
        <div id="plot"></div>
        <div class="tags"></div>
        <div class="chart-footer"></div>
      </article>`);

      _.select("button", div).addEventListener("click", () => {
        // selectDiv(`#${containerId}`);
        showChartMenus(key, reCreateCharts, showCharts);
      });
      wrapper.appendChild(div);
    }

    function createTOCentry() {
      const a = `<a href="#${getChartId(key)}">${chartTitleWithIndex}</a>`;

      const tocEntry = _.createElements(`<div>${a}</div>`);
      toc.appendChild(tocEntry);
      const tocEntryDup = _.createElements(a);
      dropdownTOC.appendChild(tocEntryDup);
      // dropdownTOC.setAttribute("onclick", "toggleDropdown()");
    }
  }
}

async function chartClick(key, category) {
  const chartContainer = "#chart-container" + key;
  selectDiv(chartContainer);
  if (!category) return;
  const allCounts = getCounts();

  const oneCount = allCounts.counts[key];
  for (const [k, v] of Object.entries(oneCount))
    if (k !== category) v.include = !v.include;

  await countNow(allCounts);
  selectDiv(chartContainer);
}

function menu(action) {
  if (action === "show-toc") {
    toggleDropdown();
    return;
  }

  hideDropdown();
  // if (action === "print") {
  //   //adjust toc for print
  //   window.print();
  //   //adjust toc for sceen
  //   return;
  // }

  if (action === "load-file") {
    loadFile();
    return;
  }
  if (action == "save-config") {
    //todo check this
    const config = Param.getParam("config");
    const downloadAt = Date();
    const json = JSON.stringify({ [downloadAt]: config }, null, 2);
    if (json == "{}") return;
    navigator.clipboard.writeText(json);
    downloadFile(json, "config.json");
    return;
    function downloadFile(data, name, type = "application/json") {
      const blob = new Blob([data], { type });
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      Object.assign(a, {
        href,
        style: "display: none",
        download: name,
      });
      document.body.appendChild(a);

      a.click();
      window.URL.revokeObjectURL(href);
      a.remove();
    }
  }
  if (action == "configure-dashboard") return showLayoutDialog(reCreateCharts);

  if (action == "showData") {
    return;
  }

  showErrorInDash(`"${action}" not implemented`);
}

function updateDataSource(sources, names) {
  const dataSource = _.clearHTML("#data-source");
  dataSource.appendChild(createTag(`Data source`, "tag-info"));

  sources.forEach((source, i) => {
    const text = names?.[i] ?? filename(source);
    const a = _.createElements(
      `<span class="tag-info">
          <a target="_blank" href="${source}" data-title="Click to view the file",">${text}</a>
        </span`,
    );
    dataSource.appendChild(a);
  });
  function filename(name) {
    if (!name.endsWith(".csv")) return name;
    const regex = /\/([^\/]+)$/;
    const match = name.match(regex);
    if (match && match.length > 1) return match[1];
    return name;
  }
}
///////////////////////////menu bar functions
function hideDropdown() {
  const dropdownTOC = _.select("#dropdown-toc");
  dropdownTOC.style.display = "none";
}
function toggleDropdown() {
  const dropdownTOC = _.select("#dropdown-toc");
  const tocIsHidden =
    dropdownTOC.style.display === "" || dropdownTOC.style.display === "none";
  if (tocIsHidden) dropdownTOC.style.display = "block";
  else dropdownTOC.style.display = "none";
  // toc.classList.toggle("only-print");
}
function highlightPresetMenu(label) {
  // const presetButtons = _.selectAll("#preset button");
  // presetButtons.forEach((button) => {
  //   button.blur();
  //   if (button.textContent === label) button.focus();
  // });
}

async function reCreateCharts(key, removeFilter = false) {
  // const scrollY = window.scrollY;
  const filter = removeFilter ? undefined : getCounts();
  destroyAllCharts();
  await countNow(filter);
  // window.scroll(0, scrollY);
  scrollToChart(key);
}

function scrollToChart(key) {
  if (!key) return;
  const chart = _.select(`#${getChartId(key)}`);
  if (!chart) return;
  chart.scrollIntoView(false);
  selectDiv(`#${getChartId(key)}`);
}

function selectDiv(selector) {
  const theDiv = _.select(selector);
  if (!theDiv) return;
  const isSelected = theDiv.classList.contains("selected");
  const divs = _.selectAll(".selected");
  divs.forEach((div) => {
    div.classList.remove("selected");
  });
  if (isSelected) return;
  // amimateChart(selector, "bar");
  theDiv.classList.add("selected");
}

/////////////////
function loadFile() {
  showLoadFileDialog({
    header: "Load file",
    loadNewData,
    loadConfigFile,
  });
}
//to do remove blob for local
async function loadNewData(file, filename, url) {
  /**
  Data present?	Action
  No	          Load data and create config
  Yes	          Ask if data be loaded
  */
  Logger.clearLogs();

  const blob = file instanceof File ? URL.createObjectURL(file) : file;
  const config = Param.getParam("config");
  if (!_.isEmptyObject(config)) {
    const nextStep = await Dialog.alert(
      "Select to proceed...",
      ["Keep Config", "Reset Config", "Abort Load"],
      "A config is already present",
    );
    if (nextStep === "Abort Load") return;
    if (nextStep === "Reset Config") {
      const dataDescription = await Counter.getCountsFromFile(
        _.stringify({ blob }),
      );
      Param.autoCreateConfig(blob, dataDescription);
    }
    Param.setParam("config-file", { file: blob });
  } else {
    const dataDescription = await Counter.getCountsFromFile(
      _.stringify({ blob }),
    );
    console.log({ dataDescription });
    Param.autoCreateConfig(blob, dataDescription);
  }

  // const action = await (_.isEmptyObject(config)
  //   ? "Reset Config"
  //   : Dialog.alert(
  //       "Select to proceed...",
  //       ["Keep Config", "Reset Config", "Abort Load"],
  //       "A config is already present",
  //     )); //://actionOnConfig();
  // console.log({ x, config, action });
  // if (action === "Abort Load") return;
  setLoader("show-progress");
  readyDashboard();
  // if (action === "Reset Config") {
  //   const dataDescription = await Counter.getCountsFromFile(
  //     _.stringify({ blob }),
  //   );
  //   Param.autoCreateConfig(blob, dataDescription);
  // }
  // if (action === "Keep Config") Param.setParam("config-file", { file: blob });
  updateDataSource([blob], [filename]);
  await countNow();

  adjustMenusDisplay(["show-toc", "configure-dashboard", "save-config"], "");
  setLoader("hide");
  async function actionOnConfig() {
    //todo get first row and compare

    // const doHeadersMatch = false;
    // if (doHeadersMatch) return "Keep Config";

    const action = await Dialog.alert(
      "Select to proceed...",
      ["Keep Config", "Reset Config", "Abort Load"],
      "A config is already present",
    );
    console.trace(); //{ action });
    return action;
  }
}
/* 
todo
bug - table showing more that 10 (done: was a bug for new files)
bug - config bar not updating current values (done)
fix tag: table and tag: objcet - to do button highlights (done)
fix callout (done)
add donut to call out (done)

read 2000 record limit on new file
change language for the demo, help text

oprand 1 can be column name or const (number or date)

*/

async function loadConfigFile(file, isSmokeTest = false) {
  if (!file) {
    showErrorInDash(`No input file provided`);
    return;
  }

  const [text, fileErr] = await readFile(file);

  if (fileErr) {
    showErrorInDash(fileErr);
    return;
  }

  const [configs, jsonErr] = _.parse(text);

  if (jsonErr) {
    showErrorInDash(jsonErr);
    return;
  }

  if (isSmokeTest) return configs;
  loadConfigs(configs);

  async function readFile(file) {
    try {
      if (file instanceof File) {
        const text = await file.text();
        return [text, null];
      }
      if (typeof file === "string") {
        const response = await fetch(file);
        if (!response.ok) {
          return [null, `HTTP error! status: ${response.status}`];
        }
        const text = await response.text();
        return [text, null];
      }
      return [null, `Invalid file type. File: ${_.stringify(file)}`];
    } catch (error) {
      return [null, error];
    }
  }
}
async function loadConfigs(configs) {
  // setLoader("show-progress");
  // hideDropdown();
  // readyDashboard();

  const [keys, error, config] = validateConfigs(configs);

  if (error) {
    showErrorInDash(error);
    return;
  }

  if (keys.length === 0) {
    loadAConfig(config);
    return;
  }
  const presetDiv = _.select("#top-nav #preset");
  const notPresetDiv = _.select("#top-nav #not-preset");
  const tocClone = _.selectAll("button", notPresetDiv)[0];

  keys.forEach((label, i) => {
    const clone = tocClone.cloneNode(true);
    clone.textContent = label;
    clone.id = "preset-" + i;
    clone.addEventListener("click", () => loadPresetFile(label));
    presetDiv.appendChild(clone);
  });
  notPresetDiv.style.display = "none";
  adjustMenusDisplay(["show-toc"], "");
  _.selectAll("#top-nav #preset .menu")[0].click();
}

async function loadAConfig(config, isPreset = false) {
  hideDropdown();
  readyDashboard();
  const [, err] = validateConfig(config);

  if (err) {
    showErrorInDash(err);
    return;
  }

  const { files } = config;
  if (files.length === 0) {
    Param.setParam("config-replace", { newConfig: config });
    console.log({config})
    return;
  }
  setLoader("show-progress");
  const fileSize = await _.getFileSize(files[0]);
  const isValid = fileSize > -1;
  if (isPreset && !isValid) {
    showErrorInDash(`Invalid file: ${files[0]}`);
    return;
  }
  Param.setParam("config-replace", { newConfig: config });
  if (!isValid) return;
  updateDataSource([files[0]]);
  if (!isPreset)
    adjustMenusDisplay(["show-toc", "configure-dashboard", "save-config"], "");
  await countNow();
}

function showErrorInDash(msg, type = "severe") {
  _.select("#severe-error").textContent = msg;
  // Logger.logValues(msg, type);
  Logger.showLogs();
  setLoader("hide");
}
async function newCountNow(filter) {
  Logger.startLogs();
  const config = Param.getParam("config");
  const json = JSON.stringify({ filter, config });
  // const allCounts = await Counter.getCountsFromFile(json);
  const allCounts = await runInBrowser();

  saveCounts(allCounts);
  showCharts();
  showFilters();
  Logger.showLogs();
  setLoader("hide");
  // --- Browser runner: stream straight into the shared counting function ---
  async function runInBrowser(file) {
    if (file instanceof File) return countColumns(file.stream());
    //introduce auth
    const res = await fetch(file); // remote server must allow CORS
    if (!res.ok)
      throw new Error(`Remote fetch failed: ${res.status} ${res.statusText}`);
    return countColumns(res.body);
  }

  // --- Worker runner: same inputs the Worker expects ---
  async function runInWorker(file) {
    const request =
      file instanceof File
        ? {
            method: "POST",
            headers: { "Content-Type": "text/csv" },
            body: file,
          }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file }),
          };
    const res = await fetch(WORKER_URL, request);
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  async function countColumns() {
    //todo
  }
}

async function waitAtLeast(asyncFn, seconds) {
  const timerPromise = _.sleep(seconds * 1000);
  const functionPromise = asyncFn();
  const [, result] = await Promise.all([timerPromise, functionPromise]);

  return result;
}
