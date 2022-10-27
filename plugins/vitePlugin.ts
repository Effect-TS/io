import { createFilter } from "@rollup/pluginutils"
import fs from "fs"
import path from "path"
import ts from "typescript"
import type * as V from "vite"

function tsPlugin(options?: { include?: Array<string>; exclude?: Array<string> }): V.Plugin {
  const filter = createFilter(options?.include, options?.exclude)

  const configPath = ts.findConfigFile(
    "./",
    ts.sys.fileExists,
    "tsconfig.test.json"
  )

  if (!configPath) {
    throw new Error("Could not find a valid \"tsconfig.test.json\".")
  }

  const files = {}
  const registry = ts.createDocumentRegistry()

  const initTS = () => {
    const config = JSON.parse(fs.readFileSync(configPath).toString())

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

    const servicesHost: ts.LanguageServiceHost = {
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
      readFile: (fileName) => fs.readFileSync(fileName).toString()
    }

    return ts.createLanguageService(servicesHost, registry)
  }

  let services = initTS()

  return {
    name: "ts-plugin",
    transform(code, id) {
      if (filter(id)) {
        if (/\.tsx?/.test(id)) {
          if (typeof services.getProgram()?.getSourceFile(id) === "undefined") {
            services = initTS()
          }
          files[id].version++
          const syntactic = services.getSyntacticDiagnostics(id)
          if (syntactic.length > 0) {
            throw new Error(syntactic[0].messageText.toString())
          }
          const semantic = services.getSemanticDiagnostics(id)
          if (semantic.length > 0) {
            throw new Error(semantic[0].messageText.toString())
          }
          const out = services.getEmitOutput(id).outputFiles
          if (out.length === 0) {
            throw new Error("typescript output files is empty")
          }
          code = out[0].text
        }
        return {
          code
        }
      }
    }
  }
}

export { tsPlugin }
