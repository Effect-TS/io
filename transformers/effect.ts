import { createFilter } from "@rollup/pluginutils"
import ts from "typescript"

class RefCounted<A> {
  private counter = 0
  constructor(readonly ref: A) {}
  get get() {
    this.counter++
    return this.ref
  }
  get count() {
    return this.counter
  }
}

export default function effectPlugin(
  program: ts.Program,
  options?: {
    trace?: { include?: Array<string>; exclude?: Array<string> }
    optimize?: { include?: Array<string>; exclude?: Array<string> }
  }
) {
  const checker = program.getTypeChecker()
  const traceFilter = createFilter(options?.trace?.include, options?.trace?.exclude)
  const optimizeFilter = createFilter(options?.optimize?.include, options?.optimize?.exclude)
  return {
    before(ctx: ts.TransformationContext) {
      return (sourceFile: ts.SourceFile) => {
        if (sourceFile.isDeclarationFile) {
          return sourceFile
        }

        const tracer = new RefCounted(ctx.factory.createUniqueName("tracer"))
        const fileName = new RefCounted(ctx.factory.createUniqueName("fileName"))

        function getOriginal(node: ts.Node): ts.Node {
          let current = node
          while ("original" in current) {
            current = current["original"]
          }
          return current
        }

        function getTrace(node: ts.Node) {
          try {
            const pos = getOriginal(node).getStart()
            const nodeEnd = sourceFile.getLineAndCharacterOfPosition(pos)
            return ctx.factory.createBinaryExpression(
              fileName.get,
              ctx.factory.createToken(ts.SyntaxKind.PlusToken),
              ctx.factory.createStringLiteral(`:${nodeEnd.line + 1}:${nodeEnd.character + 1}`)
            )
          } catch (e) {
            return undefined
          }
        }

        const traceVisitor = (node: ts.Node): ts.Node => {
          const visited = ts.visitEachChild(node, traceVisitor, ctx)
          if (ts.isCallExpression(visited)) {
            let shouldEmbedTrace = false
            const signature = checker.getResolvedSignature(visited)
            const declaration = signature?.declaration

            if (declaration) {
              shouldEmbedTrace = ts.getAllJSDocTags(
                declaration,
                (tag): tag is ts.JSDocTag => tag.tagName.text === "macro" && tag.comment === "traced"
              ).length > 0
            }

            if (!shouldEmbedTrace) {
              shouldEmbedTrace = (checker.getSymbolAtLocation(visited.expression)?.getJsDocTags(checker)
                .filter((tag) =>
                  tag.name === "macro" && tag.text &&
                  tag.text.map((d) => d.text).join("\n") === "traced"
                ) || []).length > 0
            }

            if (shouldEmbedTrace) {
              const trace = getTrace(
                ts.isPropertyAccessExpression(visited.expression) ? visited.expression.name : visited.expression
              )
              if (typeof trace !== "undefined") {
                return ctx.factory.createCallExpression(
                  ctx.factory.createCallExpression(
                    ctx.factory.createPropertyAccessExpression(tracer.get, "withCallTrace"),
                    [],
                    [trace]
                  ),
                  [],
                  [visited]
                )
              }
            }
          }

          return visited
        }

        const findSource = (node: ts.Node): ts.SourceFile => {
          while (!ts.isSourceFile(node)) {
            node = node.parent
          }
          return node
        }

        const optimizeVisitor = (node: ts.Node): ts.Node => {
          const visited = ts.visitEachChild(node, optimizeVisitor, ctx)
          if (ts.isCallExpression(visited) && visited.arguments.length > 0) {
            const signature = checker.getResolvedSignature(visited)
            const declaration = signature?.declaration
            if (
              declaration && !ts.isJSDocSignature(declaration) &&
              findSource(declaration).fileName.includes("@fp-ts/data/Function")
            ) {
              if (declaration.name?.getText() === "pipe") {
                let expr = ts.visitNode(visited.arguments[0], optimizeVisitor)
                for (let i = 1; i < visited.arguments.length; i++) {
                  expr = ctx.factory.createCallExpression(
                    ts.visitNode(visited.arguments[i], optimizeVisitor),
                    [],
                    [expr]
                  )
                }
                return expr
              }
            }
          }
          return visited
        }

        let visited = sourceFile

        if (optimizeFilter(sourceFile.fileName)) {
          visited = ts.visitNode(visited, optimizeVisitor)
        }

        if (traceFilter(sourceFile.fileName)) {
          visited = ts.visitNode(visited, traceVisitor)
        }

        const statements: Array<ts.Statement> = []

        if (tracer.count > 0) {
          statements.push(ctx.factory.createImportDeclaration(
            undefined,
            ctx.factory.createImportClause(
              false,
              undefined,
              ctx.factory.createNamespaceImport(tracer.get)
            ),
            ctx.factory.createStringLiteral("@effect/io/CallTrace")
          ))
        }

        if (fileName.count > 0) {
          statements.push(ctx.factory.createVariableStatement(
            undefined,
            ctx.factory.createVariableDeclarationList(
              [
                ctx.factory.createVariableDeclaration(
                  fileName.get,
                  undefined,
                  undefined,
                  ctx.factory.createStringLiteral(sourceFile.fileName)
                )
              ],
              ts.NodeFlags.Const
            )
          ))
        }

        for (const statement of visited.statements) {
          statements.push(statement)
        }

        return ctx.factory.updateSourceFile(
          visited,
          statements,
          visited.isDeclarationFile,
          visited.referencedFiles,
          visited.typeReferenceDirectives,
          visited.hasNoDefaultLib,
          visited.libReferenceDirectives
        )
      }
    }
  }
}
