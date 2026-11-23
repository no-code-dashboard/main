// import { resolveObjectURL } from "node:buffer";
import { _, getCounts, saveCounts } from "./util.js";
import { chartTypes } from "./chart-types/chart-types.js";

export { Param };
const Param = (function () {
  "use strict";
  // const self = {} // public object - returned at end of module
  let config = {};
  const configs = {};

  function getCountOf(type) {
    if (!type) return 0;
    if (!config) return 0;
    return type === "chart"
      ? config.chartProperties
        ? config.chartProperties.length
        : 0
      : type === "callout"
        ? config.callouts
          ? config.callouts.length
          : 0
        : 0;
  }
  function getChartProps(index, getDefaults) {
    if (!config.chartProperties[index]) return {};

    const chartProps = { ...config.chartProperties[index] };

    const { chartType } = chartProps;
    const defaults = chartTypes[chartType].presets(chartProps);
    chartProps.chartTitleWithIndex =
      (Number(index) + 1).toString() +
      ". " +
      (chartProps.chartTitle ? chartProps.chartTitle : defaults.chartTitle);
    if (getDefaults) {
      for (const d in defaults) if (!chartProps[d]) chartProps[d] = defaults[d];
    }
    return chartProps;
  }
  function arrayMove(arr, from, to) {
    if (from === to) return;
    const l = arr.length;
    if (from < 0 || from >= l) return;
    if (to < 0 || to >= l) return;
    let a = [...arr];
    a[from] = undefined;
    const delta = from < to ? 1 : 0;
    a.splice(to + delta, 0, arr[from]);

    return a.filter((v) => v !== undefined);
  }
  function setChartProps({ index, properties }) {
    // const newValues = { ...chartProps };
    let isUpdated = false;
    const chartProps = config.chartProperties[index];
    // const valuesToUpdate = { ...newValues };

    for (const [key, value] of Object.entries(properties)) {
      //if (chartProps[key] == undefined) continue
      if (chartProps[key] !== value) {
        chartProps[key] = value;
        isUpdated = true;
      }
    }
    if (chartProps.position) delete chartProps.position;
    //to do rename position

    for (const key of Object.keys(chartProps)) {
      if (properties[key] === undefined) delete chartProps[key];
    }

    const position = Number(properties.position) - 1;

    const chartProperties = config.chartProperties;
    const newPositions = arrayMove(
      chartProperties.map((_, i) => i),
      index,
      position,
    );
    if (newPositions) {
      // console.log(index, newPositions);
      //move the chart
      const newcharts = newPositions.map((i) =>
        _.stringify(chartProperties[i]),
      );
      chartProperties.forEach(
        (c, i) => ([chartProperties[i]] = _.parse(newcharts[i])),
      );
      //update callouts
      const callouts = config.callouts;
      if (callouts)
        callouts.forEach((v) => {
          v.chartNumber = newPositions[Number(v.chartNumber)] + "";
        });
      isUpdated = true;
    }

    return isUpdated;
  }
  function removeParam(type, index) {
    if (!type) return false;
    return type === "chart"
      ? removeChart(index)
      : type === "callout"
        ? removeCallOut(index)
        : false;
  }
  function removeChart(index) {
    if (!config.chartProperties) return false;
    if (index < 0) return false;
    const chartProperties = config.chartProperties;
    if (index > chartProperties.length - 1) return false;

    chartProperties.splice(index, 1);
    if (config.callouts)
      config.callouts.forEach((co) => {
        const chartNumber = co.chartNumber;
        if (chartNumber === undefined) return;
        if (chartNumber < index) co.chartNumber = Number(chartNumber) - 1 + "";
      });

    return true;
  }

  function cloneParam(type, index) {
    if (!type) return;
    if (!config.chartProperties) return false;
    if (index < 0) return false;
    const chartProperties = config.chartProperties;
    if (index > chartProperties.length - 1) return false;
    const newValue = JSON.parse(JSON.stringify(chartProperties[index]));

    chartProperties.splice(index, 0, newValue);
    if (config.callouts)
      config.callouts.forEach((co) => {
        const chartNumber = co.chartNumber;
        if (chartNumber === undefined) return;
        if (chartNumber > index) co.chartNumber = Number(chartNumber) + 1 + "";
      });

    return true;
  }

  function removeCallOut(index) {
    if (!config.callouts) return false;
    if (index === undefined) return false;
    if (!config.callouts[index]) return false;
    config.callouts.splice(index, 1);
    return true;
  }

  function getCallOutProps(index) {
    return config.callouts[index];
  }
  function setCalloutProps({ index, properties }) {
    if (!config.callouts) config.callouts = [];
    const _properties = _.cleanObject(properties);

    if (typeof index === "undefined") {
      config.callouts.push(_properties);
      return true;
    }
    if (!config.callouts[index]) return false;
    const position = Number(_properties.position) - 1;
    delete _properties.position;

    const callout = config.callouts[index];
    for (const key in callout) delete callout[key];
    Object.assign(callout, _properties);

    const callouts = config.callouts;
    const newPositions = arrayMove(
      callouts.map((_, i) => i),
      Number(index),
      position,
    );
    if (newPositions) {
      const newCallouts = newPositions.map((i) => _.stringify(callouts[i]));
      callouts.forEach((c, i) => ([callouts[i]] = _.parse(newCallouts[i])));
    }
    return true;
  }
  function autoCreateConfig(file, dataDescription) {
    createDefaultConfig();
    createDefaultchartsXXX();
    createDefaultCallouts();

    function autoType(chartProps) {
      const { dateCount, numberCount, stringCount } =
        dataDescription[chartProps];
      if (dateCount > 0 && numberCount == 0 && stringCount == 0) return "Date";
      if (numberCount > 0 && dateCount == 0 && stringCount == 0)
        return "Number";
      return "String";
    }
    function createDefaultConfig() {
      const today = _.formatDate(new Date());
      config.reportDate = today;
      config.dates = ["report-date", today];
      config.reportTitle = "No-Code Dashboard";
      config.maxValues = "30";
      config.files = [file];
      config.preview = 2000;
    }
    function createDefaultchartsXXX() {
      config.columnNames = [];
      config.columnTypes = [];
      config.callouts = []; //use in future
      config.chartProperties = [];
      const chartProperties = config.chartProperties;
      for (const colName in dataDescription) {
        const chartType = autoType(colName);
        const chartProps = {
          chartSize: "Small",
          countType: "Count",
          chartType: "Bar",
          x_dataType: chartType,
          x_column: colName,
        };
        if (chartProps.x_dataType === "Date") chartProps.x_dateFormat = "MMM";
        if (chartProps.x_dataType === "Number") chartProps.x_bin = "5";

        chartProperties.push(chartProps);
      }
      chartProperties.forEach((v) => {
        config.columnNames.push(v.x_column);
        config.columnTypes.push(v.x_dataType);
      });
      //add table
      chartProperties.push({
        chartType: "Data Table",
        chartSize: "Large",
        rowsToDisplay: "10",
      });
      //add description
      chartProperties.push({
        chartType: "Data Description",
        chartSize: "Large",
      });

      const message =
        "The input has the following data headers (value in bracket indicates chart type assumed):" +
        config.columnNames.reduce(
          (list, column, i) =>
            `${list}\n${i + 1}. ` + `${column} (${config.columnTypes[i]})`,
          "",
        );
      chartProperties.unshift({
        chartType: "Note",
        chartSize: "Small",
        message: message,
      });
    }
    function createDefaultCallouts() {
      config.callouts = [];
      for (let i = 0; i < config.chartProperties.length; i++)
        if (config.chartProperties[i].chartType === "Bar")
          config.callouts.push({
            chartNumber: i + "",
            valueType: "Max",
          });
    }
  }
  function getConfig() {
    return config;
  }
  // if (type === "config-replace") return replaceConfig(newValues);
  function replaceConfig({ newConfig }) {
    if (!newConfig) return false;
    config = structuredClone(newConfig);
    return true;
  }
  // if (type === "config-file") return setConfigFile(newValues);
  function setConfigFile({ file }) {
    if (!file) return false;
    config.files = [file];
  }

  function setConfig(options) {
    const { newConfig } = options;

    if (newConfig) {
      Object.assign(config, newConfig);
      return true;
    }
    let isUpdated = false;
    for (const key in options)
      if (key === "file") {
        config.file = [file];
      } else if (config[key] !== options[key]) {
        config[key] = options[key];
        isUpdated = true;
      }
    function isEqual(one, two) {
      const typeOne = typeof one;
      if (typeOne !== typeof two) return false;
      if (typeOne === "string" || typeOne === "number") return one === two;
      if (typeOne === "object") {
        onestr = JSON.stringify(one);
        twoStr = JSON.stringify(two);
        return oneStr === twoStr;
      }
      return false;
    }
    // function set(one, two) {
    //   let isUpdated = false;
    //   const typeOne = typeof one;
    //   // if (typeOne  !== typeof two) return false
    //   if (typeOne === "string" || typeOne === "number") one = two;
    //   return true;
    //   if (typeOne === "object") {
    //     onestr = JSON.stringify(one);
    //     twoStr = JSON.stringify(two);
    //     return oneStr === twoStr;
    //   }
    //   return false;
    // }
    return isUpdated;

    // if (replace) {
    //   Object.assign(config, newConfig);
    //   return true;
    // }
    // if (!newConfig && !dataDescription) {
    //   config.file = [file];
    //   return;
    // }
    // Object.assign(config, {});
    // Object.assign(config, newConfig);
    // return true;
  }
  function getParam(type, index, getDefaults) {
    if (type === "chart-count") return getCountOf("chart");
    if (type === "callout-count") return getCountOf("callout");
    if (type === "chart-properties") return getChartProps(index, getDefaults);
    if (type === "callouts") return getCallOutProps(index, getDefaults);
    if (type === "config") return getConfig();
    if (type === "dates") return config.dates;
  }
  function setParam(type, newValues) {
    if (type === "chart-properties") return setChartProps(newValues);
    if (type === "callouts") return setCalloutProps(newValues);
    if (type === "config") return setConfig(newValues);
    if (type === "config-replace") return replaceConfig(newValues);
    if (type === "config-file") return setConfigFile(newValues);
  }

  return {
    removeParam,
    cloneParam,
    getParam,
    setParam,
    autoCreateConfig,
  };
})();
