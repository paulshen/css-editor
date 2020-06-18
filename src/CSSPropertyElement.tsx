import * as React from "react";
import { Editor, Path, Range, Transforms } from "slate";
import { RenderElementProps, useSelected, useSlate } from "slate-react";
import styles from "./App.module.css";
import { completePropertyName, isValidProperty } from "./CSSData";
import { setValueNodeValue } from "./Utils";

export function CSSPropertyElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  const editor = useSlate();
  const selected = useSelected();
  let focused = false;
  if (
    element.value === undefined &&
    editor.selection !== null &&
    Range.isCollapsed(editor.selection)
  ) {
    const aboveProperty = Editor.above(editor, {
      match: (node) => node.type === "css-property",
    });
    if (aboveProperty !== undefined) {
      focused = aboveProperty[0] === element;
    }
  }
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!focused) {
      return undefined;
    }
    if (element.value !== undefined) {
      return undefined;
    }
    if (childText.length < 1) {
      return undefined;
    }
    return completePropertyName(childText).slice(0, 8);
  }, [focused, element.value, childText]);
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
        const valueNodePath = Path.next(nodePath);
        Transforms.setNodes(editor, { property: value }, { at: valueNodePath });
        const valueNodePoint = { path: valueNodePath, offset: 0 };
        Transforms.setSelection(editor, {
          anchor: valueNodePoint,
          focus: valueNodePoint,
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
  React.useEffect(() => {
    if (!focused && element.value === undefined) {
      const childText = element.children[0].text;
      if (typeof childText === "string" && isValidProperty(childText)) {
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
  }, [focused]);
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
        {": "}
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
