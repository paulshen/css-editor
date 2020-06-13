import * as React from "react";
import { Editor, Transforms } from "slate";
import { RenderElementProps, useEditor, useSelected } from "slate-react";
import styles from "./App.module.css";
import { ENUM_PROPERTIES } from "./Constants";
import { setValueNodeValue } from "./Utils";

export default function CSSValueElement(props: RenderElementProps) {
  const editor = useEditor();
  const selected = useSelected();
  const { attributes, children, element } = props;
  React.useEffect(() => {
    if (!selected) {
      setValueNodeValue(editor, element);
    }
  }, [selected]);
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!selected) {
      return undefined;
    }
    if (element.value !== undefined) {
      return undefined;
    }
    if (typeof element.property !== "string") {
      return undefined;
    }
    const enumValues = ENUM_PROPERTIES[element.property];
    if (enumValues === undefined) {
      return undefined;
    }
    return enumValues.filter((option) => option.startsWith(childText));
  }, [selected, element.property, element.value, childText]);
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
        Transforms.delete(editor, { at: [...nodePath, 0], voids: true });
        Transforms.setSelection(editor, {
          anchor: { path: nodePath, offset: 0 },
          focus: { path: nodePath, offset: 0 },
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
  return (
    <span {...attributes} className={styles.cssValue}>
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
