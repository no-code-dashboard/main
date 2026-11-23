"use strict";
import { ANNOTATION_POSITIONS } from "../common.js";
import { Dialog } from "../dialog/dialog.js";
import { _ } from "../util.js";
import {
  validateAnnotations,
  validatePlan,
  validateForecast,
} from "../validation.js";

export { AnnotationUi, PlanUi, ChartFilterUi, ForecastUi, CountTypeUi, AxisUi };

const SHOW = { attrs: ["class-remove", "hide"], applyTo: "wrapper" };
const HIDE = { attrs: ["class-add", "hide"], applyTo: "wrapper" };
const ENABLE = ["disabled"];
const DISABLE = ["disabled", "disabled"];

class PlanUi {
  static elements({ config }) {
    return [
      {
        tag: "object",
        name: "plan",
        label: "Plan",
        elements: [
          {
            tag: "date",
            label: "Start date",
            name: "startDate",
            options: config.dates ?? [],
          },
          {
            tag: "date",
            label: "End date",
            name: "endDate",
            options: config.dates ?? [],
          },
          {
            tag: "text",
            label: "Scope from",
            name: "scopeFrom",
            placeholder: "0",
          },
          {
            tag: "text",
            label: "Scope to",
            name: "scopeTo",
            options: ["max", "to max value"],
            placeholder: "Pick tag or enter number...",
          },
          {
            tag: "text",
            label: "Points",
            name: "points",
            options: ["line", "", "sigmoid", ""],
            placeholder: "Pick tag or enter numbers...",
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
  static validate(values, config) {
    const { plan } = values;
    const [errors, planObj] = validatePlan(plan, config);

    const { placeholder = "Plan" } = planObj ?? {};

    const attributes = [
      { name: "plan_label", attrs: ["placeholder", placeholder ?? ""] },
    ];
    return [errors, [], attributes];
  }
}
class ForecastUi {
  static elements({ config }) {
    // const dates = (config.dates ?? []).filter((_, i) => i % 2 === 0).join(",");
    return [
      {
        tag: "object",
        name: "forecast",
        label: "Forecast",
        elements: [
          { tag: "text", label: "Look back", name: "lookBack" },
          {
            tag: "date",
            label: "Forecast to",
            name: "forecastTo",
            options: ["max", "to max value", ...(config.dates ?? [])],
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
  static validate(values, config) {
    const { forecast } = values;
    // const [errors, forecastObj] = _.parseForecast(forecast, config);
    const [errors, forecastObj] = validateForecast(forecast, config);

    const { placeholder = "Forecast" } = forecastObj ?? {};

    const attributes = [
      { name: "forecast_label", attrs: ["placeholder", placeholder] },
    ];

    return [errors, [], attributes];
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
        item: "Condition",
        elements: [
          {
            tag: "select",
            options: ["and", "or"],
            label: "Combine operator",
            name: "combinator",
          },
          {
            tag: "select",
            options: columns,
            label: "Field",
            name: "field",
          },
          {
            tag: "select",
            options: ["eq", "not_eq", "in", "not_in"],
            label: "Compare operator",
            name: "op",
          },
          { tag: "text", label: "Value", name: "value" },
        ],
      },
    ];
  }
  static validate(values) {
    const [errors, warnings, attributes] = [[], [], []];
    const { chartFilter } = values;
    const conditions = _.toTuples(chartFilter, 4).map((row, i) => ({ row, i }));

    if (conditions.length === 0) return [errors, warnings, attributes];

    conditions.forEach((quad, j) => {
      const { row } = quad;

      const [combinator, field, op, value] = row;
      function setError(key, message) {
        errors.push({ [`chartFilter_${key}_${j}`]: message });
      }

      if (!_.isString(combinator)) setError("combinator", `and/or required`);

      if (!_.isString(field)) setError("field", `Field required`);

      if (!_.isString(op)) setError("op", `Compare operator required`);

      if (!_.isString(value)) setError("value", `Value required`);
    });

    //can we hide
    Dialog.setElementsAttrs({
      name: `chartFilter_combinator_0`,
      ...HIDE,
    });

    return [errors, warnings, attributes, fiterValues()];

    function fiterValues() {
      if (errors.length > 0) return;
      const where = conditions.map((quad) => {
        const [andOr, column, op, values] = quad.row;
        return { column, op, values, andOr };
      });
      return where;
    }
  }
}
class AnnotationUi {
  static elements({ config }) {
    const dates = (config.dates ?? []).join(",");
    //const [, , positions] = _.parseAnnotations();

    return [
      {
        tag: "table",
        label: "Annotations",
        name: "annotations",
        item: "Annotation",
        elements: [
          {
            tag: "date",
            label: "Date",
            name: "date",
            options: config.dates ?? [],
          },
          { tag: "text", label: "Label", name: "label" },
          {
            tag: "text",
            options: ANNOTATION_POSITIONS,
            label: "Position",
            name: "position",
            value: ANNOTATION_POSITIONS[0],
          },
        ],
      },
    ];
  }
  static validate(values, config) {
    const { annotations } = values;
    // const [errors, annotationArray] = _.parseAnnotations(annotations, config);
    const [errors, annotationArray] = validateAnnotations(annotations, config);

    const [warnings, attributes] = [[], []];

    return [errors, warnings, attributes, getannotations()];

    function getannotations() {
      if (errors.length > 0) return;
      return annotationArray;
    }
  }
}
class CountTypeUi {
  static elements({ config }) {
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
          {
            tag: "select",
            label: "Over column",
            options: columns,
            name: "colOver",
          },
        ],
      },
    ];
  }
  static validate(values) {
    const { countType, colOver } = values;
    const [errors, warnings, attributes] = [[], [], []];
    attributes.push({ name: "colOver", attrs: DISABLE });
    // if (colOver) {
    // attributes.push({ name: "colOver", attrs: DISABLE });
    if (countType !== "Count")
      attributes.push({ name: "colOver", attrs: ENABLE });
    // }
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
      { tag: "text", label: "Categories", name: "categories" },
      { tag: "text", label: "Axis label", name: "label" },
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
      _.isArray(names) ? names.map((v) => prefix + v) : prefix + names;
    const dataType = values[fix("dataType")];
    const [errors, warnings, attributes] = [[], [], []];
    attributes.push({
      name: fix(["dateFormat", "bin", "separator", "categories"]),
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
        // if (!_.isArray(binArray)) return false; //err("x_bin", binError, errors);
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

    if (dataType === "String") show("categories");
    return [errors, warnings, attributes];
  }
}
