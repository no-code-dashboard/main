"use strict";
import { _ } from "../util.js";
import { TaggedInput } from "./tagged-input.js";
// import style from "/css/dialog.css"
export { Dialog };

const UUID = crypto.randomUUID();

const getId = (id) => id + "-" + UUID;
const getWrapperId = (id) => id + "-wrapper-" + UUID;

// to do fix id

/**
 * To do
 * resolve "Form submission canceled because the form is not connected"
 * do we really need the wrappers?
 *
 *
 */

function isSpecial(tag) {
  const specials = [
    "tag", //not valid prop/tag
    "label", //valid tag and prop
    "for", //valid prop
    "type", //valid prop
    "value", //valid prop
    "name", //valid prop
    "elements",
    "option", //not used but safety
    "options", //option is valid prop not options
    "data-type", //valid prop
    "id", //valid prop
    "text", // not valid prop
    //todo fix tags etc
    //https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes
    "_tag",
    "_t",
    "_label",
    "_l",
    "_value",
    "_v", //keep value as valid prop
    // "name",
    "_elements",
    "_e",
    "_options",
    "_o",
    "_type", //keep type as valid prop
    "_txt", // for text
  ];
  return specials.includes(tag);
}
function isInput(tag) {
  return ["text", "date", "number", "range"].includes(tag);
}

let dialog, alertButtonPressed;

let hasErrors = false;
//TO DO remove all styles
//TO DO allow disable/enable hide/show most common

function getElement(target, type = "name") {
  const selector =
    type === "name"
      ? `[name = ${target}]`
      : type === "id"
        ? `#${target}`
        : target;

  return selector ? _.select(selector, dialog) : null;
}
function getWrapper(name) {
  // return _.select(`[id = ${name}-wrapper]`);
  return _.select(`#${name}-wrapper`);
}

function setElementsAttrs(specifiers) {
  //todo we only need this for show/hide and enable/diable
  if (!specifiers) return;

  const specs = _.isArray(specifiers) ? specifiers : [specifiers];

  for (const spec of specs) {
    const { name, id, attrs, applyTo } = spec;
    if (!(name || id)) continue;
    if (!_.isArray(attrs)) continue;

    const [attr, value] = attrs;
    if (!attr) continue;
    const isValidValue =
      _.isString(value) || typeof value === "boolean" || value === undefined;

    if (!isValidValue) continue;

    const selectors = name
      ? _.isArray(name)
        ? name
        : [name]
      : _.isArray(id)
        ? id
        : [id];

    for (const selector of selectors) {
      const e = !name
        ? getElement(getId(selector), "id")
        : applyTo === "wrapper"
          ? getWrapper(selector)
          : getElement(selector);

      {
        //todo add show/hide remove class.. and applyTo???
        // const ok = [
        //   "class-add",
        //   "class-remove",
        //   "disabled",
        //   "placeholder",
        //   "text",
        // ];
        // if (!ok.includes(attr))
        //   console.log("setElementsAttrs", { attr, value, e });
      }
      if (!e) continue;

      if (attr === "text") {
        e.textContent = value;
        continue;
      }
      if (attr.startsWith("class-")) {
        if (attr === "class-add") e.classList.add(value);
        if (attr === "class-remove") e.classList.remove(value);
        if (attr === "class-toggle") e.classList.toggle(value);
        continue;
      }
      // if (attr === "class") {
      //   if (!action) e.setAttribute(attr, value);
      //   if (action === "add") e.classList.add(value);
      //   if (action === "remove") e.classList.remove(value);
      //   if (action === "toggle") e.classList.toggle(value);
      //   continue;
      // }

      if (value) e.setAttribute(attr, value);
      else e.removeAttribute(attr);
    }
  }
}

function createErrorElement(text) {
  return _.createElements(`<p class="error-message">${text}</p>`);
}
function setElementAttributes(e, param) {
  for (const key in param) {
    if (key.startsWith("_")) continue;
    if (isSpecial(key)) continue;
    try {
      e.setAttribute(key, param[key]);
    } catch (error) {
      console.error(`Invalid attribute in dialog: (${key}:${param[key]})`);
    }
  }
}
function createButton(param) {
  const { label } = param;
  const type = param.class === "disable-on-error" ? 'type="submit"' : "";
  const button = _.createElements(
    `<button ${type} tabindex="0">${label}</button>`,
  );
  setElementAttributes(button, param);
  return button;
}

function createSelect(param) {
  const { name, label, options, value } = param;
  const id = getId(name);
  const wrapper = _.createElements(`<p id="${name}-wrapper"></p>`);
  const _label = _.createElements(`<label for="${id}">${label}</label>`);
  wrapper.append(_label);
  const ops = options.map(
    (op) =>
      `<option value="${op}" ${op === value ? "selected" : ""}>${op}</option>`,
  );

  const select =
    _.createElements(`<select id="${id}" name="${name}" tabindex="0">
      ${ops.join("")}
    </select>`);
  setElementAttributes(select, param);
  wrapper.append(select);
  return wrapper;
}
function createFileSelect(param) {
  const { options, name, label, value } = param;
  const id = getId(name);
  const html = `<p id="${name}-wrapper">
    <input id="${id}" type="file" name="${name}">
  </p>`;
  const wrapper = _.createElements(html);
  return wrapper;
}
function createRadio(param) {
  const { options, name, label, value } = param;
  const _options = options
    .map((op, i) => {
      const id = getId(name + "_" + i);
      const checked = (value ?? options[0]) === op ? "checked" : "";
      return `<input id="${id}" value ="${op}" type="radio" name="${name}" ${checked}>
      <label for="${id}">${op}</label>`;
    })
    .join("");

  const html = `<fieldset>
        <legend>${label}</legend>
        <div id="${name}-wrapper">
          ${_options}
        </div>
      </fieldset>`;

  const wrapper = _.createElements(html);
  return wrapper;
}
function createInput(param) {
  const { tag, name, label, value } = param;
  const id = getId(name);
  const wrapper = _.createElements(`<p id="${name}-wrapper"></p>`);
  const _label = _.createElements(`<label for="${id}">${label}</label>`);
  wrapper.append(_label);

  const _param = { ...param, id, type: tag };
  const isTaggedInput = tag === "date" || tag === "text";
  const input = isTaggedInput
    ? TaggedInput.make(_param, dialog)
    : _.createElements(
        `<input type="${tag}" id="${id}" name="${name}" value="${value}">`,
      );

  if (!isTaggedInput) setElementAttributes(input, param);
  wrapper.append(input);
  return wrapper;
}
function createTextArea(param) {
  const { tag, name, label, value } = param;
  const id = getId(name);
  const wrapper = _.createElements(`<div id="${name}-wrapper"></div>`);
  const _label = _.createElements(
    `<label style="display:block" for="${id}">${label}</label>`,
  );
  wrapper.append(_label);

  const textarea = _.createElements(
    `<textarea id="${id}" name=${name} tabindex="0" rows=1></textarea>`,
  );
  if (value) {
    textarea.textContent = value;
  }
  setElementAttributes(textarea, param);
  wrapper.append(textarea);
  return wrapper;
}

function createCheckboxs(param) {
  const { label, value, name, disabled } = param;
  const div = _.createElements("div");
  const checked = Boolean(value);
  const checkEntry = createOne(label, checked);
  div.appendChild(checkEntry);

  const wrapper = _.createElements("div");
  wrapper.append(div);
  return wrapper;

  function createOne(label, checked) {
    const html = `<p id=""${name}-wrapper"">
          <input type="checkbox" id="${getId(name)}" 
           ${checked ? "checked" : ""} 
           ${disabled ? "disabled" : ""}
           name="${name}" tabindex="0">
          <label for="${getId(name)}">${label}</label>
      </p>`;
    const p = _.createElements(html);
    // const input = _.select("input", p);
    // if (disabled) input.disabled = true;
    return p;
  }
}

const isAtomicUi = (tag) =>
  isInput(tag) ||
  ["select", "button", "radio", "checkbox", "textarea", "file"].includes(tag);

function createAtomicUi(param) {
  const { tag } = param;
  if (isInput(tag)) return createInput(param);
  if (tag === "select") return createSelect(param);
  if (tag === "button") return createButton(param);
  if (tag === "radio") return createRadio(param);
  if (tag === "textarea") return createTextArea(param);
  if (tag === "checkbox") return createCheckboxs(param);
  if (tag === "file") return createFileSelect(param);
  return;
}

function createElement(param) {
  if (!param) return;

  const { tag, name, label, id } = param;

  if (!tag) return createErrorElement("Missing tag");

  if (isAtomicUi(tag)) return createAtomicUi(param);

  if (tag == "overlay") {
    const id = param.id;
    const overlayDiv = _.createElements(
      `<div ${id ? `id="${id}"` : ""} class="overlay"></div>`,
    );
    return overlayDiv;
  }

  if (tag === "object") return ObjectUi.make(param, dialog);
  if (tag === "table") return TableUi.make(param, dialog);

  if (tag === "date-select") {
    return TaggedInput.make({ ...param, tags: ["max"] }, dialog);
  }

  if (tag == "fieldset") {
    // assertName(name);
    const { legend, elements } = param;

    const html = `<fieldset>
        <legend>${legend}</legend>
      </fieldset>`;
    const fieldset = _.createElements(html);
    if (elements) {
      elements.forEach((param) => {
        const { tag } = param;
        const e = isAtomicUi(tag)
          ? createAtomicUi(param)
          : _.createElements(`<div>Unsupported tag in fieldset: ${tag}</div>`);

        fieldset.append(e);
      });
    }
    return fieldset;
  }

  if (tag === "details") {
    const { legend, elements } = param;

    const html = `<details>
        <summary>${legend}</summary>
        <div id="detail-wrapper"></div>
      </details>`;
    const details = _.createElements(html);
    const detailWrapper = _.select("#detail-wrapper", details);
    if (elements) {
      elements.forEach((param) => {
        const { tag } = param;
        const e = isAtomicUi(tag)
          ? createAtomicUi(param)
          : _.createElements(`<div>Unsupported tag in details: ${tag}</div>`);

        detailWrapper.append(e);
      });
    }
    return details;
  }

  const e = _.createElements(tag);
  if (id) e.setAttribute("id", getId(id));
  setElementAttributes(e, param);
  if (param.text) e.textContent = param.text;
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
   * markErrors({ name: ['password', 'confirmPassword'], message: 'Passwords must match' });
   *
   */
function markErrors(errors) {
  if (!errors) {
    error();
    return;
  }
  const errs = _.isArray(errors) ? errors : [errors];
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

  const error = _.createElements(`<p class="error-message"></p>`);

  if (!name) {
    error.textContent = "No name for: " + errorMessages;
    dialog.append(error);
    disableOnError();
    return this;
  }
  const errorToDisplay = _.isArray(errorMessages)
    ? errorMessages.join(". ")
    : errorMessages;

  const namedElement = getElement(name);
  if (namedElement) namedElement.classList.add("error");
  const wrapperId = name + "-wrapper";
  // const wrapper = _.select("#" + wrapperId, dialog); //getElement(name);
  const wrapper = getElement(wrapperId, "id");
  error.textContent = wrapper ? errorToDisplay : name + ":" + errorToDisplay;
  if (wrapper) wrapper.after(error);
  else dialog.append(error);

  disableOnError();
  return this;
}

function overlay(elements, id) {
  //to do remove overlay
  if (!dialog) return;
  // const overlayDiv = _.select(`.overlay${id ? "#" + id : ""}`, dialog);
  const overlayDiv = _.select(`.overlay`, dialog);
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
  { callback = null, width = "medium", classes = "dialog", legend = "" },
) {
  if (dialog) close();
  dialog = _.createElements(`<dialog class="${classes}">
          <form method="dialog">
            <fieldset>
                <legend class="legend-main">${legend}</legend>
                <main></main>
            </fieldset>
          </form>
      </dialog>`);
  const body = _.select("body");

  if (typeof callback === "function") {
    dialog.addEventListener("change", (e) => {
      const target = e.target;
      callback({ type: "change", target, e });
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
    if (!e?.tag) return;
    const element = createElement(e);
    if (!element) return;
    main.append(element);
  });
  body.appendChild(dialog);
  disableOnError();
  console.log("Isconnected: ", _.select("form").isConnected);

  return this;
}
function show(modal = true) {
  if (!dialog) return;
  if (!dialog.open) dialog[modal ? "showModal" : "show"]();
  return this;
}

function close() {
  if (!dialog) return;
  dialog.close();
  dialog.remove();
}
function data() {
  if (!dialog) return {};
  const form = _.select("form", dialog);
  // const disabledElements = form.querySelectorAll(":disabled");
  // disabledElements.forEach((el) => (el.disabled = false));
  const formData = Object.fromEntries(new FormData(form));
  // disabledElements.forEach((el) => (el.disabled = true));

  const specialUis = _.selectAll("[data-type]", dialog);
  for (const el of specialUis) {
    const name = el.getAttribute("name");
    const arr = _.selectAll(`[name^="${name}_"]`, dialog).map((ui) =>
      String(ui.value).trim(),
    );
    if (arr.join("") !== "") formData[name] = arr;
  }
  return Object.fromEntries(
    Object.entries(formData).filter(
      ([name]) => !(name.includes("_") && data[name.split("_")[0]]),
    ),
  );
}

function alert(message, buttons, legend) {
  const elements = [
    { tag: "p", text: message },
    { tag: "hr" },
    ...(_.isArray(buttons) ? buttons : ["Close"]).map((label, i) => ({
      tag: "button",
      label,
    })),
  ];

  alertButtonPressed = "";
  make(elements, { legend: legend ?? "Alert" });
  show();
  const alertButtons = _.selectAll("button", dialog);
  alertButtons[0].type = "submit";
  for (const button of alertButtons)
    button.addEventListener("click", (event) => {
      alertButtonPressed = button.textContent;
      close();
    });

  return new Promise(function (resolve) {
    dialog.addEventListener("close", () => {
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
  const elements = _.isArray(e) ? e : [e];
  elements.forEach((element) => element.removeAttribute("disabled"));
}
function disable(e) {
  const elements = _.isArray(e) ? e : [e];
  elements.forEach((element) => element.setAttribute("disabled", "disabled"));
}

export class TableUi {
  static make(param, parent) {
    function getTableData(names, strArray) {
      const _strArray = strArray ?? TableUi.getData(name);
      const data = [];
      for (let i = 0; i < _strArray.length; i += names.length) {
        const obj = Object.fromEntries(
          names.map((name, j) => [name, _strArray[i + j]]),
        );
        data.push(obj);
      }
      return data;
    }
    const { elements, value, name, item = "Item" } = param;
    const names = elements.map((e) => e.name);
    const str = value ? value.map((s) => s.trim()) : [];
    const details = createTable(param);

    render(getTableData(names, str));
    return details;

    function render(data) {
      const wrapper = _.select(`#${name}`, details);
      _.clearHTML(wrapper); //.innerHTML = "";
      data.forEach((row, i) => {
        const itemLabel = `${item} ${i + 1}`;
        const delLabel = `Delete ${itemLabel}`;
        const definitlyDelLabel = `Definitly Delete ${itemLabel}`;
        const buttonId = getId(name + "-delete-" + i);
        const html = `<fieldset>
          <legend>${itemLabel}:</legend>
        </fieldset>`;
        const fieldset = _.createElements(html);

        const inputs = _.createElements("div");
        elements.forEach((e) => {
          const param = {
            ...e,
            name: name + "_" + e.name + "_" + i,
            value: row[e.name],
          };
          const input = createElement(param);
          inputs.append(input);
        });
        fieldset.append(inputs);

        const button = _.createElements(
          `<button id="${buttonId}" style="width:100%">${delLabel}</button>`,
        );
        fieldset.append(button);
        const reset = (button) => {
          button.classList.remove("t-red");
          button.textContent = delLabel;
        };
        button.addEventListener("blur", () => {
          reset(button);
        });
        button.addEventListener("click", (e) => {
          if (button.classList.contains("t-red")) {
            const data = getTableData(names);
            render(data.filter((_, j) => j !== i));
            if (parent) parent.dispatchEvent(new Event("change"));
          } else {
            button.classList.add("t-red");
            button.textContent = definitlyDelLabel;
          }
        });

        wrapper.appendChild(fieldset);
      });
      // const strArray = _.selectAll(`[name]`, wrapper).map((v) => v.value);
      // wrapper.setAttribute("value", _.stringify(strArray));
    }

    function addRow() {
      const data = getTableData(names);
      const newRow = Object.fromEntries(
        names.map((name, i) => [name, elements[i]?.value ?? ""]),
      );
      data.push(newRow);
      render(data);
      if (parent) parent.dispatchEvent(new Event("change"));
    }

    function createTable(param) {
      const { label, name } = param;

      const html = `
        <details>
          <summary>${label}</summary>
          <div id="${name}-wrapper">
            <div id="${name}" name="${name}" data-type="table">
            </div>
          </div>
        </details>`;
      const details = _.createElements(html);
      const button = _.createElements(
        `<button style="width:100%">Add new ${item}</button>`,
      );
      button.addEventListener("click", addRow);

      details.append(button);
      return details;
    }
  }
  static getData(name) {
    const dialog = _.select("dialog");
    return _.selectAll(`[name^="${name}_"]`, dialog).map((v) => v.value);
  }
}
export class ObjectUi {
  static make(param, parent) {
    const { value, label, name, elements } = param;
    const values = (value ? (_.isArray(value) ? value : []) : []).map((s) =>
      s.trim(),
    );

    // //starling pin 240926

    const html = `
        <summary>${label}</summary>
        <div id="${name}-wrapper">
          <div id="${name}" name="${name}" data-type="object"></div>
        </div>
        <button style="width:100%">Clear ${label}</button>`;

    const details = _.createElements("details");
    details.innerHTML = html;
    const wrapper = details.querySelector(`#${name}-wrapper`);
    const button = _.select("button", details); //todo fix bad code where button selected before antother buttons are chosen
    elements.forEach((e, i) => {
      const param = { ...e, name: name + "_" + e.name, value: values[i] };
      const input = createElement(param);
      wrapper.append(input);
    });

    const reset = (button) => {
      button.classList.remove("t-red");
      button.textContent = `Clear ${label}`;
    };
    button.addEventListener("blur", () => {
      reset(button);
    });

    button.addEventListener("click", (e) => {
      if (button.classList.contains("t-red")) {
        _.selectAll(`[name^="${name}_"]`, dialog).forEach(
          (e) => (e.value = ""),
        );
        if (parent) parent.dispatchEvent(new Event("change"));
        reset(button);
      } else {
        button.classList.add("t-red");
        button.textContent = "Definitely clear";
      }
    });

    return details;
  }
  // static getData(name) {
  //   const dialog = _.select("dialog");
  //   const entries = _.selectAll(`[name^="${name}_"]`, dialog).map(
  //     (ui) => ui.value,
  //   );
  //   return entries; //: entries.join(",");
  // }
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
