"use strict";
import { dataTypes } from "./data-types.js";
import { _ } from "./util.js";

export { Dialog };

/**
 * To do
 * resolve "Form submission canceled because the form is not connected"
 *
 */

const Dialog = (function () {
  function isSpecial(tag) {
    return ["tag", "label", "value", "name", "elements", "options"].includes(
      tag
    );
  }
  function isInput(tag) {
    return (
      // tag.startsWith("input") ||
      ["text", "date", "number", "range"].includes(tag)
    );
  }
  const specials = {
    tag: 1,
    label: 1,
    initialValue: 1,
    // value: 1,
    name: 1,
    elements: 1,
    options: 1,
    disable: 1,
    onclick: 1,
    onchange: 1,
  };

  let dialog, alertButtonPressed;

  let hasErrors = false;
  //TO DO remove all styles
  const HTMLs = {
    // dialog: (className="dialog") =>
    //   `<dialog ${className ? "class=" + className : ""}>
    //       <form method="dialog">
    //         <main></main>
    //       </form>
    //   </dialog>`,
    dialog: (legend) =>
      `<dialog class="dialog">
          <form method="dialog">
            <fieldset>
                <legend class="legend-main">${legend}</legend>
                <main></main>
            </fieldset>
          </form>
      </dialog>`,

    //individuals
    input: (label, type, name) =>
      `<p id="wrapper-${name}">
          <label for="${name}">${label}:</label>
          <input type="${type}" id="${name}" name=${name} tabindex="0">
      </p>`,
    // date: (label, type, name) =>
    //   `<p id="wrapper-${name}">
    //       <label for="${name}">${label}:</label>
    //       <select></select?
    //       <input type="${type}" id="${name}" name=${name} tabindex="0">
    //   </p>`,
    textarea: (label, name) =>
      `<div id="wrapper-${name}">
          <label style="display:block" for="${name}">${label}:</label>
          <textarea id="${name}" name=${name} tabindex="0" rows=1></textarea>
      </div>`,
    select: (label, name) =>
      `<p id="wrapper-${name}">
          <label for="${name}">${label}:</label>
          <select id="${name}" name=${name} tabindex="0"></select>
        </p>`,
    button: (label) => `<button tabindex="0">${label}</button>`,
    checkbox: (label, checked, name) =>
      `<p id="wrapper-${name}">
          <input type="checkbox" id="${name}"
           ${checked ? "checked" : ""} 
           name=${name} tabindex="0">
          <label for="${name}">${label}</label>
      </p>`,
    //grouped items
    radio: (label, name) =>
      `<fieldset>
        <legend>${label}</legend>
        <p id="wrapper-${name}">
          <span></span>
        </p>
      </fieldset>`,
    table: (label, name) =>
      `<fieldset>
        <legend>${label}</legend>
        <div id="wrapper-${name}"> 
          <table id="${name}" name=${name}>
            <thead></thead>
            <tbody></tbody>
          </table>
        <button id="${name}-add">Add</button>
        <button id="${name}-remove">Remove</button>
        </div>
      </fieldset>`,
    object: (label, name) =>
      `<div id="wrapper-${name}">
      </div>`,
    fieldset: (legend) =>
      `<fieldset>
        <legend>${legend}</legend>
      </fieldset>`,
    error: (messages) => `<p class="error-message">${messages}</p>`,
  };
  function getElement(name) {
    return _.select(`[name = ${name}]`, dialog);
  }
  function getWrapper(name) {
    return _.select(`[id = wrapper-${name}]`);
  }

  function setElementsAttrs(specifiers) {
    if (!specifiers) return;

    const specs = Array.isArray(specifiers) ? specifiers : [specifiers];

    for (const spec of specs) {
      const isName = spec.name || spec.name;

      const { names, name, ids, id, attrs, applyToWrapper } = spec;

      console.assert(Array.isArray(attrs), `"attrs" not array`);
      const [attr, value, action] = attrs;
      const isValidValueType =
        typeof value === "string" || typeof value === "boolean";
      if (!isValidValueType) return;
      const nameOrId = name ? name : id;

      const selectors = isName ? (names ? names : [name]) : ids ? ids : [id];

      // console.assert(
      //   selectors.length > 0,
      //   `invalid "names" (${JSON.stringify(spec)})`
      // );

      for (const s of selectors) {
        const e = !isName
          ? _.select("#" + s, dialog)
          : applyToWrapper
          ? getWrapper(s)
          : getElement(s);
        if (!e) continue;
        if (attr === "class") {
          if (action === "set") e.setAttribute(attr, value);
          if (action === "add") e.classList.add(value);
          if (action === "remove") e.classList.remove(value);
          if (action === "toggle") e.classList.toggle(value);
          continue;
        }
        const set = !action || value === true;
        if (set) e.setAttribute(attr, value);
        const remove = action === "remove" || value === false;
        if (remove) e.removeAttribute(attr);
      }
    }
  }

  function isSpecial(attr) {
    return specials[attr] ? true : false;
  }
  function createErrorElement(text) {
    const html = HTMLs["error"](text);
    return _.createElements(html);
  }
  function setElementAttributes(e, param) {
    for (const key in param) {
      if (isSpecial(key)) continue;
      try {
        e.setAttribute(key, param[key]);
      } catch (error) {
        console.error(`Invalid attribute in dialog: (${key}:${param[key]})`);
      }
    }
  }
  function createButton(param) {
    const { tag, label } = param;
    const html = HTMLs[tag](label);
    const button = _.createElements(html);
    setElementAttributes(button, param);
    return button;
  }

  function createSelect(param) {
    const { tag, options, name, label, value } = {
      options: ["No options"],
      ...param,
    };

    const html = HTMLs[tag](label, name);
    const div = _.createElements(html);
    const select = _.select("select", div);
    options.forEach((option) => {
      const optionEl = _.createElements({
        option: {
          text: option,
          value: option,
          selected: value === option ? "selected" : false,
        },
      });
      select.append(optionEl);
    });
    const max = options.reduce((size, v) => Math.max(size, v.length), 0);
    select.style.width = `${max}em`;
    setElementAttributes(select);
    return div;
  }
  function createRadio(param) {
    const { tag, options, name, label, value } = {
      options: ["No options"],
      ...param,
    };

    const html = HTMLs[tag](label, name);
    const wrapper = _.createElements(html);
    const span = _.select("span", wrapper);
    options.forEach((option, i) => {
      const id = name + "-radio-" + i;
      const label = _.createElements({
        label: { text: option, for: id },
      });

      const checked = (value ? value === option : i === 0) ? "" : undefined;
      const input = _.createElements({
        input: { type: "radio", name, id, value: option, checked },
      });
      span.append(input);
      span.append(label);
    });
    // const max = options.reduce((size, v) => Math.max(size, v.length), 0);
    // select.style.width = `${max}em`;
    // setElementAttributes(select);
    return wrapper;
  }
  function createInput(param) {
    const { tag, name, label } = param;
    const type = tag.replace("input", "").trim();
    const html = HTMLs["input"](label, type, name);
    const div = _.createElements(html);
    const input = _.select("input", div);
    setElementAttributes(input, param);
    return div;
  }
  function createTextArea(param) {
    const { tag, name, label } = param;
    const html = HTMLs[tag](label, name);
    const div = _.createElements(html);
    const textarea = _.select("textarea", div);
    if (param.value) {
      textarea.textContent = param.value;
      delete param.value;
    }
    setElementAttributes(textarea);
    return div;
  }
  function assertName(name, param) {
    console.assert(
      name && typeof name === "string",
      `"name" absent ${JSON.stringify(param)}`
    );
    console.assert(
      name && typeof name === "string" && !name.includes("-"),
      `hyphenated "name" ${name}`
    );
  }

  function createElement(param) {
    if (!param) return;

    const { tag, options, name, label } = param;

    if (!tag) return createErrorElement("Missing tag");

    function setElementAttributes(e) {
      for (const key in param) {
        if (!isSpecial(key)) {
          try {
            e.setAttribute(key, param[key]);
          } catch (error) {
            console.assert(
              false,
              `Invalid attribute in dialog spec (${key}:${param[key]})`
            );
          }
        }
      }
    }

    //todo: name required for input, select, textarea as no - in name

    // basic input items

    if (isInput(tag)) return createInput(param);
    if (tag == "select") return createSelect(param);
    if (tag == "button") return createButton(param);
    if (tag == "radio") return createRadio(param);
    if (tag == "textarea") return createTextArea(param);

    if (tag == "checkbox") {
      function createACheckBox(label, checked, disabled) {
        const html = HTMLs["checkbox"](label, checked, name ?? label);
        const p = _.createElements(html);
        const input = _.select("input", p);
        if (disabled) input.disabled = true;
        return p;
      }
      const div = _.createElements("div"); //document.createElement("div");
      assertName(name);
      const checked = Boolean(param.value);
      const checkEntry = createACheckBox(label, checked);
      div.appendChild(checkEntry);
      //requires a wrapper to display error message
      const wrapper = _.createElements("div");
      wrapper.append(div);
      return wrapper;
    }
    if (tag == "overlay") {
      const id = param.id;
      const overlayDiv = _.createElements({ div: { class: "overlay" } });
      if (id) overlayDiv.id = id;
      return overlayDiv;
    }
    if (tag === "object") {
      const { options, value } = param;
      assertName(name);
      const { headers, specs, type } = {
        ...{ headers: ["None"], specs: [], type: "table" },
        ...options,
      };
      const ui = options.ui;

      const html = HTMLs["object"]("", name);
      const wrapper = _.createElements(html);
      console.log(wrapper);
      // const table = _.select("table", wrapper);

      const data = _.parse(value);
      console.log({ data, value });
      wrapper.setAttribute("data-object", true);
      const parent = name;
      ui.forEach((element) => {
        const { tag, name } = element;
        const value = data[name];
        const id = parent + "-cell-" + name;
        const e = createElement({ tag, name, value, id });
        wrapper.append(e);
      });
      delete param.value;
      if (options.clearButton) {
        const button = _.createElements({
          button: { text: options.clearButton },
        });
        button.addEventListener("click", (e) => {
          const cells = _.selectAll("td", table);
          cells.forEach((cell) => {
            const child = cell.firstChild;
            if (child) child.value = "";
            else cell.textContent = "";
          });
        });
        wrapper.append(button);
      }
      return wrapper;
    }
    if (tag === "table") {
      const { options, value } = param;
      // assertName(name);
      const { headers, specs, type } = {
        ...{ headers: ["None"], specs: [], type: "table" },
        ...options,
      };
      const tableColumns = headers.length;
      const html = HTMLs["table"](label, name);
      const wrapper = _.createElements(html);

      const table = _.select("table", wrapper);
      if (type === "table") {
        table.setAttribute("data-table", true);
        const data = value ? _.getArray(value) : headers.map((h) => "");
        console.log(data);
        const heads = createRow(headers, "th");
        const thead = _.select("thead", table);
        thead.append(heads);

        let rowNumber = 0;
        const tbody = _.select("tbody", table);
        for (let i = 0; i < data.length; i += tableColumns) {
          const rowdata = [];
          for (let j = 0; j < headers.length; j++) {
            rowdata.push(data[i + j]);
          }
          const tr = createRow(rowdata, "td", rowNumber); //, rowNumber++, specs);
          tbody.append(tr);
          rowNumber++;
        }
        tbody.addEventListener("click", (e) => {
          const cell = e.target;
          if (cell.tagName !== "TD") return;
          const column = cell.id.replace(`${name}-cell-`, "").split("-")[1];
          removeInputs(tbody);
          const input = createInput(cell.textContent, specs[column], "XXX");
          cell.textContent = "";
          cell.append(input);
        });

        // addBlankRow(table);
        function createRow(cells, tag, rowNumber) {
          const tr = _.createElements("tr");
          cells.forEach((cell, col) => {
            const th = _.createElements({ [tag]: { text: cell } });
            if (!isNaN(rowNumber)) {
              th.setAttribute("id", `${name}-cell-${rowNumber}-${col}`);
            }
            tr.append(th);
          });
          return tr;
        }
      } else {
        const data = _.parse(value);
        console.log({ data, value });
        table.setAttribute("data-object", true);
        for (let i = 0; i < headers.length; i++) {
          const key = headers[i];
          const value = data[key];
          const type = specs[i] ? specs[i] : "text";
          const id = name + "-cell-" + key;
          const th = _.createElements({
            th: {
              label: { for: id, text: _.toSentence(key) + ":" },
            },
          });
          const input = createInput(value, type, id);
          const td = _.createElements("td");
          td.append(input);
          const tr = _.createElements("tr");
          tr.append(th);
          tr.append(td);
          table.append(tr);
        }
      }
      delete param.value;
      if (options.clearButton) {
        //add button
        _.select(`#${name}-add`, wrapper).addEventListener("click", (e) => {
          // const tbody = _.select("tbody", table);
          // const rows = _.selectAll("tr", tbody);
          // rows.forEach((row) => row.remove());
        });
        _.select(`#${name}-remove`, wrapper).addEventListener("click", (e) => {
          // const tbody = _.select("tbody", table);
          // const rows = _.selectAll("tr", tbody);
          // rows.forEach((row) => row.remove());
        });
      }
      return wrapper;

      function createInput(value, type, id) {
        const isSelect = type.includes(",");
        const inputSpec = isSelect
          ? { select: { id, name: id } }
          : { input: { type, id, value, name: id } };
        const input = _.createElements(inputSpec);
        if (isSelect) {
          const options = _.getArray(type);
          getSelectOptions(options, value).forEach((option) =>
            input.appendChild(option)
          );
        }
        return input;
      }
      // table event listenrs
      function selectRow(e) {}
      function clearAll() {}
      function addNewRow() {}
      function deleteRow() {}
      function modufyRow() {}
      function adjustButtons() {}

      function removeInputs(tbody) {
        const inputs = _.selectAll("input,select", tbody);
        inputs.forEach((input) => {
          const parent = input.parentElement;
          parent.textContent = input.value;
          input.remove();
        });
      }
    }
    if (tag == "fieldset") {
      // assertName(name);
      const { legend, elements } = param;

      const html = HTMLs[tag](legend);
      const fieldset = _.createElements(html);
      if (elements) {
        elements.forEach((param) => {
          const { tag } = param;
          const e = isInput(tag)
            ? createInput(param)
            : tag === "select"
            ? createSelect(param)
            : tag === "textarea"
            ? createTextArea(param)
            : tag === "button"
            ? createButton(param)
            : _.createElements({ div: { text: `Unsupported tag: ${tag}` } });
          fieldset.append(e);
        });
      }
      return fieldset;
    }

    const e = _.createElements(tag); //document.createElement(tag);
    setElementAttributes(e);
    if (label) e.textContent = label;
    return e;
  }
  function getSelectOptions(options, selected) {
    return;
    const elements = [];
    options.forEach((value, i) => {
      const option = _.createElements("option"); //document.createElement("option");
      option.setAttribute("value", value);
      option.textContent = value;
      if (!selected && i == 0) option.selected = true;
      if (selected && value === selected) option.selected = true;
      elements.push(option);
    });
    return elements;
  }
  function addBlankRow(table) {
    return;
    if (!table) return "";
    if (!table.dataset.table) return;
    const name = table.id;
    if (!name) return;
    const isFilled = (row) => {
      const cells = _.selectAll(`[id^="${name}-cell-"`, row);
      const filledCells = cells
        .map((cell) => cell.value.trim())
        .filter((cell) => cell);
      return cells.length === filledCells.length;
    };
    const rows = _.selectAll("tr", table);
    if (!rows) return;
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    if (!isFilled(lastRow)) return;

    const tr = lastRow.cloneNode(true);
    const cells = _.selectAll(`td`, tr);
    cells.forEach((cell) => {
      const input = cell.firstChild;
      input.value = "";
      const [p1, p2, row, col] = input.id.split("-");
      input.id = [p1, p2, Number(row) + 1, col].join("-");
      input.name = input.id;
    });

    lastRow.after(tr);
  }

  function disableOnError() {
    const hasErrors = _.selectAll(".error", dialog).length > 0;
    const disableOnErrorElements = _.selectAll(".disable-on-error", dialog);
    for (const el of disableOnErrorElements)
      if (hasErrors) el.disabled = true;
      else el.removeAttribute("disabled");
  }
  // A110Jul2023#audi

  /**
   * Processes a single error object or an array of error objects,
   * @typedef {{name: string}} OneKeyErr - has only one key value
   * @property {OneKeyErr} - the only key is used as name and value as the message
   * @typedef {{name: string, names: string[], message: string}} NamedErr - has either 'names' or 'name' as a key
   * @property {NamedErr} - If `names` is present, it will be used instead of the `name` property, and 'message' is applied to all 'names' or 'name'
   * @typedef {OneKeyErr | NamedErr} Err
   * @param {Err | Err[] } err - Single or an array of err
    
   * @property {string[]} err.names - (Optional) An array of names associated with this error.
   * If `names` is present, it will be used instead of the `name` property,
   * allowing a single error message to be applied to multiple contexts/fields.
   * @property {string} err.name - (Required if `names` is not provided) The single name
   * (e.g., field name, identifier) associated with the message.
   * @property {string} err.message - The message string to be displayed.
   * @property {string} name.message
   * @returns {void}
   *
   * @example
   * markErrors({ email: 'Invalid email format' });
   * markErrors({ name: 'email', message: 'Invalid email format' });
   * markErrors({ names: ['password', 'confirmPassword'], message: 'Passwords must match' });
   *
   */
  function markErrors(errors) {
    if (!errors) {
      error();
      return;
    }
    const errs = Array.isArray(errors) ? errors : [errors];
    for (const err of errs) {
      const keys = Object.keys(err);
      if (keys.length === 1) {
        const name = keys[0];
        error(err[name], name);
        continue;
      }
      const { name, message } = err;
      const names = err.names ? err.names : [name];
      for (const name of names) error(message, name);
    }
  }
  function error(errorMessages, name) {
    if (!dialog) return;
    if (!errorMessages) {
      const errors = _.selectAll(".error", dialog);
      for (const error of errors) {
        // if (error.tagName === "P") error.remove();
        // else
        error.classList.remove("error");
      }
      const errorMessages = _.selectAll(".error-message", dialog);
      for (const error of errorMessages) error.remove();

      hasErrors = false;
      disableOnError();
      return this;
    }
    hasErrors = true;

    if (!name) {
      const err = _.createElements(
        HTMLs["error"]("No name for: " + errorMessages)
      );
      dialog.append(err);
      disableOnError();
      return this;
    }
    const errorToDisplay = Array.isArray(errorMessages)
      ? errorMessages.join(". ")
      : errorMessages;

    const namedElement = getElement(name);
    namedElement.classList.add("error");
    const wrapperId =
      "wrapper-" + (name.includes("-") ? name.split("-")[0] : name);
    const wrapper = _.select("#" + wrapperId, dialog); //getElement(name);
    const err = _.createElements(HTMLs["error"](errorToDisplay));
    if (wrapper) wrapper.after(err);
    else dialog.append(err);

    disableOnError();
    return this;
  }

  function overlay(elements, id) {
    if (!dialog) return;
    const overlayDiv = _.select(`.overlay${id ? "#" + id : ""}`, dialog);
    _.clearHTML(overlayDiv);
    if (!elements) return;
    [...elements].forEach((e) => {
      if (_.isEmptyObject(e)) return;
      const el = createElement(e);
      if (!el) return;
      // if (initialvalues && el.name)
      //   if (initialvalues[el.name]) el.value = initialvalues[el.name];
      overlayDiv.appendChild(el);
    });
    disableOnError();
    return this;
  }
  function make(
    elements,
    { callback, width = "medium", classes = "", legend = "" }
  ) {
    if (dialog) close();
    // if (!dialogId) {
    dialog = _.createElements(HTMLs["dialog"](legend));
    dialog.setAttribute("class", classes);
    const body = document.body;
    body.appendChild(dialog);

    if (typeof callback === "function") {
      dialog.addEventListener("change", (e) =>
        callback({ type: "change", target: e.target })
      );

      dialog.addEventListener("click", (e) => {
        const target = e.target;
        const isButton = target.tagName.toLowerCase() === "button";
        const type = isButton ? "click-button" : "click";
        // const type = "click";
        if (isButton) e.preventDefault();
        callback({ type, target });
      });
    }
    const main = _.select("main", dialog);
    [...elements].forEach((e) => {
      if (_.isEmptyObject(e)) return;
      const element = createElement(e);
      if (!element) return;
      main.append(element);
    });

    disableOnError();
    return this;
  }
  function show(modal = true) {
    if (!dialog) return;
    if (dialog.open) return this;
    if (modal) dialog.showModal();
    else dialog.show();
    return this;
  }

  function close() {
    if (!dialog) return;
    dialog.close();
    dialog.remove();
  }

  function data() {
    if (!dialog) return;
    const data = {};
    const elementsWithNames = _.selectAll("[name]", dialog);
    for (const namedEl of elementsWithNames) {
      const key = namedEl.getAttribute("name");
      data[key] =
        namedEl.type === "checkbox"
          ? namedEl.checked
          : namedEl.type === "radio"
          ? data[key] ?? (namedEl.checked ? namedEl.value : undefined)
          : namedEl.tagName === "TABLE"
          ? getTableData(namedEl, key)
          : namedEl.value.trim();
    }
    //remove named table cell elements
    for (const namedEl of elementsWithNames) {
      const name = namedEl.getAttribute("name");
      if (namedEl.tagName === "TABLE") {
        const tableElements = _.selectAll(`[name^="${name}-cell-"`, dialog);
        tableElements.forEach((e) => delete data[e.name]);
      }
    }
    return data;
    function getRadioData(name) {
      return _.select(`input[name="${name}"]:checked`).value;
    }
    function getTableData(table, name) {
      if (!table) return "";
      if (table.dataset.table) return tableValues();
      if (table.dataset.object) return objectValues();
      return "";

      function tableValues() {
        const value = (td) => {
          const input = td.firstElementChild;
          return (input ? input.value : td.textContent).trim();
        };
        const cells = _.selectAll("td", table).map((td) => value(td));
        return cells.join(",");
      }
      function objectValues() {
        const idPrefix = `${name}-cell-`;
        const obj = {};
        _.selectAll(`[id^="${idPrefix}"`, table).forEach((cell) => {
          const key = cell.id.replace(idPrefix, "");
          const value = cell.value;
          obj[key] = typeof value === "string" ? value.trim() : value;
        });
        return JSON.stringify(obj);
      }
    }
  }

  function alert(message, buttons) {
    const alertElements = [{ tag: "p", label: message }, { tag: "hr" }];

    (Array.isArray(buttons) ? buttons : ["Close"]).forEach((label) => {
      if (typeof label == "string")
        alertElements.push({ tag: "button", label });
    });

    alertButtonPressed = "";
    make(alertElements, { legend: "Alert", classes: "dialog" });
    show();

    const alertButtons = Array.from(_.selectAll("button", dialog));
    for (const button of alertButtons)
      button.addEventListener("click", (event) => {
        alertButtonPressed = button.textContent;
        close();
      });

    return new Promise(function (resolve, reject) {
      dialog.addEventListener("close", (event) => {
        resolve(alertButtonPressed);
      });
    });
  }

  return {
    getElement,
    setElementsAttrs,
    hasErrors,
    markErrors,
    // error,
    overlay,
    make,
    show,
    close,
    data,
    alert,
  };
})();

function isBolleanAttribute(attr) {
  return [
    "allowfullscreen",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "contenteditable",
    "controls",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "hidden",
    "ismap",
    "itemscope",
    "loop",
    "multiple",
    "muted",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "seamless",
    "selected",
    "truespeed",
  ].includes(attr);
}
