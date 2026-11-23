// import { extent as d3Extent } from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { _ } from "../util.js";
import { ChartFilterUi, CountTypeUi, AxisUi } from "./uis.js";

export { risk, twoByTwo, stateChange };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALLOUT_VALUE_TYPES = ["Max", "Min", "Categories"];
const COUNT_LABELS_PLACEHOLDER = "VL, L, M, H, VH";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLabels(chartProps) {
  const { x_label, x_column, y_label, y_column } = chartProps;
  return { x_label: x_label || x_column, y_label: y_label || y_column };
}

// TODO: move this to niceJoin?
function category(cats) {
  const [first, ...rest] = _.isArray(cats) ? cats : [];
  const length = rest.length;
  if (!first) return "NA";
  if (length === 0) return first;
  return `${first} & ${length} more`;
}

/** Turns a presets function into the placeholder attributes for each field. */
function placeholderAttributes(presets, chartProps) {
  return Object.entries(presets(chartProps)).map(([name, value]) => ({
    name,
    attrs: ["placeholder", value],
  }));
}

/** Column select + label + value-map inputs for one axis. */
const axisElements = (columns, prefix, mapLabel) => [
  { tag: "select", options: columns, name: prefix + "column", label: "Column" },
  { tag: "text", label: mapLabel, name: prefix + "labels" },
  { tag: "text", label: "Axis label", name: prefix + "label" },
];

const axisGroups = (columns, mapLabel) => [
  {
    tag: "details",
    legend: "Horizontal axis",
    elements: axisElements(columns, "x_", mapLabel),
  },
  {
    tag: "details",
    legend: "Vertical axis",
    elements: axisElements(columns, "y_", mapLabel),
  },
];

// common callout functions
const calloutOverlay = (options) => [
  {
    tag: "select",
    name: "valueType",
    label: "Value type",
    options: CALLOUT_VALUE_TYPES,
  },
  {
    tag: "select",
    label: options?.x_label,
    name: "x_category",
    options: options?.x,
  },
  {
    tag: "select",
    label: options?.y_label,
    name: "y_category",
    options: options?.y,
  },
  { tag: "text", label: "Message", name: "message" },
  {
    tag: "select",
    name: "format",
    options: ["donut", "number"],
    label: "Callout format",
  },
];

const validateCallout = (calloutProps, chartProps, presets) => {
  const { valueType, message } = calloutProps;
  const errors = [];
  const CATEGORYS = ["x_category", "y_category"];
  const attributes = [{ name: CATEGORYS, attrs: ["disabled", "disabled"] }];
  if (valueType === "Categories") {
    attributes.push({ name: CATEGORYS, attrs: ["disabled"] });
  }

  if (!CALLOUT_VALUE_TYPES.includes(valueType)) {
    errors.push({ valueType: "Invalid value" });
  }

  const { calloutMessage } = presets(chartProps, calloutProps);

  attributes.push({
    name: "message",
    attrs: ["placeholder", errors.length > 0 ? "" : calloutMessage],
  });
  return [
    errors,
    [],
    attributes,
    { ...calloutProps, message: message ?? calloutMessage },
  ];
};

const getCallout = (calloutProps, chartProps, data, presets) => {
  const { x_column, y_column } = chartProps;
  const { valueType, x_category, y_category } = calloutProps;
  const [error, , , _calloutProps] = validateCallout(
    calloutProps,
    chartProps,
    presets,
  );
  if (error.length > 0) {
    console.error("Invalid properties", error);
    return {
      ...calloutProps,
      value: "ERR",
      message: "Invalid callout properties",
    };
  }
  if (!data)
    return { ...calloutProps, value: "ERR", message: "No data in chart" };

  const { message } = _calloutProps;
  // const msg = message || calloutMessage;

  if (valueType === "Categories") {
    const match = data.find(
      (d) => d.x.trim() === x_category && d.y.trim() === y_category,
    );
    const value = match?.v ?? "NA";
    return { ...calloutProps, value, message };
    //: findCategoryValue(data, x_category, y_category),
  }

  const [total, min, max] = _.tmm(data, (d) => d.v);

  const value = valueType === "Max" ? max : min;

  const cats = data
    .filter((d) => d.v === value)
    .map((d) => `${x_column} = ${d.x}, ${y_column} = ${d.y}`);

  return {
    ...calloutProps,
    value,
    total,
    valueType,
    message: message.replace("...", category(cats)),
  };
};

const getCalloutMessage = (calloutProps, title) => {
  if (!calloutProps) return "";
  const { valueType } = calloutProps;
  if (valueType === "Categories") return _.capitalise(title);
  return `${_.capitalise(valueType)}imum ${title} (...)`;
};
const presets = (chartProps, calloutProps, title) => {
  const { x_label, y_label } = getLabels(chartProps);
  return {
    x_label,
    y_label,
    chartTitle: title.toUpperCase(),
    countLabels: COUNT_LABELS_PLACEHOLDER,
    calloutMessage: getCalloutMessage(calloutProps, title),
  };
};

// ---------------------------------------------------------------------------
// Chart type: risk
// ---------------------------------------------------------------------------

const risk = {
  cannotFilter: true,

  chartOverlay({ config }) {
    // const axisGroup =
    return [
      {
        tag: "details",
        legend: "Horizontal axis",
        elements: [
          {
            tag: "select",
            options: config.columnNames,
            name: "x_column",
            label: "Column",
          },
          { tag: "text", label: "Map", name: "x_map" },
          { tag: "text", label: "Axis label", name: "x_label" },
        ],
      },
      {
        tag: "details",
        legend: "Vertical axis",
        elements: [
          {
            tag: "select",
            options: config.columnNames,
            name: "y_column",
            label: "Column",
          },
          { tag: "text", label: "Map", name: "y_map" },
          { tag: "text", label: "Axis label", name: "y_label" },
        ],
      },
      { tag: "text", label: "Count labels", name: "countLabels" },
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
    ];
  },

  validateChart(chartProps) {
    const [e1, w1, a1] = ChartFilterUi.validate(chartProps);
    const [e2, w2, a2] = CountTypeUi.validate(chartProps);
    const errors = [...e1, ...e2];
    const warnings = [...w1, ...w2];
    const attributes = [...a1, ...a2];

    const { x_column, y_column, countLabels } = chartProps;
    if (x_column === y_column) {
      errors.push({
        name: "y_column",
        message: "Must be different to " + x_column,
      });
    }

    const checkArray = (name, length) => {
      const values = (chartProps[name] ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length !== length) {
        errors.push({ name, message: `Required ${length} values` });
      }
    };
    checkArray("x_map", 10);
    checkArray("y_map", 10);
    if (countLabels) checkArray("countLabels", 5);

    attributes.push(...placeholderAttributes(risk.presets, chartProps));
    return [errors, warnings, attributes];
  },

  title: (chartProps, calloutProps) => {
    const description = CountTypeUi.description(chartProps);
    return `${description} of risks`.toLowerCase();
  },

  presets: (chartProps, calloutProps) =>
    presets(chartProps, calloutProps, risk.title(chartProps)),

  calloutOverlay: (...args) => calloutOverlay(...args),
  validateCallout: (...args) => validateCallout(...args, risk.presets),
  getCallout: (...args) => getCallout(...args, risk.presets),
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

const twoByTwo = {
  cannotFilter: true,

  chartOverlay: ({ config }) => [
    ...AxisUi.elements({
      config,
      prefix: "x_",
      legend: "Horizontal axis",
      dataTypes: ["String"],
    }),
    ...AxisUi.elements({
      config,
      prefix: "y_",
      legend: "Vertical axis",
      dataTypes: ["String"],
    }),
    {
      tag: "text",
      placeholder: COUNT_LABELS_PLACEHOLDER,
      name: "countLabels",
      label: "Count labels",
    },
    ...ChartFilterUi.elements({ config }),
    ...CountTypeUi.elements({ config }),
  ],

  validateChart: (chartProps) => {
    const [e0, w0, a0] = AxisUi.validate(chartProps, "x_");
    const [e1, w1, a1] = AxisUi.validate(chartProps, "y_");
    const [e2, w2, a2] = ChartFilterUi.validate(chartProps);
    const [e3, w3, a3] = CountTypeUi.validate(chartProps);
    const errors = [...e0, ...e1, ...e2, ...e3];
    const warnings = [...w0, ...w1, ...w2, ...w3];
    const attributes = [...a0, ...a1, ...a2, ...a3];

    const { x_column, y_column } = chartProps;
    if (x_column === y_column) {
      errors.push({ y_column: "Must be different to X axis" });
    }

    attributes.push(...placeholderAttributes(twoByTwo.presets, chartProps));
    return [errors, warnings, attributes];
  },
  title: (chartProps, calloutProps) => {
    const { x_label, y_label } = getLabels(chartProps);
    const description = CountTypeUi.description(chartProps);
    return `${description} by ${x_label} & ${y_label}`.toLowerCase();
  },
  presets: (chartProps, calloutProps) =>
    presets(chartProps, calloutProps, twoByTwo.title(chartProps)),
  calloutOverlay: (...args) => calloutOverlay(...args),
  validateCallout: (...args) => validateCallout(...args, twoByTwo.presets),
  getCallout: (...args) => getCallout(...args, twoByTwo.presets),
};

// ---------------------------------------------------------------------------
// Chart type: State change
// ---------------------------------------------------------------------------

const stateChange = {
  cannotFilter: true,

  chartOverlay: ({ config }) => {
    const columnSelect = { tag: "select", options: config.columnNames };
    return [
      { ...columnSelect, label: "Id column", name: "idCol" },
      { ...columnSelect, label: "Timestamp column", name: "timestampCol" },
      ...axisGroups(config.columnNames, "Categories"),
      ...ChartFilterUi.elements({ config }),
      ...CountTypeUi.elements({ config }),
    ];
  },
  validateChart: (chartProps) => {
    const [errors, warnings, attributes] = ChartFilterUi.validate(chartProps);

    attributes.push({
      name: "colOver",
      attrs: ["class-add", "hide"],
      applyTo: "wrapper",
    });

    // Each of these must point at a different column.
    const columnProps = [
      ["idCol", "Id-column"],
      ["timestampCol", "Timestamp-column"],
      ["x_column", "Column"],
      ["y_column", "Column"],
    ];

    const seen = new Set();
    for (const [prop, label] of columnProps) {
      const column = chartProps[prop];
      if (!column) continue;
      if (seen.has(column)) {
        errors.push({ [prop]: `${label} must be different` });
      } else {
        seen.add(column);
      }
    }

    attributes.push(...placeholderAttributes(stateChange.presets, chartProps));
    return [errors, warnings, attributes];
  },

  title: (chartProps, calloutProps) => {
    const description = CountTypeUi.description(chartProps);
    const postfix = description == "count" ? "s" : " times";
    return `${description} of transition${postfix}`.toLowerCase();
  },
  presets: (chartProps, calloutProps) =>
    presets(chartProps, calloutProps, stateChange.title(chartProps)),
  calloutOverlay: (...args) => calloutOverlay(...args),
  validateCallout: (...args) => validateCallout(...args, stateChange.presets),
  getCallout: (...args) => getCallout(...args, stateChange.presets),
};
