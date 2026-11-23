"use strict";
import { _ } from "../modules/util.js";
export { markdownToHtml };
/**
 * Main function to convert the "limited" Markdown text to HTML.
 * Supports: Bold, Italic, Link, Unordered/Ordered List, Table
 * @param {string} markdown - The raw markdown input string.
 * @returns {string} - The resulting HTML string.
 */
function markdownToHtml(markdown) {
  const CODE_PLACEHOLDER = crypto.randomUUID();
  const lines = markdown.split("\n");
  var output = [];
  var inUnorderedList = false;
  var inOrderedList = false;
  // table vars
  var tableState = "none";
  var tableHeader = "";
  var tablestyles = [];
  // code block
  var codeBlockState = "none";

  function push(tag) {
    output.push(tag);
  }
  // Helper to close lists
  function closeLists() {
    if (inUnorderedList) {
      push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      push("</ol>");
      inOrderedList = false;
    }
    if (tableState === "table") {
      push("</table>");
      tableState = "none";
    }
  }

  for (const line of lines) {
    // Sanitise
    const safeline = _.escapeHTML(line);

    // code block
    if (safeline.startsWith("```")) {
      if (codeBlockState === "none") {
        push("<pre><code>");
        codeBlockState = "code";
      } else {
        push("</code></pre>");
        codeBlockState = "none";
      }
      continue;
    }
    if (codeBlockState === "code") {
      push(safeline);
      continue;
    }
    // Handle unordered list item
    if (safeline.startsWith("* ") || safeline.startsWith("- ")) {
      // Start a new UL if not already in one, closing OL if necessary
      if (inOrderedList) {
        push("</ol>");
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        push("<ul>");
        inUnorderedList = true;
      }

      // Extract content and process inline
      const listItemContent = safeline.substring(2).trim();
      push(`<li>${processInline(listItemContent)}</li>`);
      continue; // Done with this line
    }
    // Handle table
    if (safeline.startsWith("|") && safeline.endsWith("|")) {
      if (tableState === "none") {
        tableState = "possible";
        tableHeader = safeline;
        continue;
      }
      const tds = getRowTexts(safeline);

      if (tableState === "possible") {
        var isValidTableRowAfterHeder = true;
        function getAlignment(input) {
          if (!input) {
            isValidTableRowAfterHeder = false;
            return null;
          }

          // Regex: starts with :, has one or more -, ends with :
          if (/^:-+:$/.test(input)) {
            return "text-align: center";
          }

          // Regex: starts with :, then one or more - until the end
          if (/^:-+$/.test(input)) {
            return "text-align: left";
          }

          // Regex: one or more - followed by : at the end
          if (/^-+:$/.test(input)) {
            return "text-align: right";
          }

          // 4. Check for Default/Space: Purely hyphens
          // Regex: one or more hyphens only
          if (/^-+$/.test(input)) {
            return "";
          }
          isValidTableRowAfterHeder = false;
          // 5. Fallback
          return null;
        }
        tablestyles = [];
        tds.forEach((td) => tablestyles.push(getAlignment(td)));

        if (!isValidTableRowAfterHeder) {
          push(`<p>${processInline(tableHeader)}</p>`);
          push(`<p>${processInline(safeline)}</p>`);
          tableHeader = "";
          tableState === "none";
          tablestyles = [];
          continue;
        }
        tableState = "table";
        const ths = getRowTexts(tableHeader);
        push("<table>");
        push(getTableRow(ths, "th", tablestyles));
        continue;
      }
      push(getTableRow(tds, "td", tablestyles));
      continue;

      function getRowTexts(text) {
        return text
          .substring(1, text.length - 1)
          .split("|")
          .map((v) => v.trim(v));
      }

      function getTableRow(tds, tag, styles) {
        var row = `<tr>`;
        tds.forEach((td, i) => {
          const style = styles[i] ? ` style="${styles[i]}"` : "";
          row += `<${tag}${style}>${processInline(td)}</${tag}>`;
        });
        row += `</tr>`;
        return row;
      }
    }
    // Handle ordered list item
    // Regex: Matches digits followed by a dot and a space (e.g., "1. ")
    const olMatch = safeline.match(/^(\d+\.\s)(.*)/);
    if (olMatch) {
      // Start a new OL if not already in one, closing UL if necessary
      if (inUnorderedList) {
        push("</ul>");
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        push("<ol>");
        inOrderedList = true;
      }

      // Extract content and process inline (group 2 is the rest of the line)
      const listItemContent = olMatch[2].trim();
      push(`<li>${processInline(listItemContent)}</li>`);
      continue; // Done with this line
    }

    // Handle paragraph (If not a list item)
    closeLists();

    // Process inline elements and wrap in <p> tag

    push(`<p>${processInline(safeline)}</p>`);
  }

  // Final check to close any open lists at the end of the document
  closeLists();

  // Join everything back into a single HTML string

  return output.join("\n");

  function processInline(text) {
    const codes = [];
    const b = "<b>$1</b>",
      i = "<i>$1</i>",
      bi = "<b><i>$1</i></b>";

    const rules = [
      //code
      [
        /`([^`]+)`/g,
        (_, p) => {
          codes.push(p);
          return CODE_PLACEHOLDER;
        },
      ],

      //Bold italics ***x*** or ___x___
      [/\*{3}(.*?)\*{3}/g, bi],
      [/\_{3}(.*?)\_{3}/g, bi],

      // Bold **x** or __x__
      [/\*\*(.*?)\*\*/g, b],
      [/__(.*?)\__/g, b],

      // Italics *x* or _x_
      [/\*(.*?)\*/g, i],
      [/_(.*?)_/g, i],

      //h1, h2, h3
      [/^###\s*(.*)/gm, (_, p) => head("h3", p)],
      [/^##\s*(.*)/gm, (_, p) => head("h2", p)],
      [/^#\s*(.*)/gm, (_, p) => head("h1", p)],

      // Image
      [
        /!\[([^\]]+)\]\(([^)]+)\s"([^")]+)"\)/g,
        '<img src="$2" alt="$1" title="$3" />',
      ],

      //links
      [
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, p, url) => `<a href="${safeUrl(url)}">${p}</a>`,
      ],

      //Lists
      [/([^\n]+)(\+)([^\n]+)/g, "<ul><li>$3</li></ul>"],
      // [/([^\n]+)(\*)([^\n]+)/g, "<ul><li>$3</li></ul>"],
      [/^\-\s/g, "<ul><li>$3</li></ul>"],
    ];
    var innerHTML = text;

    rules.forEach(
      ([rule, template]) => (innerHTML = innerHTML.replace(rule, template)),
    );

    codes.forEach((c) => {
      innerHTML = innerHTML.replace(CODE_PLACEHOLDER, `<code>${c}</code>`);
    });

    return innerHTML;

    function head(tag, text) {
      const id = (
        text.includes(CODE_PLACEHOLDER)
          ? text.replace(CODE_PLACEHOLDER, codes[codes.length - 1])
          : text
      )
        .trim()
        .toLowerCase()
        .replace(/<[^>]*>/g, "") // remove <code>, <b>, <i> etc
        .replace(/[^a-z0-9-_]/g, "-") // replace spaces and special chars with hyphens
        .replace(/-+/g, "-"); // replace multiple hypens with one

      return `<${tag} id="${id}">${text}</${tag}>`;
    }
    function safeUrl(url) {
      return url.trim().toLowerCase().startsWith("javascript:") ? "#" : url;
    }
  }
}
