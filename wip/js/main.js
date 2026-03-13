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
  getChartContainer,
  getKey,
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
  amimateChart,
} from "./modules/chart.js";
import {
  showChartMenus,
  showCalloutMenu,
} from "./modules/dialog/chart-callout-.js";
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
  const id = e.target.id;
  if (id && id.startsWith("chart-")) {
    selectDiv("#" + id);
  }
});
window.addEventListener("error", (event) => {
  const message = `Unhandled error. ${event.type}: ${event.message}`;
  console.trace(message);
  showErrorInDash(message);
  Dialog.close();
});
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
    ``,
    ["Load file", "Show demo", "Cancel"],
    "Select to proceed",
  );
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
  return _.createElements({
    span: { class: colorClass, text, "data-title": tooltip },
  });
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

  const callOutWrapper = _.clearHTML(".callout-container");
  const wrapper = _.clearHTML(".chart-container");
  const toc = _.clearHTML("#toc");
  const dropdownTOC = _.clearHTML("#dropdown-toc");
  dropdownTOC.addEventListener("click", () => toggleDropdown());
  const allCounts = getCounts();

  for (const key in allCounts.callouts) {
    const div = _.createElements(
      `<div class="callout" id="callout-${key}">
        <div id="value"></div>
        <hr style="margin:0.5rem">
        <button id="message"></button>
      </div>`,
    );

    const button = _.select("#message", div);
    button.addEventListener("click", () => {
      selectDiv(`#callout-${key}`);
      showCalloutMenu(key, reCreateCharts, scrollToChart);
    });

    callOutWrapper.append(div);
    createCallout(key, allCounts.callouts[key], scrollToChart);
  }

  for (const key in allCounts.counts) {
    const { chartType, chartTitleWithIndex, chartSize } = Param.getParam(
      "chart-properties",
      key,
      true,
    );
    const spanClass = "" + chartSize.toLowerCase();

    const id = getChartId(key);
    // const chartTemplate = _.select("#wrapper-loader .chart");
    const chartTemplate = _.select("#chart-template");
    createChartPlaceholder();
    createTOCentry();

    const data = allCounts.data[key];
    // const memo = allCounts.memo[key]
    drawChart(id, data, chartClick);

    function createChartPlaceholder() {
      const containerId = getChartContainer(key);
      const div = _.createElements(`
      <div class="surface-1 chart ${spanClass}" data-chart-type="${chartType}" id="${containerId}">
        <h4>
          <span>${chartTitleWithIndex}</span>
          <button tabindex="0">&#8942;</button>
        </h4>
        <div id="chart-${key}"></div>
        <div class="tags"></div>
        <div class="chart-footer"></div>
      </div>`);

      _.select("button", div).addEventListener("click", () => {
        selectDiv(`#${containerId}`);
        showChartMenus(id, reCreateCharts, showCharts);
      });
      wrapper.appendChild(div);
    }

    function createTOCentry() {
      const a = {
        a: {
          href: "#" + getChartContainer(key),
          text: chartTitleWithIndex,
        },
      };

      const tocEntry = _.createElements({ div: a });
      toc.appendChild(tocEntry);
      const tocEntryDup = _.createElements(a);

      dropdownTOC.appendChild(tocEntryDup);
      // dropdownTOC.setAttribute("onclick", "toggleDropdown()");
    }
  }
}

async function chartClick(chartId, category) {
  selectDiv("#chart-container" + chartId.replace("chart", ""));
  if (!category) return;
  const allCounts = getCounts();
  const key = getKey(chartId);

  const oneCount = allCounts.counts[key];
  for (const [k, v] of Object.entries(oneCount))
    if (k !== category) v.include = !v.include;

  await countNow(allCounts);
  selectDiv("#chart-container" + chartId.replace("chart", ""));
}
async function chartResetFilter(chartId) {
  let allCounts = getCounts();
  const key = getKey(chartId);
  const oneCount = allCounts[key].counts;

  for (const [k, v] of Object.entries(oneCount)) v.include = true;
  await countNow(allCounts);
}

function menu(action) {
  if (action === "show-toc") {
    toggleDropdown();
    return;
  }

  hideDropdown();
  if (action === "print") {
    //adjust toc for print
    window.print();
    //adjust toc for sceen
    return;
  }

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

  if (action === "smoke-test") {
    smokeTest(loadConfigFile, loadPresetFile, scrollToChart);
    return;
  }

  showErrorInDash(`"${action}" not implemented`);
}

function updateDataSource(sources, names) {
  const dataSource = _.clearHTML("#data-source");
  dataSource.appendChild(createTag(`Data source`, "tag-info"));

  sources.forEach((source, i) => {
    const a = _.createElements({
      span: {
        a: {
          href: source,
          target: "_blank",
          text: names?.[i] ?? filename(source),
          "data-title": "Click to view/download the file",
        },
        class: "tag-info",
      },
    });
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
  const chart = _.select(`#${getChartContainer(key)}`);
  if (!chart) return;
  chart.scrollIntoView(false);
  selectDiv(`#${getChartContainer(key)}`);
}

function selectDiv(selector) {
  const divs = _.selectAll(".selected");
  divs.forEach((div) => {
    div.classList.remove("selected");
  });

  const div = _.select(selector);
  if (!div) return;
  amimateChart(selector, "bar");
  div.classList.add("selected", "flash-border");
  _.sleep(1500).then(() => {
    div.classList.remove("flash-border");
  });
}

/////////////////
function loadFile() {
  showLoadFileDialog({
    header: "Load file",
    loadData: loadNewData,
    loadConfigFile,
  });
}
async function loadNewData(blob, filename) {
  /**
  Data present?	Action
  No	          Load data and create config
  Yes	          Ask if data be loaded
  */
  Logger.clearLogs();
  const config = Param.getParam("config");
  const action = _.isEmptyObject(config)
    ? "Reset Config"
    : await actionOnConfig();
  if (action === "Abort Load") return;
  setLoader("show-progress");
  readyDashboard();
  if (action === "Reset Config") {
    const dataDescription = await Counter.getCountsFromFile(
      _.stringify({ blob }),
    );
    Param.autoCreateConfig(blob, dataDescription);
  }
  if (action === "Keep Config") Param.setParam("config-file", { file: blob });
  updateDataSource([blob], [filename]);
  await countNow();

  adjustMenusDisplay(
    ["show-toc", "configure-dashboard", "save-config", "print"],
    "",
  );
  setLoader("hide");
  async function actionOnConfig() {
    //to do get first row and compare
    const areHeadersSame = false;
    if (areHeadersSame) return "Keep Config";
    return await Dialog.alert(`Config present`, [
      "Keep Config",
      "Reset Config",
      "Abort Load",
    ]);
    return action;
  }
}
/* 
mvp
bug - table showing more that 10 (done: was a bug for new files)
bug - config bar not updating current values (done)
fix tag: table and tag: objcet - to do button highlights (done)

fix callout
add donut to call out
read 2000 record limit on new file
change language for the demo, help text

*/

async function loadConfigFile(fileOrUrl, isSmokeTest = false) {
  if (!fileOrUrl) {
    showErrorInDash(`No input file provided`);
    return;
  }

  const filename = _.stringify(fileOrUrl);

  const [text, fileReadErr] =
    fileOrUrl instanceof File
      ? await readFile(fileOrUrl)
      : typeof fileOrUrl === "string"
        ? await readUrl(fileOrUrl)
        : [null, `Invalid file type. File: ${filename}`];

  if (fileReadErr) {
    showErrorInDash(
      `Cannot read file. File: ${filename}; error: ${fileReadErr}`,
    );
    return;
  }

  const [configs, invalidJsonErr] = _.parse(text);

  if (invalidJsonErr) {
    showErrorInDash(
      `File is not JSON. File: ${filename}; error: ${invalidJsonErr}`,
    );
    return;
  }
  if (isSmokeTest) return configs;
  else loadConfigs(configs);

  async function readFile(file) {
    try {
      const text = await file.text();
      return [text, null];
    } catch (error) {
      return [null, error];
    }
  }
  async function readUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [null, `HTTP error! status: ${response.status}`];
      }
      const text = await response.text();
      return [text, null];
    } catch (error) {
      return [null, error];
    }
  }
}
async function loadConfigs(configs) {
  setLoader("show-progress");
  hideDropdown();
  readyDashboard();

  const [keys, error] = validateConfigs(configs);

  if (error) {
    showErrorInDash(error);
    return;
  }

  if (keys.length === 1) {
    loadAConfig(configs[keys[0]]);
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
  adjustMenusDisplay(["show-toc", "print"], "");
  _.selectAll("#top-nav #preset .menu")[0].click();
}

async function loadAConfig(config, isPreset = false) {
  setLoader("show-progress");
  hideDropdown();
  readyDashboard();

  const [, invalidConfigErr] = validateConfig(config);

  if (invalidConfigErr) {
    showErrorInDash(invalidConfigErr);
    return;
  }
  const { files } = config;
  const isValidFile = files && (await _.isValidFile(files[0]));

  if (isPreset && !isValidFile) {
    showErrorInDash(`Invalid file: ${files[0]}`);
    return;
  }
  Param.setParam("config-replace", { newConfig: config });
  if (!isValidFile) return;
  updateDataSource([files[0]]);
  if (!isPreset)
    adjustMenusDisplay(
      ["show-toc", "configure-dashboard", "save-config", "print"],
      "",
    );
  await countNow();
}
function showErrorInDash(msg, type = "error") {
  Logger.logValues(msg, type);
  Logger.showLogs();
  setLoader("hide");
}

//////////quick test area
// import X from "../xxxx/van-1.6.0.js";
// const { p } = X.tags;
// console.log(typeof p);

// function tryCatch(value, errsToCatch) {
//   try {
//     return [value, null];
//   } catch (error) {
//     return [null, error];
//   }
// }
