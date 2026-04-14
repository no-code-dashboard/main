"use strict";
import { _ } from "../util.js";

export { AnnotationUi, PlanUi, ChartFilterUi, ForecastUi, CountTypeUi, AxisUi };

const SHOW = { attrs: ["class", "hide", "remove"], applyTo: "wrapper" };
const HIDE = { attrs: ["class", "hide", "add"], applyTo: "wrapper" };
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

    const labelPlaceholder = "Plan";
    const [startDate, endDate, scopeFrom, scopeTo, points, label] = plan
      .split(",")
      .map((v) => v.trim());
    const errs = [];
    if (startDate || endDate || scopeFrom || scopeTo || points) {
      if (!_.isValidDate(startDate)) errs.push("Start date must be date");

      if (_.isValidDate(endDate)) {
        const isEndGtStart =
          _.isValidDate(endDate) &&
          _.isValidDate(startDate) &&
          endDate > startDate;
        if (!isEndGtStart) errs.push("End date must be > start");
      } else errs.push("End date must be date");

      if (isNaN(scopeFrom) || Number(scopeFrom) < 0)
        errs.push("Scope from must be a number >= 0");

      const isValidScopeTo =
        scopeTo && (scopeTo.toLowerCase() === "max" || Number(scopeTo) > 0);
      if (!isValidScopeTo) errs.push(`Scope to must be max or a number`);

      const isValidPoints =
        points &&
        (isPreset(points) ||
          _.getArray(points, { delim: " ", format: "number" }).length >= 2);
      if (!isValidPoints)
        errs.push(
          `Points to must be "line", "sigmoid" or an array of min 2 numbers`,
        );
    }
    if (errs.length > 0) errors.push({ plan: errs.join(", ") });
    return [errors, warnings, attributes, planValues()];

    function planValues() {
      if (errors.length > 0) return;
      const planPoints = isPreset(points)
        ? presetPlans[points.toLowerCase()]
        : _.getArray(points, { delim: " ", format: "number" });

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
  static validate(values) {
    const [errors, warnings, attributes] = [[], [], []];
    const { forecast } = values;
    if (!_.isPresent(forecast)) return { errors, warnings, attributes };

    const [lookBack, forecastTo, label] = forecast
      .split(",")
      .map((v) => v.trim());
    let labelPlaceholder = "Forecast";
    const errs = [];
    if (lookBack || forecastTo || label) {
      const isValidLookBack = _.isInteger(lookBack) && Number(lookBack) > 0;
      if (isValidLookBack) labelPlaceholder += ` (${Number(lookBack)} days)`;
      else errs.push("Look back must be a integer > 0");

      const isValidForecastTo =
        forecastTo.toLowerCase() === "max" || _.isValidDate(forecastTo);
      if (!isValidForecastTo) errs.push(`Forecast to must be "max" or date`);
    }
    if (errs.length > 0) errors.push({ forecast: errs.join(", ") });
    return [errors, warnings, attributes, forecastValues()];

    function forecastValues() {
      if (errs.length > 0) return;
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
            default: "and",
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
            default: "in",
          },
          { tag: "text", label: "RHS", name: "value" },
        ],
      },
    ];
  }
  static validate(values) {
    const [errors, warnings, attributes] = [[], [], []];

    const { chartFilter } = values;
    // if (values["chartFilter--"]) {
    //   // const logicalOp = values["chartFilter-logicalOp"];
    //   // const column = values["chartFilter-column"];
    //   // const compareOp = values["chartFilter-compareOp"];
    //   const value = values["chartFilter-value"];

    //   if (!_.isPresent(value))
    //     errors.push({ "chartFilter-value": "Value required" });
    // }
    // return { errors, attributes, chartFilter: fiterValues() };
    const conditions = _.toRows(chartFilter, 4).map((row, i) => ({ row, i }));

    if (conditions.length === 0) return [errors, warnings, attributes];

    const errorMessage = [];

    // if (conditions.length > 0)
    //   errors.push({ "chartFilter-cell-0-0": `Condition required` });
    // else
    conditions.forEach((quad, j) => {
      const { row } = quad;
      const [relationalOp, lhs, LogicalOp, rhs] = row;
      let isRowNumShown = false;
      function setError(message) {
        errorMessage.push((isRowNumShown ? "" : `Row ${j + 1}: `) + message);
        isRowNumShown = true;
      }

      if (!_.isPresent(relationalOp)) setError(`Relational op required`);

      if (!_.isPresent(lhs)) setError(`LHS required`);

      if (!_.isPresent(LogicalOp)) setError(`Logical op required`);

      if (!_.isPresent(rhs)) setError(`RHS required`);
    });

    if (errorMessage.length > 0)
      errors.push({ chartFilter: errorMessage.join(", ") });

    return [errors, warnings, attributes, fiterValues()];

    function fiterValues() {
      if (errors.length > 0) return;
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
          {
            tag: "date",
            label: "Date",
            name: "date",
          },
          { tag: "text", label: "Label", name: "label" },
          {
            tag: "select",
            options: AnnotationUi.positions,
            label: "Position",
            name: "position",
            default: AnnotationUi.positions[0],
          },
        ],
      },
    ];
  }
  static validate(values) {
    const { annotations } = values;
    const [errors, warnings, attributes] = [[], [], []];

    if (!_.isPresent(annotations)) return [errors, warnings, attributes];
    const annotationArray = _.toRows(annotations, 3).map((row, i) => ({
      row,
      i,
    }));

    if (annotationArray.length === 0) return [errors, warnings, attributes];

    const errorMessage = [];
    annotationArray.forEach((triplet, j) => {
      const { row, i } = triplet;
      const [date, label, position] = row;
      let isRowNumShown = false;
      function setError(message) {
        errorMessage.push((isRowNumShown ? "" : `Row ${j + 1}: `) + message);
        isRowNumShown = true;
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
        : countType
          ? countType.toLowerCase()
          : "count";
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
