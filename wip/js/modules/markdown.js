"use strict";

export { markdownToHtml };
/**
 * Main function to convert the limited Markdown text to HTML.
 * Supports: Bold, Italics, Links, Unordered Lists (*, -), Ordered Lists (N.)
 * @param {string} markdown - The raw markdown input string.
 * @returns {string} - The resulting HTML string.
 */
function xxxmarkdownToHtml(markdown) {
  const lines = markdown.split("\n");
  let output = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let inTable = false;
  function push(tag) {
    output.push(tag);
    if (tag.startsWith("</")) {
      // xOutput.pop()
      return;
    }
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
    if (inTable) {
      push("</table>");
      inTable = false;
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 1. Handle Empty Lines (Ends any open list structure)
    if (trimmedLine === "") {
      closeLists();
      // Don't add anything for empty lines unless we are intentionally creating a break
      // For simplicity, we just close lists and continue.
      continue;
    }

    // 2. Check for Unordered List Item
    if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
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
      const listItemContent = trimmedLine.substring(2).trim();
      push(`<li>${processInline(listItemContent)}</li>`);
      continue; // Done with this line
    }

    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      const tds = trimmedLine
        .substring(1, trimmedLine.length - 1)
        .split("|")
        .map((v) => v.trim(v));

      let tdtag = "td";
      if (!inTable) {
        push("<table>");
        inTable = true;
        tdtag = "th";
      }

      let row = `<tr>`;
      tds.forEach((td) => {
        const [style, text] = getStyle();
        row += `<${tdtag} ${style}>${processInline(text)}</${tdtag}>`;
        function getStyle() {
          if (tdtag !== "th") return ["", td];
          const trailingHyphens = td.match(/-*$/)[0].length;
          if (trailingHyphens <= 0) return ["", td];
          return [
            `style="width:${trailingHyphens * 10}%"`,
            td.replace(/-*$/, ""),
          ];
        }
      });
      row += `</tr>`;
      push(row);
      continue;
    }
    // 3. Check for Ordered List Item
    // Regex: Matches digits followed by a dot and a space (e.g., "1. ")
    const olMatch = trimmedLine.match(/^(\d+\.\s)(.*)/);
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

    // 4. Handle Paragraph (If not a list item)
    closeLists();

    // Process inline elements and wrap in <p> tag
    const paragraph = processInline(trimmedLine);
    push(`<p>${paragraph}</p>`);
    //create {p:{text: paragraph}} or {p:paragraph}
  }

  // Final check to close any open lists at the end of the document
  closeLists();

  // Join everything back into a single HTML string
  return output.join("\n");

  function processInline(text) {
    const rules = [
      //h1, h2, h3
      [/^###\s*(.*)/gm, `<h3>$1</h3>`],
      [/^##\s*(.*)/gm, `<h2>$1</h2>`],
      [/^#\s*(.*)/gm, `<h1>$1</h1>`],

      //bold, italics and paragragh rules
      [/\*\*\s?([^\n]+)\*\*/g, "<b>$1</b>"],
      [/\*\s?([^\n]+)\*/g, "<i>$1</i>"],
      [/__([^_]+)__/g, "<b>$1</b>"],
      [/_([^_`]+)_/g, "<i>$1</i>"],

      //links
      [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>'],

      //Lists
      [/([^\n]+)(\+)([^\n]+)/g, "<ul><li>$3</li></ul>"],
      // [/([^\n]+)(\*)([^\n]+)/g, "<ul><li>$3</li></ul>"],
      [/^\-\s/g, "<ul><li>$3</li></ul>"],
      //code
      [/`([^`]+)`/g, "<code>$1</code>"],

      //Image
      // [
      //   /!\[([^\]]+)\]\(([^)]+)\s"([^")]+)"\)/g,
      //   '<img src="$2" alt="$1" title="$3" />',
      // ],
    ];
    let innerHTML = text;

    rules.forEach(
      ([rule, template]) => (innerHTML = innerHTML.replace(rule, template))
    );
    return innerHTML;
  }
}
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
// document.getElementById('content').innerHTML =
//   marked.parse('# Marked in the browser\n\nRendered by **marked**.');
function markdownToHtml(line) {
  return marked.parse(line);
}
