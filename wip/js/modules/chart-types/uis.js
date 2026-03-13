"use strict";
import { _ } from "../util.js";

export { AnnotationUi, PlanUi, ChartFilterUi, ForecastUi, CountTypeUi, AxisUi };

const SHOW = { attrs: ["class", "hide", "remove"], applyToWrapper: true };
const HIDE = { attrs: ["class", "hide", "add"], applyToWrapper: true };
const ENABLE = ["disabled", false];
const DISABLE = ["disabled", true];

class PlanUi {
  static elements() {
    return [
      {
        tag: "object",
        name: "plan",
        label: "Plan",
        elements: [
          { tag: "date", label: "Start date", name: "startDate" },
          { tag: "date", label: "End date", name: "endDate" },
          {
            tag: "text",
            label: "Scope from",
            name: "scopeFrom",
            placeholder: "0",
          },
          { tag: "text", label: "Scope to", name: "scopeTo", list: ["Max"] },
          {
            tag: "text",
            label: "Points",
            name: "points",
            list: ["line", "sigmoid"],
          },
          {
            tag: "text",
            label: "Label",
            name: "label",
            placeholder: "Plan",
          },
        ],
      },
    ];
  }
  static validate(values /*, errors, attributes*/) {
    const [errors, warnings, attributes] = [[], [], []];
    const presetPlans = {
      line: [0, 1],
      sigmoid: [0, 0.02, 0.05, 0.12, 0.27, 0.5, 0.73, 0.88, 0.95, 0.98, 1],
    };
    const isPreset = (points) =>
      Object.keys(presetPlans).includes(points.toLowerCase());

    const { plan } = values;
    if (!_.isPresent(plan)) return [errors, warnings, attributes];

    const [planObj, error] = _.parse(plan);
    if (error) {
      errors.push({ plan: error });
      return [errors, warnings, attributes];
    }

    let planHasError = false;
    const labelPlaceholder = "Plan";
    const { startDate, endDate, scopeFrom, scopeTo, points, label } = planObj;
    if (startDate || endDate || scopeFrom || scopeTo || points) {
      const prefix = "plan-";
      const err = (e) => {
        const [key, value] = Object.entries(e)[0];
        errors.push({ [prefix + key]: value });
        planHasError = true;
      };

      if (!_.isValidDate(startDate))
        err({ startDate: "Start date must be date" });

      if (_.isValidDate(endDate)) {
        const isEndGtStart =
          _.isValidDate(endDate) &&
          _.isValidDate(startDate) &&
          endDate > startDate;
        if (!isEndGtStart) err({ endDate: "End date must be > start date" });
      } else err({ endDate: "End date must be date" });

      if (isNaN(scopeFrom) || Number(scopeFrom) < 0)
        err({ scopeFrom: "Scope from must be a number >= 0" });

      const isValidScopeTo =
        scopeTo && (scopeTo.toLowerCase() === "max" || Number(scopeTo) > 0);
      if (!isValidScopeTo) err({ scopeTo: `Scope to must be max or a number` });

      const isValidPoints =
        points &&
        (isPreset(points) ||
          _.getArray(points, { format: "number" }).length >= 2);
      if (!isValidPoints)
        err({
          points: `Points to must be "line" or "sigmoid" or an array of min 2 numbers`,
        });
    }

    return [errors, warnings, attributes, planValues()];

    function planValues() {
      if (planHasError) return;
      const planPoints = isPreset(points)
        ? presetPlans[points.toLowerCase()]
        : _.getArray(points, { format: "number" });

      return {
        startDate,
        endDate,
        scopeFrom: Number(scopeFrom),
        scopeTo:
          typeof scopeTo === "string" ? scopeTo.toLowerCase() : Number(scopeTo),
        points: planPoints,
        label: label.trim() === "" ? labelPlaceholder : label.trim(),
      };
    }
  }
}
class ForecastUi {
  static elements() {
    return [
      {
        tag: "object",
        name: "forecast",
        label: "Forecast",
        elements: [
          { tag: "text", label: "Look back", name: "lookBack" },
          {
            tag: "date-select",
            label: "Forecast to",
            name: "forecastTo",
            options: "max",
          },
          {
            tag: "text",
            label: "Label",
            name: "label",
            placeholder: "Forecast",
          },
        ],
      },
    ];
  }
  static validate(values /*, errors, attributes*/) {
    const [errors, warnings, attributes] = [[], [], []];
    const { forecast } = values;
    if (!_.isPresent(forecast)) return { errors, attributes };
    const [forecastObj, error] = _.parse(forecast);

    if (error) {
      errors.push({ forecast: error });
      return [errors, warnings, attributes];
    }

    const prefix = "forecast-";

    const { lookBack, forecastTo, label } = forecastObj;
    let labelPlaceholder = "Forecast";
    let forecastHesError = false;
    if (lookBack || forecastTo || label) {
      const err = (e) => {
        const [key, value] = Object.entries(e)[0];
        errors.push({ [prefix + key]: value });
        forecastHesError = true;
      };
      const isValidLookBack = _.isInteger(lookBack) && Number(lookBack) > 0;

      if (isValidLookBack) labelPlaceholder += ` (${Number(lookBack)} days)`;
      else err({ lookBack: "Look back must be a integer > 0" });
      const isValidForecastTo =
        forecastTo.toLowerCase() === "max" || _.isValidDate(forecastTo);
      if (!isValidForecastTo)
        err({ forecastTo: `Forecast to must be "max" or date` });

      attributes.push({
        name: prefix + "label",
        attrs: ["placeholder", labelPlaceholder],
      });
    }

    return [errors, warnings, attributes, forecastValues()];

    function forecastValues() {
      if (forecastHesError) return;

      return {
        lookBack,
        forecastTo:
          typeof forecastTo === "string"
            ? forecastTo.toLowerCase()
            : Number(forecastTo),
        label: label.trim() === "" ? labelPlaceholder : label.trim(),
      };
    }
  }
}
class ChartFilterUi {
  static elements({ config }) {
    // "action: exclude|include, where: [column, eq|neq, val|[v1,v2], and|or ...]",
    const columns = config.columnNames;

    return [
      {
        tag: "table",
        label: "Chart filter",
        name: "chartFilter",
        elements: [
          {
            tag: "select",
            options: ["and", "or"],
            label: "Relational op",
            name: "logicalOp",
          },
          {
            tag: "select",
            options: columns,
            label: "LHS",
            name: "column",
          },
          {
            tag: "select",
            options: ["eq", "neq", "in", "nin"],
            label: "Logical op",
            name: "compareOp",
          },
          { tag: "text", label: "RHS", name: "value" },
        ],
      },
    ];
  }
  static validate(values) {
    const [errors, warnings, attributes] = [[], [], []];

    const { chartFilter } = values;
    const errBefore = errors.length;
    if (values["chartFilter--"]) {
      // const logicalOp = values["chartFilter-logicalOp"];
      // const column = values["chartFilter-column"];
      // const compareOp = values["chartFilter-compareOp"];
      const value = values["chartFilter-value"];

      if (!_.isPresent(value))
        errors.push({ "chartFilter-value": "Value required" });
    }
    // return { errors, attributes, chartFilter: fiterValues() };
    const conditions = _.toRows(chartFilter, 4)
      .map((row, i) => ({ row, i }))
      .filter((v) => v.row.join("").trim() !== "");

    if (conditions.length === 0) return [errors, warnings, attributes];

    const errorMessage = [];

    // if (conditions.length > 0)
    //   errors.push({ "chartFilter-cell-0-0": `Condition required` });
    // else
    conditions.forEach((quad, j) => {
      const { row, i } = quad;
      // const prefix = "chartFilter-cell-" + i + "-";
      const [andOr, column, op, values] = row;

      function setError(message) {
        errorMessage.push(message + ` in row ${j + 1}`);
      }

      if (!_.isPresent(column)) setError(`Column required`);

      if (!_.isPresent(op)) setError(`Op required`);

      if (!_.isPresent(values)) setError(`Values required`);

      if (i > 0 && _.isPresent(andOr)) setError(`And/or required`);
    });

    return [errors, warnings, attributes, fiterValues()];

    function fiterValues() {
      return;
      if (errors.length > errBefore) return;
      // if (!_.isPresent(chartFilterType)) return;
      // if (chartFilterType.toLowerCase() === "none") return;
      const where = conditions.map((quad) => {
        const [andOr, column, op, values] = quad.row;
        return { column, op, values, andOr };
      });
      // console.log({ action: chartFilterType.toLowerCase(), where });
      // return { action: chartFilterType.toLowerCase(), where };
      return where;
    }
  }
}
class AnnotationUi {
  static positions = ["th", "tv", "mh", "mv", "bh", "bv"];
  static new_positions = [
    ["h", "v"],
    ["top", "mid", "bottom"],
  ];
  static elements() {
    return [
      {
        tag: "table",
        label: "Annotations",
        name: "annotations",
        elements: [
          { tag: "date", label: "Date", name: "date" },
          { tag: "text", label: "Label", name: "label" },
          {
            tag: "select",
            options: AnnotationUi.positions,
            label: "Position",
            name: "position",
          },
        ],
      },
    ];
  }
  static validate(values /*, errors, attributes*/) {
    const { annotations } = values;
    const [errors, warnings, attributes] = [[], [], []];
    if (values["annotations--"]) {
      const annoationsDate = values["annotations-date"];
      const annoationsLabel = values["annotations-label"];
      const annoationsPosition = values["annotations-position"];

      if (!_.isValidDate(annoationsDate))
        errors.push({ "annotations-date": "Invalid date" });

      if (!_.isPresent(annoationsLabel))
        errors.push({ "annotations-label": "Label required" });

      if (!AnnotationUi.positions.includes(annoationsPosition))
        setError("Invalid position");
    }

    if (!_.isPresent(annotations)) return [errors, warnings, attributes];

    const annotationArray = _.toRows(annotations, 3)
      .map((row, i) => ({ row, i }))
      .filter((v) => v.row.join("").trim() !== "");
    if (annotationArray.length === 0) return [errors, warnings, attributes];

    const errorMessage = [];
    annotationArray.forEach((triplet, j) => {
      // console.log(triplet);
      const { row, i } = triplet;
      const [date, label, position] = row;

      function setError(message) {
        errorMessage.push(message + ` in row ${j + 1}`);
      }

      if (!_.isValidDate(date)) setError("Invalid date");

      if (!_.isPresent(label)) setError("Label required");

      if (!AnnotationUi.positions.includes(position))
        setError("Invalid position");
    });

    if (errorMessage.length > 0)
      errors.push({ annotations: errorMessage.join(", ") });

    return [errors, warnings, attributes, getannotations()];

    function getannotations() {
      if (errorMessage.length > 0) return;
      return annotationArray;
    }
  }
}
/*
validation of the srting
validation of form that uses validation of string
*/
class CountTypeUi {
  static elements({ config, hasColOver = true }) {
    const columns = config.columnNames;
    return [
      {
        tag: "details",
        legend: "Count type",
        elements: [
          {
            tag: "select",
            value: "Count",
            options: ["Count", "Sum", "Average"],
            label: "Type",
            name: "countType",
          },
          hasColOver
            ? {
                tag: "select",
                label: "Over column",
                options: columns,
                name: "colOver",
              }
            : {},
        ],
      },
    ];
  }
  static validate(values) {
    const { countType, colOver } = values;
    const [errors, warnings, attributes] = [[], [], []];
    if (colOver) {
      attributes.push({ name: "colOver", attrs: DISABLE });
      if (countType !== "Count")
        attributes.push({ name: "colOver", attrs: ENABLE });
    }
    return [errors, warnings, attributes];
  }
  static description({ countType, colOver }) {
    return countType === "Count"
      ? "count"
      : colOver
        ? (countType === "Sum" ? "summed" : "average") + " " + colOver
        : countType.toLowerCase();
  }
}
class AxisUi {
  static elements(options) {
    const { config, prefix, legend } = options;
    const dataTypes = options?.dataTypes ?? [
      "Date",
      "Number",
      "String",
      "List",
    ];
    const columns = config.columnNames;
    // console.log({ config });
    const els = [
      { tag: "select", label: "Column", options: columns, name: "column" },
      {
        tag: "select",
        label: "Data type",
        options: dataTypes.sort(),
        value: "String",
        name: "dataType",
      },
      {
        tag: "select",
        label: "Date formats",
        value: "MMM",
        options: ["YYYY", "MMM", "MMM-YY", "DDD", "DD", "W8", "4W4", "8W"],
        name: "dateFormat",
      },
      { tag: "text", label: "Bin values", name: "bin" },
      {
        tag: "text",
        label: "List separator",
        value: ",",
        name: "separator",
      },
      { tag: "text", label: "Axis labels", name: "labels" },
      { tag: "text", label: "Axis title", name: "label" },
    ];
    const elements = els.map((e) =>
      e.name ? { ...e, name: prefix + e.name } : e,
    );
    // return elements;
    // return [{ tag: "fieldset", legend, elements }];
    return [{ tag: "details", legend, elements }];
  }
  static validate(values, /*errors, attributes,*/ prefix) {
    const fix = (names) =>
      Array.isArray(names) ? names.map((v) => prefix + v) : prefix + names;
    const dataType = values[fix("dataType")];
    const [errors, warnings, attributes] = [[], [], []];
    attributes.push({
      names: fix(["dateFormat", "bin", "separator", "labels"]),
      ...HIDE,
    });

    const show = (x) => attributes.push({ name: fix(x), ...SHOW });

    if (dataType === "Date") show("dateFormat");

    if (dataType === "Number") {
      show("bin");
      const bin = values[fix("bin")];
      const isValidBin = () => {
        if (!bin) return true;
        if (bin.trim() === "") return true;
        if (!isNaN(bin)) {
          if (_.isInteger(bin)) if (Number(bin) > 1) return true;
          return false;
        }
        const bins = bin.split(",");
        // if (!Array.isArray(binArray)) return false; //err("x_bin", binError, errors);
        if (bins.length < 2) return false; //err("x_bin", binError, errors);
        for (let i = 0; i <= bins.length - 1; i++) {
          const v = Number(bins[i]);
          if (isNaN(v)) return false; //err("x_bin", binError, errors);
          if (i > 0 && v <= Number(bins[i - 1])) return false; //err("x_bin", binError, errors);
        }
        return true;
      };
      if (!isValidBin())
        errors.push({
          name: fix("bin"),
          message: "Must be integer > 1 or list of increasing numbers",
        });
    }

    if (dataType === "List" || dataType === "List Members") show("separator");

    if (dataType === "String") show("labels");
    return [errors, warnings, attributes];
  }
}
