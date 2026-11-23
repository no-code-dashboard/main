"use strict";
import {
  DISPLAY_OTHERS,
  DISPLAY_INVALID,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID_DATE,
  DISPLAY_SPACES,
  DISPLAY_LESS,
  DISPLAY_MORE,
  isInvalidDisplay,
  displayOrder,
  MONTHS,
  WORKDAYS,
  WEEKDAYS,
} from "./common.js";
export {
  _,
  saveCounts,
  getCounts,
  setItem,
  getItem,
  // getChartId,
  getChartId,
  // getKey,
  clearCounts,
};

/*
 * Formats a date string using the format
 *
 * @param {string} date to be formatted
 * @param {string} format any combination of dd mm mmm yy and yyyy
 * @returns {string} formatted date
 */
function formatDate(date, format = "YYYY-MM-DD") {
  if (date instanceof Date && !isNaN(date.getTime()))
    return date.toISOString().substring(0, 10);

  if (!isValidDate(date)) return DISPLAY_INVALID_DATE;

  if (format === "YYYY-MM-DD")
    return new Date(date).toISOString().substring(0, 10);

  // const dateWithHyphen = date.replace(/\//g, "-").toUpperCase().trim();
  const _date = new Date(date);

  const d = _date.getDate();
  const m = _date.getMonth();
  const YYYY = String(_date.getFullYear());
  const MMM = MONTHS[m];
  const DDD = WEEKDAYS[_date.getDay()];
  const DD = String(d).padStart(2, "0");
  const MM = String(m + 1).padStart(2, "0");

  // const date_DDD_MMM_DD_YYYY = newDate.toDateString();
  // const [DDD, MMM, DD, YYYY] = date_DDD_MMM_DD_YYYY.split(" ");

  // if (DDD == "Invalid") return DISPLAY_INVALID_DATE;
  // const monthNumber = newDate.getMonth() + 1;
  // const MM = (monthNumber < 10 ? "0" : "") + monthNumber.toString();
  const YY = YYYY.substring(2, 4);

  const formattedDate = format
    .replace("DDD", DDD)
    .replace("DD", DD)
    .replace("MMM", MMM)
    .replace("MM", MM)
    .replace("YYYY", YYYY)
    .replace("YY", YY);

  return formattedDate;
}
/**
 * Tests if a date is valid
 * @param {string} date - valid formats are dd-mmm-yy, yyyy-mm-dd
 * @returns {boolean}
 */

function isValidDate(date) {
  if (typeof date !== "string") return false;
  date = date.toUpperCase().trim();
  const validPatterns = [
    /\d{4}[-/]\d{2}[-/]\d{2}/, // YYYY-MM-DD
    /\d{2}[-/][A-Z]{3}[-/]\d{2}/, // DD-MMM-YY (e.g., 15-MAY-25)
    /\d{2}[-/][A-Z]{3}[-/]\d{4}/, // DD-MMM-YYYY (e.g., 15-MAY-2025)
  ].reduce((acc, pat) => acc || pat.test(date), false);

  if (!validPatterns) return false;

  const _date = new Date(date).toString();
  return _date !== "Invalid Date";

  // function isDateOK(d, m, y) {
  //   if (y < 2000 || m < 1 || m > 12 || d < 1) return false;

  //   // Standard days in months (Feb as 28)
  //   const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  //   // Adjust for Leap Year
  //   if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) {
  //     daysInMonth[1] = 29;
  //   }

  //   return d <= daysInMonth[m - 1];
  // }

  // const cleanDate = date.replace(/\//g, "-").toUpperCase().trim();

  // let dd, mm, yyyy;

  // const monthNum = (mmm) =>
  //   1 + MONTHS.findIndex((v) => v.toUpperCase() === mmm); //indexOf(m) + 1;

  // // Pattern 1: YYYY-MM-DD
  // if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
  //   [yyyy, mm, dd] = cleanDate.split("-").map(Number);
  // }
  // // Pattern 2: DD-MMM-YY (e.g., 15-MAY-25)
  // else if (/^\d{2}-[A-Z]{3}-\d{2}$/.test(cleanDate)) {
  //   const [d, m, y] = cleanDate.split("-");
  //   dd = Number(d);
  //   mm = monthNum(m);
  //   yyyy = 2000 + Number(y);
  // }
  // // Pattern 3: DD-MMM-YYYY (e.g., 15-MAY-2025)
  // else if (/^\d{2}-[A-Z]{3}-\d{4}$/.test(cleanDate)) {
  //   const [d, m, y] = cleanDate.split("-");
  //   dd = Number(d);
  //   mm = monthNum(m);
  //   yyyy = Number(y);
  // } else {
  //   return false; // No patterns matched
  // }

  // return mm > 0 && isDateOK(dd, mm, yyyy);
}

function dateTimeDiff(dateTimeStart, dateTimeEnd, format = "Days") {
  const start = new Date(dateTimeStart);
  const end = new Date(dateTimeEnd);
  const diffMs = end - start;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const formatUC = format.toUpperCase().trim();

  switch (formatUC) {
    case "MILLISECONDS":
      return diffMs;
    case "WEEKS":
      return diffDays / 7;
    case "DAYS":
      return Math.ceil(diffDays);
    case "WORKDAYS":
      return calculateWorkdays(start, end);
    default:
      return diffDays;
  }
}

function calculateWorkdays(start, end) {
  let startDate = new Date(start < end ? start : end);
  let endDate = new Date(start < end ? end : start);

  // 1. Move start to the next day to match your "diff" logic
  startDate.setDate(startDate.getDate() + 1);

  let count = 0;
  const wordaysInAWeek = WORKDAYS.reduce((sum, v) => sum + v, 0);
  // 2. Calculate full weeks between dates
  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  count += fullWeeks * wordaysInAWeek;

  // 3. Move the pointer forward by the full weeks processed
  startDate.setDate(startDate.getDate() + fullWeeks * 7);

  // 4. Loop only through the remaining "leftover" days (0-6 days max)
  while (startDate <= endDate) {
    const day = startDate.getDay();
    // if (day !== 0 && day !== 6) count++;
    count += WORKDAYS[day]; //0 = sun,... 6 = Sat
    startDate.setDate(startDate.getDate() + 1);
  }

  return start < end ? count : -count;
}

function addDays(start, days) {
  if (isNaN(days) || Number(days) === 0) return start;

  const _start = new Date(start);
  if (_start.toString() === "Invalid Date") return start;
  // const daysInMS = 24 * 60 * 60 * 1000 * Number(days);
  // start.setTime(start.getTime() + daysInMS);
  _start.setDate(_start.getDate() + Number(days));
  return formatDate(_start);
}

///////////////////////////////// DOM helpers

// function getCSSVar(v) {
//   const style = getComputedStyle(document.body);
//   return style.getPropertyValue(v);
// }

/**
 * Remove the innerHTML and event listeners for an element
 * @param {string} selector for the element
 * @returns {HTMLElement}
 */
const clearHTML = (selector) => {
  const element = typeof selector === "string" ? select(selector) : selector;
  if (element) element.textContent = "";
  return element;
};

/**
 *
 * @param {string} type
 * @param {string} selector
 * @param {function} callback
 * @param {object} options
 * @param {HTMLElement} parent
 */
function addGlobalEventListener(
  type,
  selector,
  callback,
  options,
  parent = document,
) {
  parent.addEventListener(
    type,
    (e) => {
      if (e.target.matches(selector)) callback(e);
    },
    options,
  );
}
//https://github.com/WebDevSimplified/js-util-functions/
function select(selector, parent = document) {
  return parent.querySelector(selector);
}

function selectAll(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * Create DOM element(s) given the input.
 *
 * @example input: "<div class='x'></div>", output a div element with a class
 * @example input: {div: {class: "x", style: "y"}} output: div element with class and style
 * @example input: {div: {class: "x", style: "y", button: {class:"z"}}} output: div element with class and style
 * and a child button with class
 *
 * @param {String|Object|Array} input
 * @returns {HTMLElement}
 */
function createElements(input) {
  // const getTag = (tag) => {
  //   const underscore = tag.indexOf("_");
  //   if (underscore === -1) return tag;
  //   return tag.substring(0, underscore);
  // };
  input = input.trim();
  if (typeof input === "string" && input.startsWith("<")) {
    let temp = document.createElement("template");
    const html = input.trim();
    temp.innerHTML = html;
    return temp.content.firstChild;
  }

  if (typeof input === "string") {
    return document.createElement(input);
  }

  const e = document.createElement(input);
  e.textContent = "Invalid input";
  return e;
  // console.log({ input });
  // if (typeof input !== "object") return;

  // const key = Object.keys(input)[0];

  // const element = document.createElement(getTag(key));
  // const attributes = input[key];
  // if (typeof attributes !== "object") return element;

  // Object.entries(attributes).forEach(([attr, value]) => {
  //   if (attr === "class") {
  //     if (typeof value !== "string") return;
  //     const classes = value.split(" ");
  //     for (const c of classes) element.classList.add(c);
  //     return;
  //   }

  //   if (attr === "dataset") {
  //     if (!isArray(value)) return;
  //     const [k, v] = value;
  //     element.dataset[k] = v;
  //     return;
  //   }

  //   if (attr === "text") {
  //     if (typeof value !== "string") return;
  //     element.textContent = value;
  //     return;
  //   }
  //   if (typeof value === "object") {
  //     const childAttrs = {};
  //     childAttrs[attr] = value;
  //     const child = createElements(childAttrs);
  //     if (child) element.appendChild(child);
  //     return;
  //   }

  //   if (typeof attr === "string" && value) element.setAttribute(attr, value);
  // });

  // return element;
}
function removeChildren(selector) {
  const parent = select(selector);

  // parent.replaceChildren()

  while (parent.firstChild) {
    parent.lastChild.replaceWith(parent.lastChild.cloneNode(true)); //removes any event listener
    parent.removeChild(parent.lastChild);
  }
}

////////////////////////////////////////////////////

/**
 *
 * @param {object} obj
 * @returns {object}
 */
// function flatten(obj, parent, flattened = {}) {
//   for (let key in obj) {
//     let property = parent ? parent + "_" + key : key;
//     if (typeof obj[key] === "object") {
//       flatten(obj[key], property, flattened);
//     } else {
//       flattened[property] = obj[key];
//     }
//   }
//   return flattened;
// }
/**
 *
 * @param {object} obj
 * @returns {object}
 */
// function unFlatten(obj) {
//   Object.keys(obj).reduce((res, k) => {
//     k.split("_").reduce(
//       (acc, e, i, keys) =>
//         acc[e] ||
//         (acc[e] = isNaN(Number(keys[i + 1]))
//           ? keys.length - 1 === i
//             ? obj[k]
//             : {}
//           : []),
//       res,
//     );
//     return res;
//   }, {});
// }

function cleanArray(inString, format) {
  const inArray = inString.split(",");
  const outArray = [];
  inArray.forEach((v) => {
    const val = v.trim();
    outArray.push(format === "Number" ? Number(val) : val);
  });
  return outArray;
}
/**
 * Generate a clean array from input string
 * @param {string} input Input string with values
 * @param {string} delim Delimiter separating the values
 * @param {string} format Decides type of the result. "number" returns array of numbers else array of string items
 * @returns {string[]|number[]}
 */
function getArray(input, options = {}) {
  const { delim = ",", format = "string" } = options;
  const arr = input.split(delim);
  return format === "number"
    ? arr.map((v) => Number(v)).filter((v) => !isNaN(v))
    : arr.map((v) => String(v).trim());
}

function split(text) {
  const regex = /("[^"]*"|'[^']*'|[^,]+)/g;
  return (typeof text === "string" ? text : "")
    .match(regex)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""));
}

function toMap(arr) {
  const map = new Map();
  if (isArray(arr))
    for (let i = 0; i < arr.length; i += 2) {
      const key = arr[i];
      const value = arr[i + 1];
      map.set(key, value);
    }
  return map;
}

function getDuplicates(arr) {
  if (!isArray(arr)) return []
  const seen = {};
  const duplicates = [];

  for (const a of arr) {
    if (seen[a]) {
      duplicates.push(a);
    } else {
      seen[a] = a; // First time seeing it
    }
  }
  return duplicates
}

function sortArrayOrObjects(arrObj, { key, order = "a" }) {
  const value = (x) => (typeof key === "function" ? key(x) : x[key]);
  const sortedArrObj = arrObj.sort((a, b) => {
    const aValue = value(a);
    const bValue = value(b);
    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
    return 0;
  });
  return order === "d" ? sortedArrObj.reverse() : sortedArrObj;
}

// function sortComparator(a, b, { arrange = "a", order: [] }) {
//   const compare = arrange === "a" ? -1 : arrange === "d" ? 1 : 0;
//   const action = (a, b, c) => (a < b ? c : a > b ? -c : 0);

//   if (isArray(order)) {
//     const aIndex = order.findIndex((v) => v === a);
//     const bIndex = order.findIndex((v) => v === b);

//     if (aIndex > -1 && bIndex > -1) return action(aIndex, bIndex, -1);
//     if (aIndex > -1) return -1;
//     if (bIndex > -1) return 1;
//   }

//   return action(a, b, compare);
// }

function isEmptyObject(obj, s = false) {
  if (s) console.log({ obj, r: obj ? Object.keys(obj).length === 0 : true });
  return obj ? Object.keys(obj).length === 0 : true;
}
// function isNoValueObject(obj) {
//   const values = Object.values(obj).map((v) =>
//     typeof v === "string" ? v.trim() : "x",
//   );
//   return values.join("") === "";
// }

function is2X2(chartType) {
  return ["Risk", "2X2", "State Change"].includes(chartType);
}
const isTable = (chartType) =>
  ["Data Table", "Data Description"].includes(chartType);
const isTrend = (chartType) => ["Trend"].includes(chartType);

function niceJoin(arr, last = "and") {
  if (!isArray(arr, { type: "string" })) return "";
  const formatter = new Intl.ListFormat(undefined, {
    style: "short",
    type: last === "and" ? "conjunction" : "disjunction",
  });
  return formatter.format(arr);
}

function isInteger(n) {
  if (isNaN(n)) return false;
  return Number.isInteger(Number(n));
}

function isArray(arr, options = {}) {
  if (!Array.isArray(arr)) return false;
  // return true
  const { type, order } = options;
  const o = isString(order) ? order.toLowerCase().trim() : "";
  const t = isString(type) ? type.toLowerCase().trim() : "";

  const isTupleOrdered = (a, b) => (o === "a" ? a >= b : b >= a);
  const isOrdered =
    o === ""
      ? true
      : arr.every((v, i) => i === 0 || isTupleOrdered(v, arr[i - 1]));

  const isValidType =
    t === ""
      ? true
      : arr.every((v) => (t === "number" ? !isNaN(v) : typeof v === t));

  return isOrdered && isValidType;
}

// function firstNonBlank(...args) {
//   // const match = args.find((arg) => typeof arg === "string" && arg.trim());
//   const match = args.find((arg) => isString(arg));
//   return match ? match.trim() : "";
// }
function cleanObject(obj) {
  if (typeof obj !== "object") return {};
  const output = {};
  for (const key in obj) {
    const value = obj[key];

    if (value === undefined) continue;

    if (typeof value === "number") {
      output[key] = String(value);
      continue;
    }
    if (isArray(value)) {
      output[key] = value.map((v) => cleanObject(v));
      continue;
    }

    if (typeof value === "object") {
      output[key] = cleanObject(value);
      continue;
    }
    if (typeof value !== "string") continue;
    if (value.trim() === "") continue;
    output[key] = value.trim();
  }
  return output;
}
function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const p = createElements("p");
  p.textContent = str.trim();
  return p.innerHTML;
}
// JSON
function stringify(obj) {
  try {
    return JSON.stringify(obj);
    return [JSON.stringify(obj), null]; //todo fix
  } catch (error) {
    return '{"error":"stringify failed"}';
    return [null, error];
  }
}
function parse(str) {
  try {
    return [JSON.parse(str), null];
  } catch (error) {
    return [null, error];
  }
}

// async function isValidFile(url) {
//   if (!url) return false;
//   if (url instanceof File) return true;
//   try {
//     const response = await fetch(url, { method: "HEAD" });
//     // console.log({url,response})

//     // if (!response.ok) {
//     //   throw new Error(`HTTP error! status: ${response.status}`);
//     // }

//     const contentLength = response.headers.get("content-length");

//     if (contentLength) {
//       const sizeInBytes = parseInt(contentLength, 10);
//       console.log(`File size: ${sizeInBytes} bytes`);
//     }
//     return response.status === 200;
//   } catch (error) {
//     console.error("Error fetching URL:", error);
//     return false;
//   }
// }

// async function getFileSize(file) {
//   if (!file) return -1;
//   if (file instanceof File) return file.size;
//   if (typeof file !== "string") return -1;

//   try {
//     const response = await fetch(file, { method: "HEAD" });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const contentLength = response.headers.get("content-length");
//     if (!contentLength) {
//       throw new Error("Content-Length header is missing");
//     }

//     return parseInt(contentLength, 10);
//   } catch (error) {
//     console.error("Error fetching file size:", error);
//     return -1;
//   }
// }

async function getFileSize(file) {
  if (file instanceof File) return file.size;
  if (typeof file !== "string" || !file) return -1;

  try {
    const response = await fetch(file, { method: "HEAD" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const size = Number.parseInt(response.headers.get("content-length"), 10);
    if (Number.isNaN(size))
      throw new Error("Missing or invalid Content-Length header");

    return size;
  } catch (error) {
    console.error("Error fetching file size:", error);
    return -1;
  }
}
// array functions
//tmm = total, min, max 
const tmm = (array, accessor) => {
  const data = (accessor ? array.map((v) => accessor(v)) : [...array])
    .filter((d) => !isNaN(d))
    .map((d) => Number(d));

  return data.reduce(
    ([total, min, max], d) => [
      d + (total ?? 0),
      Math.min(min ?? d, d),
      Math.max(max ?? d, d),
    ],
    [],
  );
};

function toTuples(arr, size) {
  if (!isArray(arr)) return [];

  const n = Math.floor(Number(size));
  if (n <= 0) return arr; // Safely prevents infinite loops and invalid sizes

  const tuples = [];
  for (let i = 0; i < arr.length; i += n) {
    tuples.push(arr.slice(i, i + n));
  }
  return tuples;
}

function isDefined(arg) {
  return arg !== null || arg;
}

function isString(str) {
  return typeof str === "string" && str.trim();
}

function capitalise(str) {
  return typeof str === "string" ? str[0].toUpperCase() + str.substring(1) : "";
}

function sleep(timeInMilliSeconds) {
  return new Promise((resolve) => setTimeout(resolve, timeInMilliSeconds));
}

/////////////////////////// object validation and parsing

function getDate(date, config) {
  const err = DISPLAY_INVALID_DATE;
  if (!isString(date)) return err;
  const dates = (config?.dates ?? []).map((v) => v.trim());
  const foundIndex = dates.findIndex((d, i) => i % 2 === 0 && d === date);

  const _date = foundIndex !== -1 ? dates[foundIndex + 1] : null;
  return _date
    ? isValidDate(_date)
      ? _date.trim()
      : err
    : isValidDate(date)
      ? date.trim()
      : err;
}

// function parsePlan(plan, config = {}) {
//   if (!plan) return [[]];

//   const errors = [];
//   const presetPlans = {
//     line: [0, 1],
//     sigmoid: [0, 0.02, 0.05, 0.12, 0.27, 0.5, 0.73, 0.88, 0.95, 0.98, 1],
//   };

//   const isPreset = (points) =>
//     Object.keys(presetPlans).includes(points.toLowerCase());

//   const [startDateStr, endDateStr, scopeFrom, scopeTo, points, label] = isArray(
//     plan,
//   )
//     ? plan.map((v) => String(v).trim())
//     : [String(plan)];

//   //validation
//   const startDate = getDate(startDateStr, config);
//   const endDate = getDate(endDateStr, config);

//   if (startDateStr || endDateStr || scopeFrom || scopeTo || points) {
//     if (startDate === DISPLAY_INVALID_DATE)
//       errors.push({ plan_startDate: "Start-date must be date" });

//     if (endDate === DISPLAY_INVALID_DATE)
//       errors.push({ plan_endDate: "End-date must be date" });

//     const isValidDates =
//       startDate !== DISPLAY_INVALID_DATE && endDate !== DISPLAY_INVALID_DATE;

//     if (isValidDates && endDate < startDate)
//       errors.push({ plan_endDate: "End-date must be > Start-date" });

//     if (isNaN(scopeFrom) || Number(scopeFrom) < 0)
//       errors.push({ plan_scopeFrom: "Scope-from must be a number >= 0" });

//     const isValidScopeTo =
//       scopeTo && (scopeTo.toLowerCase() === "max" || Number(scopeTo) > 0);
//     if (!isValidScopeTo)
//       errors.push({ plan_scopeTo: `Scope-to must be "max" or a number > 0` });

//     const _points = (points ?? "").split(",");
//     const isValidPoints =
//       isString(points) &&
//       (isPreset(points) ||
//         (_points.every((n) => Number(n) >= 0) && _points.length > 1));
//     if (!isValidPoints) {
//       errors.push({
//         plan_points: `Points must be "line", "sigmoid" or an array of min two +ve numbers`,
//       });
//     }
//     return [errors, planValues()];
//   }
//   return [[]];

//   function planValues() {
//     if (errors.length > 0) return;
//     const planPoints = isPreset(points)
//       ? presetPlans[points.toLowerCase()]
//       : getArray(points, { delim: ",", format: "number" });

//     return {
//       startDate,
//       endDate,
//       scopeFrom: Number(scopeFrom),
//       scopeTo:
//         typeof scopeTo === "string" ? scopeTo.toLowerCase() : Number(scopeTo),
//       points: planPoints,
//       placeholder: `Plan (${isPreset(points) ? points : "custom"})`,
//       label, //: label.trim() === "" ? placeholder : label.trim(),
//     };
//   }
// }
function parseForecast(forecast, config) {
  if (!forecast) return [[]];

  const errors = [];
  const [lookBack, forecastToStr, label] = isArray(forecast)
    ? forecast.map((v) => String(v).trim())
    : [String(forecast)];

  let forecastTo;

  if (lookBack || forecastToStr || label) {
    const isValidLookBack = isInteger(lookBack) && Number(lookBack) > 0;
    if (!isValidLookBack)
      errors.push({
        forecast_lookBack: `Look-back must be an integer > 0`,
      });

    if (forecastToStr.toLowerCase() === "max") forecastTo = "max";
    else {
      forecastTo = getDate(forecastToStr, config);
      if (forecastTo === DISPLAY_INVALID_DATE)
        errors.push({
          forecast_forecastTo: 'Forecast-to must be "max" or a date',
        });
    }
    const placeholder =
      "Forecast" + (errors.length > 0 ? "" : ` (${Number(lookBack)} days)`);

    return [errors, { lookBack, forecastTo, label, placeholder }];
  }
  return [[]];
}
function parseChartFilter(chartFilter) {
  if (!chartFilter) return [[], null];

  const conditions = isArray(chartFilter)
    ? toTuples(chartFilter, 4)
    : [[String(chartFilter)]];
  const errors = [];
  if (conditions.length === 0) return [errors];

  function setError(key, message, i) {
    errors.push({ [`chartFilter_${key}_${i}`]: message });
  }
  const ops = ["eq", "not_eq", "in", "not_in"];
  conditions.forEach(([combinator, field, op, value], i) => {
    if (!["and", "or"].includes(combinator))
      setError("combinator", `Combine-operator must be and or or"`, i);

    if (!isString(field)) setError("field", `Field is required`, i);

    if (!ops.includes(op))
      setError("op", `Compare-operator must be ${ops.join()}`, i);

    if (!isString(value)) setError("value", `Value is required`, i);
  });

  return [errors, conditions];
}
// function parseAnnotations(annotaions, config) {
//   const positions = [
//     "th",
//     "top horizotal",
//     "tv",
//     "top vertical",
//     "mh",
//     "mid horizontal",
//     "mv",
//     "mid vertical",
//     "bh",
//     "botton horizontal",
//     "bv",
//     "bottom vertical",
//   ];
//   if (!annotaions) return [[], null, positions];

//   const _annotations = isArray(annotaions)
//     ? toTuples(annotaions, 3).map(([d, l, p]) => [getDate(d, config), l, p])
//     : [[String(annotaions)]];

//   const errors = [];

//   function setError(key, message, i) {
//     errors.push({ [`annotations_${key}_${i}`]: message });
//   }
//   const pos = positions.filter((_, i) => i % 2 === 0);

//   _annotations.forEach(([date, label, position], i) => {
//     if (date === DISPLAY_INVALID_DATE) setError("date", "Invalid date", i);

//     if (!isString(label)) setError("label", "Label is required", i);

//     if (!(isString(position) && pos.includes(position)))
//       setError("position", `Position must be ${niceJoin(pos, "or")}`, i);
//   });

//   return [errors, _annotations, positions];
// }

const _ = {
  capitalise,
  formatDate,
  isValidDate,
  dateTimeDiff,
  addDays,
  // flatten,
  // unFlatten,
  cleanArray,
  getArray,
  toMap,
  removeChildren,
  sortArrayOrObjects,
  isEmptyObject,
  // isNoValueObject,
  is2X2,
  isTable,
  // sortComparator,
  isTrend,
  niceJoin,
  isInteger,
  isArray,
  getDuplicates,
  // firstNonBlank,
  cleanObject,
  escapeHTML,
  toSentence,
  stringify,
  parse,
  toTuples,
  isString,
  getDate,
  // dom related
  // getCSSVar,
  // isValidFile,
  tmm,
  getFileSize,
  clearHTML,
  addGlobalEventListener,
  sleep,
  select,
  selectAll,
  createElements,
  //
  // parsePlan,
  parseForecast,
  parseChartFilter,
  // parseAnnotations,
};
// })();

function saveCounts(x) {
  setItem("allCounts", JSON.stringify(x));
}
function getCounts() {
  return JSON.parse(getItem("allCounts"));
}

function setItem(key, value) {
  localStorage.setItem(key, value);
  // store[key] = value
}
function getItem(key) {
  return localStorage.getItem(key);
  // console.assert(store[key], `${key} is not found`)
  // return store[key]
}

// function getChartId(key) {
//   return "chart-" + key;
// }

function getChartId(key) {
  return "chart-" + key;
}
// function getKey(id) {
//   return id.replace("chart-", "");
// }
function clearCounts() {
  saveCounts({});
}
function toSentence(str) {
  //camel case to sentence
  if (!str) return "Undefined";
  const parts = str.split(/(?=[A-Z])/);
  let label = parts.join(" ").toLowerCase();
  return label[0].toUpperCase() + label.substring(1);
}
