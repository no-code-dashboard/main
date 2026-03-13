const footer = `<hr style="margin: 0.5rem" />
          <a href="index.html">
            <img src="ncd.svg" width="50px" alt="no code dashboard" />
          </a>
          <p>&copy; 2025</p>
          <p>
            Powered by
            <a href="https://www.w3schools.com" target="_blank"
              >HTML5, CSS3, JS,</a
            >
            <a href="https://www.papaparse.com" target="_blank">Papaparse, </a>
            <a href="https://observablehq.com/plot/" target="_blank"
              >Observable Plot,</a
            >
            <a href="https://open-props.style" target="_blank">Open Prop,</a>
            <span> and a lot of elbow grease</span>
          </p>
          <p>
            See: <a href="index.html?demo" target="_blank">demo</a>,
            <a href="./help/" target="_blank">help</a>
          </p>
          <p>
            <a
              href="mailto:abhijit.majumdar@no-code-dashboard.com?&subject=Feedback on no-code-dashboard"
              target="_blank"
              >Send your feedback</a
            >
          </p>`;
// `<label for="">Color scheme</label>
// <select>
//   <option value="light dark">Default</option>
//   <option value="dark">Dark</option>
//   <option value="light">Light</option>
// </select>`;
export function addFooter() {
  const footerElement = document.querySelector("footer");
  if (!footerElement) return;
  footerElement.innerHTML = footer;
  // const select = footerElement.querySelector("select");
  // if (select)
  //   select.addEventListener("change", () => {
  //     document.body.setAttribute("data-theme", select.value);
  //   });
}
