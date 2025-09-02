"use strict";
import { _ } from "./util.js";
export { registerComponents };
//todo: https://codepen.io/beforesemicolon/pen/jOMgZrY
class Datainput extends HTMLElement {
  constructor() {
    super();
    this.dateIndicator = "Date";
    this.innerHTML = `<select id="select">
      <option value="Date">Date</option>
    </select>
    <input type="date" id="input"/>`;
    this.select = this.querySelector("select");
    this.input = this.querySelector("input");
    //if (this.select.value !== "date") this.input.setAttribute("disabled", true);
    this.select.addEventListener("change", this);
    this.handleEvent();
    // const value = this.getAttribute("value")
    // console.log(value)
    // if (value) this.setAttribute("value",value)
  }
  static observedAttributes = ["options", "value"];

  get options() {
    this.getAttribute("options");
  }
  set options(value) {
    this.setAttribute("options", value);
  }

  handleEvent(event) {
    const value = this.select.value.trim();
    if (value === this.dateIndicator) this.input.removeAttribute("disabled");
    else this.input.setAttribute("disabled", true);
  }
  get value() {
    return this.select.value !== this.dateIndicator ? this.select.value : this.input.value;
  }
  set value(value) {
    if (typeof value !== "string") return;
    if (value === this.dateIndicator) return;

    const select = this.select;

    const options = _.selectAll("option", select);
    const option = options.filter((option) => option.value === value)[0];
    if (option) {
      select.value = value;
      this.handleEvent(); //select.value does not triggerhandleEvent
      return;
    }
  
    if (!_.isValidDate(value)) return
    select.value = this.dateIndicator; //options[options.length - 1].value;
    this.input.value = value;
    this.handleEvent(); //select.value does not triggerhandleEvent
  }
  attributeChangedCallback(attr, oldValue, newValue) {
    console.log(newValue)
    if (attr.toLowerCase() === "options") {
      const select = this.select;
      const options =
        typeof newValue === "string"
          ? _.getArray(newValue).filter((v) => v.trim() !== this.dateIndicator)
          : [];
      removeExstingOptions();
      options.forEach((option) =>
        select.append(
          _.createElements({ option: { text: option, value: option } })
        )
      );
      select.append(
        _.createElements({
          option: { text: this.dateIndicator, value: this.dateIndicator },
        })
      );

      function removeExstingOptions() {
        const options = _.selectAll("option", select);
        options.forEach((option) => option.remove());
      }
    }
    // console.log("attribute changed", name, oldValue, newValue, this);
  }
}
function registerComponents() {
  customElements.define("date-input", Datainput);
}
