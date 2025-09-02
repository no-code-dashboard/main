"use strict";
import { _, getChartId, getKey } from "./util.js";
import { Param } from "./param.js";
export {
  drawChart,
  // createCallout,
  destroyAllCharts, //removeCharts
};

function drawChart(chartId, data, clickCallback) {
  const key = getKey(chartId);
  const { chartType } = Param.getParam("chart-properties", key);

  if (_.is2X2(chartType)) return createHeatMapChart(key, data, clickCallback);

  if (_.isTable(chartType)) return createTableChart(key, data, clickCallback);

  if (chartType == "Note") return createNoteChart(key, data, clickCallback);

  if (chartType == "Plan") return createPlanChart(key, data, clickCallback);

  if (chartType == "Banner") return createBannerChart(key, data, clickCallback);

  if (_.isTrend(chartType)) return createTrendChart(key, data, clickCallback);

  createBarChart(key, data, clickCallback);
}

function bounce(element, type, scales) {
  //https://observablehq.com/@fil/plot-animate-a-bar-chart/2
  // https://observablehq.com/@recifs/plot-fade-in-bar-chart

  function getValues(type) {
    let xy, dimension, scaleXY;
    if (type == "barY") {
      xy = "y";
      dimension = "height";
    }
    if (type == "barX") {
      xy = "x";
      dimension = "width";
    }
    if (type == "barX") {
      // xy = "x"
      // dimension = "width"
    }
    return { xy, dimension };
  }
  const { xy, dimension, scaleXY } = getValues(type);

  // const xy = type == "barY" ? "y" : type == "barX" ? "x" : undefined
  // const dimension =
  //     type == "barY" ? "height" : type == "barX" ? "width" : undefined
  if (!xy) return;
  d3.select(element)
    .selectAll("rect")
    .transition()
    .delay(500)
    .duration(2000)
    .ease(d3.easeElasticOut)
    .attr(dimension, function () {
      return this.getAttribute(dimension);
    })
    // .attr("y", function () {
    //     return this.getAttribute("y")
    // })
    .attr(xy, function () {
      return this.getAttribute(xy);
    })
    .selection()
    .attr(dimension, 0)
    // .attr(dimension, scales.y(0) - scales.y(0.01)) << error -ve height
    // .attr("y", scales.y(0.01))
    .attr(xy, scales.y(0.01)); //dimension == "height" ? scales.y(0.01) : scales.x(0.01))
}
function render(
  index,
  scales,
  values,
  dimensions,
  context,
  next,
  bounceType,
  id,
  clickCallback
) {
  const el = next(index, scales, values, dimensions, context);
  bounce(el, bounceType, scales); //bounce(el, "height", scales)
  if (clickCallback) {
    const elements = el.querySelectorAll("rect"); //TODO - set class to elements? for transition?
    for (let i = 0; i < elements.length; i++) {
      const target = elements[i];
      target.addEventListener("click", function onclick() {
        const cat = values.channels.x.value[index[i]];
        clickCallback(id, cat);
      });
    }
  }
  return el;
}

function onHover(event, key, highlightAll = false) {
  const tagsSupported = ["rect", "path"];
  const chart = _.select("#" + getChartId(key));
  const elements = Array.from(_.selectAll(tagsSupported.join(","), chart));
  for (const e of elements) e.style.opacity = 1;
  const target = event.target;
  if (!tagsSupported.includes(target.tagName)) return;
  for (const e of elements) e.style.opacity = 0.25;
  if (!highlightAll) {
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
function createBarChart(key, { data }, clickCallback) {
  const id = getChartId(key);
  const { countType, x_dataType, chartType } = Param.getParam(
    "chart-properties",
    key
  );
  const div = _.clearHTML("#" + id);
  const x = "x",
    y = "v",
    yLabel = countType;
  const barY = {
    x,
    y,
    fill: _.getCSSVar("--color-brand"),
    title: (d) => `${d[x]}: ${d[y]}`,
    // href: "XXX",
    render: (i, s, v, d, c, n) =>
      render(i, s, v, d, c, n, "barY", id, clickCallback),
    // render: setCallback, //typeof clickCallback === "function" ? setCallback : null,
    // sort: (d, i) => i,
  };

  const text = {
    x,
    y,
    text: (d) => d[y],
    dy: -5,
    lineAnchor: "bottom",
  };

  const plot = Plot.plot({
    // grid: true,
    style: "width:100%;height:100%;font-family:inherit;font-size:1.2rem",
    // style: "width:100%;height:100%;font-family:inherit", // style: "font-family:inherit",
    marginLeft: 50,
    x: { axis: "bottom", label: null, domain: data.map((v) => v.x) },
    y: { label: yLabel, tickFormat: "~s", ticks: 4 },
    // render,
    marks: [Plot.barY(data, barY), Plot.text(data, text)],
  });
  div.append(plot);
  div.onmouseover = (event) => {
    onHover(event, key);
  };
  div.append(_.createElements({ data: { json: JSON.stringify(data) } }));
  return;
}
function createHeatMapChart(key, chartData, clickCallback) {
  const RAG_COLORS = [
    _.getCSSVar("--color-green"),
    _.getCSSVar("--color-green-amber"),
    _.getCSSVar("--color-amber"),
    _.getCSSVar("--color-amber-red"),
    _.getCSSVar("--color-red"),
  ];
  const RAG_CONTRAST_COLORS = ["black", "black", "black", "white", "white"];
  const id = getChartId(key);
  const chartProp = Param.getParam("chart-properties", key);
  const {
    domain: { countDomain, xDomain, yDomain },
    data,
  } = chartData;

  const {
    x_column,
    y_column,
    countLabels,
    x_label,
    x_labels,
    y_label,
    y_labels,
  } = chartProp;

  function colorRange(domain) {
    const length = domain.length;
    if (length >= 5) return set(0, 1, 2, 3, 4);
    if (length === 4) return set(0, 1, 2, 4);
    if (length === 3) return set(0, 2, 4);
    if (length === 2) return set(0, 4);
    return set(0);
    function set(...args) {
      const fill = [];
      const fontColor = [];
      for (const arg in args) {
        fill.push(RAG_COLORS[arg]);
        fontColor.push(RAG_CONTRAST_COLORS[arg]);
      }
      return { fill, fontColor };
    }
  }
  const fillFontColors = colorRange(countDomain);
  const color = {
    domain: countDomain,
    range: fillFontColors.fill,
    legend: countDomain.length > 1,
    type: "ordinal",
  };

  function getContrastingColor(x) {
    const i = countDomain.findIndex((v) => v === x);
    if (i === -1) return "red";
    return fillFontColors.fontColor[i];
  }
  const plot = Plot.plot({
    padding: 0, //padding between cells
    height: 450,
    marginRight: 0,
    marginBottom: 0,
    marginTop: 40,
    marginLeft: 60,
    color,
    style: "width:100%;height:100%;font-family:inherit;font-size:.75rem",
    // style: "width:100%;height:100%;font-family:inherit", // style: "font-family:inherit",
    x: { domain: xDomain },
    y: { domain: yDomain },
    marks: [
      Plot.axisX({
        label: _.pick1stNonBlank(x_label, x_column),
        anchor: "top",
        lineWidth: 0,
      }),
      Plot.axisY({
        label: _.pick1stNonBlank(y_label, y_column),
        lineWidth: 0,
        marginLeft: 60,
      }),
      Plot.cell(data, {
        x: (d) => d.x,
        y: (d) => d.y,
        fill: (d) => d.fill,
        inset: 1,
        title: (d) => d.x + "\n" + d.y + "\n" + d.v,
        render: (i, s, v, d, c, n) => render(i, s, v, d, c, n, "barX"),
      }),
      Plot.text(data, {
        x: (d) => d.x,
        y: (d) => d.y,
        text: (d) => d.v,
        fill: (d) => getContrastingColor(d.fill, color.range),
      }),
    ],
  });
  const div = _.clearHTML("#" + id);
  div.onmouseover = (event) => {
    onHover(event, key, true);
  };
  div.append(plot);
  div.append(_.createElements({ data: { json: JSON.stringify(data) } }));
}
function createNoteChart(key) {
  const id = getChartId(key);
  const chartDiv = _.clearHTML("#" + id);
  const { message } = Param.getParam("chart-properties", key);

  const makeElement = (line) => {
    const style = "123456789*".includes(line[0]) ? "margin-left:1rem;" : "";
    //q quotes, s strikethrough, sub/sup sub-super-script
    function toElementObject(line, allowedTags = ["b", "i", "u"]) {
      //TODO process nested tags
      const startTags = allowedTags.map((v) => `<${v}>`);
      const endTags = allowedTags.map((v) => `</${v}>`);

      const inputTokens = _.tokenize(line, [...startTags, ...endTags]);

      const isStartTag = (x) => startTags.includes(x);
      const isEndTag = (x) => endTags.includes(x);
      const stage1 = inputTokens.map((token, i) => {
        const commaIfNotEnd = i < inputTokens.length - 1 ? "," : "";
        if (isStartTag(token)) {
          const tag = token.replace("<", "").replace(">", "") + "_" + i;
          return `"${tag}":{"text":"`;
        }
        if (isEndTag(token)) return `"}${commaIfNotEnd}`;
        if (i === 0 || isEndTag(inputTokens[i - 1]))
          return `"span_${i}":{"text":"${token}"}${commaIfNotEnd}`;
        return token;
      });
      try {
        return JSON.parse(`{"p":{${stage1.join("")}}}`);
      } catch (error) {
        return { p: { text: line } };
      }
    }
    const e = toElementObject(line);
    if (style !== "") e.p.style = style;

    return _.createElements(e);
  };

  const lines = message.split("\n");
  for (const line of lines) chartDiv.appendChild(makeElement(line.trim()));
  return;
}

function createBannerChart(key, data, clickCallback) {
  const id = getChartId(key);
  const chartDiv = _.clearHTML("#" + id);
  const container = _.select("#chart-container-" + key);

  const { tag, chartTitle } = Param.getParam("chart-properties", key);

  const e = _.createElements({ [tag]: { text: chartTitle } });
  // console.log({key, e, chartDiv})
  chartDiv.append(e);
  console.log({ key, e, chartDiv, chartTitle });
  {
    // remove non banner elements
    _.select("span", container).textContent = "";
    const footer = _.select(".chart-footer", container);
    footer.remove();
  }
}

const callOutId = (key) => "call-out-" + key;
// function createCallout(key, callOut) {
//   const e = _.select("#" + callOutId(key));
//   if (!e) return;
//   const topE = _.select("#top", e);
//   const bottomE = _.select("#bottom", e);
//   const { top, bottom } = callOut;
//   topE.textContent = top;
//   bottomE.textContent = bottom;
// }
function createTableChart(key, { data, labels }) {
  const id = getChartId(key);
  // const chartProp = Param.getParam("chart-properties",key)
  const oneConfig = Param.getParam("chart-properties", key);
  const chartDiv = _.clearHTML("#" + id);

  const tableElements = {
    table: {
      style: "cursor:default;border:none",
      thead: { style: "position:sticky;top:0px" },
      tbody: {},
    },
  };

  const table = _.createElements(tableElements);

  function makeTableRow(row, thd, tooltip) {
    const tr = document.createElement("tr");
    row.forEach((v, i) => {
      const cell = document.createElement(thd);
      cell.textContent = v;
      if (tooltip) cell.title = `${row[0]}: ${tableHeaders[i]}`;
      tr.appendChild(cell);
    });
    return tr;
  }

  const thead = _.select("thead", table);
  const tableHeaders = Object.keys(data[0]);
  const head = makeTableRow(tableHeaders, "th");
  thead.appendChild(head);

  const tbody = _.select("tbody", table);
  labels.forEach((v, i) => {
    const row = makeTableRow(Object.values(data[i]), "td", true);
    tbody.appendChild(row);
  });
  chartDiv.appendChild(table);
  return;
}
function getAnnotations(annotations) {
  if (!annotations) return [];
  const annotationArray = annotations.split(",");
  if (annotationArray.length % 3 !== 0) return [];
  const plotAnnotations = [];

  for (let i = 0; i < annotationArray.length; i += 3) {
    const date = annotationArray[i].trim();
    const label = annotationArray[i + 1].trim();

    const style = annotationArray[i + 2].trim().toLocaleLowerCase();
    const isTop = style[0] === "t";
    const isMid = style[0] === "m";

    const position = isTop ? "top" : isMid ? "center" : "bottom";
    // const orientation = style[1] === "v" ? "vertical" : "horizontal"
    const text = label + ": " + _.formatDate(date, "DD-MMM");
    plotAnnotations.push({
      x: new Date(date).getTime(),
      position,
      rotate: style[1] === "v" ? 270 : 0,
      text,
    });
  }
  return plotAnnotations;
}
function createPlanChart(key, { data }, clickCallback) {
  const id = getChartId(key);
  const { annotations, firstLabel, secondLabel } = Param.getParam(
    "chart-properties",
    key
  );
  const oneConfig = Param.getParam("chart-properties", key);

  const annotationArray = getAnnotations(annotations);

  const plotData = [];
  let row = 0;
  let hasSecondDate, hasRag;
  Object.keys(data).forEach((k, i) => {
    const newDate = (v) => (v ? new Date(data[k][v]) : null);
    if (i === 0) {
      hasSecondDate = data[k].secondStartDate;
      hasRag = data[k].rag;
    }
    const ragPrefix = hasRag ? `(${data[k].rag})` : "";
    plotData.push({
      row: row++,
      label: k,
      start: newDate("start"),
      end: newDate("end"),
      milestone: data[k]["start"] === data[k]["end"],
      rag: firstLabel + (hasSecondDate ? "" : ragPrefix),
    });
    if (hasSecondDate)
      plotData.push({
        row: row++,
        label: k,
        secondStartDate: newDate("secondStartDate"),
        secondEndDate: newDate("secondEndDate"),
        milestone: data[k]["secondStartDate"] === data[k]["secondEndDate"],
        rag: secondLabel + ragPrefix,
        lead: newDate("start"),
      });
  });
  let domain = [firstLabel],
    range = [_.getCSSVar("--color-brand")];
  if (hasRag && hasSecondDate) {
    domain = [
      firstLabel,
      secondLabel + "(B)",
      secondLabel + "(G)",
      secondLabel + "(A)",
      secondLabel + "(R)",
    ];
    range = [
      _.getCSSVar("--color-brand"),
      _.getCSSVar("--color-blue"),
      _.getCSSVar("--color-green"),
      _.getCSSVar("--color-amber"),
      _.getCSSVar("--color-red"),
    ];
  }
  if (!hasRag && hasSecondDate) {
    domain = [firstLabel, secondLabel];
    range = [_.getCSSVar("--color-brand"), _.getCSSVar("--color-90-90")];
  }
  if (hasRag && !hasSecondDate) {
    domain = [
      firstLabel + "(B)",
      firstLabel + "(G)",
      firstLabel + "(A)",
      firstLabel + "(R)",
    ];
    range = [
      _.getCSSVar("--color-blue"),
      _.getCSSVar("--color-green"),
      _.getCSSVar("--color-amber"),
      _.getCSSVar("--color-red"),
    ];
  }

  const dateFormat = (d) => {
    return d3.timeFormat("%d %b")(d); // d.toDateString().substring(4, 10)
  };
  const plotTitle = ({
    start,
    end,
    secondStartDate,
    secondEndDate,
    milestone,
  }) => {
    const prefix = start ? "Plan: " : "Actual/Est: ";
    const startPart = dateFormat(start ?? secondStartDate);
    if (milestone) return prefix + startPart;
    const endPart = dateFormat(end ?? secondEndDate);
    return prefix + startPart + "-" + endPart;
  };
  const p = Plot.plot({
    // height: _.getCSSVar("--is-print") === "true" ? 600 : screen.height * 0.7,
    marginLeft: 5,
    style: "width:100%;height:100%;font-family:inherit;font-size:.75rem",
    // style: "width:100%; height: 100 %; ", //"width: 100%; height: 100 %; font: inherit; ",
    x: {
      axis: "top",
      grid: true,
    },
    y: { axis: null },
    // y: {
    //     label: null,
    //     // grid: true,
    //     tickFormat: (d) => null,
    // },
    color: {
      domain,
      range,
      legend: true,
    },
    r: {
      range: [0, 5],
    },
    marks: [
      Plot.ruleX(annotationArray, {
        x: "x",
        opacity: 0.5,
        y1: -1,
        y2: plotData.length,
        strokeDasharray: 2,
      }),
      Plot.text(annotationArray, {
        x: "x",
        y: (d, i) => (d.position == "top" ? -2 : plotData.length + 1),
        text: "text",
        rotate: (d) => d.rotate,
        fontStyle: "italic",
      }),
      Plot.barX(plotData, {
        x1: (d) => d.start ?? d.secondStartDate,
        x2: (d) => d.end ?? d.secondEndDate,
        y: "row",
        fill: "rag",
        stroke: "none",
        title: (d) => plotTitle(d),
        render: (i, s, v, d, c, n) => render(i, s, v, d, c, n, "barX"),
      }),
      Plot.text(plotData, {
        x: "end",
        y: "row",
        text: "label",
        textAnchor: "start",
        dx: 5,
      }),
      Plot.dot(plotData, {
        x: (d) => (d.milestone ? d.start ?? d.secondStartDate : null),
        r: (d) => (d.milestone ? 1 : 0),
        y: "row",
        fill: "rag",
        symbol: "diamond",
        title: (d) => plotTitle(d),
      }),
      Plot.ruleY(plotData, {
        x: (d) => (d.lead ? d.secondStartDate : null),
        x1: (d) => (d.lead ? d.lead : null),
        x2: (d) => (d.lead ? d.secondStartDate : null),
        y: "row",
        stroke: "rag",
      }),
    ],
  });

  // _.select(p).select("div").style("float", "left") // Floats the swatch on the left.

  const div = _.clearHTML("#" + id);
  div.onmouseover = (event) => {
    onHover(event, key, true);
  };
  div.append(p);
}
function createTrendChart(key, { domain, data }, clickCallback) {
  const id = getChartId(key);
  const { forecast, chartType, plan } = Param.getParam("chart-properties", key);
  const cumulative = true;
  const { reportDate } = Param.getParam("config");
  const { annotations, x_label, x_column } = Param.getParam(
    "chart-properties",
    key
  );
  const xLabel = _.pick1stNonBlank(x_label, x_column);
  const annotationArray = getAnnotations(annotations);

  let cumSum = 0;

  // const plotData = Object.keys(data).map((date) => {
  //     const count =
  //         chartType === "Trend OC"
  //             ? data[date].open - data[date].close
  //             : data[date].count
  //     cumSum += count
  //     return {
  //         x: new Date(date),
  //         z: cumulative ? cumSum : count,
  //         type: xLabel,
  //     }
  // })
  const plotData = data.map((d) => ({
    ...d,
    x: new Date(d.x),
    // type: xLabel,
  }));
  const timelineColor = _.getCSSVar("--color-brand");
  const planColor = _.getCSSVar("--color-120-120");
  const forecastColor = _.getCSSVar("--color-120-240");

  const range = [timelineColor];
  if (domain.plan) range.push(planColor);
  if (domain.forecast) range.push(forecastColor);

  const color = {
    domain: Object.keys(domain).map((key) => domain[key]),
    range,
    legend: true,
  };

  const maxPlotValue = plotData.reduce((max, v) => (v.v > max ? v.v : max), 0);
  const p = Plot.plot({
    // height: _.getCSSVar("--is-print") === "true" ? 600 : screen.height * 0.7,
    // marginLeft: 5,
    // style: "width:100%; height: 100 %; ", //"width: 100%; height: 100 %; font: inherit; ",
    x: { axis: "bottom", label: null /* grid: true */ },
    y: { axis: "left" /* grid: true */ },
    style: "width:100%;height:100%;font-family:inherit;font-size:.75rem",
    color,
    marks: [
      Plot.ruleX(annotationArray, {
        x: "x",
        opacity: 0.5,
        strokeDasharray: 2,
      }),
      Plot.text(annotationArray, {
        x: "x",
        y: (d) =>
          maxPlotValue *
          (d.position == "top" ? 1.1 : d.position == "bottom" ? 0.1 : 0.5),
        text: "text",
        rotate: (d) => d.rotate,
        fontStyle: "italic",
      }),
      Plot.line(
        plotData.filter((d) => d.type === "Timeline"),
        {
          x: (d) => d.x,
          y: (d) => d.v,

          strokeWidth: (d) => (d.type === "Timeline" ? 3 : 1),
          // TODD Fix strokeDasharray
          // strokeDasharray: 3, //works
          // strokeDasharray: (d) => (d.type === "Timeline" ? 1 : 3), //does not work
          stroke: (d) => d.type,
          // marker: (d) => d.type !== "Timeline", //does not work
          // tip: (d) => `${d.x}: ${d.v}`,
          // tip: "xy",
        }
      ),
      Plot.line(
        plotData.filter((d) => d.type !== "Timeline"),
        {
          x: (d) => d.x,
          y: (d) => d.v,
          strokeWidth: 1,
          // strokeDasharray: 3, //works
          stroke: (d) => d.type,
          marker: true,
        }
      ),
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
        })
      ),
    ],
  });

  const div = _.clearHTML("#" + id);
  div.onmouseover = (event) => {
    onHover(event, key, true);
  };
  div.append(p);
  //https://observablehq.com/@onoratod/animate-a-path-in-d3
  // const length = d3.select(p).select("path").node().getTotalLength()
  // d3.select(p)
  //     .select("path")
  //     .attr("stroke-dasharray", length + " " + length)
  //     .attr("stroke-dashoffset", length)
  //     .transition()
  //     .ease(d3.easeLinear)
  //     .attr("stroke-dashoffset", 0)
  //     .duration(1700)
}

function destroyAllCharts() {
  _.clearHTML("#wrapper");
  _.clearHTML("#toc");
  _.clearHTML("#call-out-wrapper");
}
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
  // console.log(n)
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
  return { slope, intercept };
}
function testLr(
  data = [246, 248, 250, 251, 252, 253, 253, 255, 256, 258, 258, 260, 262, 387]
) {
  return linearRegression(data);
}
