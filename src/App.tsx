import * as React from "react";
import { createEditor, Node } from "slate";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  useFocused,
  useSelected,
  withReact,
} from "slate-react";

function CSSSelectorElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  return (
    <div {...attributes}>
      {children}
      <span contentEditable={false}>{" {"}</span>
    </div>
  );
}
function CSSBlockElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  return (
    <div {...attributes}>
      <div style={{ paddingLeft: "16px" }}>{children}</div>
      <div contentEditable={false}>{"}"}</div>
    </div>
  );
}
function CSSTypeElement(props: RenderElementProps) {
  const selected = useSelected();
  const focused = useFocused();
  const { attributes, children, element } = props;
  return (
    <span {...attributes}>
      {typeof element.value === "string" ? (
        <span
          style={{
            backgroundColor: selected && focused ? "#f0f0f0" : undefined,
          }}
        >
          {element.value}
        </span>
      ) : null}
      {children}
      <span contentEditable={false}>: </span>
    </span>
  );
}

function renderElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  switch (props.element.type) {
    case "css-selector":
      return <CSSSelectorElement {...props} />;
    case "css-type":
      return <CSSTypeElement {...props} />;
    case "css-value":
      return (
        <span {...attributes}>
          {children}
          <span contentEditable={false}>;</span>
        </span>
      );
    case "css-block":
      return <CSSBlockElement {...props} />;
    case "css-rule":
    case "css-declaration":
      return <div {...attributes}>{children}</div>;
    default:
      return <DefaultElement {...props} />;
  }
}

function App() {
  const editor = React.useMemo(() => {
    const editor = withReact(createEditor());
    const isVoid = editor.isVoid;
    editor.isVoid = (element) => {
      if (element.type === "css-type" && element.value !== undefined) {
        return true;
      }
      return isVoid(element);
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
                  type: "css-type",
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
                  type: "css-type",
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
  ]);
  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(newValue) => {
        setValue(newValue);
      }}
    >
      <Editable renderElement={renderElement} />
    </Slate>
  );
}

export default App;
