import * as React from "react";
import { Editor, Path, Transforms } from "slate";
import { RenderElementProps, useEditor, useSelected } from "slate-react";
import styles from "./App.module.css";
import { ENUM_PROPERTIES } from "./Constants";
import { setValueNodeValue } from "./Utils";

export function CSSPropertyElement(props: RenderElementProps) {
  const editor = useEditor();
  const selected = useSelected();
  const { attributes, children, element } = props;
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!selected) {
      return undefined;
    }
    if (element.value !== undefined) {
      return undefined;
    }
    return Object.keys(ENUM_PROPERTIES).filter((option) =>
      option.startsWith(childText)
    );
  }, [selected, element.value, childText]);
  const hasSuggestions = suggestions !== undefined && suggestions.length > 0;
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(
    0
  );
  const selectedSuggestionIndexRef = React.useRef(selectedSuggestionIndex);
  React.useEffect(() => {
    selectedSuggestionIndexRef.current = selectedSuggestionIndex;
  });
  React.useEffect(() => {
    if (suggestions !== undefined && suggestions.length > 0) {
      editor.suggestionsHandleKeyEnter = (e: KeyboardEvent) => {
        const value = suggestions[selectedSuggestionIndexRef.current];
        const [nodeEntry] = Editor.nodes(editor, {
          match: (node) => node === element,
        });
        const [_, nodePath] = nodeEntry;
        Transforms.setNodes(editor, { value }, { at: nodePath });
        Transforms.delete(editor, { at: [...nodePath, 0] });
        const valueNodePath = Path.next(nodePath);
        Transforms.setNodes(editor, { property: value }, { at: valueNodePath });
        const valueNodePoint = { path: valueNodePath, offset: 0 };
        Transforms.setSelection(editor, {
          anchor: valueNodePoint,
          focus: valueNodePoint,
        });
        e.preventDefault();
      };
      editor.suggestionsHandleKeyArrow = (e: KeyboardEvent) => {
        const key = e.key;
        setSelectedSuggestionIndex(
          (index) =>
            (index + (key === "ArrowUp" ? -1 : 1) + suggestions.length) %
            suggestions.length
        );
        e.preventDefault();
      };
      return () => {
        editor.suggestionsHandleKeyEnter = undefined;
        editor.suggestionsHandleKeyArrow = undefined;
      };
    }
  }, [suggestions]);
  React.useEffect(() => {
    if (!selected && element.value === undefined) {
      const childText = element.children[0].text;
      if (
        typeof childText === "string" &&
        ENUM_PROPERTIES[childText] !== undefined
      ) {
        const [nodeEntry] = Editor.nodes(editor, {
          at: [],
          match: (node) => node === element,
        });
        Transforms.delete(editor, { at: [...nodeEntry[1], 0] });
        Transforms.setNodes(editor, { value: childText }, { at: nodeEntry[1] });
        const valueNodePath = Path.next(nodeEntry[1]);
        const [valueNode] = Editor.node(editor, valueNodePath);
        Transforms.setNodes(
          editor,
          { property: childText },
          { at: valueNodePath }
        );
        setValueNodeValue(editor, undefined, valueNodePath);
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
      {hasSuggestions ? (
        <div className={styles.suggestions} contentEditable={false}>
          {suggestions!.map((suggestion, i) => (
            <div
              className={
                styles.suggestionListItem +
                (selectedSuggestionIndex === i
                  ? " " + styles.suggestionListItemSelected
                  : "")
              }
              key={suggestion}
            >
              {suggestion}
            </div>
          ))}
        </div>
      ) : null}
    </span>
  );
}
