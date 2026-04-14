"use strict";
import { _ } from "../util.js";

export { Dialog };

const idPrefix = crypto.randomUUID();

const getId = (id) => idPrefix + "-" + id;

/**
 * To do
 * resolve "Form submission canceled because the form is not connected"
 * do we really need the wrappers?
 *
 *
 */

function isSpecial(tag) {
  const specials = [
    "tag",
    "label",
    "value",
    "list",
    "name",
    "elements",
    "options",
    "data-type",
    //todo fix tags etc
    //https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes
    "_tag",
    "_label",
    "_value",
    // "list",
    // "name",
    "_elements",
    "_options",
    "_type",
  ];
  return specials.includes(tag);
}
function isInput(tag) {
  return ["text", "date", "number", "range"].includes(tag);
}

function updateInputElement(input, param) {
  setElementAttributes(input, param);
  const { tag, name, value, list } = param;
  input.type = tag;
  input.value = value ?? "";
  if (tag === "text" && Array.isArray(list)) {
    const id = getId(name) + "-datalist";
    input.setAttribute("list", id);
    const datalist = _.createElements({ datalist: { id } });
    datalist.innerHTML = list
      .map((v) => `<option value="${v}"></option>`)
      .join("");
    input.append(datalist);
  }
  return input;
}
function updateSelectElement(select, param) {
  setElementAttributes(select, param);
  const { options, value } = param;
  options.forEach((option) => {
    const optionEl = _.createElements({
      option: {
        text: option,
        value: option,
        selected: (value ?? "") === option ? "selected" : false,
      },
    });
    select.append(optionEl);
  });
  return select;
}
let dialog, alertButtonPressed;

let hasErrors = false;
//TO DO remove all styles
const HTMLs = {
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
    `<p id="${name}-wrapper">
          <label for="${getId(name)}">${label}</label>
          <input type="${type}" id="${getId(name)}" name=${name} tabindex="0">
      </p>`,
  textarea: (label, name) =>
    `<div id="${name}-wrapper"">
          <label style="display:block" for="${getId(name)}">${label}</label>
          <textarea id="${getId(
            name,
          )}" name=${name} tabindex="0" rows=1></textarea>
      </div>`,
  select: (label, name) =>
    `<p id="${name}-wrapper">
          <label for="${getId(name)}">${label}</label>
          <select id="${getId(name)}" name=${name} tabindex="0"></select>
        </p>`,
  button: (label) => `<button tabindex="0">${label}</button>`,
  checkbox: (label, checked, name) =>
    `<p id=""${name}-wrapper"">
          <input type="checkbox" id="${getId(name)}"
           ${checked ? "checked" : ""} 
           name=${name} tabindex="0">
          <label for="${getId(name)}">${label}</label>
      </p>`,
  //grouped items
  radio: (label, name) =>
    `<fieldset>
        <legend>${label}</legend>
        <p id="${name}-wrapper">
          <span></span>
        </p>
      </fieldset>`,
  fieldset: (legend) =>
    `<fieldset>
        <legend>${legend}</legend>
      </fieldset>`,
  details: (legend) =>
    `<details>
        <summary>${legend}</summary>
        <div id="detail-wrapper"></div>
      </details>`,
  error: (messages) => `<p class="error-message">${messages}</p>`,
};
function getElement(name, type = "name") {
  const selector =
    type === "name"
      ? `[name = ${name}]`
      : type === "id"
        ? `#${name}`
        : undefined;

  if (!selector) return null;
  return _.select(selector, dialog);
}
function getWrapper(name) {
  // return _.select(`[id = ${name}-wrapper]`);
  return _.select(`#${name}-wrapper`);
}

function setElementsAttrs(specifiers) {
  if (!specifiers) return;

  const specs = Array.isArray(specifiers) ? specifiers : [specifiers];

  for (const spec of specs) {
    const isName = spec.name || spec.names;

    const { names, name, ids, id, attrs, applyTo, row, col } = spec;

    console.assert(Array.isArray(attrs), `"attrs" not array`);
    const [attr, value, action] = attrs;
    const isValidValueType =
      typeof value === "string" || typeof value === "boolean";
    if (!isValidValueType) continue;
    const nameOrId = name ? name : id;

    const selectors = isName ? (names ? names : [name]) : ids ? ids : [id];

    for (const s of selectors) {
      const e = !isName
        ? getElement(s, "id")
        : applyTo === "wrapper"
          ? getWrapper(s)
          : applyTo === "cell"
            ? TableUi.getCell(s, row, col)
            : getElement(s);
      if (!e) continue;
      if (attr === "text") {
        e.textContent = value;
        continue;
      }
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
  const { tag, name, label } = param;
  const html = HTMLs[tag](label, name);
  const div = _.createElements(html);
  const select = _.select("select", div);
  updateSelectElement(select, param);
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

  return wrapper;
}
function createInput(param) {
  const { tag, name, label } = param;
  const html = HTMLs["input"](label, tag, name);
  const div = _.createElements(html);
  const input = _.select("input", div);
  updateInputElement(input, param);
  return div;
}
function createTextArea(param) {
  const { tag, name, label } = param;
  const html = HTMLs[tag](label, name);
  const div = _.createElements(html);
  const textarea = _.select("textarea", div);
  if (param.value) {
    textarea.textContent = param.value ?? "";
  }
  setElementAttributes(textarea, param);
  return div;
}
function assertName(name, param) {
  console.assert(
    name && typeof name === "string",
    `"name" absent ${JSON.stringify(param)}`,
  );
  console.assert(
    name && typeof name === "string" && !name.includes("-"),
    `hyphenated "name" ${name}`,
  );
}

function createElement(param) {
  if (!param) return;

  const { tag, name, label } = param;

  if (!tag) return createErrorElement("Missing tag");

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
  if (tag === "object") return TableUi.make(param, dialog); //ObjectUi.make(param);

  if (tag === "table") return TableUi.make(param, dialog);

  if (tag === "date-select") {
    return DateSelectUi.make(param);
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
                : _.createElements({
                    div: { text: `Unsupported tag: ${tag}` },
                  });
        fieldset.append(e);
      });
    }
    return fieldset;
  }

  if (tag === "details") {
    const { legend, elements } = param;

    const html = HTMLs[tag](legend);
    const details = _.createElements(html);
    const detailWrapper = _.select("#detail-wrapper", details);
    if (elements) {
      elements.forEach((param) => {
        const { tag } = param;
        if (tag) {
          const e = isInput(tag)
            ? createInput(param)
            : tag === "select"
              ? createSelect(param)
              : tag === "textarea"
                ? createTextArea(param)
                : tag === "button"
                  ? createButton(param)
                  : _.createElements({
                      div: { text: `Unsupported tag in detail: ${tag}` },
                    });
          detailWrapper.append(e);
        }
      });
    }
    return details;
  }

  const e = _.createElements(tag); //document.createElement(tag);
  setElementAttributes(e, param);
  if (label) e.textContent = label;
  return e;
}

function disableOnError() {
  const hasErrors = _.selectAll(".error", dialog).length > 0;
  const disableOnErrorElements = _.selectAll(".disable-on-error", dialog);
  if (hasErrors) disable(disableOnErrorElements);
  else enable(disableOnErrorElements);
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
      error.classList.remove("error");
    }
    const errs = _.selectAll(".error-message", dialog);
    for (const msg of errs) msg.remove();

    hasErrors = false;
    disableOnError();
    return this;
  }
  hasErrors = true;

  if (!name) {
    const err = _.createElements(
      HTMLs["error"]("No name for: " + errorMessages),
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
  const wrapperId = name + "-wrapper";
  // const wrapper = _.select("#" + wrapperId, dialog); //getElement(name);
  const wrapper = getElement(wrapperId, "id");
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
    overlayDiv.appendChild(el);
  });
  disableOnError();
  return this;
}
function make(
  elements,
  { callback, width = "medium", classes = "", legend = "" },
) {
  if (!customElements.get("date-input"))
    customElements.define("date-input", DateUi);
  if (dialog) close();
  // if (!dialogId) {
  dialog = _.createElements(HTMLs["dialog"](legend));
  dialog.setAttribute("class", classes);
  const body = document.body;
  body.appendChild(dialog);

  if (typeof callback === "function") {
    dialog.addEventListener("change", (e) => {
      const target = e.target;
      callback({ type: "change", target });
    });

    dialog.addEventListener("click", (e) => {
      const target = e.target;
      const isButton = target.tagName.toLowerCase() === "button";
      const type = isButton ? "click-button" : "click";
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
function data(removeInternals = false) {
  if (!dialog) return;
  const data = {};
  const elementsWithNames = _.selectAll("[name]", dialog);
  for (const el of elementsWithNames) {
    const key = el.getAttribute("name");
    data[key] =
      el.type === "checkbox"
        ? el.checked
        : el.type === "radio"
          ? (data[key] ?? (el.checked ? el.value : undefined))
          : ["table", "object"].includes(el.dataset.type) // === "table"
            ? TableUi.getData(key)
            : // : el.dataset.type === "object"
              //   ? ObjectUi.getData(el, key) //getObjectData(key)
              el.value
              ? String(el.value).trim()
              : "";
  }
  //to do remove removeInternals
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => (removeInternals ? true : !key.includes("-")))
      .map(([key, value]) => [key, _.escapeHTML(value)]),
  );
}

function alert(message, buttons, legend) {
  const alertElements = [{ tag: "p", label: message }, { tag: "hr" }];

  (Array.isArray(buttons) ? buttons : ["Close"]).forEach((label) => {
    if (typeof label == "string") alertElements.push({ tag: "button", label });
  });

  alertButtonPressed = "";
  make(alertElements, { legend: legend ?? "Alert", classes: "dialog" });
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

const Dialog = {
  getElement,
  setElementsAttrs,
  hasErrors,
  markErrors,
  overlay,
  make,
  show,
  close,
  data,
  alert,
  test,
};
function enable(e) {
  const elements = Array.isArray(e) ? e : [e];
  elements.forEach((element) => element.removeAttribute("disabled"));
}
function disable(e) {
  const elements = Array.isArray(e) ? e : [e];
  elements.forEach((element) => element.setAttribute("disabled", "disabled"));
}
function triggerEvent(eventType) {
  if (!eventType) return;
  if (!dialog) return;
  const event = new Event(eventType);
  dialog.dispatchEvent(event);
}
const id = Symbol("id");
export class TableUi {
  static make(param, parent) {
    const { elements, value } = param;
    const names = elements.map((e) => e.name);
    const isTable = param.tag === "table";
    const str = value
      ? value.split(",").map((s) => s.trim())
      : isTable
        ? []
        : names.map((_, i) => elements[i].default ?? "");

    let data = [];

    for (let i = 0; i < str.length; i += names.length) {
      let obj = { [id]: i + 1 };
      names.forEach((key, index) => {
        if (str[i + index] !== undefined) {
          obj[key] = str[i + index];
        }
      });
      data.push(obj);
    }
    let nextId = data.length;

    const wrapper = createTable(param);
    if (isTable)
      _.select("#add-btn", wrapper).addEventListener("click", addRow);

    render();
    return wrapper;

    function render() {
      let rows = data.map((r) => r);
      const tbody = _.select("tbody", wrapper);
      tbody.innerHTML = "";
      if (rows.length === 0) tbody.innerHTML = `<tr><td>No data</td></tr>`;

      rows.forEach((row) => {
        const tr = _.createElements("tr");
        names.forEach((col) => {
          const td = _.createElements("td");
          td.textContent = row[col];
          td.addEventListener("click", () =>
            startEdit(td, row[id], col, row[col]),
          );
          tr.appendChild(td);
        });

        if (isTable) {
          const delTd = _.createElements("td");
          const delBtn = _.createElements("button");
          // delBtn.className = "del-btn";
          delBtn.textContent = "×";
          delBtn.title = "Delete row";
          delBtn.addEventListener("click", () => {
            data = data.filter((r) => r[id] !== row[id]);
            render();
            if (parent) parent.dispatchEvent(new Event("change"));
          });
          delTd.appendChild(delBtn);
          tr.appendChild(delTd);
        }
        tbody.appendChild(tr);
      });
    }

    function startEdit(td, index, col, value) {
      if (td.childElementCount > 0) return;
      const prev = td.innerHTML;
      td.innerHTML = "";
      const spec = {
        ...param.elements.find((e) => e.name === col),
        value: prev,
        td,
      };
      const input = createInput(spec, td);
      td.appendChild(input);
      input.focus();

      function commit() {
        const val = input.value.trim(); //|| value;
        data = data.map((r) => (r[id] === index ? { ...r, [col]: val } : r));
        render();
        if (parent) parent.dispatchEvent(new Event("change"));
      }
      function cancel() {
        td.innerHTML = prev;
      }

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          input.blur();
        }
        if (e.key === "Escape") {
          input.removeEventListener("blur", commit);
          cancel();
        }
      });
    }

    function addRow() {
      data.push({
        [id]: ++nextId,
        ...Object.fromEntries(
          names.map((r, i) => [r, param.elements[i].default ?? ""]),
        ),
      });
      render();
      if (parent) parent.dispatchEvent(new Event("change"));
    }

    function createTable() {
      const { tag, label, name, elements } = param;
      const labels = elements.map((e) => e.label);
      const thead = `
      <thead>
        <tr>
          ${labels.map((r) => `<th data-col="${r}">${r}</th>`).join("")}
          ${isTable ? `<th></th>` : ``}
        </tr>
      </thead>`;
      const html = `
        <summary>${label}</summary>
        <div id="${name}-wrapper">
          ${isTable ? `<button id="add-btn" title="Add row">&plus;</button>` : ""}
          <table id="${name}" name="${name}" data-type="table">
            ${thead}
            <tbody></tbody>
          </table>
        </div>`;

      const details = _.createElements("details");
      details.innerHTML = html;
      return details;
    }
    function createInput(param, td) {
      const { tag } = param;
      if (tag === "select") {
        const select = _.createElements("select");
        updateSelectElement(select, param);
        return select;
      }
      const input = _.createElements("input");
      updateInputElement(input, param);
      // input.style = td.style; //.width = "100%";
      // console.log({ input });

      return input;
    }
  }
  static getData(name) {
    const dialog = _.select("dialog");
    const div = _.select(`#${name}-wrapper`, dialog);
    if (!div) return;
    const isTable = _.select("#add-btn", div);
    const trs = _.selectAll("tbody tr", div);
    if (!trs) return "";
    return [...trs]
      .map((tr) => {
        const row = [..._.selectAll("td", tr)].map((td, i) => td.textContent);
        return isTable ? row.toSpliced(-1, 1) : row;
      })
      .flat()
      .join(",");
  }
  static getCell(name, row, col) {
    const div = _.select(`#${name}-wrapper`);
    if (!div) return;
    const trs = [..._.selectAll("tbody tr", div)];
    if (!trs) return;
    const tr = trs.filter((_, i) => i === row)[0];
    if (!tr) return;
    const td = [..._.selectAll("td", tr)].filter((_, i) => i === col)[0];
    return td;
  }
}

class xDateUi {
  static make(param) {
    const { value, name, label, type = "date", list } = param;
    const options = list
      ? list
          .split(",")
          .map((op) => op.trim())
          .map((op, i) => `<option ${value === op?"selected":""}value="${op}">${op}</option>`)
          .join("")
      : "";
    // optHtmls.push(`<option hidden></option>`);
    const id = "list"
    const html = `
      <p id="${name}-wrapper" class="date-select">
          <label for="${name}">${label}</label>
          <input type="text" id="${name}" name="${name}" ${options? `list="${id}"`:""}>
          ${options? `<datalist id="${id}"></datalist>`:""}
          <input type="date"></input>
      </p>`;

    const wrapper = _.createElements(html);
    const select = _.select(`#${name}`, wrapper);
    select.style = "min-width:14ch;margin-right:1ch;";
    const input = _.select(`input`, wrapper);
    input.style = "width:2.5rem;color:transparent";
    input.addEventListener("change", () => {
      set(input.value);
    });

    if (_.isValidDate(value)) set(value);
    else select.value = value;

    return wrapper;

    function set(value) {
      if (!value) return;
      const options = _.selectAll(`option`, select);
      const lastOption = options[options.length - 1];
      const displayValue = _.isValidDate(value)
        ? _.formatDate(value, "YYYY-MM-DD")
        : "";
      lastOption.value = displayValue;
      lastOption.textContent = displayValue;
      select.value = displayValue;
    }
  }
}

class DateUi extends HTMLElement {
  constructor() {
    super();
    // this.attachShadow({ mode: "open" });
  }
  // connectedCallback() { this._render(); }

  // attributeChangedCallback() {
  //   if (this._shadow.innerHTML) this._update();
  // }
  connectedCallback() {
    this._render();
    this.attachEventListeners();
  }

  static get observedAttributes() {
    return ["list", "value", "placeholder", "name", "disabled"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._render();
      this.attachEventListeners();
    }
  }

  _getList() {
    const list = this.getAttribute("list");
    return list
      ? list
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "")
      : [];
  }

  _render() {
    const list = this._getList();
    const options = list
      .map((o) => `<option value="${o}">${o}</option>`)
      .join("");
    const id = crypto.randomUUID();
    const ph = this.getAttribute("placeholder") || ``; //placeholderFromFormat(fmt);
    const name = this.getAttribute("name") || "";
    const disabled = this.hasAttribute("disabled") || ``;
    // this.shadowRoot.innerHTML = `
    this.innerHTML = `
          <p>
            <input type="text" 
              ${name ? `name="${name}"` : ""}
              ${ph ? `placeholder="${ph}"` : ""}
              ${disabled ? `disabled="disabled"` : ""}
              ${options !== "" ? `list="${id}"` : ""}
            >
            ${options !== "" ? `<datalist id="${id}">${options}</datalist>` : ""}
            <input type="date" style="width:2rem;overflow:hidden;cursor: pointer;">
          </p>
        `;
  }

  attachEventListeners() {
    const options = this._getList();
    // const [dateInput, display] = this.shadowRoot.querySelectorAll(`input`);
    const [display, dateInput] = this.querySelectorAll(`input`);

    this._display = display;

    if (dateInput && display)
      dateInput.addEventListener("change", (e) => triggerChange(e, this));

    if (display)
      display.addEventListener("change", (e) => triggerChange(e, this));

    function triggerChange(e, el) {
      display.value = e.target.value || "";
      el.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    }
  }
  get value() {
    return this._display.value;
  }
  set value(val) {
    this._display.value = val;
  }
}

function test(action, name, value) {
  if (!dialog) return;
  if (action === "set") {
    const element = getElement(name);
    if (!element) return;
    if (element.value === value) return;
    element.value = value;
    const event = new Event("change", { bubbles: true });
    element.dispatchEvent(event);
    return;
  }
  if (action === "click") {
    const button = _.select(`button:has(span:contains("${name}"))`, dialog);
    if (!button) return;
    button.click();
    return;
  }
  if (action === "open") {
    const details = _.selectAll("details", dialog);
    if (!details) return;
    details.forEach((d) => (d.open = true));
  }
}
