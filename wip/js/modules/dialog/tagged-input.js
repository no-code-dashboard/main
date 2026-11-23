import { _ } from "../util.js";
export class TaggedInput {
  static make(params = {}, parent) {
    const {
      type,
      id,
      placeholder = "",
      name,
      options = [],
      value = "",
    } = params;

    const tags = (
      typeof options === "string" ? options.split(",") : options
    ).map((o) => o.trim());
    // .filter((o) => o);

    const hasTags = tags.length > 0;
    const includeDate = type === "date";

    // --- build DOM --- to do how do we return input so that other attaributes may be applied

    const wrapper = _.createElements(`<p class="tdi-wrapper"></p>`);
    const input = _.createElements(
      `<input type="text" class="tdi-input" id="${id}" name="${name}" ${value ? `value="${value}"` : ""}>`,
    );
    input.placeholder = placeholder
      ? placeholder
      : hasTags && includeDate
        ? "Pick tag or date..."
        : hasTags
          ? "Pick tag..."
          : includeDate
            ? "Pick date..."
            : "";
    wrapper.appendChild(input);
    const panel = _.createElements(`<div class="tdi-panel"></div>`);
    if (hasTags) {
      const html = `<button type="button" class="tiny" aria-label="select tag" title="select tag">
        <svg viewBox="0 0 24 24">
          <path d="M12 19L6 9H18L12 19Z"/>
        </svg>
      </button>`;
      const tagBtn = _.createElements(html);
      // if (hasTags)
      tags.forEach((tag, i) => {
        if (i % 2 !== 0) return;
        const item = document.createElement("button");
        item.className = "tdi-tag-item";
        item.textContent = tag + (tags[i + 1] ? ` (${tags[i + 1]})` : "");
        item.addEventListener("click", () => {
          input.value = tag;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          closePanel();
        });
        panel.appendChild(item);
      });

      tagBtn.addEventListener("click", (e) => {
        const isOpen = panel.classList.contains("tdi-open");

        const openPanels = _.selectAll(".tdi-open");
        openPanels.forEach((p) => p.classList.remove("tdi-open"));

        e.stopPropagation();
        if (isOpen) closePanel();
        else openPanel();
      });

      if (parent)
        parent.addEventListener("click", (e) => {
          if (!panel.contains(e.target)) closePanel();
        });
      wrapper.appendChild(tagBtn);
      wrapper.appendChild(panel);
    }

    if (includeDate) {
      const html = `<button type="button" class="tiny" aria-label="select date" title="select date">
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
      </button>`;
      const dateBtn = _.createElements(html);

      const hiddenDateInput = _.createElements(`<input type="date">`);
      hiddenDateInput.value = value;
      hiddenDateInput.tabIndex = -1;

      dateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closePanel();
        let openedNatively = false;
        if (typeof hiddenDateInput.showPicker === "function") {
          try {
            hiddenDateInput.showPicker(); // modern browsers (Chrome, Edge)
            openedNatively = true;
          } catch (err) {
            // showPicker() throws in some contexts (e.g. cross-origin iframes,
            // no user-activation, or browsers that restrict it) — fall back below.
            openedNatively = false;
          }
        }
        if (!openedNatively) {
          hiddenDateInput.focus();
          hiddenDateInput.click(); // fallback (e.g. Firefox/Safari, sandboxed iframes)
        }
      });

      hiddenDateInput.addEventListener("change", () => {
        // if (!hiddenDateInput.value) return;
        // const [y, m, d] = hiddenDateInput.value.split("-");
        input.value = hiddenDateInput.value;
        // options.dateFormat === "locale"
        //   ? new Date(y, m - 1, d).toLocaleDateString()
        //   : hiddenDateInput.value; // ISO YYYY-MM-DD
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });

      wrapper.appendChild(dateBtn);
      wrapper.appendChild(hiddenDateInput);
    }

    if (!includeDate && !hasTags) {
      input.addEventListener("keydown", (event) => {
        const value = input.value.trim();
        const placeholder = input.placeholder;

        if (event.key === "ArrowRight" && value === "" && placeholder) {
          event.preventDefault(); // keep the arrow key from doing anything else
          input.value = placeholder;
          input.setSelectionRange(value.length - 1, value.length - 1);
        }
      });
    }
    return wrapper;

    function openPanel() {
      if (panel) panel.classList.add("tdi-open");
    }
    function closePanel() {
      if (panel) panel.classList.remove("tdi-open");
    }
  }
}
