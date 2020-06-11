import * as React from "react";
import { createEditor, Editor, Node, Path, Element, Transforms } from "slate";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  useSelected,
  withReact,
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
  const selected = useSelected();
  const { attributes, children, element } = props;
  return (
    <span {...attributes} className={styles.cssProperty}>
      {typeof element.value === "string" ? (
        <span
          style={{
            backgroundColor: selected ? "#e0e0e0" : undefined,
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
  return (
    <span
      {...attributes}
      style={{ backgroundColor: selected ? "#f0f0f0" : undefined }}
    >
      {children}
    </span>
  );
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
      return <div {...attributes}>{children}</div>;
    default:
      return <DefaultElement {...props} />;
  }
}

function App() {
  const editor = React.useMemo(() => {
    const editor = withReact(createEditor());
    const { isVoid, isInline, insertBreak, insertNode, normalizeNode } = editor;
    editor.isVoid = (element) => {
      if (element.type === "css-property" && element.value !== undefined) {
        return true;
      }
      return isVoid(element);
    };
    editor.isInline = (element) => {
      // if (element.type === "css-property" || element.type === "css-value") {
      //   return true;
      // }
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
    editor.normalizeNode = (entry) => {
      const [node, path] = entry;

      if (Element.isElement(node) && node.type === "css-declaration") {
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
            }
          }}
        />
      </Slate>
    </div>
  );
}

export default App;
