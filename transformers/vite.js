/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { createFilter } = require("@rollup/pluginutils")
const path = require("path")
const fs = require("fs")
const ts = require("typescript")

/**
 * @typedef { import('@rollup/pluginutils').FilterPattern} FilterPattern
 * @typedef { { include?: FilterPattern, exclude?: FilterPattern, babelPlugins?: any[] } } CommonOptions
 */

/**
 * @param {import('@vue/babel-plugin-jsx').VueJSXPluginOptions & CommonOptions} options
 * @returns {import('vite').Plugin}
 */
function tsPlugin(options = {}) {
  const configPath = ts.findConfigFile(
    "./",
    ts.sys.fileExists,
    "tsconfig.test.json"
  )

  if (!configPath) {
    throw new Error("Could not find a valid \"tsconfig.json\".")
  }

  const files = {}
  const registry = ts.createDocumentRegistry()

  const initTS = () => {
    const config = JSON.parse(fs.readFileSync(configPath))

    Object.assign(config.compilerOptions, {
      sourceMap: false,
      inlineSourceMap: true,
      inlineSources: true,
      noEmit: false,
      declaration: false,
      declarationMap: false,
      module: "ESNext",
      target: "ES2022"
    })

    const tsconfig = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(path.resolve(configPath))
    )

    if (!tsconfig.options) tsconfig.options = {}

    tsconfig.fileNames.forEach((fileName) => {
      if (!(fileName in files)) {
        files[fileName] = { version: 0 }
      }
    })

    const servicesHost = {
      getScriptFileNames: () => tsconfig.fileNames,
      getScriptVersion: (fileName) => files[fileName] && files[fileName].version.toString(),
      getScriptSnapshot: (fileName) => {
        if (!fs.existsSync(fileName)) {
          return undefined
        }
        return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString())
      },
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => tsconfig.options,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: (fileName) => fs.existsSync(fileName),
      readFile: (fileName) => fs.readFileSync(fileName)
    }

    return ts.createLanguageService(servicesHost, registry)
  }

  let services = initTS()

  return {
    name: "ts-plugin",

    transform(code, id) {
      const {
        exclude = /\.esbuild\./,
        include = /\.(jsx|tsx?)$/
      } = options

      const filter = createFilter(include, exclude)

      if (filter(id)) {
        if (/\.tsx?/.test(id)) {
          if (typeof services.getProgram().getSourceFile(id) === "undefined") {
            services = initTS()
          }
          files[id].version++
          try {
            const emit = services.getEmitOutput(id)
            if (emit.diagnostics?.[0]) throw new Error(diagnostics[0].messageText)
            code = emit.outputFiles[0].text
          } catch {
            //
          }
        }

        return {
          code
        }
      }
    }
  }
}

module.exports = tsPlugin
tsPlugin.default = tsPlugin
