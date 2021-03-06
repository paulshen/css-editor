import classNames from "classnames";
import * as React from "react";
import {
  createEditor,
  Editor,
  Element,
  Node,
  Path,
  Point,
  Range,
  Span,
  Transforms,
} from "slate";
import { withHistory } from "slate-history";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  useSlate,
  withReact,
} from "slate-react";
import styles from "./App.module.css";
import { CSSPropertyElement } from "./CSSPropertyElement";
import CSSValueElement from "./CSSValueElement";
import {
  insertAtRule,
  insertDeclaration,
  insertRule,
  unwrapAtRule,
} from "./Mutations";
import SlateEditorPanel from "./SlateEditorPanel";
import { nodeAtOrAbove } from "./Utils";

function CSSSelectorElement(
  props: RenderElementProps & { isAtRule?: boolean }
) {
  const { attributes, children, element, isAtRule } = props;
  let focused = false;
  const editor = useSlate();
  if (editor.selection !== null) {
    const aboveProperty = Editor.above(editor, {
      match: (node) => node === element,
    });
    focused = aboveProperty !== undefined;
  }
  return (
    <div
      {...attributes}
      className={classNames(
        styles.cssSelector,
        isAtRule ? styles.cssAtRulePrelude : undefined
      )}
    >
      <span
        className={classNames(
          styles.cssSelectorSpan,
          focused ? styles.inputFocused : undefined
        )}
      >
        {children}
      </span>
    </div>
  );
}
function CSSRuleElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  const editor = useSlate();
  let selected = false;
  if (editor.selection !== null) {
    const [nodeEntry] = Editor.nodes(editor, {
      match: (node) => node === element,
    });
    if (nodeEntry !== undefined) {
      const aboveEntry =
        editor.selection !== null
          ? Editor.node(editor, editor.selection)
          : undefined;
      if (aboveEntry !== undefined) {
        selected = Path.isCommon(aboveEntry[1], nodeEntry[1]);
      }
    }
  }
  return (
    <div
      {...attributes}
      className={classNames(
        styles.cssRule,
        selected ? styles.cssRuleSelected : undefined
      )}
    >
      {children}
    </div>
  );
}
function CSSBlockElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  return (
    <div {...attributes} className={styles.cssBlock}>
      <div className={styles.blockDeclarations}>{children}</div>
    </div>
  );
}

function renderElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  switch (props.element.type) {
    case "css-selector":
      return <CSSSelectorElement {...props} />;
    case "css-atrule-prelude":
      return <CSSSelectorElement {...props} isAtRule={true} />;
    case "css-declaration":
      return (
        <div {...attributes} className={styles.cssDeclaration}>
          {children}
        </div>
      );
    case "css-property":
      return <CSSPropertyElement {...props} />;
    case "css-value":
      return <CSSValueElement {...props} />;
    case "css-block":
      return <CSSBlockElement {...props} />;
    case "css-atrule-block":
      return <CSSBlockElement {...props} />;
    case "css-rule":
      return <CSSRuleElement {...props} />;
    case "css-atrule":
      return (
        <div {...attributes} className={styles.cssRule}>
          {children}
        </div>
      );
    default:
      return <DefaultElement {...props} />;
  }
}

function handleKeyDown(editor: Editor, e: React.KeyboardEvent) {
  if (e.key === "Tab") {
    if (!e.shiftKey && editor.suggestionsHandleKeyTab !== undefined) {
      // @ts-ignore
      editor.suggestionsHandleKeyTab(e);
      return;
    }
    if (editor.selection !== null) {
      if (e.altKey) {
        let from: Path;
        let span: Span;
        if (e.shiftKey) {
          from = Editor.first(editor, editor.selection)[1];
          const [, to] = Editor.first(editor, []);
          span = [from, to];
        } else {
          from = Editor.last(editor, editor.selection)[1];
          const [, to] = Editor.last(editor, []);
          span = [from, to];
        }
        const [first, second] = Editor.nodes(editor, {
          at: span,
          reverse: e.shiftKey,
          match: (node) =>
            node.type === "css-selector" || node.type === "css-atrule-prelude",
        });
        let match = first;
        if (match !== undefined && Path.isCommon(match[1], from)) {
          match = second;
        }
        if (match !== undefined) {
          const [_, matchPath] = match;
          const point = { path: matchPath, offset: 0 };
          Transforms.setSelection(editor, {
            anchor: point,
            focus: point,
          });
        }
        e.preventDefault();
        return;
      }
      let nextPoint;
      if (e.shiftKey) {
        nextPoint = Editor.before(editor, editor.selection, {
          unit: "block",
        });
        if (nextPoint !== undefined) {
          if (Path.equals(editor.selection.focus.path, nextPoint.path)) {
            nextPoint = Editor.before(editor, nextPoint, {
              unit: "block",
            });
          }
        }
      } else {
        nextPoint = Editor.after(editor, editor.selection, {
          unit: "block",
        });
        if (nextPoint !== undefined) {
          if (Path.equals(editor.selection.focus.path, nextPoint.path)) {
            nextPoint = Editor.after(editor, nextPoint, {
              unit: "block",
            });
          }
        }
        if (nextPoint !== undefined) {
          nextPoint = Editor.end(editor, nextPoint.path);
        }
      }
      if (nextPoint !== undefined) {
        Transforms.setSelection(editor, {
          anchor: nextPoint,
          focus: nextPoint,
        });
        e.preventDefault();
      }
    }
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (editor.suggestionsHandleKeyArrow !== undefined) {
      // @ts-ignore
      editor.suggestionsHandleKeyArrow(e);
      return;
    }
    if (e.altKey) {
      if (e.shiftKey) {
        const cssRule = nodeAtOrAbove(editor, ["css-rule", "css-atrule"]);
        if (cssRule !== undefined) {
          const [, cssRulePath] = cssRule;
          if (e.key === "ArrowUp") {
            if (cssRulePath[cssRulePath.length - 1] !== 0) {
              Transforms.moveNodes(editor, {
                at: cssRulePath,
                to: Path.previous(cssRulePath),
              });
            }
          } else {
            const [parent] = Editor.parent(editor, cssRulePath);
            const childIndex = cssRulePath[cssRulePath.length - 1];
            if (parent.children.length - 1 > childIndex) {
              Transforms.moveNodes(editor, {
                at: cssRulePath,
                to: Path.next(cssRulePath),
              });
            }
          }
          e.preventDefault();
        }
        return;
      }

      const cssDeclaration = nodeAtOrAbove(editor, ["css-declaration"]);
      if (cssDeclaration !== undefined) {
        const [, cssDeclarationPath] = cssDeclaration;
        if (e.key === "ArrowUp") {
          if (cssDeclarationPath[cssDeclarationPath.length - 1] !== 0) {
            Transforms.moveNodes(editor, {
              at: cssDeclarationPath,
              to: Path.previous(cssDeclarationPath),
            });
          }
        } else {
          const [parent] = Editor.parent(editor, cssDeclarationPath);
          const childIndex = cssDeclarationPath[cssDeclarationPath.length - 1];
          if (parent.children.length - 1 > childIndex) {
            Transforms.moveNodes(editor, {
              at: cssDeclarationPath,
              to: Path.next(cssDeclarationPath),
            });
          }
        }
        e.preventDefault();
      }
      return;

      // const valueTokenEntry = Editor.above(editor, {
      //   match: (node: Node) => {
      //     if (
      //       !Element.isElement(node) ||
      //       node.type !== "css-value" ||
      //       typeof node.property !== "string" ||
      //       node.token !== true
      //     ) {
      //       return false;
      //     }
      //     const enumValues = getValidPropertyValues(node.property);
      //     return (
      //       enumValues !== undefined &&
      //       enumValues.includes(node.children[0].text as string)
      //     );
      //   },
      // });
      // if (valueTokenEntry !== undefined) {
      //   rotateEnumValue(editor, valueTokenEntry, e.key === "ArrowDown");
      //   e.preventDefault();
      // }
    }
  } else if (e.key === "Enter") {
    if (editor.suggestionsHandleKeyEnter !== undefined) {
      // @ts-ignore
      editor.suggestionsHandleKeyEnter(e);
      return;
    }
    if (e.shiftKey) {
      if (e.ctrlKey) {
        if (editor.selection !== null) {
          const aboveRule = nodeAtOrAbove(editor, ["css-atrule", "css-rule"]);
          let insertPath = [0];
          if (aboveRule !== undefined) {
            insertPath = Path.next(aboveRule[1]);
          }
          insertAtRule(editor, insertPath);
        }
      } else {
        let insertPath = [0];
        const aboveMatch = nodeAtOrAbove(editor, [
          "css-rule",
          "css-atrule-block",
          "css-atrule",
        ]);
        if (aboveMatch !== undefined) {
          const [aboveMatchNode, aboveMatchNodePath] = aboveMatch;
          if (aboveMatchNode.type === "css-atrule-block") {
            insertPath = [...aboveMatchNodePath, 0];
          } else {
            insertPath = Path.next(aboveMatchNodePath);
          }
        }
        insertRule(editor, insertPath);
      }
      e.preventDefault();
    }
  } else if (e.key === "Backspace") {
    if (e.shiftKey) {
      if (e.ctrlKey) {
        const atRule = nodeAtOrAbove(editor, ["css-atrule"]);
        if (atRule !== undefined) {
          const [, atRulePath] = atRule;
          unwrapAtRule(editor, atRulePath);
          e.preventDefault();
          return;
        }
      }
      const declaration = nodeAtOrAbove(editor, ["css-declaration"]);
      if (declaration !== undefined) {
        const [, declarationPath] = declaration;
        Transforms.delete(editor, { at: declarationPath });
        e.preventDefault();
        return;
      }
      const rule = nodeAtOrAbove(editor, ["css-rule", "css-atrule"]);
      if (rule !== undefined) {
        const [, rulePath] = rule;
        Transforms.delete(editor, { at: rulePath });
        e.preventDefault();
        return;
      }
    }
  } else if (e.key === "Escape") {
    if (editor.suggestionsHandleKeyEscape !== undefined) {
      // @ts-ignore
      editor.suggestionsHandleKeyEscape(e);
      return;
    }
    if (editor.selection !== null) {
      if (!Range.isCollapsed(editor.selection)) {
        Transforms.setSelection(editor, {
          focus: editor.selection.anchor,
        });
        e.preventDefault();
        return;
      }
      const aboveBlock = nodeAtOrAbove(editor, [
        "css-block",
        "css-atrule-block",
      ]);
      if (aboveBlock !== undefined) {
        const [, aboveBlockPath] = aboveBlock;
        const selectorEdges = Editor.edges(
          editor,
          Path.previous(aboveBlockPath)
        );
        Transforms.setSelection(editor, {
          anchor: selectorEdges[0],
          focus: selectorEdges[1],
        });
      }
      e.preventDefault();
    }
  } else if (e.key === "a" && e.metaKey && editor.selection !== null) {
    const nodeTypes = [
      "css-property",
      "css-value",
      "css-declaration",
      "css-rule",
      "css-selector",
      "css-atrule",
      "css-atrule-prelude",
    ];
    const aboveMatch = nodeAtOrAbove(editor, nodeTypes);
    let abovePath: Path = [];
    if (aboveMatch !== undefined) {
      abovePath = aboveMatch[1];
      const aboveEdges = Editor.edges(editor, abovePath);
      const selectionEdges = Range.edges(editor.selection);
      if (
        Point.equals(aboveEdges[0], selectionEdges[0]) &&
        Point.equals(aboveEdges[1], selectionEdges[1])
      ) {
        const aboveMatch = Editor.above(editor, {
          at: abovePath,
          match: (node) => nodeTypes.includes(node.type as string),
        });
        if (aboveMatch !== undefined) {
          abovePath = aboveMatch[1];
        } else {
          abovePath = [];
        }
      }
    }
    const edges = Editor.edges(editor, abovePath);
    Transforms.setSelection(editor, {
      anchor: edges[0],
      focus: edges[1],
    });
    e.preventDefault();
  } else if (e.key === ":") {
    const propertyMatch = nodeAtOrAbove(editor, ["css-property"]);
    if (propertyMatch !== undefined) {
      const [, propertyPath] = propertyMatch;
      const point = { path: Path.next(propertyPath), offset: 0 };
      Transforms.setSelection(editor, {
        anchor: point,
        focus: point,
      });
      e.preventDefault();
    }
  }
}

function SlateEditor({
  value,
  setValue,
}: {
  value: Node[];
  setValue: (value: Node[]) => void;
}) {
  const editor = React.useMemo(() => {
    const editor = withHistory(withReact(createEditor()));
    const {
      isVoid,
      isInline,
      insertBreak,
      insertNode,
      deleteFragment,
      deleteBackward,
      deleteForward,
      normalizeNode,
    } = editor;
    editor.isVoid = (element) => {
      return isVoid(element);
    };
    editor.isInline = (element) => {
      return isInline(element);
    };
    editor.insertBreak = () => {
      const [
        selectionNodeEntry,
        selectionParentNodeEntry,
      ] = Editor.levels(editor, { reverse: true });
      const [selectionNode, selectionNodePath] = selectionNodeEntry;
      if (selectionNode.type === "css-rule") {
        const newRulePath = Path.next(selectionNodePath);
        insertRule(editor, newRulePath);
        return;
      }

      if (selectionParentNodeEntry !== undefined) {
        const [
          selectionParentNode,
          selectionParentNodePath,
        ] = selectionParentNodeEntry;
        if (selectionParentNode.type === "css-atrule-prelude") {
          const newRulePath = [...Path.next(selectionParentNodePath), 0];
          insertRule(editor, newRulePath);
          return;
        }
      }

      let newDeclarationPath;
      const [declarationNodeEntry] = Editor.nodes(editor, {
        match: (node: Node) => node.type === "css-declaration",
      });
      if (declarationNodeEntry !== undefined) {
        newDeclarationPath = Path.next(declarationNodeEntry[1]);
      } else {
        const [selectorNodeEntry] = Editor.nodes(editor, {
          match: (node: Node) => node.type === "css-selector",
        });
        if (selectorNodeEntry !== undefined) {
          newDeclarationPath = [...Path.next(selectorNodeEntry[1]), 0];
        }
      }
      if (newDeclarationPath !== undefined) {
        const [parentNode] = Editor.node(
          editor,
          Path.parent(newDeclarationPath)
        );
        const existingDeclarationNode = (parentNode as Element).children[
          newDeclarationPath[newDeclarationPath.length - 1]
        ];
        if (
          existingDeclarationNode !== undefined &&
          Element.isElement(existingDeclarationNode)
        ) {
          if (
            // @ts-ignore
            existingDeclarationNode.children[0].children[0].text === "" &&
            // @ts-ignore
            existingDeclarationNode.children[1].children[0].text === ""
          ) {
            Transforms.setSelection(editor, {
              anchor: { path: newDeclarationPath, offset: 0 },
              focus: { path: newDeclarationPath, offset: 0 },
            });
            return;
          }
        }
        insertDeclaration(editor, newDeclarationPath);
        return;
      }
    };
    editor.deleteFragment = () => {
      const [selectionNodeEntry] = Editor.levels(editor, { reverse: true });
      const [selectionNode, selectionNodePath] = selectionNodeEntry;
      if (selectionNode.type === "css-rule") {
        Transforms.delete(editor, {
          at: selectionNodePath,
        });
        return;
      }
      deleteFragment();
    };
    editor.deleteBackward = (unit) => {
      if (editor.selection !== null) {
        if (Range.isCollapsed(editor.selection)) {
          const nodeEntry = Editor.node(editor, editor.selection);
          const nextPoint = Editor.before(editor, editor.selection);
          if (
            nextPoint !== undefined &&
            !Path.equals(nodeEntry[1], nextPoint.path)
          ) {
            const canDelete = () => {
              const cssAtRulePrelude = nodeAtOrAbove(editor, [
                "css-atrule-prelude",
              ]);
              if (cssAtRulePrelude !== undefined) {
                if (cssAtRulePrelude[0].children[0].text === "") {
                  const cssAtRule = Editor.above(editor, {
                    at: cssAtRulePrelude[1],
                    match: (node) => node.type === "css-atrule",
                  })!;
                  Transforms.removeNodes(editor, { at: cssAtRule[1] });
                  return;
                }
              }

              const cssSelector = nodeAtOrAbove(editor, ["css-selector"]);
              if (cssSelector !== undefined) {
                const [cssSelectorNode] = cssSelector;
                if (cssSelectorNode.children[0].text === "") {
                  const cssRule = Editor.above(editor, {
                    at: cssSelector[1],
                    match: (node) => node.type === "css-rule",
                  })!;
                  Transforms.removeNodes(editor, { at: cssRule[1] });
                  return;
                }
              }

              const cssDeclaration = nodeAtOrAbove(editor, ["css-declaration"]);
              if (cssDeclaration === undefined) {
                return false;
              }
              const cssProperty = nodeAtOrAbove(editor, ["css-property"]);
              if (cssProperty !== undefined) {
                const [cssPropertyNode, cssPropertyNodePath] = cssProperty;
                if (
                  cssPropertyNode.value === undefined &&
                  cssPropertyNode.children[0].text === ""
                ) {
                  Transforms.removeNodes(editor, {
                    match: (node) => node.type === "css-declaration",
                  });
                  return;
                }
                if (cssPropertyNode.value !== undefined) {
                  Transforms.setNodes(
                    editor,
                    { value: undefined },
                    { at: cssPropertyNodePath }
                  );
                  const [cssValueNode, cssValueNodePath] = Editor.node(
                    editor,
                    Path.next(cssPropertyNodePath)
                  );
                  const cssValue = cssValueNode.value as string | undefined;
                  Transforms.setNodes(
                    editor,
                    { property: undefined, value: undefined },
                    { at: cssValueNodePath }
                  );
                  if (cssValue !== undefined) {
                    Transforms.insertText(editor, cssValue, {
                      at: [...cssValueNodePath, 0],
                    });
                  }
                  return;
                }
              }
              const cssValue = Editor.above(editor, {
                match: (node) =>
                  node.type === "css-value" && node.value !== undefined,
              });
              if (cssValue !== undefined) {
                const [, nodePath] = cssValue;
                Transforms.setNodes(
                  editor,
                  { value: undefined },
                  { at: nodePath }
                );
                return;
              }
              const [cssDeclarationNode] = cssDeclaration;
              const nextCssDeclaration = Editor.above(editor, {
                at: nextPoint,
                match: (node) => node.type === "css-declaration",
              });
              if (
                nextCssDeclaration === undefined ||
                cssDeclarationNode !== nextCssDeclaration[0]
              ) {
                return false;
              }
              return true;
            };
            if (!canDelete()) {
              return;
            }
          }
        }
      }
      deleteBackward(unit);
    };
    editor.deleteForward = (unit) => {
      if (editor.selection !== null) {
        if (Range.isCollapsed(editor.selection)) {
          const nodeEntry = Editor.node(editor, editor.selection);
          const nextPoint = Editor.after(editor, editor.selection);
          if (
            nextPoint !== undefined &&
            !Path.equals(nodeEntry[1], nextPoint.path)
          ) {
            return;
          }
        }
      }
      deleteForward(unit);
    };
    editor.normalizeNode = (entry) => {
      const [node, path] = entry;

      if (Element.isElement(node)) {
        if (node.type === "css-declaration") {
          let typeChild;
          let hasCssValueChild = false;
          for (const [child, childPath] of Node.children(editor, path)) {
            if (Element.isElement(child) && child.type === "css-property") {
              typeChild = child;
            }
            if (Element.isElement(child) && child.type === "css-value") {
              hasCssValueChild = true;
            }
          }
          if (typeChild === undefined) {
            Transforms.removeNodes(editor, { at: path });
            return;
          }
          if (!hasCssValueChild) {
            Transforms.insertNodes(
              editor,
              {
                type: "css-value",
                property: typeChild.value,
                children: [{ text: "" }],
              },
              { at: [...path, 1] }
            );
            return;
          }
        }
        if (node.type === "css-block") {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (!Element.isElement(child) && child.text !== "") {
              Transforms.wrapNodes(
                editor,
                { type: "css-property", children: [] },
                { at: [...path, i] }
              );
              Transforms.wrapNodes(
                editor,
                { type: "css-declaration", children: [] },
                { at: [...path, i] }
              );
              Transforms.insertNodes(
                editor,
                { type: "css-value", children: [{ text: "" }] },
                { at: [...path, i, 1] }
              );
              return;
            }
          }
        }
        if (node.type === "css-atrule-block") {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (!Element.isElement(child) && child.text !== "") {
              Transforms.wrapNodes(
                editor,
                { type: "css-selector", children: [] },
                { at: [...path, i] }
              );
              Transforms.wrapNodes(
                editor,
                { type: "css-rule", children: [] },
                { at: [...path, i] }
              );
              Transforms.insertNodes(
                editor,
                {
                  type: "css-block",
                  children: [
                    {
                      type: "css-declaration",
                      children: [
                        { type: "css-property", children: [{ text: "" }] },
                        { type: "css-value", children: [{ text: "" }] },
                      ],
                    },
                  ],
                },
                { at: [...path, i, 1] }
              );
              return;
            }
          }
        }
      }

      normalizeNode(entry);
    };
    return editor;
  }, []);
  return (
    <div className={styles.editor}>
      <Slate
        editor={editor}
        value={value}
        onChange={(newValue) => {
          console.log(newValue);
          setValue(newValue);
        }}
      >
        <Editable
          renderElement={renderElement}
          onKeyDown={(e) => {
            handleKeyDown(editor, e);
          }}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="false"
        />
        <SlateEditorPanel />
      </Slate>
    </div>
  );
}

export default SlateEditor;
