import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "./util.js";
import {
  validatePlan,
  validateForecast,
  validateChartFilter,
  validateBarProp,
  validate2x2Prop,
  validateRiskProp,
  validateStateChangeProp,
  validatePlanProp,
  validateTrendProp,
  validateDataDescriptionProp,
  validateDataTableProp,
} from "../modules/validation.js";
import {
  DISPLAY_OTHERS,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID_DATE,
  DISPLAY_SPACES,
  MAX_BAR_CATS,
} from "./common.js";
import { dataTypes } from "./data-types.js";
import { chartTypes, getCallout } from "./chart-types/chart-types.js";

// Papa (PapaParse) is expected as a global; it can't be loaded as an ES module.

/*
Error strategy
  - definition/config errors: validated in the dialog and once at the start of the file here
  - data errors: logged per record

Shape of allCounts
  {
    memo:     { dataDescription, global, 0: chartMemo, 1: chartMemo, ... },
    counts:   { 0: oneCount, 1: oneCount, ... },
    data:     { 0: chartData, ... },   // built at the end of the file
    callouts: { ... },
  }
  oneCount = {
    category: {
      include,        // false when the user has filtered this category out
      totalSum,       // sum of the column, ignoring the filter
      filteredSum,    // sum of the column, with the filter
      totalCount,     // record count, ignoring the filter
      filteredCount,  // record count, with the filter
    },
    ...
  }
*/

export const Counter = {
  getFirstRecord, // required?
  getCountsFromFile,
  getChartDataTypes,
  getChartDescription,
};

const SYMBOL_OTHERS = Symbol(DISPLAY_OTHERS);
const SPECIAL_CATS = [
  DISPLAY_SPACES,
  DISPLAY_INVALID_DATE,
  DISPLAY_INVALID_NUMBER,
  SYMBOL_OTHERS,
];
const MAX_PLAN_ITEMS = 30;
const MAX_2X2_CELLS = 100;
const MAX_FORECAST_DAYS = 100;

/* ------------------------------------------------------------------ */
/* CSV reading                                                         */
/* ------------------------------------------------------------------ */

// Resolves with `resolveValue` when parsing completes, or `{ err }` on failure.
function readCSV(resolveValue, { file, step, complete, preview = 0, token }) {
  const downloadRequestHeaders = token
    ? {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      }
    : undefined;

  return new Promise((resolve) => {
    Papa.parse(file, {
      delimiter: ",",
      download: true,
      header: true,
      skipEmptyLines: true,
      downloadRequestHeaders,
      preview,
      step,
      error: (err) => resolve({ err }),
      complete: (result, file) => {
        resolve(resolveValue);
        complete?.(result, file);
      },
    });
  });
}

async function getFirstRecord(file) {
  let firstRow;
  // FIXME: resolves with `firstRow` as it is *now* (undefined), so this
  // always returns undefined. Needs a different way of returning the row.
  return readCSV(firstRow, {
    file,
    step: (row) => {
      firstRow = row;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Small pure helpers                                                  */
/* ------------------------------------------------------------------ */

const getMin = (current, value) =>
  current == null || value < current ? value : current;

const getMax = (current, value) =>
  current == null || value > current ? value : current;

function symbolToDisplay(v) {
  return typeof v === "symbol" ? v.description : v;
}

function getOrderedValues(chartType, ...args) {
  return chartTypes[chartType]?.orderedValues?.(...args) ?? [];
}

function cannotFilter(chartType) {
  return chartTypes[chartType]?.cannotFilter || false;
}

function cleanRow(rawRow, presetOffsetDays) {
  const row = {};
  for (const key in rawRow) {
    const cell = rawRow[key].trim();
    row[key] = _.isValidDate(cell)
      ? _.formatDate(
          presetOffsetDays ? _.addDays(cell, presetOffsetDays) : cell,
          "YYYY-MM-DD",
        )
      : cell;
  }
  return row;
}

// Statistics gathered per column for the data description.
function newColumnStats() {
  return {
    spaceCount: 0,
    minDate: null,
    maxDate: null,
    dateCount: 0,
    minNumber: null,
    maxNumber: null,
    totalNumber: 0,
    numberCount: 0,
    minString: null,
    maxString: null,
    stringCount: 0,
  };
}

function addToColumnStats(stats, item) {
  if (item === "") {
    stats.spaceCount++;
  } else if (_.isValidDate(item)) {
    stats.maxDate = getMax(stats.maxDate, item);
    stats.minDate = getMin(stats.minDate, item);
    stats.dateCount++;
  } else if (!isNaN(item)) {
    const n = Number(item);
    stats.maxNumber = getMax(stats.maxNumber, n);
    stats.minNumber = getMin(stats.minNumber, n);
    stats.totalNumber += n;
    stats.numberCount++;
  } else {
    stats.maxString = getMax(stats.maxString, item);
    stats.minString = getMin(stats.minString, item);
    stats.stringCount++;
  }
}

// x_bin is either a bin count ("5") or an explicit list of bin edges.
function getBins(x_bin, columnStats) {
  const binCount = Number(x_bin.trim());
  if (isNaN(binCount)) return _.cleanArray(x_bin, "Number");

  const { maxNumber, minNumber } = columnStats;
  const max = Math.round(maxNumber);
  const min = Math.floor(minNumber);
  const rawStep = (max - min) / (binCount + 1);
  if (rawStep < 10) return [min, max];

  const step = Math.round(rawStep);
  const bins = [min];
  for (let i = 1; i < binCount; i++) bins.push(min + i * step);
  bins.push(max);
  return bins;
}

// The count increments for one record, depending on which pass we're in.
function countDelta(isFiltered, sum) {
  return isFiltered
    ? { filteredSum: sum, filteredCount: 1 }
    : { totalSum: sum, totalCount: 1 };
}

function update2X2Counts(
  count,
  x,
  y,
  { totalSum = 0, filteredSum = 0, totalCount = 0, filteredCount = 0 },
) {
  let xy = `${x}|${y}`;
  if (!count[xy]) {
    const isTooMany = Object.keys(count).length >= MAX_2X2_CELLS;
    // FIXME: once over the limit this replaces the existing "others" entry
    // each time a new combination arrives, resetting its totals.
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

/* ------------------------------------------------------------------ */
/* Chart filter conditions                                             */
/* ------------------------------------------------------------------ */

const OPERATORS = {
  eq: (a, b) => a === b,
  not_eq: (a, b) => a !== b,
  in: (a, b) => b.includes(a), // substring check, so both sides must be strings
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

// `warn(message)` reports problems; the caller decides where they are logged.
function getConditionResult(row, { columnName, op, operand }, warn) {
  const opName = String(op ?? "");
  const asNumber = opName.includes(NUMERIC_FLAG);
  const compare = OPERATORS[opName.replace(NUMERIC_FLAG, "")];

  if (!compare) {
    warn(`Chart filter op invalid: ${op}`);
    return false;
  }

  const columnValue = toComparable(row?.[columnName], asNumber);
  const target = toComparable(operand, asNumber);

  if (asNumber && (Number.isNaN(columnValue) || Number.isNaN(target))) {
    warn(`Chart filter non-numeric value for op ${op}: ${columnName}`);
    return false;
  }
  return compare(columnValue, target);
}

/* ------------------------------------------------------------------ */
/* Counting                                                            */
/* ------------------------------------------------------------------ */

async function getCountsFromFile(inputJSON) {
  const { filter, config, blob } = JSON.parse(inputJSON);
  const file = blob || config.files[0]; // TODO: multiple files

  let totalRowCounts = 0;
  let filteredRowCounts = 0;
  let isStartOfFile = true;
  let fileError;
  let dataDescription = {};

  if (!config) {
    await passOne(file, 0);
    return dataDescription;
  }

  const chartKeys = config.chartProperties.map((props, i) => i);
  const { presetOffsetDays } = config;
  const hasFilterInInput = filter !== undefined;
  const allCounts = hasFilterInInput
    ? filter
    : { memo: {}, counts: {}, callouts: {} };

  // Pass 1 describes every column (needed for bins, trend end dates, ...).
  // It is skipped when we are only re-counting after a filter change.
  if (hasFilterInInput) {
    zeroCounters();
  } else {
    await passOne(file, presetOffsetDays);
    if (fileError) {
      log(fileError.err, "0", "error");
      return allCounts;
    }
    allCounts.memo.dataDescription = dataDescription;
  }

  clearLog();
  return passTwo(file);

  /* ---------------------------- passes ---------------------------- */

  async function passOne(file, presetOffsetDays) {
    dataDescription = {};
    const result = await readCSV(
      { complete: true },
      {
        file,
        step: (parsed) =>
          gatherDataDescription(cleanRow(parsed.data, presetOffsetDays)),
      },
    );
    if (!result.complete) fileError = result;
  }

  function passTwo(file) {
    return readCSV(allCounts, {
      file,
      step: (parsed) => {
        if (parsed.errors.length > 0) console.error(parsed.errors);
        countRecords(cleanRow(parsed.data, presetOffsetDays));
      },
      complete: () => {
        countRecords(); // no row = end of file
        makeChartData(allCounts, config);
        makeCallOuts(allCounts, config);
      },
    });
  }

  function gatherDataDescription(row) {
    for (const col in row) {
      dataDescription[col] ??= newColumnStats();
      addToColumnStats(dataDescription[col], row[col]);
    }
  }

  /* ------------------------ per-record logic ------------------------ */

  // Each record is counted twice per chart: once ignoring the filter
  // (isFiltered = false, gives the "total" figures) and once if it survives
  // the filters (isFiltered = true).
  function countRecords(row) {
    if (!row) {
      Object.assign((allCounts.memo.global ??= {}), {
        totalRowCounts,
        filteredRowCounts,
      });
      for (const key in allCounts.counts) countChart(key);
      return;
    }

    totalRowCounts++;

    if (totalRowCounts === 1) {
      for (const key of chartKeys) {
        allCounts.counts[key] ||= {};
        allCounts.memo[key] = {};
      }
    }

    const inChart = chartKeys.map((key) => includeRowInChart(key, row));

    // Only bar charts return a value: the category this record fell into.
    const categories = chartKeys.map((key) =>
      countChart(key, false, row, inChart[key]),
    );
    isStartOfFile = false;

    const passesFilters = chartKeys.every((key) => {
      const category = categories[key];
      if (category === undefined) return true;
      if (cannotFilter(getChartProps(key).chartType)) return true;
      return allCounts.counts[key][category].include;
    });
    if (!passesFilters) return;

    filteredRowCounts++;
    for (const key of chartKeys) {
      if (inChart[key]) countChart(key, true, row, true);
    }
  }

  function countChart(key, isFiltered, row, inChart) {
    const { chartType } = getChartProps(key);
    const args = {
      key,
      oneCount: allCounts.counts[key],
      memo: allCounts.memo[key],
      isFiltered,
      row,
      inChart,
    };
    switch (chartType) {
      case "Bar":
        return countBar(args);
      case "Data Description":
        return countDataDescription(args);
      case "Data Table":
        return countTable(args);
      case "Note":
        return;
      case "Plan":
        return countPlan(args);
      case "Risk":
        return countRisk(args);
      case "2X2":
        return count2X2(args);
      case "State Change":
        return countStateChange(args);
      case "Trend":
        return countTrend(args);
      default:
        console.error(`Invalid chartType: ${chartType}`);
    }
  }

  // Validates a chart's config at the start of the file.
  // Returns true if the chart is misconfigured and must not be counted.
  function hasConfigError(key, validate) {
    const memo = allCounts.memo[key];
    if (isStartOfFile) {
      const [errors] = validate(getChartProps(key));
      if (errors.length > 0) {
        log("Error in config", key);
        console.error("Error in config:", _.stringify(errors));
        memo.fatalError = true;
      }
    }
    return Boolean(memo.fatalError);
  }

  function getSumValue(key, column, row) {
    if (!column) return 0;
    const value = row[column];
    if (isNaN(value)) {
      log(`Av/Sum is ${DISPLAY_INVALID_NUMBER}`, key);
      return 0;
    }
    return Number(value);
  }

  function isValidColumn(key, column, row) {
    const cols = _.isArray(column) ? [...column] : [column];
    return cols.reduce((err, col) => {
      if (row[col] === undefined) {
        log(`Invalid column ${col}`, key, "error");
        return false;
      } else return err;
    }, true);
  }

  /* --------------------------- Bar --------------------------- */

  function countBar({ key, oneCount, memo, isFiltered, row, inChart }) {
    if (hasConfigError(key, validateBarProp)) return;

    const chartProps = getChartProps(key);
    const { colOver, x_column, x_dataType } = chartProps;

    if (isStartOfFile) {
      if (!isValidColumn(key, x_column, row)) {
        memo.fatalError = true;
        return;
      }
      initBar(chartProps, memo);
    }
    if (!row) return;

    const maxCats = 2 * MAX_BAR_CATS;
    const countCategory = (originalCat) => {
      const cat =
        oneCount[originalCat] || Object.keys(oneCount).length < maxCats
          ? originalCat
          : SYMBOL_OTHERS;
      if (cat === SYMBOL_OTHERS) log(`Over ${maxCats} categories`, key);

      oneCount[cat] ??= {
        include: true, // true means include in counts
        totalSum: 0,
        filteredSum: 0,
        totalCount: 0,
        filteredCount: 0,
      };
      if (inChart) {
        const sum = getSumValue(key, colOver, row);
        const c = oneCount[cat];
        if (isFiltered) {
          c.filteredCount++;
          c.filteredSum += sum;
        } else {
          c.totalCount++;
          c.totalSum += sum;
        }
      }
      return cat;
    };

    const value = dataTypes[x_dataType].getFormattedValue(row[x_column], memo);
    if (x_dataType === "List Members") {
      if (_.isArray(value)) value.forEach((member) => countCategory(member));
      return; // a record in several categories can't be used as a filter
    }
    return countCategory(value);
  }

  function initBar(chartProps, memo) {
    const { x_column, x_bin, x_categories, x_dateFormat, x_separator } =
      chartProps;
    if (x_bin) {
      memo.bin = getBins(x_bin, allCounts.memo.dataDescription[x_column]);
    }
    if (x_categories) memo.order = x_categories;
    if (x_dateFormat) {
      memo.dateFormat = x_dateFormat;
      memo.reportDate = config.reportDate;
    }
    if (x_separator) memo.separator = x_separator;
  }

  /* ----------------------- 2X2 and Risk ----------------------- */

  function count2X2({ key, oneCount, isFiltered, row, inChart }) {
    if (hasConfigError(key, validate2x2Prop) || !row || !inChart) return;
    const { colOver, x_column, y_column } = getChartProps(key);

    if (isStartOfFile)
      if (!isValidColumn(key, [x_column, y_column], row)) {
        memo.fatalError = true;
        return;
      }

    const sum = getSumValue(key, colOver, row);
    update2X2Counts(
      oneCount,
      row[x_column],
      row[y_column],
      countDelta(isFiltered, sum),
    );
  }

  function countRisk({ key, oneCount, memo, isFiltered, row, inChart }) {
    if (hasConfigError(key, validateRiskProp) || !row) return;
    const { x_map, y_map, colOver, x_column, y_column } = getChartProps(key);

    if (isStartOfFile) {
      if (!isValidColumn(key, [x_column, y_column], row)) {
        memo.fatalError = true;
        return;
      }
      memo.xMap = _.toMap(_.getArray(x_map));
      memo.yMap = _.toMap(_.getArray(y_map));
    }
    if (!inChart) return;

    const x = memo.xMap.get(row[x_column].trim());
    const y = memo.yMap.get(row[y_column].trim());
    if (x === undefined) log("Horizontal map incorrect", key);
    if (y === undefined) log("Vertical map incorrect", key);

    const sum = getSumValue(key, colOver, row);
    update2X2Counts(oneCount, x, y, countDelta(isFiltered, sum));
  }

  /* --------------------- State change --------------------- */

  function countStateChange({ key, oneCount, memo, isFiltered, row }) {
    if (hasConfigError(key, validateStateChangeProp)) return;
    const { reportDate } = config;
    const { idCol, x_column, y_column, timestampCol } = getChartProps(key);

    if (isStartOfFile) {
      if (!isValidColumn(key, [idCol, x_column, y_column, timestampCol], row)) {
        memo.fatalError = true;
        return;
      }
      memo.previousState = { id: "", to: "", from: "", timestamp: 0 };
    }

    const prev = memo.previousState;

    // Closes out the last record of an id: how long it has been in its state.
    const closeOutPrevious = () => {
      if (!prev.to) return;
      const delta = _.dateTimeDiff(prev.timestamp, reportDate, "Days");
      if (delta < 0) log("Timestamp not in ascending order", key);
      update2X2Counts(oneCount, "<Now>", prev.to, {
        filteredCount: 1,
        filteredSum: delta,
      });
    };

    if (!row) {
      closeOutPrevious();
      return;
    }
    if (!isFiltered) return;

    const id = row[idCol].trim();
    const to = row[x_column].trim();
    const from = row[y_column].trim();
    let timestamp = row[timestampCol];
    if (!_.isValidDate(timestamp)) {
      log(`timestamp is ${DISPLAY_INVALID_DATE}`, key);
      timestamp = 0;
    }

    if (id !== prev.id) {
      closeOutPrevious();
    } else if (prev.to) {
      if (prev.to !== from) log('"from" not same as previous "to"', key);
      const delta = _.dateTimeDiff(prev.timestamp, timestamp, "Days");
      update2X2Counts(oneCount, to, from, {
        filteredCount: 1,
        filteredSum: delta,
      });
      if (delta < 0) log("Timestamp not in ascending order", key);
    }
    Object.assign(prev, { id, to, from, timestamp });
  }

  /* ----------------- Data table / description ----------------- */

  function countTable({ key, oneCount, isFiltered, row }) {
    if (hasConfigError(key, validateDataTableProp) || !row || !isFiltered) {
      return;
    }
    const { rowsToDisplay } = getChartProps(key);
    if (Object.keys(oneCount).length >= rowsToDisplay) {
      // drop the middle one, so the first and last rows are both kept
      delete oneCount[filteredRowCounts - Math.round(rowsToDisplay / 2)];
    }
    oneCount[filteredRowCounts] ??= { include: true };
    oneCount[filteredRowCounts].filteredValue = row;
  }

  function countDataDescription({ key, oneCount, isFiltered, row }) {
    if (
      hasConfigError(key, validateDataDescriptionProp) ||
      !row ||
      !isFiltered
    ) {
      return;
    }
    if (filteredRowCounts === 1) {
      for (const col in row) {
        oneCount[col] = { include: true, ...newColumnStats() };
      }
    }
    for (const col in row) addToColumnStats(oneCount[col], row[col]);
  }

  /* ----------------------------- Plan ----------------------------- */

  function countPlan({ key, oneCount, memo, isFiltered, row }) {
    if (hasConfigError(key, validatePlanProp)) return;
    const chartProps = getChartProps(key);
    const {
      descriptionCol,
      startDateCol,
      endDateCol,
      secondStartDateCol,
      secondEndDateCol,
      ragCol,
      ragMap,
    } = chartProps;
    const hasSecondDate = Boolean(secondStartDateCol);
    const hasRag = Boolean(ragCol);
    if (isStartOfFile) {
      const hasInvalidRequiredCol = !isValidColumn(
        key,
        [descriptionCol, startDateCol, endDateCol],
        row,
      );

      const hasInvalidSecondDates =
        hasSecondDate &&
        !isValidColumn(key, [secondStartDateCol, secondEndDateCol], row);

      const hasInvalidRagCol = hasRag && !isValidColumn(key, ragCol, row);

      if (hasInvalidRequiredCol || hasInvalidSecondDates || hasInvalidRagCol) {
        memo.fatalError = true;
        return;
      }
      if (hasRag && ragMap)
        memo.ragMap = _.toMap(_.getArray(ragMap.toUpperCase()));
    }

    if (!row || !isFiltered) return;

    const desc = row[descriptionCol];
    oneCount[desc] ??= { include: true };

    const start = _.formatDate(row[startDateCol]);
    const end = _.formatDate(row[endDateCol]);
    const secondStart = _.formatDate(row[secondStartDateCol]);
    const secondEnd = _.formatDate(row[secondEndDateCol]);

    const errors = [];
    if (!_.isValidDate(start)) errors.push("Invalid start date");
    if (!_.isValidDate(end)) errors.push("Invalid end date");
    if (hasSecondDate) {
      if (!_.isValidDate(secondStart)) errors.push("Invalid second start date");
      if (!_.isValidDate(secondEnd)) errors.push("Invalid second end date");
    }
    if (errors.length === 0) {
      if (start > end) errors.push("Start date > end date");
      if (secondStart && secondStart > secondEnd) {
        errors.push("Second start date > end date");
      }
    }
    if (errors.length > 0) {
      errors.forEach((message) => log(message, key));
      return;
    }

    if (Object.keys(oneCount).length > MAX_PLAN_ITEMS) {
      foldIntoOthers(oneCount, { start, end, secondStart, secondEnd });
      return;
    }
    const rag = memo.ragMap?.get(row[ragCol]?.toUpperCase());
    Object.assign(oneCount[desc], { start, end, secondStart, secondEnd, rag });
  }

  // Plan items beyond MAX_PLAN_ITEMS are merged into one "others" item.
  function foldIntoOthers(oneCount, { start, end, secondStart, secondEnd }) {
    const others = (oneCount[DISPLAY_OTHERS] ??= {
      include: true,
      start,
      end,
      secondStart,
      secondEnd,
      rag: undefined,
    });
    if (others.start > start) others.start = start;
    if (others.end < end) others.end = end;
    if (secondStart) {
      if (others.secondStart > secondStart) others.secondStart = secondStart;
      if (others.secondEnd < secondEnd) others.secondEnd = secondEnd;
    }
  }
  /* ---------------------------- Trend ---------------------------- */

  function countTrend({ key, oneCount, memo, isFiltered, row }) {
    if (hasConfigError(key, validateTrendProp)) return;
    const chartProps = getChartProps(key);
    const { x_column, x1_column } = chartProps;
    if (isStartOfFile) {
      if (!isValidColumn(key, x_column, row)) memo.fatalError = true;
      if (x1_column)
        if (!isValidColumn(key, x1_column, row)) memo.fatalError = true;
      if (memo.fatalError) return;
      initTrend(key, chartProps, oneCount, memo);
    }

    if (!row) {
      memo.totalRowCounts = totalRowCounts;
      memo.filteredRowCounts = filteredRowCounts;
      return;
    }
    if (!isFiltered) return;

    // The first date opens an item, the optional second date closes it.
    addTrendEvent(oneCount, memo, row[x_column], { open: 1, close: 0 });
    if (row[x1_column]) {
      addTrendEvent(oneCount, memo, row[x1_column], { open: 0, close: 1 });
    }
  }

  function addTrendEvent(oneCount, memo, date, { open, close }) {
    if (!_.isValidDate(date)) return;

    // each bucket is keyed by its last date
    const bucket = oneCount[Object.keys(oneCount).find((d) => date <= d)];
    bucket.count += open;
    bucket.open += open;
    bucket.close += close;

    const { forecast } = memo;
    if (!forecast) return;
    const dateDiff = _.dateTimeDiff(forecast.cutoffDate, date) - 1;
    if (dateDiff >= 0) {
      forecast.count += open - close;
      forecast.open += open;
      forecast.close += close;
      forecast.lookBackValues[dateDiff] += open - close;
    }
  }

  function initTrend(key, chartProps, oneCount, memo) {
    const { x_column, x1_column, forecast, plan } = chartProps;
    const { reportDate } = config;
    Object.assign(memo, { reportDate, count: 0, open: 0, close: 0 });

    let trendEndDate = reportDate;
    for (const column of [x_column, x1_column]) {
      if (!column) continue;
      const columnMax = allCounts.memo.dataDescription[column].maxDate;
      if (trendEndDate < columnMax) trendEndDate = columnMax;
    }
    // TODO: include the plan end date as well?

    getOrderedValues("Trend", chartProps, trendEndDate, config).forEach(
      (date) => {
        oneCount[date] = { include: true, open: 0, close: 0, count: 0 };
      },
    );

    initForecast(key, forecast, memo);
    initPlan(key, plan, memo);
  }

  function initForecast(key, forecast, memo) {
    const [errors, forecastObj] = validateForecast(forecast, config);
    if (errors.length > 0) {
      log("Invalid forecast", key);
      return;
    }
    if (!forecastObj) return;

    const { lookBack, label, placeholder } = forecastObj;
    memo.forecast = {
      ...forecastObj,
      label: label || placeholder,
      count: 0,
      open: 0,
      close: 0,
      lookBackValues: new Array(lookBack).fill(0),
      cutoffDate: _.addDays(config.reportDate, -(lookBack - 1)),
    };
  }

  function initPlan(key, plan, memo) {
    const [errors, planObj] = validatePlan(plan, config);
    if (errors.length > 0) {
      log("Invalid plan", key);
      return;
    }
    if (planObj) memo.plan = { ...planObj };
  }

  /* ------------------------ chart filters ------------------------ */

  // Applies the chart's own filter (not the user's category filter).
  function includeRowInChart(key, row) {
    const memo = allCounts.memo[key];
    if (totalRowCounts === 1) initChartFilter(key, memo);
    if (!memo.chartFilter) return true;

    // evaluate every condition (so each one logs its problems), then combine
    const results = memo.chartFilter.map(([join, columnName, op, operand]) => ({
      join,
      met: getConditionResult(row, { columnName, op, operand }, (message) =>
        log(message, key),
      ),
    }));
    return results.reduce((acc, { met, join }, i) => {
      if (i === 0) return met;
      return join === "and" ? acc && met : acc || met;
    }, true);
  }

  function initChartFilter(key, memo) {
    const { chartFilter } = getChartProps(key);
    if (!chartFilter) return;
    const [errors, conditions] = validateChartFilter(chartFilter);
    if (errors.length > 0) {
      log("Invalid chart filter", key);
      return;
    }
    if (conditions) memo.chartFilter = conditions;
  }

  /* --------------------------- misc --------------------------- */

  function getChartProps(index) {
    const chartProps = config?.chartProperties?.[index];
    if (!chartProps) {
      log(`Invalid call to getChartProps; index= ${index}`, undefined, "error");
      return;
    }
    return chartProps;
  }

  // Resets counts before re-counting with a new filter. Categories are kept
  // for the chart types that can be filtered; everything else starts over.
  function zeroCounters() {
    for (const key in allCounts.counts) {
      const { chartType } = getChartProps(key);
      const entries = Object.values(allCounts.counts[key]);

      if (["2X2", "Risk", "Bar"].includes(chartType)) {
        for (const entry of entries) {
          Object.assign(entry, {
            totalSum: 0,
            filteredSum: 0,
            totalCount: 0,
            filteredCount: 0,
          });
        }
      } else if (chartType === "Trend") {
        for (const entry of entries) {
          Object.assign(entry, { open: 0, close: 0, count: 0 });
        }
      } else {
        allCounts.counts[key] = {};
      }
    }
  }

  function clearLog() {
    for (const memo of Object.values(allCounts.memo)) delete memo.log;
  }

  function log(message, key, severity = "warning") {
    logMessage(message, severity, key, allCounts, filteredRowCounts);
  }
}

function logMessage(message, severity, key, allCounts, filteredRowCounts) {
  const memo = (allCounts.memo[key] ||= {});
  const memoLog = (memo.log ??= {});

  if (!memoLog[message]) {
    memoLog[message] = { first: filteredRowCounts, count: 0 };
    if (severity === "error" || severity === "severe") {
      console.error({ message, severity, key, allCounts });
    }
    if (severity === "severe") console.trace();
  }
  const entry = memoLog[message];
  entry.severity = severity;
  entry.last = filteredRowCounts;
  entry.count++;
}

/* ------------------------------------------------------------------ */
/* Chart descriptions                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Turning counts into chart data                                      */
/* ------------------------------------------------------------------ */

function makeChartData(allCounts, config) {
  allCounts.data = {};
  config.chartProperties.forEach((chartProps, key) => {
    if (allCounts.memo[key].fatalError) {
      //message, severity, key, allCounts, filteredRowCounts
      logMessage("Cannot draw chart due to error", "error", key, allCounts, 0);
      return;
    }
    allCounts.data[key] = buildChartData({
      key,
      chartProps,
      oneCount: allCounts.counts[key],
      memo: allCounts.memo[key],
      allCounts,
    });
  });
}

function buildChartData(ctx) {
  switch (ctx.chartProps.chartType) {
    case "Bar":
      return barData(ctx);
    case "Data Table":
      return tableData(ctx);
    case "Data Description":
      return descriptionData(ctx);
    case "2X2":
    case "State Change":
      return gridData(ctx);
    case "Risk":
      return riskData(ctx);
    case "Plan":
      return { labels: [], data: ctx.oneCount };
    case "Trend":
      return trendData(ctx);
    default:
      return undefined; // Note, and unknown types, have no data
  }
}

function makeCallOuts(allCounts, config) {
  allCounts.callouts = {};
  (config.callouts ?? []).forEach((callout, i) => {
    const chartProps = config.chartProperties[callout.chartNumber];
    const data = allCounts.data[callout.chartNumber]?.data;
    allCounts.callouts[i] = getCallout(callout, chartProps, data, config);
  });
}

/* ------------------------------ Bar ------------------------------ */

function average(sum, count) {
  return count > 0 ? Number((sum / count).toFixed(1)) : 0;
}

// Returns [filtered value, total value] for a bar row.
function getBarValues(countType, row) {
  if (countType.startsWith("Sum")) return [row.sum, row.totalSum];
  if (countType.startsWith("Count")) return [row.count, row.totalCount];
  return [average(row.sum, row.count), average(row.totalSum, row.totalCount)];
}

function getBarSortKey(sortOn, countType) {
  if (!sortOn || sortOn === "none") return null;
  if (sortOn === "cat") return "x";
  if (countType === "Count") return "totalCount";
  if (countType === "Sum") return "totalSum";
  return (row) => average(row.totalSum, row.totalCount);
}

function barData({ chartProps, oneCount, memo }) {
  // x_sortOn: cat | value; x_sortOrder: ascending | descending
  // (sorting is only available for string or number data types without bins)
  const {
    countType,
    x_dataType,
    x_sortOn = "v",
    x_sortOrder = "a",
  } = chartProps;
  const cats = memo ? dataTypes[x_dataType].getCategories(memo) : [];

  const toRow = (key, x = key) => {
    const c = oneCount[key];
    return {
      x,
      count: c?.filteredCount ?? 0,
      // FIXME: probably should be c?.filteredSum. As written, "Sum" bars
      // show counts and "Average" bars always come out as 1.
      sum: c?.filteredCount ?? 0,
      totalCount: c?.totalCount ?? 0,
      totalSum: c?.totalSum ?? 0,
    };
  };

  const mustCats = cats.map((cat) => toRow(cat));
  const specials = SPECIAL_CATS.map((cat) =>
    toRow(cat, symbolToDisplay(cat)),
  ).filter((row) => row.count > 0);
  const optionals = Object.keys(oneCount)
    .filter((key) => !SPECIAL_CATS.includes(key) && !cats.includes(key))
    .map((key) => toRow(key));

  const sortKey = getBarSortKey(x_sortOn, countType);
  const sorted = sortKey
    ? _.sortArrayOrObjects(optionals, { key: sortKey, order: x_sortOrder })
    : optionals;

  // Anything beyond the bar limit is folded into "Others"
  const maxOptionals = Math.max(
    0,
    MAX_BAR_CATS - (cats.length + specials.length),
  );
  const kept = sorted.slice(0, maxOptionals);
  const removed = sorted.slice(maxOptionals);

  if (removed.length > 0) {
    let others = specials.find((row) => row.x === DISPLAY_OTHERS);
    if (!others) {
      others = {
        x: DISPLAY_OTHERS,
        count: 0,
        sum: 0,
        totalCount: 0,
        totalSum: 0,
      };
      specials.push(others);
    }
    for (const row of removed) {
      others.count += row.count;
      others.sum += row.sum;
      others.totalCount += row.totalCount;
      others.totalSum += row.totalSum;
    }
  }

  const data = [...mustCats, ...kept, ...specials].map((row) => {
    const [v, vTot] = getBarValues(countType, row);
    return { x: row.x, v, vTot };
  });
  return { data };
}

/* -------------------- Data Table / Description -------------------- */

function tableData({ oneCount }) {
  const labels = [];
  const data = [];
  for (const key in oneCount) {
    labels.push(key);
    data.push({ "#": key, ...oneCount[key].filteredValue });
  }
  return { labels, data };
}

const DESCRIPTION_ROWS = {
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

function descriptionData({ key, oneCount }) {
  const columns = Object.keys(oneCount);
  const stats = Object.keys(DESCRIPTION_ROWS);

  const data = stats.map((stat) => {
    const entry = { Attributes: DESCRIPTION_ROWS[stat] };
    for (const column of columns) entry[column] = oneCount[column][stat] ?? "";
    return entry;
  });
  // Labels count up from the chart's index (as the original code did)
  const labels = stats.map((stat, n) => key + n);
  return { labels, data };
}

/* ------------------------- 2X2 / State change ------------------------- */

// Returns the count (or sum, or average) to display for a 2X2-style cell.
function getDisplayValue(countType, v) {
  const count = v.count ?? v.filteredCount;
  const sum = v.sum ?? v.filteredSum;

  if (countType.startsWith("Sum")) return sum;
  if (countType.startsWith("Average")) return average(sum, count);
  return count;
}

function gridData({ chartProps, oneCount }) {
  const { countType, x_categories, y_categories, countLabels } = chartProps;

  const data = Object.keys(oneCount).map((key) => ({
    x: oneCount[key].x,
    y: oneCount[key].y,
    v: getDisplayValue(countType, oneCount[key]),
  }));

  const countDomain = _.getArray(countLabels);
  const xDomain = x_categories ? _.getArray(x_categories) : [];
  const yDomain = y_categories ? _.getArray(y_categories) : [];

  // map each value onto one of the count labels (used as the cell colour)
  const [min, max] = d3Extent(data, (d) => d.v);
  const step = (max - min) / (countDomain.length - 1);
  const fill = (v) => countDomain[Math.floor((v - min) / step)];

  for (const d of data) {
    if (!xDomain.includes(d.x)) xDomain.push(d.x);
    if (!yDomain.includes(d.y)) yDomain.push(d.y);
    d.fill = fill(d.v);
  }
  return { domain: { countDomain, xDomain, yDomain }, data };
}

/* ------------------------------ Risk ------------------------------ */

const RISK_THRESHOLDS = [2, 6, 9, 12]; // score <= threshold[i] -> label i

function riskData({ chartProps, oneCount, memo }) {
  const { countType, countLabels } = chartProps;
  const { xMap, yMap } = memo;
  const countDomain = _.getArray(countLabels);

  // position of a value in its map; unknown values rank highest
  const position = (value, map) => {
    const index = [...map.values()].indexOf(value);
    return index === -1 ? 5 : index;
  };
  const colorFor = ({ x, y }) => {
    const score = position(x, xMap) * position(y, yMap);
    const level = RISK_THRESHOLDS.findIndex((limit) => score <= limit);
    return countDomain[level === -1 ? RISK_THRESHOLDS.length : level];
  };

  const data = Object.keys(oneCount).map((key) => ({
    x: oneCount[key].x,
    y: oneCount[key].y,
    fill: colorFor(oneCount[key]),
    v: getDisplayValue(countType, oneCount[key]),
  }));
  const domain = {
    countDomain,
    xDomain: [...xMap.values()],
    yDomain: [...yMap.values()].reverse(),
  };
  return { domain, data };
}

/* ----------------------------- Trend ----------------------------- */

function trendData({ key, chartProps, oneCount, memo, allCounts }) {
  const { x_label, aggrateType, x1_column } = chartProps;
  const isCumulative = aggrateType === "cumulative"; // TODO allow for false

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
  if (memo?.plan) addPlanPoints(data, domain, memo);
  if (memo?.forecast) {
    addForecastPoints(data, domain, { key, memo, allCounts, cumulativeCount });
  }
  return { domain, data };
}

function addPlanPoints(plotData, domain, memo) {
  const { startDate, endDate, scopeFrom, scopeTo, points, label, placeholder } =
    memo.plan;
  const labelToShow = label || placeholder;
  const to = scopeTo === "max" ? memo.filteredRowCounts : scopeTo;
  const deltaScope = to - scopeFrom;
  const dateSteps =
    _.dateTimeDiff(startDate, endDate, "Days") / (points.length - 1);

  points.forEach((point, i) => {
    plotData.push({
      x: _.addDays(startDate, Math.round(i * dateSteps)),
      v: Math.round(scopeFrom + deltaScope * point),
      type: labelToShow,
    });
  });
  domain.plan = labelToShow;
}

function addForecastPoints(
  plotData,
  domain,
  { key, memo, allCounts, cumulativeCount },
) {
  const { count, lookBack, lookBackValues, cutoffDate, forecastTo, label } =
    memo.forecast;
  const { filteredRowCounts } = memo;

  if (isNaN(lookBack) || Number(lookBack) <= 0) return;

  // straight line through the last point, with the slope of the look-back period
  const slope = count / lookBack;
  const intercept = cumulativeCount - slope * (lookBackValues.length - 1);
  const valueAt = (day) => intercept + slope * day;
  const dayAt = (value) => {
    const delta = value - intercept;
    if (slope === 0) return delta > 0 ? Infinity : -Infinity;
    return delta / slope;
  };

  // days (after the cutoff) until the forecast reaches the current row count
  let daysToEnd = dayAt(filteredRowCounts);
  if (daysToEnd > MAX_FORECAST_DAYS) {
    logMessage(
      `Forecast limited to ${MAX_FORECAST_DAYS} days`,
      "warning",
      key,
      allCounts,
      0,
    );
    daysToEnd = MAX_FORECAST_DAYS;
  }

  const toMax = forecastTo === "max";
  const endDate = toMax
    ? _.addDays(cutoffDate, daysToEnd)
    : _.isValidDate(forecastTo)
      ? forecastTo
      : _.addDays(cutoffDate, forecastTo);
  const endCount = toMax
    ? filteredRowCounts
    : valueAt(_.dateTimeDiff(cutoffDate, endDate));

  plotData.push(
    { x: new Date(cutoffDate), v: cumulativeCount - count, type: label },
    { x: new Date(endDate), v: Math.round(endCount), type: label },
  );
  domain.forecast = label;
}
