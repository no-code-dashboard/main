"use strict";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import { _, getChartId } from "./util.js";
import { Param } from "./param.js";
import { markdownToHtml } from "./markdown.js";
import { validateAnnotations } from "./validation.js";
export { drawChart, createCallout, destroyAllCharts, animateChart };

const PLOT_STYLE = "width:100%;height:100%;font-family:inherit;";

function drawChart(key, data, clickCallback) {
  const { chartType } = Param.getParam("chart-properties", key);

  if (chartType === "Note") return createNoteChart(key, data, clickCallback);

  if (!data) return craeateErrorChart(key);

  if (_.is2X2(chartType)) return createHeatMapChart(key, data, clickCallback);

  if (_.isTable(chartType)) return createTableChart(key, data, clickCallback);

  if (chartType === "Plan") return createPlanChart(key, data, clickCallback);

  if (chartType === "Trend") return createTrendChart(key, data, clickCallback);

  createBarChart(key, data, clickCallback);
}
function craeateErrorChart(key) {
  const div = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(div);
  
  const plot = _.createElements(`<div style="min-height:10rem"></div>`);
  div.append(plot);
}
// function bounce(element, type, scales) {
//   //https://observablehq.com/@fil/plot-animate-a-bar-chart/2
//   // https://observablehq.com/@recifs/plot-fade-in-bar-chart

//   function getValues(type) {
//     let xy, dimension, scaleXY;
//     if (type == "barY") {
//       xy = "y";
//       dimension = "height";
//     }
//     if (type == "barX") {
//       xy = "x";
//       dimension = "width";
//     }
//     if (type == "barX") {
//       // xy = "x"
//       // dimension = "width"
//     }
//     return { xy, dimension };
//   }
//   const { xy, dimension, scaleXY } = getValues(type);

//   // const xy = type == "barY" ? "y" : type == "barX" ? "x" : undefined
//   // const dimension =
//   //     type == "barY" ? "height" : type == "barX" ? "width" : undefined
//   if (!xy) return;
//   d3.select(element)
//     .selectAll("rect")
//     .transition()
//     .delay(500)
//     .duration(2000)
//     .ease(d3.easeElasticOut)
//     .attr(dimension, function () {
//       return this.getAttribute(dimension);
//     })
//     // .attr("y", function () {
//     //     return this.getAttribute("y")
//     // })
//     .attr(xy, function () {
//       return this.getAttribute(xy);
//     })
//     .selection()
//     .attr(dimension, 0)
//     // .attr(dimension, scales.y(0) - scales.y(0.01)) << error -ve height
//     // .attr("y", scales.y(0.01))
//     .attr(xy, scales.y(0.01)); //dimension == "height" ? scales.y(0.01) : scales.x(0.01))
// }
function render(
  index,
  scales,
  values,
  dimensions,
  context,
  next,
  bounceType,
  key,
  callback,
) {
  const el = next(index, scales, values, dimensions, context);
  // bounce(el, bounceType, scales); //bounce(el, "height", scales)
  if (callback) {
    const elements = el.querySelectorAll("rect"); //TODO - set class to elements? for transition?

    for (let i = 0; i < elements.length; i++) {
      const target = elements[i];
      const cat = values.channels.x.value[index[i]];
      // const title = _.select("title", target);
      // if (title) {
      //   target.setAttribute("data-title", title.textContent)
      // }
      target.addEventListener("click", () => {
        // const cat = values.channels.x.value[index[i]];
        if (callback) callback(key, cat);
      });
    }
  }
  return el;
}

function createBarChart(key, { data }, clickCallback) {
  const { countType, x_label, chartTitleWithIndex } = Param.getParam(
    "chart-properties",
    key,
  );

  const x = "x",
    y = "v",
    yLabel = countType;
  const barY = {
    x,
    y,
    className: "bars",
    title: (d) => `${d[x]}: ${d[y]}`,
    render: (...args) => render(...args, "barY", key, clickCallback),
  };

  const text = { x, y, text: (d) => d[y], dy: -5, lineAnchor: "bottom" };

  const plot = Plot.plot({
    style: PLOT_STYLE + "font-size:1.2rem",
    // title: chartTitleWithIndex,
    marginLeft: 50,
    marginBottom: x_label ? 60 : 30,
    x: {
      axis: "bottom",
      label: x_label ?? null,
      domain: data.map((v) => v.x),
    },
    y: { label: yLabel, tickFormat: "~s", ticks: 4 },
    marks: [Plot.barY(data, barY), Plot.text(data, text)],
  });
  const div = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(div);
  div.append(plot);
  div.onmouseover = (event) => {
    onChartHover(event, key, "bar");
  };
  div.append(_.createElements(`<data json='${_.stringify(data)}'></data>`));
  return;
}
function getCssContrastColor(bgColor) {
  // 1. Create a temporary element to leverage the browser's CSS engine
  const tempEl = document.createElement("div");
  tempEl.style.backgroundColor = bgColor;
  tempEl.style.color = `contrast-color(${bgColor})`;
  document.body.appendChild(tempEl);
  const computedColor = window.getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);
  return computedColor;
}
function createHeatMapChart(key, chartData, clickCallback) {
  const RAG_COLORS = [
    "--color-green",
    "--color-green-amber",
    "--color-amber",
    "--color-amber-red",
    "--color-red",
  ].map((c) => `var(${c})`);

  const chartProps = Param.getParam("chart-properties", key);
  const {
    domain: { countDomain, xDomain, yDomain },
    data,
  } = chartData;

  const {
    chartTitleWithIndex,
    x_column,
    y_column,
    countLabels,
    x_label,
    x_categories,
    y_label,
    y_categories,
  } = chartProps;

  function colorRange(domain) {
    const length = domain.length;
    if (length >= 5) return set(0, 1, 2, 3, 4);
    if (length === 4) return set(0, 1, 2, 4);
    if (length === 3) return set(0, 2, 4);
    if (length === 2) return set(0, 4);
    return set(0);

    function set(...args) {
      return args.map((arg) => RAG_COLORS[arg]);
      // const fill = [];
      // for (const arg in args) {
      //   fill.push(RAG_COLORS[arg]);
      // }
      // return fill;
    }
  }
  const color = {
    domain: countDomain,
    range: colorRange(countDomain),
    legend: countDomain.length > 1,
    type: "ordinal",
  };

  function getContrastingColor(x) {
    const i = countDomain.findIndex((v) => v === x);
    if (i === -1) return "red";
    return getCssContrastColor(RAG_COLORS[i]);
  }

  const plot = Plot.plot({
    padding: 0, //padding between cells
    height: 450,
    marginRight: 0,
    marginBottom: 0,
    marginTop: 40,
    marginLeft: 60,
    color,
    style: PLOT_STYLE + "font-size:.75rem",
    // title: chartTitleWithIndex,
    x: { domain: xDomain },
    y: { domain: yDomain },
    marks: [
      Plot.axisX({
        label: x_label || x_column,
        anchor: "top",
        // lineWidth: 0,
      }),
      Plot.axisY({
        label: y_label || y_column,
        // anchor: "left",
        // lineWidth: 0,
        // marginRight: 20,
      }),
      Plot.cell(data, {
        x: (d) => d.x,
        y: (d) => d.y,
        fill: (d) => d.fill,
        inset: 1,
        title: (d) => d.x + "\n" + d.y + "\n" + d.v,
        render: (...args) => render(...args, "barX"),
      }),
      Plot.text(data, {
        x: (d) => d.x,
        y: (d) => d.y,
        text: (d) => d.v,
        fontSize: 16,
        fill: (d) => getContrastingColor(d.fill),
      }),
    ],
  });
  alignLgendsToLeft(plot);
  const div = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(div);
  div.onmouseover = (event) => {
    onChartHover(event, key, "heatmap");
  };
  div.append(plot);
  div.append(_.createElements(`<data json='${_.stringify(data)}'></data>`));
}
function createNoteChart(key) {
  const chartDiv = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(chartDiv);
  const { message, chartTitleWithIndex } = Param.getParam(
    "chart-properties",
    key,
  );
  chartDiv.innerHTML = markdownToHtml(message);
  chartDiv.classList.add("markdown");
}
function createTableChart(key, { data, labels }) {
  const chartDiv = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(chartDiv);
  const headers = Object.keys(data[0]);

  // const p = Plot.plot({
  //   x: { domain: headers, anchor: "top" },
  //   marks: [
  //     Plot.cell(
  //       data,
  //       {
  //         x: (d,i) => i,
  //         y: (d,i) => i,
  //         stroke: "black"
  //       }
  //     ),
  //     Plot.text(data, {
  //       x: (d, i) => i,
  //       y: (d, i) => i,
  //       text: "revenue",
  //       fill: "black",
  //     }),
  //   ],
  // });
  // chartDiv.append(p);
  // return;

  const row = (i) =>
    Object.values(data[i])
      .map((d) => `<td>${d}</td>`)
      .join("");
  const rows = labels.map((v, i) => `<tr>${row(i)}</tr>`).join("");
  const html = `<table>
    <thead>
      <tr>${headers.map((d) => `<th>${d}</th>`).join("")}</tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  chartDiv.append(_.createElements(html));
}
function createPlanChart(key, { data }, clickCallback) {
  const { annotations, firstLabel, secondLabel, chartTitleWithIndex } =
    Param.getParam("chart-properties", key);
  const oneConfig = Param.getParam("chart-properties", key);
  const config = Param.getParam("config");

  const plotData = [];

  let row = 0,
    hasSecondDate = false,
    hasRag = false;

  for (const label in data) {
    const { start, end, rag, secondStart, secondEnd } = data[label];
    const newDate = (v) => (v ? new Date(v) : null);
    const ragPrefix = rag ? `(${rag})` : "";
    if (rag) hasRag = true;
    plotData.push({
      row: row++,
      label,
      start: newDate(start),
      end: newDate(end),
      milestone: start === end,
      rag: firstLabel + (secondStart ? "" : ragPrefix),
    });
    if (secondStart) {
      ((hasSecondDate = true),
        plotData.push({
          row: row++,
          label,
          secondStart: newDate(secondStart),
          secondEnd: newDate(secondEnd),
          milestone: secondStart === secondEnd,
          rag: secondLabel + ragPrefix,
          lead: newDate(start),
        }));
    }
  }
  const BRAG = [
    ["B", "blue"],
    ["R", "red"],
    ["A", "amber"],
    ["G", "green"],
  ];
  const domain = [
    firstLabel,
    ...(hasRag
      ? BRAG.map(([r]) => `${secondLabel}(${r})`)
      : hasSecondDate
        ? [secondLabel]
        : []),
  ];
  const range = [
    "brand",
    ...(hasRag ? BRAG.map(([_, c]) => c) : hasSecondDate ? ["plus-90"] : []),
  ].map((c) => `var(--color-${c})`);
  range[0] = "black";
  const dateFormat = (d) => {
    return d3.timeFormat("%d %b")(d); // d.toDateString().substring(4, 10)
  };
  const plotTitle = ({ start, end, secondStart, secondEnd, milestone }) => {
    const prefix = (start ? firstLabel : secondLabel) + ": ";
    const startPart = dateFormat(start ?? secondStart);
    if (milestone) return prefix + startPart;
    const endPart = dateFormat(end ?? secondEnd);
    return prefix + startPart + "-" + endPart;
  };
  const p = Plot.plot({
    marginLeft: 5,
    style: PLOT_STYLE + "font-size:.75rem",
    // title: chartTitleWithIndex,
    x: {
      axis: "top",
      grid: true,
    },
    y: { axis: null },
    color: {
      domain,
      range,
      legend: true,
    },
    r: {
      range: [0, 5],
    },
    marks: [
      ...annotationPlots(annotations, config, {
        x: "x",
        y1: -1,
        y2: plotData.length,
        text: "text",
        top: -2,
        bottom: plotData.length + 1,
      }),
      Plot.barX(plotData, {
        x1: (d) => d.start ?? d.secondStart,
        x2: (d) => d.end ?? d.secondEnd,
        y: "row",
        fill: "rag",
        // stroke: (d) => (d.rag === "Plan" ? "none" : "black"),
        // stroke: "none",
        title: (d) => plotTitle(d),
        // render: (i, s, v, d, c, n) => render(i, s, v, d, c, n, "barX"),
        render: (...args) => render(...args, "barX"),
      }),
      // Plot.text(plotData, {
      //   x: "end",
      //   y: "row",
      //   text: "label",
      //   textAnchor: "start",
      //   dx: 5,
      // }),
      Plot.text(plotData, {
        x: "start",
        // x: (d) => d.start,
        // x: (d) => d.start + (d.end) / 2,
        y: "row",
        text: "label",
        fill: (d) => (d.milestone ? "black" : "white"),
        textAnchor: "start",
        dx: 5,
      }),
      Plot.dot(plotData, {
        x: (d) => (d.milestone ? (d.start ?? d.secondStart) : null),
        r: (d) => (d.milestone ? 1 : 0),
        y: "row",
        fill: "rag",
        symbol: "diamond",
        title: (d) => plotTitle(d),
      }),
      // Plot.ruleY(plotData, {
      Plot.arrow(plotData, {
        x: (d) => (d.lead ? d.secondStart : null),
        x1: (d) => (d.lead ? d.lead : null),
        x2: (d) => (d.lead ? d.secondStart : null),
        y: "row",
        // stroke: "rag",
      }),
    ],
  });

  // _.select(p).select("div").style("float", "left") // Floats the swatch on the left.
  p.onmouseover = (event) => {
    onChartHover(event, key, "plan");
  };
  alignLgendsToLeft(p);
  const div = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(div);
  div.append(p);
}

function createTrendChart(key, { domain, data }, clickCallback) {
  const config = Param.getParam("config");
  // const { reportDate } = Param.getParam("config");
  const { annotations, x_label, x_column, chartTitleWithIndex } =
    Param.getParam("chart-properties", key);
  // const xLabel = x_label || x_column//_.firstNonBlank(x_label, x_column);

  const plotData = data.map((d) => ({
    ...d,
    x: new Date(d.x),
    // type: xLabel,
  }));
  const timelineColor = "var(--color-brand)";
  const planColor = "var(--color-plus-120)";
  const forecastColor = "var(--color-plus-240)";

  const range = [timelineColor];
  if (domain.plan) range.push(planColor);
  if (domain.forecast) range.push(forecastColor);
  const color = {
    domain: Object.keys(domain).map((key) => domain[key]),
    range,
    legend: range.length > 1,
  };

  const maxPlotValue = plotData.reduce((max, v) => (v.v > max ? v.v : max), 0);
  // const line = (data, { strokeDasharray, strokeWidth, marker }) =>
  //   Plot.line(data, {
  //     x: (d) => d.x,
  //     y: (d) => d.v,
  //     strokeWidth,
  //     strokeDasharray,
  //     stroke: (d) => d.type,
  //     marker: marker,
  //   });
  const p = Plot.plot({
    x: { axis: "bottom", label: null /* grid: true */ },
    y: { axis: "left" /* grid: true */ },
    style: PLOT_STYLE + "font-size:.75rem",
    // title: chartTitleWithIndex,
    color,
    marks: [
      ...annotationPlots(annotations, config, {
        x: "x",
        text: "text",
        top: maxPlotValue * 1.1,
        bottom: maxPlotValue * 0.1,
      }),
      // line(
      //   plotData.filter((d) => d.type === "Timeline"),
      //   { marker: true },
      // ),
      // line(
      //   plotData,//.filter((d) => d.type !== "Timeline"),
      //   {},
      // ),
      Plot.line(plotData, {
        x: "x",
        y: "v",
        stroke: (d) => d.type,
      }),
      //tolerance on forecast
      domain.forecast
        ? Plot.areaY(
            plotData.filter((d) => d.type === domain.forecast),
            {
              x: "x", //(d) => d.x,
              y1: (d) => d.v * 0.9, // lower bound
              y2: (d) => d.v * 1.1, // upper bound
              fill: forecastColor,
              fillOpacity: 0.2, // makes the band translucent
            },
          )
        : null,
      // Plot.line(
      //   plotData, //.filter((d) => d.type !== "Timeline"),
      //   {
      //     x: (d) => d.x,
      //     y: (d) => d.v,
      //     strokeWidth: (d) => (d.type === "Timeline" ? 3 : 1),
      //     // strokeDasharray: 3, //works
      //     stroke: (d) => d.type,
      //     marker: true,
      //   },
      // ),
      Plot.crosshair(plotData, {
        x: (d) => d.x,
        y: (d) => d.v,
      }),
      Plot.text(
        plotData,
        Plot.selectLast({
          // Plot.normalizeY({
          x: (d) => d.x,
          y: (d) => d.v,
          text: (d) => d.v,
          textAnchor: "center",
          dy: -10,
          // })
        }),
      ),
    ],
  });
  p.onmouseover = (event) => {
    onChartHover(event, key, "trend");
  };
  alignLgendsToLeft(p);
  const div = _.select(`#${getChartId(key)} > div`);
  _.clearHTML(div);
  div.append(p);
}

////////////////////////////////////// callout
function createCallout(key, callout) {
  const e = _.select(`#callout-${key}`);
  if (!e) return;
  const { value, message, valueType, total, format = "donut" } = callout;
  const valuePlace = _.select("#value", e);
  valuePlace.title = value;
  const display = isNaN(value)
    ? value
    : value.toLocaleString(undefined, {
        notation: "compact",
      });

  const hasDonutData = total && value / total <= 1 && value / total >= 0;

  if (format === "donut" && hasDonutData)
    valuePlace.append(donutChart(value / total, { display, valueType, total }));
  else valuePlace.append(donutChart(value, { display, valueType }));

  // _.select("#value", e).textContent = display;

  _.select("#message", e).textContent = message;
}

//////////////////////////// helpers

function alignLgendsToLeft(plot) {
  plot.style.display = "flex";
  plot.style.flexDirection = "column";
  plot.style.alignItems = "flex-start";
}
function destroyAllCharts() {
  _.clearHTML("#toc");
  _.clearHTML(".callout-container");
  _.clearHTML(".chart-container");
}

function animateChart(chartSelector) {
  //https://observablehq.com/@fil/plot-animate-a-bar-chart/2
  // https://observablehq.com/@recifs/plot-fade-in-bar-chart

  const chartType = _.select(chartSelector).dataset.chartType;

  const xy =
    chartType === "Bar" || _.is2X2(chartType)
      ? "y"
      : chartType === "Plan"
        ? "x"
        : undefined;

  if (!xy) return;

  const dimension = xy === "x" ? "width" : "height";

  d3.select(chartSelector)
    .selectAll("rect")
    .selection()
    .transition()
    .delay((d, i) => i * 100)
    .duration(2000)
    .ease(d3.easeElasticOut)
    .attr(dimension, function () {
      return this.getAttribute(dimension);
    })
    .attr(xy, function () {
      return this.getAttribute(xy);
    })
    .selection()
    .attr(dimension, 0);
}

function onChartHover(event, key, chartType) {
  const tagsSupported = ["rect", "path"];
  const chart = _.select("#" + getChartId(key));
  const elements = Array.from(_.selectAll(tagsSupported.join(","), chart));
  for (const e of elements) e.style.opacity = 1;
  const target = event.target;
  if (!tagsSupported.includes(target.tagName.toLowerCase())) return;
  for (const e of elements) e.style.opacity = 0.25;
  if (chartType === "bar") {
    target.style.opacity = 1;
    return;
  }
  const color = getColor(target);
  for (const e of elements) if (color === getColor(e)) e.style.opacity = 1;

  function getColor(e) {
    const fillOrStroke = e.tagName === "rect" ? "fill" : "stroke";
    return window.getComputedStyle(e).getPropertyValue(fillOrStroke);
  }
}
function annotationPlots(
  annotations,
  config,
  { x, y1, y2, text, top, bottom },
) {
  const [error, annotationArray] = validateAnnotations(annotations, config);

  if (error.length > 0) {
    return [];
  }
  if (!annotationArray) return [];

  const plot = [];

  annotationArray.forEach(([date, label, style]) => {
    const isTop = style[0] === "t";
    const isMid = style[0] === "m";

    const position = isTop ? "top" : isMid ? "center" : "bottom";
    const rotate = style[1] === "v" ? 270 : 0;
    const text = label + ": " + _.formatDate(date, "DD-MMM");
    plot.push({
      x: new Date(date).getTime(),
      position,
      rotate,
      text,
    });
  });

  return [
    Plot.ruleX(plot, {
      x,
      opacity: 0.5,
      y1,
      y2,
      strokeDasharray: 2,
    }),
    Plot.text(plot, {
      x,
      y: (d) =>
        d.position === "top"
          ? top
          : d.position === "bottom"
            ? bottom
            : (top + bottom) / 2,
      text,
      rotate: (d) => d.rotate,
      fontStyle: "italic",
    }),
  ];
}

/* 

background-color: #E5E5F7;
opacity: 0.8;
background: radial-gradient(#444CF7 15%, transparent 16%) 0 0, radial-gradient(#444CF7 15%, transparent 16%) 5px 5px, radial-gradient(#444CF733 15%, transparent 20%) 0 1px, radial-gradient(#444CF733 15%, transparent 20%) 5px 6px;
background-size: 10px 10px;
*/
function donutChart(value, { valueType = "max", total, display }) {
  const isValidValue = !isNaN(value); // && value >= 0 && value <= 1;
  // const valueType = options?.valueType ?? "max";
  // const showMax = valueType.toLowerCase() === "max";
  // const topValueToDisplay = isValidValue ? (showMax ? value : 1 - value) : 0;

  // const offsetAngle = Math.PI * (2 - topValueToDisplay);
  // const data = [
  //   { name: showMax ? "x" : "y", value: topValueToDisplay },
  //   { name: showMax ? "y" : "x", value: 1 - topValueToDisplay },
  // ];
  const width = 200;
  const height = Math.min(width, 200);
  const radius = Math.min(width, height) / 2;

  // const arc = d3
  //   .arc()
  //   .innerRadius(radius * 0.67)
  //   .outerRadius(radius - 1);

  // const pie = d3
  //   .pie()
  //   .sort(null)
  //   .value((d) => d.value);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  if (total) {
    const showMax = valueType.toLowerCase() === "max";
    const topValueToDisplay = isValidValue ? (showMax ? value : 1 - value) : 0;

    const offsetAngle = Math.PI * (2 - topValueToDisplay);
    const data = [
      { name: showMax ? "x" : "y", value: topValueToDisplay },
      { name: showMax ? "y" : "x", value: 1 - topValueToDisplay },
    ];
    const arc = d3
      .arc()
      .innerRadius(radius * 0.67)
      .outerRadius(radius - 1);

    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d.value);

    svg
      .append("g")
      .selectAll()
      .data(
        pie(data).map((d) => ({
          ...d,
          startAngle: d.startAngle + offsetAngle,
          endAngle: d.endAngle + offsetAngle,
        })),
      )
      .join("path")
      // .attr("fill", (d) => (d.data.name == "x" ? "var(--color-brand)" : "var(--text-2)"))
      // .attr("fill", "var(--color-brand)")
      .attr("opacity", (d) => (d.data.name == "x" ? 1 : 0.3))
      .attr("fill", (d) =>
        d.data.name == "x" ? "var(--color-brand)" : "var(--color-plus-180)",
      )
      // .attr("stroke", "var(--color-brand)")
      .attr("d", arc)
      .append("title")
      .text((d) => `${Math.round(100 * d.data.value).toLocaleString()}%`);
  }
  const text = display; //isValidValue && display ? display : "Invalid";
  svg
    .append("g")
    .attr("font-family", "inherit")
    .attr("font-size", "3rem")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "currentColor")
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text(text);
  return svg.node();
}
