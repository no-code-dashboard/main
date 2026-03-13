"use strict";
import { _ } from "./util.js";

export { getPresetConfig, validateConfigs, validateConfig };

const configs = {};

function getPresetConfig(type) {
  if (!type) return { error: `Preset Config: "type" missing` };
  const [config, error] = validateConfig(configs[type]);
  if (error) return [null, error];
  const { files, reportDate, covertDatesToToday } = config;

  let daysToAdd = 0;
  if (covertDatesToToday) {
    const today = new Date().toISOString().substring(0, 10);
    daysToAdd = _.dateTimeDiff(reportDate, today, "Days");
  }
  config.presetOffsetDays = daysToAdd;

  const json = replaceDates(JSON.stringify(config), daysToAdd);
  const [ammendedConfig, err] = _.parse(json);
  return [ammendedConfig, err];

  function replaceDates(str, daysToAdd) {
    if (daysToAdd === 0) return str;

    //to do add more date conversion for any valid date
    const datePatterns = [
      "(19|20)[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])", // yyyy-mm-dd
      // "[0-9]{4}-[0-9]{2}-[0-9]{2}"
    ];

    let dateReplacedStr = str;
    for (const pattern of datePatterns) {
      const regExp = new RegExp(pattern, "gi");
      dateReplacedStr = dateReplacedStr.replace(regExp, (date) =>
        _.addDays(date, daysToAdd),
      );
    }
    return dateReplacedStr;
  }
}

function validateConfigs(_configs) {
  if (!_configs) return [null, `Configs missing`];
  if (typeof _configs !== "object") return [null, `Configs not object`];
  const errors = [];
  for (const key in _configs) {
    const config = _configs[key];
    const [, error] = validateConfig(config);
    if (error) errors.push(`${key}: ${error}`);
  }
  if (errors.length > 1) return [null, "Invalid configs: " + errors.join(", ")];
  Object.assign(configs, _configs);
  return [Object.keys(configs), null];
}

function validateConfig(config) {
  if (!config) return [null, `Config missing`];
  if (typeof config !== "object") return [null, `Config not object`];
  const { reportDate } = config;
  const errors = [];

  if (!config["reportTitle"]) errors.push(`reportTitle missing`);

  if (reportDate && !_.isValidDate(reportDate))
    errors.push(`Invalid reportDate: (${reportDate})`);

  ["chartProperties", "columnNames", "columnTypes"].forEach((key) => {
    if (!config[key]) errors.push(`${key} missing`);
    else if (!Array.isArray(config[key])) errors.push(`Invalid ${key}`);
  });

  if (errors.length > 0) return [null, "Invalid config: " + errors.join(", ")];

  return [config, null];
}
