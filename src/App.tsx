import * as React from "react";
import {
  createEditor,
  Editor,
  Node,
  Range,
  Path,
  Element,
  Transforms,
} from "slate";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  useSelected,
  withReact,
  useEditor,
} from "slate-react";
import styles from "./App.module.css";

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
function CSSPropertyElement(props: RenderElementProps) {
  const editor = useEditor();
  const selected = useSelected();
  const { attributes, children, element } = props;
  React.useEffect(() => {
    if (!selected && element.value === undefined) {
      const childText = element.children[0].text;
      if (typeof childText === "string" && childText.length > 0) {
        const [nodeEntry] = Editor.nodes(editor, {
          at: [],
          match: (node) => node === element,
        });
        Transforms.setNodes(
          editor,
          {
            value: childText,
          },
          {
            at: nodeEntry[1],
          }
        );
        Transforms.delete(editor, {
          at: [...nodeEntry[1], 0],
        });
      }
    }
  }, [selected]);
  return (
    <span {...attributes} className={styles.cssProperty}>
      {typeof element.value === "string" ? (
        <span
          style={{
            backgroundColor: selected ? "#e0e0e0" : undefined,
            color: "green",
          }}
          contentEditable={false}
        >
          {element.value}
        </span>
      ) : null}
      {children}
      <span contentEditable={false} className={styles.colon}>
        :{" "}
      </span>
    </span>
  );
}
function CSSValueElement(props: RenderElementProps) {
  const selected = useSelected();
  const { attributes, children, element } = props;
  return <span {...attributes}>{children}</span>;
}

function renderElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  switch (props.element.type) {
    case "css-selector":
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
    case "css-rule":
      return (
        <div {...attributes} className={styles.cssRule}>
          {children}
        </div>
      );
    default:
      return <DefaultElement {...props} />;
  }
}

function App() {
  const editor = React.useMemo(() => {
    const editor = withReact(createEditor());
    const {
      isVoid,
      isInline,
      insertBreak,
      insertNode,
      deleteBackward,
      deleteForward,
      normalizeNode,
    } = editor;
    editor.isVoid = (element) => {
      if (element.type === "css-property" && element.value !== undefined) {
        return true;
      }
      return isVoid(element);
    };
    editor.isInline = (element) => {
      return isInline(element);
    };
    editor.insertBreak = () => {
      const [declarationNode] = Editor.nodes(editor, {
        match: (node: Node) => node.type === "css-declaration",
      });
      if (declarationNode !== undefined) {
        const newPath = Path.next(declarationNode[1]);
        Transforms.insertNodes(
          editor,
          {
            type: "css-declaration",
            children: [
              {
                type: "css-property",
                children: [{ text: "" }],
              },
              {
                type: "css-value",
                children: [{ text: "" }],
              },
            ],
          },
          { at: newPath }
        );
        Transforms.setSelection(editor, {
          anchor: {
            path: newPath,
            offset: 0,
          },
          focus: {
            path: newPath,
            offset: 0,
          },
        });
        return;
      }
      insertBreak();
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
                const [cssPropertyNode] = cssProperty;
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
                    {
                      match: (node) => node.type === "css-property",
                    }
                  );
                  return;
                }
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
          let hasCssTypeChild = false;
          for (const [child, childPath] of Node.children(editor, path)) {
            if (Element.isElement(child) && child.type === "css-property") {
              hasCssTypeChild = true;
            }
          }
          if (!hasCssTypeChild) {
            Transforms.removeNodes(editor, { at: path });
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
                  {
                    type: "css-property",
                    children: [{ text: "" }],
                  },
                  {
                    type: "css-value",
                    children: [{ text: "" }],
                  },
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
      type: "css-rule",
      children: [
        {
          type: "css-selector",
          children: [
            {
              text: "#main",
            },
          ],
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
    {
      type: "css-rule",
      children: [
        {
          type: "css-selector",
          children: [
            {
              text: ".foo",
            },
          ],
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
            if (e.key === "Tab") {
              if (editor.selection !== null) {
                const nextPoint = e.shiftKey
                  ? Editor.before(editor, editor.selection, {
                      unit: "block",
                    })
                  : Editor.after(editor, editor.selection, {
                      unit: "block",
                    });
                if (nextPoint !== undefined) {
                  Transforms.setSelection(editor, {
                    anchor: nextPoint,
                    focus: nextPoint,
                  });
                  e.preventDefault();
                }
              }
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
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
          }}
        />
      </Slate>
    </div>
  );
}

export default App;
