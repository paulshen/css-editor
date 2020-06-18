import * as React from "react";
import { Editor, Range, Transforms } from "slate";
import { RenderElementProps, useSelected, useSlate } from "slate-react";
import styles from "./App.module.css";
import { ENUM_PROPERTIES } from "./Constants";
import { setValueNodeValue } from "./Utils";

export default function CSSValueElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  const editor = useSlate();
  const selected = useSelected();
  let focused = false;
  if (
    element.value === undefined &&
    editor.selection !== null &&
    Range.isCollapsed(editor.selection)
  ) {
    const aboveValue = Editor.above(editor, {
      match: (node) => node.type === "css-value",
    });
    if (aboveValue !== undefined) {
      focused = aboveValue[0] === element;
    }
  }
  React.useEffect(() => {
    if (!focused) {
      setValueNodeValue(editor, element);
    }
  }, [focused]);
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!focused) {
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
  }, [focused, element.property, element.value, childText]);
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
      editor.suggestionsHandleKeyTab = (e: KeyboardEvent) => {
        // @ts-ignore
        editor.suggestionsHandleKeyEnter(e);
      };
      if (suggestions.length > 1) {
        editor.suggestionsHandleKeyArrow = (e: KeyboardEvent) => {
          const key = e.key;
          setSelectedSuggestionIndex(
            (index) =>
              (index + (key === "ArrowUp" ? -1 : 1) + suggestions.length) %
              suggestions.length
          );
          e.preventDefault();
        };
      }
      return () => {
        editor.suggestionsHandleKeyEnter = undefined;
        editor.suggestionsHandleKeyTab = undefined;
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
