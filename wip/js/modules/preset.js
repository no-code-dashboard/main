"use strict";
import { _ } from "./util.js";

export { getPresetConfig, validateConfigs, validateConfig };

const configs = {};

function getPresetConfig(type) {
  if (!type) return { error: `Preset Config: "type" missing` };
  // const [, error,config] = validateConfig(configs[type]);
  // if (error) return [null, error];
  const config = configs[type];
  const { files, reportDate, covertDatesToToday } = config;

  let daysToAdd = 0;
  if (covertDatesToToday) {
    const today = _.formatDate(new Date());
    daysToAdd = _.dateTimeDiff(reportDate, today, "Days");
  }
  config.presetOffsetDays = daysToAdd;

  const json = replaceDates(JSON.stringify(config), daysToAdd);
  const [_config, err] = _.parse(json);
  return [_config, err];

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
  if (!_configs) return [null, [`Configs missing`]];
  if (typeof _configs !== "object") return [null, [`Configs not object`]];
  const errors = [];

  if (!_configs["multi-config"]) return validateConfig(_configs);

  delete _configs["multi-config"];
  for (const key in _configs) {
    const config = _configs[key];
    console.log({ config });
    const [, error] = validateConfig(config);
    if (error) errors.push(`${key}: ${error}`);
  }
  if (errors.length > 1) return [null, "Invalid configs: " + errors.join(", ")];
  Object.assign(configs, _configs);
  return [Object.keys(configs), null];
}

function validateConfig(config) {
  if (!config) return [[], [`Config missing`]];

  if (typeof config !== "object") return [null, [`Config not object`]];
  const { reportDate } = config;
  const errors = [];

  if (!config["reportTitle"]) errors.push(`reportTitle missing`);

  if (!_.isValidDate(reportDate))
    errors.push(`Invalid reportDate: (${reportDate})`);

  ["chartProperties", "columnNames", "columnTypes"].forEach((key) => {
    if (!config[key]) errors.push(`${key} missing`);
    else if (!_.isArray(config[key])) errors.push(`Invalid ${key}`);
  });

  if (errors.length > 0) return [[], "Invalid config: " + errors.join(", ")];

  return [[], null, config];
}
