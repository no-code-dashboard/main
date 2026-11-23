"use strict";
import { _ } from "../util.js";
import { Dialog } from "./dialog.js";

export { showLoadFileDialog };
function showLoadFileDialog({ header, loadNewData, loadConfigFile }) {
  const elements = [
    {
      tag: "radio",
      name: "fileType",
      label: "File type",
      options: ["Data", "Config"],
    },
    {
      tag: "radio",
      name: "fileLocation",
      label: "File location",
      options: ["Local file", "Remote file"],
    },
    { tag: "hr" },
    { tag: "file", name: "localFile" },
    { tag: "text", name: "remoteFileName", label: "Remote file name" },
    { tag: "p", id: "size" },
    // { tag: "text", name: "remoteApiKey", label: "Remote file api key" },
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

      if (fileLocation === "Remote file") loadRemote(fileType);
      else loadLocal(fileType);
      // Dialog.close();
      return;
    }
    if (label == "Load cookie") {
      return;
    }

    function loadLocal(fileType) {
      const input = Dialog.getElement("localFile");
      const file = input.files[0];
      if (file) {
        Dialog.close();
        fileType === "Data"
          ? loadNewData(file, file.name)
          : loadConfigFile(file);
      }
    }
    function loadRemote(fileType) {
      const { remoteFileName, remoteFileApi } = Dialog.data();
      Dialog.close();
      fileType === "Data"
        ? loadNewData(remoteFileName, null)
        : loadConfigFile(remoteFileName);
    }
  }
  async function validateFilenames() {
    const { fileLocation, fileType, localFile, remoteFileName, remoteFileApi } =
      Dialog.data();

    Dialog.markErrors();
    const errors = [],
      attributes = [
        {
          name: ["remoteFileName", "localFile"],
          attrs: ["class-add", "hide"],
          applyTo: "wrapper",
        },
        { id: "size", attrs: ["text"] },
      ];
    const SHOW = { attrs: ["class-remove", "hide"], applyTo: "wrapper" };
    if (fileLocation === "Local file") {
      attributes.push({ name: "localFile", ...SHOW });
      //force value to ensure new file is read
      attributes.push({ name: "localFile", attrs: ["value", ""] });
      const accept = fileType === "Data" ? ".csv" : ".json";
      attributes.push({ name: "localFile", attrs: ["accept", accept] });
      if (!localFile.name) errors.push({ localFile: "Required" });
    }
    if (fileLocation === "Remote file") {
      attributes.push({ name: "remoteFileName", ...SHOW });
      if (!remoteFileName) errors.push({ remoteFileName: "Required" });
    }
    if (errors.length === 0) {
      const file = fileLocation === "Local file" ? localFile : remoteFileName;
      const size = await _.getFileSize(file);
      if (size === -1) errors.push({ remoteFileName: "Invalid file" });
      else {
        const decimals = size < 1024 ? 2 : 1;
        const sizeDisplay = `${(size / 1024).toFixed(decimals)} KB`;
        attributes.push({
          id: "size",
          attrs: ["text", "File size: " + sizeDisplay],
        });
      }
    }
    Dialog.setElementsAttrs(attributes);
    Dialog.markErrors(errors);
  }
}
