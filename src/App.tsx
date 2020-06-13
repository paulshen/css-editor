import * as React from "react";
import {
  createEditor,
  Editor,
  Element,
  Node,
  Path,
  Range,
  Span,
  Transforms,
} from "slate";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  withReact,
} from "slate-react";
import styles from "./App.module.css";
import { ENUM_PROPERTIES } from "./Constants";
import { CSSPropertyElement } from "./CSSPropertyElement";
import CSSValueElement from "./CSSValueElement";

function CSSSelectorElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  return (
    <div {...attributes} className={styles.cssSelector}>
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
      return <CSSSelectorElement {...props} />;
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
      return (
        <div {...attributes} className={styles.cssRule}>
          {children}
        </div>
      );
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

function insertRule(editor: Editor, insertPath: Path) {
  Transforms.insertNodes(
    editor,
    {
      type: "css-rule",
      children: [
        { type: "css-selector", children: [{ text: "" }] },
        { type: "css-block", children: [] },
      ],
    },
    { at: insertPath }
  );
  Transforms.setSelection(editor, {
    anchor: { path: insertPath, offset: 0 },
    focus: { path: insertPath, offset: 0 },
  });
}

function App() {
  const editor = React.useMemo(() => {
    const editor = withReact(createEditor());
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
      if (element.type === "css-property" && element.value !== undefined) {
        return true;
      }
      if (element.type === "css-value" && element.value !== undefined) {
        return true;
      }
      return isVoid(element);
    };
    editor.isInline = (element) => {
      return isInline(element);
    };
    editor.insertBreak = () => {
      const [selectionNodeEntry] = Editor.levels(editor, { reverse: true });
      const [selectionNode, selectionNodePath] = selectionNodeEntry;
      if (selectionNode.type === "css-rule") {
        const newRulePath = Path.next(selectionNodePath);
        insertRule(editor, newRulePath);
        return;
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
        Transforms.insertNodes(
          editor,
          {
            type: "css-declaration",
            children: [
              { type: "css-property", children: [{ text: "" }] },
              { type: "css-value", children: [{ text: "" }] },
            ],
          },
          { at: newDeclarationPath }
        );
        Transforms.setSelection(editor, {
          anchor: { path: newDeclarationPath, offset: 0 },
          focus: { path: newDeclarationPath, offset: 0 },
        });
        return;
      }
      insertBreak();
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
              const cssSelector = Editor.above(editor, {
                match: (node) => node.type === "css-selector",
              });
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

              const cssDeclaration = Editor.above(editor, {
                match: (node) => node.type === "css-declaration",
              });
              if (cssDeclaration === undefined) {
                return false;
              }
              const cssProperty = Editor.above(editor, {
                match: (node) => node.type === "css-property",
              });
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
          if (node.children.length === 0) {
            Transforms.insertNodes(
              editor,
              {
                type: "css-declaration",
                children: [
                  { type: "css-property", children: [{ text: "" }] },
                  { type: "css-value", children: [{ text: "" }] },
                ],
              },
              { at: [...path, 0] }
            );
            return;
          }
        }
      }

      normalizeNode(entry);
    };
    return editor;
  }, []);
  const [value, setValue] = React.useState<Node[]>([
    {
      type: "css-atrule",
      children: [
        {
          type: "css-atrule-prelude",
          children: [{ text: "@media (min-width: 900px)" }],
        },
        {
          type: "css-atrule-block",
          children: [
            {
              type: "css-rule",
              children: [
                {
                  type: "css-selector",
                  children: [{ text: "#main" }],
                },
                {
                  type: "css-block",
                  children: [
                    {
                      type: "css-declaration",
                      children: [
                        {
                          type: "css-property",
                          value: "border",
                          children: [{ text: "" }],
                        },
                        {
                          type: "css-value",
                          children: [{ text: "1px solid black" }],
                        },
                      ],
                    },
                    {
                      type: "css-declaration",
                      children: [
                        {
                          type: "css-property",
                          value: "color",
                          children: [{ text: "" }],
                        },
                        {
                          type: "css-value",
                          children: [{ text: "red" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "css-rule",
      children: [
        {
          type: "css-selector",
          children: [{ text: ".foo" }],
        },
        {
          type: "css-block",
          children: [
            {
              type: "css-declaration",
              children: [
                {
                  type: "css-property",
                  value: "border",
                  children: [{ text: "" }],
                },
                {
                  type: "css-value",
                  children: [{ text: "1px solid black" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
  return (
    <div className={styles.app}>
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
            const convertNodeToEdit = () => {
              {
                const aboveMatch = Editor.above(editor, {
                  match: (node) => node.type === "css-property",
                });
                if (aboveMatch !== undefined) {
                  const [aboveMatchNode, aboveMatchNodePath] = aboveMatch;
                  if (typeof aboveMatchNode.value === "string") {
                    Transforms.setNodes(editor, { value: undefined });
                    Transforms.insertText(editor, aboveMatchNode.value);
                    Transforms.setSelection(editor, {
                      anchor: { path: aboveMatchNodePath, offset: 0 },
                    });
                    const valueNodeEntry = Editor.node(
                      editor,
                      Path.next(aboveMatchNodePath)
                    );
                    const value = valueNodeEntry[0].value;
                    if (typeof value === "string") {
                      Transforms.setNodes(
                        editor,
                        { value: undefined },
                        { at: valueNodeEntry[1] }
                      );
                      Transforms.insertText(editor, value, {
                        at: valueNodeEntry[1],
                      });
                    }
                    e.preventDefault();
                  }
                }
              }
              {
                const aboveMatch = Editor.above(editor, {
                  match: (node) => node.type === "css-value",
                });
                if (aboveMatch !== undefined) {
                  const [aboveMatchNode, aboveMatchNodePath] = aboveMatch;
                  if (typeof aboveMatchNode.value === "string") {
                    Transforms.setNodes(editor, { value: undefined });
                    Transforms.insertText(editor, aboveMatchNode.value);
                    Transforms.setSelection(editor, {
                      anchor: { path: aboveMatchNodePath, offset: 0 },
                    });
                    e.preventDefault();
                  }
                }
              }
            };
            if (e.key === "Tab") {
              if (editor.selection !== null) {
                let nextPoint;
                if (e.shiftKey) {
                  nextPoint = Editor.before(editor, editor.selection, {
                    unit: "block",
                  });
                  if (nextPoint !== undefined) {
                    if (
                      Path.equals(editor.selection.focus.path, nextPoint.path)
                    ) {
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
                    if (
                      Path.equals(editor.selection.focus.path, nextPoint.path)
                    ) {
                      nextPoint = Editor.after(editor, nextPoint, {
                        unit: "block",
                      });
                    }
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
                const match = Editor.above(editor, {
                  match: (node: Node) =>
                    node.type === "css-value" &&
                    typeof node.property === "string" &&
                    typeof node.value === "string" &&
                    ENUM_PROPERTIES[node.property] !== undefined &&
                    ENUM_PROPERTIES[node.property].includes(node.value),
                });
                if (match !== undefined) {
                  const [matchNode, matchPath] = match;
                  const enumValues =
                    ENUM_PROPERTIES[matchNode.property as string];
                  const index = enumValues.indexOf(matchNode.value as string);
                  const nextIndex =
                    (index +
                      enumValues.length +
                      (e.key === "ArrowDown" ? 1 : -1)) %
                    enumValues.length;
                  Transforms.setNodes(
                    editor,
                    { value: enumValues[nextIndex] },
                    { at: matchPath }
                  );
                  e.preventDefault();
                } else if (editor.selection !== null) {
                  let from: Path;
                  let span: Span;
                  if (e.key === "ArrowUp") {
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
                    reverse: e.key === "ArrowUp",
                    match: (node) =>
                      node.type === "css-selector" ||
                      node.type === "css-atrule-prelude",
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
                }
              } else {
                const aboveMatch = Editor.above(editor, {
                  match: (node) => node.type === "css-property",
                });
                if (aboveMatch !== undefined) {
                  const match = Editor.above(editor, {
                    match: (node: Node) => node.type === "css-declaration",
                  });
                  if (match !== undefined) {
                    const [matchNode, matchPath] = match;
                    let nextMatch;
                    if (e.key === "ArrowDown") {
                      nextMatch = Editor.next(editor, {
                        at: Editor.point(editor, matchPath, { edge: "end" }),
                      });
                    }
                    if (e.key === "ArrowUp") {
                      nextMatch = Editor.previous(editor, {
                        at: matchPath,
                      });
                    }
                    if (nextMatch !== undefined) {
                      const [_, nextPath] = nextMatch;
                      Transforms.setSelection(editor, {
                        anchor: { path: nextPath, offset: 0 },
                        focus: { path: nextPath, offset: 0 },
                      });
                      e.preventDefault();
                    }
                  }
                }
              }
            } else if (e.key === "Enter") {
              if (editor.suggestionsHandleKeyEnter !== undefined) {
                // @ts-ignore
                editor.suggestionsHandleKeyEnter(e);
                return;
              }
              if (e.shiftKey) {
                const aboveMatch = Editor.above(editor, {
                  match: (node) => node.type === "css-rule",
                });
                if (aboveMatch !== undefined) {
                  const [aboveMatchNode, aboveMatchNodePath] = aboveMatch;
                  insertRule(editor, Path.next(aboveMatchNodePath));
                  e.preventDefault();
                }
              }
            } else if (e.key === "c") {
              convertNodeToEdit();
            }
          }}
        />
      </Slate>
    </div>
  );
}

export default App;
