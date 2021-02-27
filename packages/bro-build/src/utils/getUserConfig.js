import joi from "joi";
import slash from "slash2";
import { relative } from "path";
import { getExistFile } from "./getExistFile";
import schemaJoi from "../schema";

export const CONFIG_FILES = [".brorc.js", ".brorc.ts"];

export function getUserConfig({ cwd }) {
  const configFile = getExistFile({
    cwd,
    files: CONFIG_FILES,
    isRelative: false,
  });

  if (configFile) {
    const userConfig = compatESModuleRequire(require(configFile));
    const userConfigs = Array.isArray(userConfig) ? userConfig : [userConfig];
    userConfigs.forEach((config) => {
      // do validate
      const schema = schemaJoi(joi);
      const { error } = schema.validate(config);
      if (error) {
        const e = new Error(
          `Invalid options in ${slash(relative(cwd, configFile))}, ${error.message}`
        );
        e.stack = error.stack;
        throw e;
      }
    });
    return userConfig;
  }

  return {};
}

function compatESModuleRequire(m) {
  return m.__esModule ? m.default : m;
}
