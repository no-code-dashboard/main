"use strict";
import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "./util.js";
import {
  validatePlan,
  validateForecast,
  validateChartFilter,
  validateAnnotations,
  validateNoteProp,
  validateBarProp,
  validate2x2Prop,
  validateRiskProp,
  validateStateChangeProp,
  validatePlanProp,
  validateTrendProp,
  validateDataDescriptionProp,
  validateDataTableProp,
} from "../modules/validation.js";

/*
Error stategy

definition or config error -used in  dialog and once at init in counter
data error - counter for each record

validate planProps,... chartTypeProps...

*/

// import "https://cdn.jsdelivr.net/npm/papaparse@5.5.3/papaparse.min.js"

//Cannot set properties of undefined
//import * as Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';

//does not provide an export named 'default'
//import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';

// import Papa from 'papaparse'
// import 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';

//no-code-dashboard-12:59

// import { CsvParseStream } from "@std/csv/parse-stream";

async function readColumns(byteStream, step, complete) {
  // const res = await fetch("https://api.example.com/secure-data.csv", {
  //   headers: {
  //     Authorization: "Bearer YOUR_ACCESS_TOKEN",
  //     // or "Authorization": "Basic " + btoa("username:password")
  //   },
  // });

  // if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

  // // Pipe the response body through TextDecoderStream and CsvParseStream
  // const records = res.body
  //   .pipeThrough(new TextDecoderStream())
  //   .pipeThrough(new CsvParseStream({ skipFirstRow: true }));

  // for await (const record of records) {
  //   console.log(record);
  // }

  const reader = byteStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new CsvParseStream({ skipFirstRow: true })) // rows -> { col: value }
    .getReader();

  const result = {};
  while (true) {
    const { done, value: row } = await reader.read();
    if (done) {
      complete();
      break;
    }
    step(row);
    // for (const [col, v] of Object.entries(row)) {
    //   // null-prototype objects so values like "__proto__" are safe as keys
    //   const counts = (result[col] ??= Object.create(null));
    //   counts[v] = (counts[v] || 0) + 1;
    // }
  }
  return reduce(result);
}

import {
  DISPLAY_OTHERS,
  DISPLAY_INVALID,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID_DATE,
  DISPLAY_SPACES,
  DISPLAY_LESS,
  DISPLAY_MORE,
  MAX_BAR_CATS,
  MAX_2X2_CATS,
} from "./common.js"; 

import { dataTypes } from "./data-types.js";
import {
  chartTypes,
  // getParsedValue,
  getCallout,
} from "./chart-types/chart-types.js";

export { Counter };

const Counter = (function () {
  return {
    getFirstRecord, // required?
    getCountsFromFile,
    getChartDataTypes,
    getChartDescription,
  };
})();

const SYMBOL_OTHERS = Symbol(DISPLAY_OTHERS);
const SYMBOL_INVALID = Symbol(DISPLAY_INVALID);
const SYMBOL_INVALID_NUMBER = Symbol(DISPLAY_INVALID_NUMBER);
const SYMBOL_INVALID_DATE = Symbol(DISPLAY_INVALID_DATE);
const SYMBOL_SPACES = Symbol(DISPLAY_SPACES);
const SYMBOL_LESS = Symbol(DISPLAY_LESS);
const SYMBOL_MORE = Symbol(DISPLAY_MORE);

function symbolToDisplay(v) {
  if (typeof v === "symbol") return v.description;
  return v;
}

function getDisplayValue(countType, v) {
  const count = v.count != undefined ? v.count : v.filteredCount;
  const sum = v.sum != undefined ? v.sum : v.filteredSum;

  if (countType.startsWith("Sum")) return sum; //[v.filteredSum, v.totalSum;]

  const av = (count, sum) => (count > 0 ? Number((sum / count).toFixed(1)) : 0);
  if (countType.startsWith("Average")) return av(count, sum);
  //[av(v.filteredCount,v.filteredSum),av(v.totalCount,v.totalSum)]

  return count; //[v.filteredCount, v.totalCount;]
}
async function readCSV(
  resolveValue,
  { file, step, error, complete, preview = 0, token },
) {
  const downloadRequestHeaders = token
    ? {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      }
    : undefined;
  const p = await new Promise((resolve) => {
    Papa.parse(file, {
      delimiter: ",",
      download: true,
      // worker: true,
      header: true,
      skipEmptyLines: true,
      downloadRequestHeaders,
      preview,
      step: (row) => step(row),
      error: (err, file) => {
        resolve({ err });
      },
      complete: (result, file) => {
        resolve(resolveValue);
        complete(result, file);
      },
    });
  });
  return p;
}

function getOrderedValues(chartType, ...args) {
  return chartTypes[chartType]?.orderedValues?.(...args) ?? [];
}

async function getFirstRecord(file) {
  let firstRow;
  return await readCSV(firstRow, {
    file,
    step: (row) => {
      firstRow = row;
    },
    error: (err, file) => console.error({ err, file }),
    complete: () => {
      //resolve(firstRow)
    },
  });
}
function getMin(currentValue, value) {
  return currentValue == null || value < currentValue ? value : currentValue;
}

function getMax(currentValue, value) {
  return currentValue == null || value > currentValue ? value : currentValue;
}
// async function getCountsFromFile(file, config, filter) {
async function getCountsFromFile(inputJSON) {
  let totalRowCounts = 0,
    filteredRowCounts = 0,
    isStartOfFile = true,
    fileError,
    dataDescription = {};

  totalRowCounts = 0;
  filteredRowCounts = 0;
  const { filter, config, blob } = JSON.parse(inputJSON); //comment this
  //Todo deal with multiple files
  const file = blob ? blob : config.files[0]; // comment this

  const preview = config ? config.preview : 2000;
  if (!config) {
    await passOne(file, 0, preview);
    return dataDescription;
  }
  const hasFilterInInput = typeof filter !== "undefined";
  // function hasFilter(x_column) {
  //   const { chartProperties } = config;
  //   const filteredCharts = chartProperties
  //     .map((chart, i) => ({ ...chart, key: i }))
  //     .filter((chart) => chart.x_column === x_column);

  //   let someHaveFilter = false;
  //   const isFalse = (v) => v !== undefined && !v;

  //   for (const chartProps of filteredCharts) {
  //     const count = allCounts.counts[chartProps.key];
  //     for (const cat in count)
  //       if (isFalse(count[cat].include)) someHaveFilter = true;
  //   }
  //   return someHaveFilter;
  // }
  const allCounts = hasFilterInInput
    ? JSON.parse(JSON.stringify(filter))
    : { memo: {}, counts: {}, callouts: {} };

  if (hasFilterInInput) zeroCounters(allCounts);

  const { presetOffsetDays } = config;
  // TO DO too many async awaits - simplify

  ////////////////////////////////////////////////////////////////////////// pass 1
  if (!hasFilterInInput) {
    await passOne(file, presetOffsetDays, preview);
    if (fileError) {
      log(fileError.err, "0", "error");
      return allCounts;
    }
    allCounts.memo.dataDescription = dataDescription;
  }
  clearLog();
  const pass1allCounts = await passTwo(file, allCounts);
  const files = config.files;
  const hasOneFile = file ? true : files.length === 1;
  if (hasOneFile) return pass1allCounts;

  // return await passTwo(files[1], pass1allCounts, true);
  /////////////////////////////////////////////////////////////////
  function passTwo(file, allCounts, secondFile = false) {
    const counts = secondFile ? {} : allCounts;
    const response = /* await */ readCSV(counts, {
      file,
      step: (uncleanRow) => {
        if (uncleanRow.errors.length > 0) {
          console.error(errors);
        }
        const row = cleanRow(uncleanRow.data, presetOffsetDays);
        countRecords(counts, row);
      },
      error: (err, file) => console.error({ err, file }),
      complete: () => {
        wrapUp(counts);
      },
    });
    return response;
  }
  function countRecords(allCounts, row) {
    const isEndOfFile = !row;
    if (isEndOfFile) {
      if (!allCounts.memo.global) allCounts.memo.global = {};

      Object.assign(allCounts.memo.global, {
        totalRowCounts,
        filteredRowCounts,
      });

      for (const key in allCounts.counts) countBasedOnType(key);

      return;
    }
    totalRowCounts++;

    let rowForFilter = config.chartProperties.map((v) => undefined); //.fill(undefined);

    if (totalRowCounts === 1)
      for (const key in rowForFilter) {
        allCounts.counts[key] ||= {};
        allCounts.memo[key] = {};
      }

    for (const key in rowForFilter) countBasedOnType(key, false);

    isStartOfFile = false;

    let includeRowInReport = true;
    for (const key in rowForFilter) {
      const { chartType } = getChartProps(key);
      if (cannotFilter(chartType)) continue;
      const value = rowForFilter[key];
      if (value === undefined) continue;
      if (!allCounts.counts[key][value].include) {
        includeRowInReport = false;
        break;
      }
    }
    if (!includeRowInReport) return;

    filteredRowCounts++;

    for (const key in rowForFilter) {
      if (includeRowInChart(key, row)) countBasedOnType(key, true);
    }
    function getSumValue(key, countColumn) {
      if (!countColumn) return 0;
      const value = row[countColumn];
      if (isNaN(value)) {
        log(`Av/Sum is ${DISPLAY_INVALID_NUMBER}`, key);
        return 0;
      }
      // if (!isValidData(value, "number", "Av/Sum", key)) return 0;
      return Number(value);
    }
    function countTable(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateDataTableProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      if (isEndOfFile) return;
      const { rowsToDisplay } = getChartProps(key);
      if (!isFiltered) return;
      if (Object.keys(oneCount).length >= rowsToDisplay) {
        //delete the middle one
        delete oneCount[filteredRowCounts - Math.round(rowsToDisplay / 2)];
      }
      if (!oneCount[filteredRowCounts])
        oneCount[filteredRowCounts] = { include: true };
      oneCount[filteredRowCounts].filteredValue = row;
    }
    function countDataDescription(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateDataDescriptionProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      function initCounter() {
        for (const key in row) {
          oneCount[key] = {
            include: true,
            spaceCount: 0,
            maxDate: null,
            minDate: null,
            dateCount: 0,
            maxNumber: null,
            totalNumber: 0,
            minNumber: null,
            numberCount: 0,
            maxString: null,
            minString: null,
            stringCount: 0,
          };
        }
      }
      if (isEndOfFile) return;
      if (!isFiltered) return;
      if (filteredRowCounts == 1) initCounter();

      // function getMin(currentValue, value) {
      //   if (currentValue == undefined) return value;
      //   if (currentValue > value) return value;
      //   return currentValue;
      // }

      // function getMax(currentValue, value) {
      //   if (currentValue == undefined) return value;
      //   if (currentValue < value) return value;
      //   return currentValue;
      // }

      for (const [key, value] of Object.entries(row)) {
        const item = value.trim();
        const count = oneCount[key];
        if (item == "") {
          count.spaceCount++;
          continue;
        }
        if (_.isValidDate(item)) {
          count.maxDate = getMax(count.maxDate, item);
          count.minDate = getMin(count.minDate, item);
          count.dateCount++;
          continue;
        }
        if (!isNaN(item)) {
          const n = Number(item);
          count.maxNumber = getMax(count.maxNumber, n);
          count.minNumber = getMin(count.minNumber, n);
          count.totalNumber += n;
          count.numberCount++;
          continue;
        }
        count.maxString = getMax(count.maxString, item);
        count.minString = getMin(count.minString, item);
        count.stringCount++;
      }
    }
    function countPlan(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const chartProps = getChartProps(key);
        const [err] = validatePlanProp(chartProps);
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        } else {
          const { ragMap } = chartProps;
          if (ragMap) memo.ragMap = _.toMap(_.getArray(ragMap.toUpperCase()));
        }
      }
      if (memo.configError) return;
      if (isEndOfFile) return;
      if (!isFiltered) return;
      if (!includeRowInChart(key, row)) return;

      const {
        descriptionCol,
        startDateCol,
        endDateCol,
        secondStartDateCol,
        secondEndDateCol,
        ragCol,
      } = getChartProps(key);

      function createOthers(start, end, secondStart, secondEnd, rag) {
        if (!oneCount[DISPLAY_OTHERS])
          oneCount[DISPLAY_OTHERS] = {
            include: true,
            start,
            end,
            secondStart,
            secondEnd,
            rag: undefined,
          };

        const others = oneCount[DISPLAY_OTHERS];
        if (others.start > start) others.start = start;
        if (others.end < end) others.end = end;
        if (secondStart) {
          if (others.secondStart > secondStart)
            others.secondStart = secondStart;
          if (others.secondEnd < secondEnd) others.secondEnd = secondEnd;
        }
      }
      const desc = row[descriptionCol];
      if (!oneCount[desc]) oneCount[desc] = { include: true };
      const start = _.formatDate(row[startDateCol]);
      const end = _.formatDate(row[endDateCol]);
      const secondStart = _.formatDate(row[secondStartDateCol]);
      const secondEnd = _.formatDate(row[secondEndDateCol]);

      let errorFound = false;
      const setError = (msg) => {
        log("Invalid start date", key);
        errorFound = true;
      };
      if (!_.isValidDate(start)) setError("Invalid start date");

      if (!_.isValidDate(end)) setError("Invalid end date");
      if (secondStart) {
        if (!_.isValidDate(secondStart)) setError("Invalid second start date");
        if (!_.isValidDate(secondEnd)) setError("Invalid second end date");
      }
      if (!errorFound) {
        if (start > end) setError("Start date > end date");
        if (secondStart && secondStart > secondEnd)
          setError("Second start date > end date");
      }
      if (errorFound) return;
      const rag = memo.ragMap?.get(row[ragCol]?.toUpperCase());
      if (Object.keys(oneCount).length > 30) {
        createOthers(start, end, secondStart, secondEnd, rag);
        return;
      }
      Object.assign(oneCount[desc], {
        start,
        end,
        secondStart,
        secondEnd,
        rag,
      });
    }
    function countTrend(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateTrendProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      const chartProps = getChartProps(key);
      const { chartType, trendStartDate, x_column, x1_column, forecast, plan } =
        chartProps;
      if (isStartOfFile) init();
      if (isEndOfFile) {
        memo.totalRowCounts = totalRowCounts;
        memo.filteredRowCounts = filteredRowCounts;
        return;
      }

      if (!isFiltered) return;
      if (!includeRowInChart(key, row)) return;
      const date = row[x_column];
      addCounts({ date, openCount: 1, count: 1 });

      const closeDate = row[x1_column];
      if (closeDate) addCounts({ date: closeDate, closeCount: 1 });

      function addCounts({ date, count, openCount, closeCount }) {
        if (!_.isValidDate(date)) return;
        const chartDate = getNearestMatchingDate(date);
        const dateCount = oneCount[chartDate];
        // if (!dateCount) console.log({ oneCount, date, chartDate });
        dateCount.count += count ?? 0;
        dateCount.open += openCount ?? 0;
        dateCount.close += closeCount ?? 0;
        updateForecast({
          date,
          count: count ? count : openCount - closeCount,
          openCount,
          closeCount,
        });
      }
      function updateForecast({
        date,
        count = 0,
        openCount = 0,
        closeCount = 0,
      }) {
        // const forecast = allCounts.memo[key].forecast;
        const forecast = memo.forecast;
        if (!forecast) return;
        const { cutoffDate } = forecast;
        const dateDiff = _.dateTimeDiff(cutoffDate, date) - 1;
        if (dateDiff >= 0) {
          forecast.count += count;
          forecast.open += openCount;
          forecast.close += closeCount;
          forecast.lookBackValues[dateDiff] += count;
        }
      }
      function getNearestMatchingDate(date) {
        return Object.keys(oneCount).find((d) => date <= d);
        // for (const d in oneCount) {
        //   if (date <= d) return d;
        // }
        // return;
      }
      function init() {
        const { reportDate } = config;
        Object.assign(memo, {
          reportDate,
          count: 0, //to do really required????
          open: 0,
          close: 0,
        });
        const trendEndDate = getMaxDate();
        const dateRange = getOrderedValues(
          "Trend",
          chartProps,
          trendEndDate,
          config,
        );
        dateRange.forEach(
          (v) =>
            (oneCount[v] = {
              include: true,
              open: 0,
              close: 0,
              count: 0,
            }),
        );
        initForecast(forecast, memo);
        initPlan(plan, memo);
        function getMaxDate() {
          const updateMax = (chartProps) => {
            if (!chartProps) return;
            const colMaxDate =
              allCounts.memo.dataDescription[chartProps].maxDate;
            if (maxDate < colMaxDate) maxDate = colMaxDate;
          };
          // const { reportDate } = config
          const { reportDate } = memo;
          let maxDate = reportDate;
          updateMax(x_column);
          updateMax(x1_column);
          updateMax(x_column);
          // get plan end date as well?
          return maxDate;
        }
      }
      function initForecast(forecast, memo) {
        const [error, forecastObj] = validateForecast(forecast, config);

        if (error.length > 0) {
          log(`Invalid forecast`, key);
          return; 
        }
        if (!forecastObj) return;

        const { lookBack, label, placeholder } = forecastObj;
        const { reportDate } = config;
        const cutoffDate = _.addDays(reportDate, -(lookBack - 1));
        memo.forecast = {
          ...forecastObj,
          label: (label, placeholder),
          count: 0,
          open: 0,
          close: 0,
          lookBackValues: new Array(lookBack).fill(0),
          cutoffDate,
        };
      }
      function initPlan(plan, memo) {
        const [error, _plan] = validatePlan(plan, config);
        if (error.length > 0) {
          log(`Invalid plan`, key);
          return;
        }
        if (!_plan) return;
        memo.plan = { ..._plan };
      }
    }
    function update2X2Counts(
      count,
      x,
      y,
      { totalSum = 0, filteredSum = 0, totalCount = 0, filteredCount = 0 },
    ) {
      let xy = x + "|" + y;
      if (!count[xy]) {
        const isTooMany = Object.keys(count).length >= 100;
        if (isTooMany) xy = DISPLAY_OTHERS;
        count[xy] = {
          include: true,
          totalSum: 0,
          filteredSum: 0,
          totalCount: 0,
          filteredCount: 0,
          x: isTooMany ? "<OTHERS>" : x,
          y: isTooMany ? "<OTHERS>" : y,
        };
      }

      count[xy].totalSum += totalSum;
      count[xy].filteredSum += filteredSum;
      count[xy].totalCount += totalCount;
      count[xy].filteredCount += filteredCount;
    }
    function countStateChange(key, oneCount, filtered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateStateChangeProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      //to do make <now> as a parameter
      const { reportDate } = config;
      const { idCol, x_column, y_column, timestampCol } = getChartProps(key);
      if (totalRowCounts === 1) {
        memo.previousState = {};
        readyPrevious({});
        // if (hasFilter(x_column)) console.log(`Filter: ${x_column}`);
        // if (hasFilter(y_column)) console.log(`Filter: ${y_column}`);
        // if (hasFilter(timestampCol)) console.log(`Filter: ${timestampCol}`);
      }
      const prev = memo.previousState;
      if (isEndOfFile) {
        calculatePrevious();
        return;
      }
      if (!filtered) return;
      if (!includeRowInChart(key, row)) return;

      const id = row[idCol].trim();
      const to = row[x_column].trim();
      const from = row[y_column].trim();
      let timestamp = row[timestampCol];

      if (!_.isValidDate(timestamp)) {
        log(`timestamp is ${DISPLAY_INVALID_DATE}`, key);
        timestamp = 0;
      }
      // if (prev.id && id < prev.id)
      //     log(`Id not in ascending order ${id} ${prev.id}`, key)

      if (id !== prev.id) calculatePrevious();
      else calculateCurrent();
      readyPrevious({ id, to, from, timestamp });

      function readyPrevious({ id = "", to = "", from = "", timestamp = 0 }) {
        const prev = memo.previousState;
        Object.assign(prev, { id, to, from, timestamp });
      }
      function calculatePrevious() {
        const prev = memo.previousState;
        if (prev.to) {
          const delta = _.dateTimeDiff(prev.timestamp, reportDate, "Days");
          if (delta < 0) log(`Timestamp not in ascending order`, key);
          update2X2Counts(oneCount, "<Now>", prev.to, {
            filteredCount: 1,
            filteredSum: delta,
          });
        }
      }
      function calculateCurrent() {
        const prev = memo.previousState;
        if (prev.to) {
          if (prev.to !== from) log(`"from" not same as previous "to"`, key);
          const delta = _.dateTimeDiff(prev.timestamp, timestamp, "Days");
          update2X2Counts(oneCount, to, from, {
            filteredCount: 1,
            filteredSum: delta,
          });
          if (delta < 0) log(`Timestamp not in ascending order`, key);
        }
      }
    }
    function count2X2(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validate2x2Prop(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      if (isEndOfFile) {
        return;
      }
      if (!includeRowInChart(key, row)) return;
      const { colOver, x_column, y_column } = getChartProps(key);

      const sum = colOver ? getSumValue(key, colOver) : 0;

      update2X2Counts(oneCount, row[x_column], row[y_column], {
        totalSum: !isFiltered ? sum : 0,
        filteredSum: isFiltered ? sum : 0,
        totalCount: !isFiltered ? 1 : 0,
        filteredCount: isFiltered ? 1 : 0,
      });
    }
    function countRisk(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateRiskProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      if (isEndOfFile) return;

      if (isStartOfFile) {
        const { x_map, y_map } = getChartProps(key);
        const xMap = _.toMap(_.getArray(x_map));
        const yMap = _.toMap(_.getArray(y_map));
        console.log({ xMap, yMap });
        memo.xMap = xMap;
        memo.yMap = yMap;
      }
      const { xMap, yMap } = memo;
      if (!includeRowInChart(key, row)) return;
      const { colOver, x_column, y_column } = getChartProps(key);
      const sum = getSumValue(key, colOver);
      const x = xMap.get(row[x_column].trim());
      const y = yMap.get(row[y_column].trim());
      if (x === undefined) log("Horizontal map incorrect", key);
      if (y === undefined) log("Vertical map incorrect", key);
      update2X2Counts(oneCount, x, y, {
        totalSum: !isFiltered ? sum : 0,
        filteredSum: isFiltered ? sum : 0,
        totalCount: !isFiltered ? 1 : 0,
        filteredCount: isFiltered ? 1 : 0,
      });
    }
    function countBar(key, oneCount, isFiltered) {
      const memo = allCounts.memo[key];
      if (isStartOfFile) {
        const [err] = validateBarProp(getChartProps(key));
        if (err.length > 0) {
          log("Error in config", key);
          console.error("Error in config:", _.stringify(err));
          memo.configError = true;
        }
      }
      if (memo.configError) return;
      const {
        countType,
        colOver,
        x_column,
        x_dataType,
        x_bin,
        x_categories,
        x_dateFormat,
        x_separator,
      } = getChartProps(key);
      // if (totalRowCounts === 1 && !isFiltered) init()
      if (isStartOfFile) init();

      if (isEndOfFile) return;

      if (!x_column || row[x_column] === undefined) {
        log(`Invalid x_column ${x_column}`, key);
        return;
      }
      // if (!isValidData(row[x_column], "any", x_column, key)) return;
      updateCounts();

      // function wrapUp() {}
      function init() {
        if (x_bin) {
          const binCount = Number(x_bin.trim());
          if (isNaN(binCount)) memo.bin = _.cleanArray(x_bin, "Number");
          else {
            const { maxNumber, minNumber } =
              allCounts.memo["dataDescription"][x_column];
            const max = Math.round(maxNumber);
            const min = Math.floor(minNumber);
            const rawStep = (max - min) / (binCount + 1);
            if (rawStep < 10) {
              memo.bin = [min, max];
            } else {
              const step = Math.round(rawStep);
              memo.bin = [min];
              for (let i = 1; i < binCount; i++) memo.bin.push(min + i * step);
              memo.bin.push(max);
            }
          }
        }
        if (x_categories) memo.order = x_categories;
        if (x_dateFormat) {
          memo.dateFormat = x_dateFormat;
          memo.reportDate = config.reportDate;
        }
        if (x_separator) memo.separator = x_separator;
        return memo;
      }
      function updateCounts() {
        if (!oneCount) oneCount = {};
        const maxCats = 2 * MAX_BAR_CATS;
        const v = dataTypes[x_dataType].getFormattedValue(row[x_column], memo);

        if (x_dataType == "List Members") {
          if (_.isArray(v)) v.forEach((lm) => countAValue(lm));
          rowForFilter[key] = undefined;
          return;
        }

        rowForFilter[key] = countAValue(v);

        function countAValue(originalCat) {
          const cat = oneCount[originalCat]
            ? originalCat
            : Object.keys(oneCount).length < maxCats
              ? originalCat
              : SYMBOL_OTHERS; //DISPLAY //_OTHERS

          if (cat === SYMBOL_OTHERS)
            //_OTHERS)
            log(`Over ${maxCats} categories`, key);

          if (!oneCount[cat])
            oneCount[cat] = {
              include: true, // true mean include in counts
              totalSum: 0, // if sum/ave then sum without filter
              filteredSum: 0, // if sum/ave then sum when filtered
              totalCount: 0, // count without filter
              filteredCount: 0, // count when filtered
            };
          if (includeRowInChart(key, row)) {
            const sum = getSumValue(key, colOver);
            if (!isFiltered) {
              oneCount[cat].totalCount++;
              oneCount[cat].totalSum += sum;
            }
            if (isFiltered) {
              oneCount[cat].filteredCount++;
              oneCount[cat].filteredSum += sum;
            }
          }
          return cat;
        }
      }
    }
    function countBasedOnType(key, isFiltered) {
      const oneCount = allCounts.counts[key];
      const { chartType } = getChartProps(key);
      switch (chartType) {
        case "Bar":
          countBar(key, oneCount, isFiltered);
          break;
        case "Data Description":
          countDataDescription(key, oneCount, isFiltered);
          break;
        case "Data Table":
          countTable(key, oneCount, isFiltered);
          break;
        case "Note":
          break;
        case "Plan":
          countPlan(key, oneCount, isFiltered);
          break;
        case "Risk":
          countRisk(key, oneCount, isFiltered);
          break;
        case "2X2":
          count2X2(key, oneCount, isFiltered);
          break;
        case "State Change":
          countStateChange(key, oneCount, isFiltered);
          break;
        case "Trend":
          countTrend(key, oneCount, isFiltered);
          break;
        default:
          console.error(`Invalid chartType: ${chartType}`);
      }
    }
  }
  function wrapUp(allCounts) {
    countRecords(allCounts);
    makeChartData(allCounts, config);
    makeCallOuts(allCounts, config);
  }
  function getChartProps(index) {
    const chartProps = config?.chartProperties?.[index];
    if (!chartProps) {
      log(`Invalid call to getChartProps; index= ${index}`, undefined, "error");
      return;
    }
    return chartProps;
  }
  function zeroCounters(allCounts) {
    for (const key in allCounts.counts) {
      const { chartType } = getChartProps(key);

      if (["2X2", "Risk", "Bar"].includes(chartType)) {
        // for (const v of Object.values(allCounts.counts[key])) {
        //   v.totalSum = 0;
        //   v.filteredSum = 0;
        //   v.totalCount = 0;
        //   v.filteredCount = 0;
        // }
        for (const v of Object.values(allCounts.counts[key])) {
          Object.assign(v, {
            totalSum: 0,
            filteredSum: 0,
            totalCount: 0,
            filteredCount: 0,
          });
        }
        continue;
      }
      if (chartType === "Trend") {
        for (const v of Object.values(allCounts.counts[key])) {
          v.open = 0;
          v.close = 0;
          v.count = 0;
        }
        continue;
      }
      allCounts.counts[key] = {};
    }
  }
  function clearLog() {
    for (const key in allCounts.memo)
      if (allCounts.memo[key].log) delete allCounts.memo[key].log;
  }
  function log(message, key, severity = "warning") {
    logMessage(message, severity, key, allCounts, filteredRowCounts);
  }
  function gatherDataDescription(row, descriptions) {
    function initCounter() {
      for (const key in row)
        descriptions[key] = {
          spaceCount: 0,
          maxDate: null,
          minDate: null,
          dateCount: 0,
          maxNumber: null,
          minNumber: null,
          numberCount: 0,
          maxString: null,
          minString: null,
          stringCount: 0,
        };
    }

    if (_.isEmptyObject(descriptions)) initCounter();

    for (const [key, value] of Object.entries(row)) {
      const item = value.trim();
      const description = descriptions[key];

      if (item == "") {
        description.spaceCount++;
        continue;
      }
      //description["date"].count...
      if (_.isValidDate(item)) {
        description.maxDate = getMax(description.maxDate, item);
        description.minDate = getMin(description.minDate, item);
        description.dateCount++;
        continue;
      }
      if (!isNaN(item)) {
        description.maxNumber = getMax(description.maxNumber, Number(item));
        description.minNumber = getMin(description.minNumber, Number(item));
        description.numberCount++;
        continue;
      }
      description.maxString = getMax(description.maxString, item);
      description.minString = getMin(description.minString, item);
      description.stringCount++;
    }
  }
  function cleanRow(uncleanRow, presetOffsetDays) {
    const modifiedDate = (date) => {
      const newDate = presetOffsetDays
        ? _.addDays(date, presetOffsetDays)
        : date;
      return _.formatDate(newDate, "YYYY-MM-DD");
    };
    const row = {};
    for (const key in uncleanRow) {
      const cell = uncleanRow[key].trim();
      if (_.isValidDate(cell)) row[key] = modifiedDate(cell);
      else row[key] = cell;
    }
    return row;
  }
  async function passOne(file, presetOffsetDays, preview) {
    dataDescription = {};
    const p = await readCSV(
      // preview,
      { complete: true },
      {
        file,
        step: (row) => {
          const cleanedRow = cleanRow(row.data, presetOffsetDays);
          gatherDataDescription(cleanedRow, dataDescription);
        },
        complete: (result, file) => {
          //resolve(true)
        },
      },
    );
    if (p.complete) return;
    fileError = p;
  }
  function includeRowInChart(key, row) {
    const memo = allCounts.memo[key];
    if (totalRowCounts === 1) init();
    return memo.chartFilter ? filterAction(key, row) : true;

    function init() {
      const { chartFilter, chartType } = getChartProps(key);

      if (!chartFilter) return;
      const [errs, conditions] = validateChartFilter(chartFilter);
      if (errs.length > 0) {
        log("Invalid chart filter", key);
        return;
      }
      if (!conditions) return;
      memo.chartFilter = conditions;
    }
    function filterAction(key, row) {
      const { chartFilter } = allCounts.memo[key];
      const results = chartFilter.map((condition) => {
        const [join, columnName, op, operand] = condition;
        return {
          met: getConditionResult(row, { columnName, op, operand }),
          join,
        };
      });

      // let whereConditionMet = true;
      // for (let i = 0; i < results.length; i++) {
      //   const { met, join } = results[i];
      //   if (i === 0) whereConditionMet = met;
      //   else {
      //     if (join === "and") whereConditionMet &&= met;
      //     else whereConditionMet ||= met;
      //   }
      // }

      const isConditionMet = results.reduce((acc, { met, join }, i) => {
        if (i === 0) return met;
        return join === "and" ? acc && met : acc || met;
      }, true);

      return isConditionMet;
    }
  }

  function cannotFilter(chartType) {
    return chartTypes[chartType]?.cannotFilter || false;
  }
  // function isValidData(value, dataType, prefix, key = "global") {
  //   if (value == undefined) {
  //     log(`Column: "${prefix}" missing`, key, "error");
  //     return false;
  //   }

  //   if (typeof dataType !== "string") {
  //     log(`Data type not string`, key, "error");
  //     return false;
  //   }

  //   const dataTypeTlc = dataType.trim().toLowerCase();
  //   if (dataTypeTlc == "number")
  //     if (isNaN(value)) {
  //       log(`${prefix} is ${DISPLAY_INVALID_NUMBER}`, key);
  //       return false;
  //     }
  //   if (dataTypeTlc == "date")
  //     if (!_.isValidDate(value)) {
  //       log(`${prefix} is ${DISPLAY_INVALID_DATE}`, key);
  //       return false;
  //     }
  //   return true;
  // }
}

/////////// chartTypes functions
function getChartDescription() {
  const chartDescription = {};
  for (const key in chartTypes) {
    chartDescription[key] = {
      cannotFilter: chartTypes[key].cannotFilter,
      isChart: true,
    };
  }
  chartDescription.dateFormats = dataTypes["Date"].formats;
  return chartDescription;
}
function getChartDataTypes() {
  return JSON.stringify({ dataTypes, chartTypes });
}
//////////////////////////////////////chartTypes functions
function logMessage(message, severity, key, allCounts, filteredRowCounts) {
  const memo = (allCounts.memo[key] ||= {});
  // const memo = allCounts.memo[key];
  // if (!memo.log) memo.log = {};
  // const memoLog = memo.log;
  const memoLog = (memo.log ??= {});
  if (!memoLog[message]) {
    memoLog[message] = { first: filteredRowCounts, count: 0 };
    if (severity === "error" || severity === "severe")
      console.error({ message, severity, key, allCounts });
    if (severity === "severe") console.trace();
  }
  const ml = memoLog[message];
  ml.severity = severity;
  ml.last = filteredRowCounts;
  ml.count++;
}
function makeChartData(allCounts, config) {
  allCounts.data = {};
  for (let i = 0; i < config.chartProperties.length; i++) {
    allCounts.data[i] = dataForChart(i);
  }

  function dataForChart(i) {
    const oneCount = allCounts.counts[i];
    const chartProps = config.chartProperties[i];
    const memo = allCounts.memo[i];
    const { countType, chartType } = chartProps;
    if (chartType === "Note") return;
    if (chartType === "Barxx") {
      // x_sortOn : category | value, x_sortOrder: ascending | descending
      //available only for dataType = String or number without bin
      const { x_dataType } = chartProps;
      const cats = memo ? dataTypes[x_dataType].getCategories(memo) : [];

      const specialCats = [
        DISPLAY_SPACES,
        DISPLAY_INVALID_DATE,
        DISPLAY_INVALID_NUMBER,
        SYMBOL_OTHERS,
      ];
      const getAllCounts = (v) =>
        oneCount[v]
          ? [
              oneCount[v].filteredCount,
              oneCount[v].filteredCount,
              oneCount[v].totalCount,
              oneCount[v].totalSum,
            ]
          : [0, 0, 0, 0];
      const mustCats = cats.map((v) => {
        const [count, sum, totalCount, totalSum] = getAllCounts(v);
        return { x: v, count, sum, totalCount, totalSum };
      });

      const specials = specialCats
        .map((v) => {
          const [count, sum, totalCount, totalSum] = getAllCounts(v);
          return { x: symbolToDisplay(v), count, sum, totalCount, totalSum };
        })
        .filter((v) => v.count > 0);

      const optionals = Object.keys(oneCount)
        .filter((v) => !(specialCats.includes(v) || cats.includes(v)))
        .map((v, i) => {
          const [count, sum, totalCount, totalSum] = getAllCounts(v);
          return { x: v, count, sum, totalCount, totalSum };
        });

      const { x_sortOn = "v", x_sortOrder = "a" } = chartProps; //TODO parametrise ths

      const getSortKey = () => {
        if (x_sortOn === undefined || x_sortOn === "none" || x_sortOn === "")
          return "";
        if (x_sortOn === "cat") return "x";
        if (countType === "Count") return "totalCount";
        if (countType === "Sum") return "totalSum";
        return (d) => (d.totalCount > 0 ? d.totalSum / d.totalCount : 0);
      };

      const sortKey = getSortKey();

      const sortedOptionals =
        sortKey === ""
          ? [...optionals]
          : _.sortArrayOrObjects(optionals, {
              key: sortKey,
              order: x_sortOrder,
            });

      const optionalCount = sortedOptionals.length;

      const maxOptionals = MAX_BAR_CATS - (cats.length + specials.length);

      if (optionalCount > maxOptionals) {
        const others = { x: DISPLAY_OTHERS, count: 0, sum: 0 };
        const countToRemove = optionalCount - maxOptionals;
        let countOfRemoved = 0;

        for (let i = optionalCount - 1; i >= 0; i--) {
          const so = sortedOptionals[i];
          if (countOfRemoved >= countToRemove) break;
          others.count += so.count;
          others.sum += so.sum;
          countOfRemoved++;
          so.remove = true;
        }
        //update the others
        const othersInSpecialsIndex = specials.findIndex(
          (v) => v.x === DISPLAY_OTHERS,
        );
        if (othersInSpecialsIndex != -1) {
          const existingOthers = specials[othersInSpecialsIndex];

          existingOthers.count += others.count;
          existingOthers.sum += others.sum;
        } else specials.push(others);
      }
      function getDisplayValue(countType, v) {
        if (countType.startsWith("Sum")) return [v.sum, v.totalSum];
        if (countType.startsWith("Count")) return [v.count, v.totalCount];

        const av = (count, sum) =>
          count > 0 ? Number((sum / count).toFixed(1)) : 0;
        return [av(v.sum, v.filteredSum), av(v.count, v.totalSum)];
      }
      const data = [
        ...mustCats,
        ...sortedOptionals.filter((v) => !v.remove),
        ...specials,
      ].map((d) => {
        const [v, vTot] = getDisplayValue(countType, d);
        return { x: d.x, v, vTot }; //v: getDisplayValue(countType, d) };
      });
      return { data };
    }
    /* 
    Some likely bugs I found along the way:

    sum is set to filteredCount. The original getAllCounts returned filteredCount twice, so sum always equals count. I preserved that, but I suspect it should be oneCount[v].filteredSum. Change it in toRow if so.
    The average branch of getDisplayValue was broken. It called av(v.sum, v.filteredSum) and av(v.count, v.totalSum), with the arguments in the wrong order and referencing a property that doesn’t exist on these rows, so it returned 0 or NaN. I rewrote it as sum / count for the filtered value and totalSum / totalCount for the total. This does change the output, but it matches the sort-key average.
    The “Others” row never had totalCount/totalSum. vTot would have come out undefined or NaN for it, so I now accumulate those too.
    */
    if (chartType === "Bar") {
      const SPECIAL_CATS = [
        DISPLAY_SPACES,
        DISPLAY_INVALID_DATE,
        DISPLAY_INVALID_NUMBER,
        SYMBOL_OTHERS,
      ];

      const average = (sum, count) =>
        count > 0 ? Number((sum / count).toFixed(1)) : 0;

      function getDisplayValue(countType, d) {
        if (countType.startsWith("Sum")) return [d.sum, d.totalSum];
        if (countType.startsWith("Count")) return [d.count, d.totalCount];
        return [average(d.sum, d.count), average(d.totalSum, d.totalCount)];
      }

      function getSortKey(sortOn, countType) {
        if (!sortOn || sortOn === "none") return null;
        if (sortOn === "cat") return "x";
        if (countType === "Count") return "totalCount";
        if (countType === "Sum") return "totalSum";
        return (d) => (d.totalCount > 0 ? d.totalSum / d.totalCount : 0);
      }

      {
        // x_sortOn: cat | value, x_sortOrder: ascending | descending
        // available only for dataType = String or number without bin
        const { x_dataType, x_sortOn = "v", x_sortOrder = "a" } = chartProps;
        const cats = memo ? dataTypes[x_dataType].getCategories(memo) : [];

        const toRow = (key, x = key) => {
          const c = oneCount[key];
          return {
            x,
            count: c?.filteredCount ?? 0,
            sum: c?.filteredCount ?? 0, // see note 1
            totalCount: c?.totalCount ?? 0,
            totalSum: c?.totalSum ?? 0,
          };
        };

        const mustCats = cats.map((v) => toRow(v));

        const specials = SPECIAL_CATS.map((v) =>
          toRow(v, symbolToDisplay(v)),
        ).filter((r) => r.count > 0);

        const optionals = Object.keys(oneCount)
          .filter((v) => !SPECIAL_CATS.includes(v) && !cats.includes(v))
          .map((v) => toRow(v));

        const sortKey = getSortKey(x_sortOn, countType);
        const sortedOptionals = sortKey
          ? _.sortArrayOrObjects(optionals, {
              key: sortKey,
              order: x_sortOrder,
            })
          : optionals;

        // Anything beyond the bar limit is folded into "Others"
        const maxOptionals = Math.max(
          0,
          MAX_BAR_CATS - (cats.length + specials.length),
        );
        const keptOptionals = sortedOptionals.slice(0, maxOptionals);
        const removed = sortedOptionals.slice(maxOptionals);

        if (removed.length) {
          const others =
            specials.find((s) => s.x === DISPLAY_OTHERS) ??
            specials[
              specials.push({
                x: DISPLAY_OTHERS,
                count: 0,
                sum: 0,
                totalCount: 0,
                totalSum: 0,
              }) - 1
            ];

          for (const r of removed) {
            others.count += r.count;
            others.sum += r.sum;
            others.totalCount += r.totalCount;
            others.totalSum += r.totalSum;
          }
        }

        const data = [...mustCats, ...keptOptionals, ...specials].map((d) => {
          const [v, vTot] = getDisplayValue(countType, d);
          return { x: d.x, v, vTot };
        });

        return { data };
      }
    }
    if (chartType == "Data Table") {
      const data = [],
        labels = [];

      for (const key in oneCount) {
        labels.push(key);
        data.push({ "#": key, ...oneCount[key].filteredValue });
      }
      return { labels, data };
    }
    if (chartType == "Data Description") {
      let data = [],
        labels = [];
      const headers = {
        spaceCount: "Spaces: #",
        stringCount: "Strings: #",
        maxString: "String: Max",
        minString: "String: Min",
        dateCount: "Date: #",
        maxDate: "Date: Max",
        minDate: "Date: Min",
        numberCount: "Number: #",
        maxNumber: "Number: Max",
        minNumber: "Number: Min",
      };

      for (const head of Object.keys(headers)) {
        const entry = {};
        entry["Attributes"] = headers[head];
        for (const key of Object.keys(oneCount)) {
          entry[key] = oneCount[key][head] ?? "";
        }
        data.push(entry);
        labels.push(i++);
      }
      return { labels, data };
    }
    if (chartType == "2X2" || chartType == "State Change") {
      const { x_categories, y_categories, countLabels } = chartProps;

      const data = Object.keys(oneCount).map((key) => ({
        x: oneCount[key].x,
        y: oneCount[key].y,
        // ...oneCount[v],
        // fill: fill(displayValue(key)),
        v: getDisplayValue(countType, oneCount[key]),
      }));
      const extent = d3Extent(data, (d) => d.v);
      const xDomain = x_categories ? _.getArray(x_categories) : [];
      const yDomain = y_categories ? _.getArray(y_categories) : [];
      const countDomain = _.getArray(countLabels);
      data.forEach((v) => {
        if (!xDomain.includes(v.x)) xDomain.push(v.x);
        if (!yDomain.includes(v.y)) yDomain.push(v.y);
        v.fill = fill(v.v);
      });
      const domain = { countDomain, xDomain, yDomain };
      return { domain, data };

      function fill(d) {
        const min = extent[0];
        const step = (extent[1] - min) / (countDomain.length - 1);
        const index = Math.floor((d - min) / step);
        return countDomain[index];
      }
    }
    if (chartType == "Risk") {
      const { countLabels } = chartProps;
      const { xMap, yMap } = memo;
      const xDomain = [...xMap.values()];
      const yDomain = [...yMap.values()];
      const countDomain = _.getArray(countLabels);

      const val = (x, map) => {
        let i = 0;
        for (const val of map.values()) {
          if (val === x) return i;
          i++;
        }
        return 5;
      };

      const colorValue = (count) => {
        const value = val(count.x, xMap) * val(count.y, yMap);
        if (value <= 2) return countDomain[0];
        if (value <= 6) return countDomain[1];
        if (value <= 9) return countDomain[2];
        if (value <= 12) return countDomain[3];
        return countDomain[4];
      };
      const data = Object.keys(oneCount).map((key) => ({
        x: oneCount[key].x,
        y: oneCount[key].y,
        fill: colorValue(oneCount[key]),
        v: getDisplayValue(countType, oneCount[key]),
      }));
      const domain = {
        countDomain,
        xDomain,
        yDomain: yDomain.reverse(),
      };
      return { domain, data };
    }
    if (chartType === "Plan") {
      return { labels: [], data: oneCount };
    }
    if (chartType == "Trend") {
      const { x_label, aggrateType, x1_column } = chartProps;
      const isCumulative = aggrateType && aggrateType === "cumulative"; //to do allow for false
      let cumulativeCount = 0;
      const data = Object.keys(oneCount).map((date) => {
        const count = x1_column
          ? oneCount[date].open - oneCount[date].close
          : oneCount[date].count;
        cumulativeCount += count;
        return {
          x: new Date(date),
          v: isCumulative ? cumulativeCount : count,
          type: x_label,
        };
      });
      const domain = { timeline: x_label };
      addPlan(data);
      addForecast(data);
      return { domain, data };

      function addPlan(plotData) {
        if (!memo?.plan) return;
        const {
          startDate,
          endDate,
          scopeFrom,
          scopeTo,
          points,
          label,
          placeholder,
        } = memo.plan;
        const labelToShow = label || placeholder;
        const to = scopeTo === "max" ? memo.filteredRowCounts : scopeTo;
        const deltaScope = to - scopeFrom;
        const dateSteps =
          _.dateTimeDiff(startDate, endDate, "Days") / (points.length - 1);
        for (let i = 0; i < points.length; i++) {
          const x = _.addDays(startDate, Math.round(i * dateSteps));
          const v = Math.round(scopeFrom + deltaScope * points[i]);
          plotData.push({ x, v, type: labelToShow });
        }
        domain.plan = labelToShow;
      }
      function addForecast(plotData) {
        if (!memo?.forecast) return;
        const {
          count,
          lookBack,
          lookBackValues,
          cutoffDate,
          forecastTo,
          label,
        } = memo.forecast;

        if (isNaN(lookBack) || Number(lookBack) <= 0) return;

        let slope = count / lookBack;
        // const intercept = value - slope * valueAtPoint // the point matches actual
        // const intercept = (cumSum -count) - slope * 0 //first point matches actual
        const intercept = cumulativeCount - slope * (lookBackValues.length - 1); //last point matches actual
        // const intercept =
        //     cumSum - count / 2 - (slope * (lookBackValues.length - 1)) / 2 //mid point matches actual
        const { filteredRowCounts } = memo;
        const linear = { slope, intercept };

        const forecastStart = {
          x: new Date(cutoffDate),
          v: cumulativeCount - count,
          type: label,
        };
        const endX = getX(filteredRowCounts, linear);
        let endXModified = endX;
        const fallback = 100;
        if (endX > 0 && endX > fallback) {
          logMessage(
            `Forecast limited to ${fallback} days`,
            "warning",
            i,
            allCounts,
            0,
          );
          endXModified = fallback;
        }
        const endPoint = () => {
          const endDate =
            forecastTo === "max"
              ? _.addDays(cutoffDate, endXModified)
              : _.isValidDate(forecastTo)
                ? forecastTo
                : _.addDays(cutoffDate, forecastTo);

          const endCount =
            forecastTo === "max"
              ? filteredRowCounts
              : getY(_.dateTimeDiff(cutoffDate, endDate), linear);

          return {
            x: new Date(endDate),
            v: Math.round(endCount),
            type: label,
          };
        };

        plotData.push(forecastStart);
        plotData.push(endPoint());

        domain.forecast = label;
        function getY(x, { intercept, slope }) {
          return intercept + slope * x;
        }
        //TODO check if the forecast end is too far away
        function getX(y, { intercept, slope }) {
          const delta = y - intercept;
          if (slope === 0) return delta > 0 ? Infinity : -Infinity;
          const x = delta / slope;
          return x;
        }
      }
    }
  }
}
function makeCallOuts(allCounts, config) {
  allCounts.callouts = {};
  const { callouts } = config;
  if (!callouts) return;
  for (let i = 0; i < callouts.length; i++) {
    const chartNumber = callouts[i].chartNumber;
    const chartProps = config.chartProperties[chartNumber];
    const data = allCounts.data[chartNumber]?.data;

    const callout = getCallout(config.callouts[i], chartProps, data, config);
    allCounts.callouts[i] = callout;
  }
}

//export $p

//////////////////////////////////////////////////// allCounts current
// allCounts =  {memo, counts}
// memo = {dataDescription, {0: value}, {1: value}, ...}
// counts = {0: oneCount, 1: oneCount, ...}
// oneCount =
// {
//      cat1: {
//          include: true|false,
//          totalSumV: sum of column over without filter
//          filteredSum: sum of column over with filter
//          totalCount: count of records without filter
//          filteredCount: count of records with filter
//      }
//      cat2: {...},
//      ....
// }

//////////////////////////////////////////////////// allCounts proposed
// counts =  {global: memoCount, 0: memoCount, 1: memoCount, ...}
// memoCount = {memo: {}, count: oneCount}
// oneCount =
// {
//      cat1: {
//          include: true|false,
//          totalSumV: sum of column over without filter
//          filteredSum: sum of column over with filter
//          totalCount: count of records without filter
//          filteredCount: count of records with filter
//      }
//      cat2: {...},
//      ....
// }

///////////////////////////////////////////////////// remove $p comments

///////////////////////////////////////////////////////////// values in memo
// dataDescription (filtered and raw)
//  chartType   types of data in memo
//  trend       forecast, start, end
//  number      bin
//  date
//

///////////////////////////////////////////
// d3.linearRegression
//https://observablehq.com/@harrystevens/linear-regression
//d3.regressionLinear().x(d=> d).y((_,i)=>i)(data)
//data = [125, 2, 2, 0, 2, 1, 2, 0, 1, 1, 1, 2, 2, 2]
// a: -3.5142857142857142, b: 33.05714285714286
// {slope: -3.51, intercept: 36.54}
//test_linearRegression([1,0,2,0,3])
//{slope: 0.4, intercept: -0}
// a: 0.40000000000000013, b: 0.3999999999999997

//TODO implement regression
//Function to perform linear regression FROM CHAT GPT
function linearRegression(data) {
  // Calculate mean of x and y values
  const n = data.length;
  let sumX = 0,
    sumY = 0;

  for (let i = 0; i < n; i++) {
    sumX += i + 1;
    sumY += data[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  // Calculate coefficients
  let numerator = 0,
    denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1 - meanX) * (data[i] - meanY);
    denominator += Math.pow(i + 1 - meanX, 2);
  }
  const slope = Math.round((100 * numerator) / denominator) / 100;
  const intercept = Math.round(100 * (meanY - slope * meanX)) / 100;
  return [slope, intercept];
}
function testLr(
  data = [246, 248, 250, 251, 252, 253, 253, 255, 256, 258, 258, 260, 262, 387],
) {
  return linearRegression(data);
}
function getConditionResult(row, { columnName, op, operand }) {
  const OPERATORS = {
    eq: (a, b) => a === b,
    not_eq: (a, b) => a !== b,
    in: (a, b) => b.includes(a),
    not_in: (a, b) => !b.includes(a),
  };

  const NUMERIC_FLAG = "(n)";

  function toComparable(value, asNumber) {
    if (asNumber) {
      // Number(null) and Number("") are 0, which would silently match "0"
      return value == null || value === "" ? NaN : Number(value);
    }
    return String(value ?? "").toLowerCase();
  }
  const opName = String(op ?? "");
  const asNumber = opName.includes(NUMERIC_FLAG);
  const compare = OPERATORS[opName.replace(NUMERIC_FLAG, "")];

  if (!compare) {
    log(`Chart filter op invalid: ${op}`, key);
    return false;
  }

  const columnValue = toComparable(row?.[columnName], asNumber);
  const target = toComparable(operand, asNumber);

  if (asNumber && (Number.isNaN(columnValue) || Number.isNaN(target))) {
    log(`Chart filter non-numeric value for op ${op}: ${columnName}`, key);
    return false;
  }

  // "in" operators do a substring check, so both sides need to be strings
  // return compare(
  //   asNumber ? columnValue : columnValue,
  //   asNumber ? target : target,
  // );
  return compare(columnValue, target);
}
