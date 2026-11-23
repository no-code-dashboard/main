/*
Error stategy

Definition or config validation in this code

called by dialog and counter 

all return [error, chartProps] where chartProps is ready to use

*/
import { _ } from "../modules/util.js";
import {
  DISPLAY_OTHERS,
  DISPLAY_INVALID,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID_DATE,
  DISPLAY_SPACES,
  DISPLAY_LESS,
  DISPLAY_MORE,
  ANNOTATION_POSITIONS,
  isInvalidDisplay,
  displayOrder,
  MONTHS,
  WORKDAYS,
  WEEKDAYS,
} from "../modules/common.js";
export {
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
};

function validatePlan(plan, config = {}) {
  if (!plan) return [[]];

  const errors = [];
  const presetPlans = {
    line: [0, 1],
    sigmoid: [0, 0.02, 0.05, 0.12, 0.27, 0.5, 0.73, 0.88, 0.95, 0.98, 1],
  };

  const isPreset = (points) =>
    Object.keys(presetPlans).includes(points.toLowerCase());

  const [startDateStr, endDateStr, scopeFrom, scopeTo, points, label] =
    _.isArray(plan) ? plan.map((v) => String(v).trim()) : [String(plan)];

  //validation
  const startDate = _.getDate(startDateStr, config);
  const endDate = _.getDate(endDateStr, config);

  if (startDateStr || endDateStr || scopeFrom || scopeTo || points) {
    if (startDate === DISPLAY_INVALID_DATE)
      errors.push({ plan_startDate: "Start-date must be date" });

    if (endDate === DISPLAY_INVALID_DATE)
      errors.push({ plan_endDate: "End-date must be date" });

    const isValidDates =
      startDate !== DISPLAY_INVALID_DATE && endDate !== DISPLAY_INVALID_DATE;

    if (isValidDates && endDate < startDate)
      errors.push({ plan_endDate: "End-date must be > Start-date" });

    if (isNaN(scopeFrom) || Number(scopeFrom) < 0)
      errors.push({ plan_scopeFrom: "Scope-from must be a number >= 0" });

    const isValidScopeTo =
      scopeTo && (scopeTo.toLowerCase() === "max" || Number(scopeTo) > 0);
    if (!isValidScopeTo)
      errors.push({ plan_scopeTo: `Scope-to must be "max" or a number > 0` });

    const _points = (points ?? "").split(",");
    const isValidPoints =
      _.isString(points) &&
      (isPreset(points) ||
        (_points.every((n) => Number(n) >= 0) && _points.length > 1));
    if (!isValidPoints) {
      errors.push({
        plan_points: `Points must be "line", "sigmoid" or an array of min two +ve numbers`,
      });
    }
    return [errors, planValues()];
  }
  return [[], {}];

  function planValues() {
    if (errors.length > 0) return;
    const planPoints = isPreset(points)
      ? presetPlans[points.toLowerCase()]
      : getArray(points, { delim: ",", format: "number" });

    return {
      startDate,
      endDate,
      scopeFrom: Number(scopeFrom),
      scopeTo:
        typeof scopeTo === "string" ? scopeTo.toLowerCase() : Number(scopeTo),
      points: planPoints,
      placeholder: `Plan (${isPreset(points) ? points : "custom"})`,
      label, //: label.trim() === "" ? placeholder : label.trim(),
    };
  }
}
function validateForecast(forecast, config) {
  if (!forecast) return [[]];

  const errors = [];
  const [lookBack, forecastToStr, label] = _.isArray(forecast)
    ? forecast.map((v) => String(v).trim())
    : [String(forecast)];

  let forecastTo;

  if (lookBack || forecastToStr || label) {
    const isValidLookBack = _.isInteger(lookBack) && Number(lookBack) > 0;
    if (!isValidLookBack)
      errors.push({
        forecast_lookBack: `Look-back must be an integer > 0`,
      });

    if (forecastToStr.toLowerCase() === "max") forecastTo = "max";
    else {
      forecastTo = _.getDate(forecastToStr, config);
      if (forecastTo === DISPLAY_INVALID_DATE)
        errors.push({
          forecast_forecastTo: 'Forecast-to must be "max" or a date',
        });
    }
    const placeholder =
      "Forecast" + (errors.length > 0 ? "" : ` (${Number(lookBack)} days)`);

    return [errors, { lookBack, forecastTo, label, placeholder }];
  }
  return [[], {}];
}
function validateChartFilter(chartFilter) {
  if (!chartFilter) return [[], null];

  const conditions = _.isArray(chartFilter)
    ? _.toTuples(chartFilter, 4)
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

    if (!_.isString(field)) setError("field", `Field is required`, i);

    if (!ops.includes(op))
      setError("op", `Compare-operator must be ${ops.join()}`, i);

    if (!_.isString(value)) setError("value", `Value is required`, i);
  });

  return [errors, conditions];
}

function validateAnnotations(annotaions, config) {
  if (!annotaions) return [[], null];

  const _annotations = _.isArray(annotaions)
    ? _.toTuples(annotaions, 3).map(([d, l, p]) => [_.getDate(d, config), l, p])
    : [[String(annotaions)]];

  const errors = [];

  function setError(key, message, i) {
    errors.push({ [`annotations_${key}_${i}`]: message });
  }
  const pos = ANNOTATION_POSITIONS.filter((_, i) => i % 2 === 0);

  _annotations.forEach(([date, label, position], i) => {
    if (date === DISPLAY_INVALID_DATE) setError("date", "Invalid date", i);

    if (!_.isString(label)) setError("label", "Label is required", i);

    if (!(_.isString(position) && pos.includes(position)))
      setError("position", `Position must be ${_.niceJoin(pos, "or")}`, i);
  });

  return [errors, _annotations];
}

function validateNoteProp(chartProps) {
  return [[], chartProps];
}
function validateBarProp(chartProps) {
  return [[], chartProps];
}
function validate2x2Prop(chartProps) {
  return [[], chartProps];
}
function validateRiskProp(chartProps) {
  return [[], chartProps];
}
function validateStateChangeProp(chartProps) {
  return [[], chartProps];
}
function validatePlanProp(chartProps, columnNames) {
  const errors = [];
  // const { descriptionCol } = chartProps;
  ["descriptionCol", "startDateCol", "endDateCol"].forEach((col) => {
    if (!chartProps[col]) errors.push({ [col]: "Required" });
  });
  // if (!descriptionCol) errors.push({ descriptionCol: "Required" });

  // const { startDateCol, endDateCol } = chartProps;
  // if (!startDateCol) errors.push({ startDateCol: "Required" });
  // if (!endDateCol) errors.push({ endDateCol: "Required" });

  const { secondStartDateCol, secondEndDateCol } = chartProps;
  if (secondStartDateCol || secondEndDateCol) {
    if (!secondStartDateCol) errors.push({ secondStartDateCol: "Required" });
    if (!secondEndDateCol) errors.push({ secondEndDateCol: "Required" });
  }

  const { ragCol, ragMap } = chartProps;

  const bragError = "BRAG array required";

  if (ragCol && !ragMap) errors.push({ ragMap: bragError });
  if (ragCol && ragMap) {
    const ABGR = _.cleanArray(ragMap)
      .filter((v) => v)
      .map((v) => v.toUpperCase());
    if (
      ABGR.length !== 8 ||
      ABGR.filter((_, i) => i % 2 !== 0)
        .sort()
        .join("") !== "ABGR"
    )
      errors.push({ ragMap: bragError });
  }

  const columns = [
    "descriptionCol",
    "startDateCol",
    "endDateCol",
    "secondStartDateCol",
    "secondEndDateCol",
    "ragCol",
  ].filter((col) => chartProps[col]);

  if (columnNames)
    columns.forEach((c) => {
      if (!columnNames.includes(chartProps[c]))
        errors.push({ [c]: `Invalid, not in config` });
    });

  const seen = {};
  const duplicates = [];

  for (const c of columns) {
    const col = chartProps[c];
    if (seen[col]) {
      duplicates.push(c);
    } else {
      seen[col] = col; // First time seeing it
    }
  }
  duplicates.forEach((v) => errors.push({ [v]: "Must be different" }));

  return [errors, chartProps];
}
function validateTrendProp(chartProps) {
  return [[], chartProps];
}
function validateDataDescriptionProp(chartProps) {
  return [[], chartProps];
}
function validateDataTableProp(chartProps) {
  return [[], chartProps];
}
