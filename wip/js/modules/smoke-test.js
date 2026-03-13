"use strict";
import { _, getCounts } from "./util.js";
import { getPresetConfig, validateConfigs } from "./preset.js";
import { Dialog } from "./dialog/dialog.js";
import { Param } from "./param.js";
import { configChart } from "./dialog/chart-callout-.js";

export { smokeTest };

let testType = ["charts", "configs"]; //"configs", "charts" , "callouts", "quick"
let duration = testType.includes("quick") ? 300 : 700;
async function smokeTest(loadConfigFile, loadPresetFile, scrollToChart) {
  const startSmoke = new Date();
  console.clear();
  const elements = [{ tag: "h2", label: "Smoke test results" }, { tag: "hr" }];
  await testCharts();
  record();
  await testConfigDialogs();
  record();
  record(
    `Smoke test done(testtype = ${testType.join(", ")}): ${elapsedTime(
      startSmoke,
    )} s`,
  );
  elements.push({ tag: "hr" }, { tag: "button", label: "Close" });
  Dialog.make(elements, { callback, classes: "dialog" }).show();

  function callback({ type, target }) {
    if (type === "click-button") Dialog.close();
  }

  async function testCharts() {
    const configs = await loadConfigFile(`../jsons/demo.json`, true);
    const [keys, configErr] = validateConfigs(configs);
    if (configErr) {
      Dialog.alert("Smoke test aborted: " + configErr);
      return;
    }
    const main = document.querySelector("main");

    for (const key of keys) {
      const startLap = new Date();
      const presetType = key;
      await loadPresetFile(presetType);
      await scrollToEndAndBack(_.select("nav"), _.select("footer"));
      // await _.sleep(duration);
      const numberOfCharts = Param.getParam("chart-count");
      if (false && numberOfCharts) {
        //select random chart
        const randomChart = SelectRandomChart();
        // console.log(randomChart);
        for (let j = 0; j < numberOfCharts; j++) {
          scrollToChart(j);
          await _.sleep(duration);
          if (j === randomChart) {
            await _.sleep(duration);
            filterChart(j);
          }
        }
      }

      record(`Chart for ${presetType} done: ${elapsedTime(startLap)} s`);
      if (!testType.includes("charts")) break;
    }

    function SelectRandomChart() {
      const { chartProperties } = Param.getParam("config");
      if (!chartProperties) return -1;
      const chartCount = chartProperties.length;
      const firstBarChart = chartProperties.findIndex(
        (v) => v.chartType === "Bar",
      );

      if (firstBarChart === -1) return -1;
      let random = Math.floor(Math.random() * chartCount);
      while (chartProperties[random].chartType !== "Bar") {
        // console.log({ random, m: chartProperties.count })
        random++;
        if (random >= chartCount) random = 0;
      }
      return random;
    }
    function filterChart(key) {
      // const cats = getChartCategories(key);
      // const random = Math.floor(Math.random() * cats.length);
      // console.log({ key, cat: cats[random] });
      // chartClick(getChartId(key), cats[random]);
    }
  }
  async function testConfigDialogs() {
    if (!testType.includes("configs")) return;
    const numberOfCharts = 1; //Param.getParam("chart-count");
    for (let j = 0; j < numberOfCharts; j++) {
      const startLap = new Date();
      // scrollToChart(j);
      configChart("chart-" + j);
      await _.sleep(duration);
      // console.log(_.select("dialog"))
      const dialog = _.select("dialog");
      // console.log(dialog,dialog.open)
      const form = _.select("form", dialog);
      // const end = _.selectAll("button", dialog)

      const types = [
        "Bar",
        "Plan",
        "Note",
        "Risk",
        "2X2",
        "State Change",
        "Data Table",
        "Trend",
        "Trend OC",
        "Data Description",
      ];

      for (const type of types) {
        Dialog.test("set", "chartType", type);
        Dialog.test("open");

        // Now the loop will properly pause here until this finishes
        await scrollToEndAndBack(form, form);
      }

      // console.log(dialog.offsetHeight)
      // dialog.scrollBy({ top: 100000, behavior: "smooth" });
      // dialog.scrollTop = dialog.scrollHeight;
      await _.sleep(duration);
      Dialog.close();
      record(`Config for chart ${j} done: ${elapsedTime(startLap)} s`);
    }
  }
  function elapsedTime(start) {
    const end = new Date();
    return Math.round(_.dateTimeDiff(start, end, "Milliseconds") / 1000);
  }
  function record(label) {
    if (!label) {
      elements.push({ tag: "hr" });
      console.log("-------------------------");
      return;
    }
    elements.push({ tag: "p", label });
    console.log(label);
  }
}

async function scrollToEndAndBack(start, end) {
  await _.sleep(duration);
  end.scrollIntoView({ behavior: "smooth", block: "end" });
  await _.sleep(duration);
  start.scrollIntoView({ block: "start", behavior: "smooth" });
  await _.sleep(duration);
}
import { chartTypes } from "./chart-types/chart-types.js";
function validateObjects() {
  const invalids = {};
  for (const ct in chartTypes) {
    console.log(ct);
    const list = [
      "validateChart",
      "chartPlaceholders",
      "chartOverlay",
      "presets",
    ];
    list.forEach((l) => {
      if (!ct[l]) invalids[ct] = l;
    });
  }
  console.log({ invalids });
}
window.__dialogData = () => Dialog.data();
window.__config = () => Param.getParam("config");
window.__OK = () => validateObjects();
window.__allCounts = () => getCounts();
