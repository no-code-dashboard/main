"use strict";
import { _ } from "../util.js";
import { Dialog } from "./dialog.js";

export { showLoadFileDialog };
function showLoadFileDialog({ header, extention, loadData, loadConfigFile }) {
  const elements = [
    {
      tag: "radio",
      name: "fileLocation",
      label: "File location",
      options: ["Local file", "Remote file"],
    },
    {
      tag: "radio",
      name: "fileType",
      label: "File type",
      options: ["Data", "Config"],
    },
    { tag: "hr" },
    { tag: "text", name: "remoteFileName", label: "Remote file name" },
    { tag: "text", name: "remoteApiKey", label: "Remote file api key" },
    { tag: "hr" },
    { tag: "button", label: "Cancel" },
    { tag: "button", label: "Load", class: "disable-on-error" },
    // { tag: "button", label: "Load cookie" },
    // { tag: "button", label: "Load demo" },
  ];
  Dialog.make(elements, {
    callback,
    classes: "dialog medium",
    legend: header,
  }).show();

  validateFilenames();

  async function callback({ target, type }) {
    if (type === "change") await validateFilenames();
    if (type !== "click-button") return;
    const label = target.textContent;
    if (label === "Cancel") Dialog.close();
    if (label == "Load") {
      const { fileLocation, fileType } = Dialog.data();
      Dialog.close();
      if (fileLocation === "Remote file") loadRemote(fileType);
      else loadLocal(fileType);
      return;
    }
    if (label == "Load cookie") {
      return;
    }

    function loadLocal(fileType) {
      // const input = _.createElements({input:{type:"file",accept = extention ?? ".*",value:""}}) //_.select("#file");
      const input = _.select("#file");
      const forceReloadOfSameFile = "";
      input.value = forceReloadOfSameFile;
      const extention = fileType === "Data" ? ".csv" : ".json";
      input.accept = extention;

      const clonedElement = input.cloneNode(true);
      // Replace the original element with the new one
      input.parentNode.replaceChild(clonedElement, input);
      input.addEventListener("change", () => {
        const file = input.files[0];
        if (file) {
          const blob = URL.createObjectURL(file);
          Dialog.close();
          
          fileType === "Data"
            ? loadData(blob, file, extention)
            : loadConfigFile(file);
        }
      });
      input.click();
    }
    // const isValid = await _.isValidFile(remoteFileName)
    function loadRemote(fileType) {
      const { remoteFileName, remoteFileApi } = Dialog.data();
      // if (remoteFileName === "") return;
      // if (!isValid) return;
      Dialog.close();
      fileType === "Data"
        ? loadData(remoteFileName, null, extention)
        : loadConfigFile(remoteFileName);
    }
  }
  async function validateFilenames() {
    const { fileLocation, fileType, remoteFileName, remoteFileApi } =
      Dialog.data();
    Dialog.markErrors();
    const errors = [],
      attributes = [
        {
          names: ["remoteFileName", "remoteApiKey"],
          attrs: ["disabled", true],
        },
      ];

    if (fileLocation === "Remote file") {
      attributes.push({
        names: ["remoteFileName", "remoteApiKey"],
        attrs: ["disabled", false],
      });
      if (remoteFileName === "") errors.push({ remoteFileName: "Required" });
      else {
        const isValidFile = await _.isValidFile(remoteFileName);
        if (!isValidFile) errors.push({ remoteFileName: "Invalid file" });
      }
    }
    Dialog.setElementsAttrs(attributes);
    Dialog.markErrors(errors);
  }
}
