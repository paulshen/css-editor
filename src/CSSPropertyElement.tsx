import classNames from "classnames";
import * as React from "react";
import { Editor, Element, Path, Range, Transforms } from "slate";
import {
  ReactEditor,
  RenderElementProps,
  useSelected,
  useSlate,
} from "slate-react";
import styles from "./App.module.css";
import { completePropertyName, isValidProperty } from "./CSSData";
import { convertCssPropertyToEdit } from "./Mutations";
import { setValueNodeValue } from "./Utils";

function selectSuggestion(
  editor: ReactEditor,
  element: Element,
  value: string
) {
  const [nodeEntry] = Editor.nodes(editor, {
    match: (node) => node === element,
  });
  const [_, nodePath] = nodeEntry;
  Transforms.delete(editor, { at: [...nodePath, 0] });
  Transforms.insertText(editor, value, { at: [...nodePath, 0] });
  Transforms.setNodes(editor, { token: true }, { at: nodePath });
  const valueNodePath = Path.next(nodePath);
  Transforms.setNodes(editor, { property: value }, { at: valueNodePath });
  const valueNodePoint = { path: valueNodePath, offset: 0 };
  Transforms.setSelection(editor, {
    anchor: valueNodePoint,
    focus: valueNodePoint,
  });
}

export function CSSPropertyElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  const editor = useSlate();
  const selected = useSelected();
  let focused = false;
  if (editor.selection !== null) {
    const aboveProperty = Editor.above(editor, {
      match: (node) => node === element,
    });
    focused = aboveProperty !== undefined;
  }
  const [hideSuggestions, setHideSuggestions] = React.useState(false);
  if (!focused && hideSuggestions) {
    setHideSuggestions(false);
  }
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!focused || hideSuggestions) {
      return undefined;
    }
    if (element.token === true) {
      return undefined;
    }
    if (childText.length < 1) {
      return undefined;
    }
    return completePropertyName(childText).slice(0, 8);
  }, [focused, hideSuggestions, element.token, childText]);
  const hasSuggestions = suggestions !== undefined && suggestions.length > 0;
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(
    0
  );
  if (!hasSuggestions && selectedSuggestionIndex !== 0) {
    setSelectedSuggestionIndex(0);
  }
  const selectedSuggestionIndexRef = React.useRef(selectedSuggestionIndex);
  React.useEffect(() => {
    selectedSuggestionIndexRef.current = selectedSuggestionIndex;
  });
  React.useEffect(() => {
    if (suggestions !== undefined && suggestions.length > 0) {
      editor.suggestionsHandleKeyEnter = (e: KeyboardEvent) => {
        const value = suggestions[selectedSuggestionIndexRef.current];
        selectSuggestion(editor, element, value);
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
      editor.suggestionsHandleKeyEscape = (e: KeyboardEvent) => {
        setHideSuggestions(true);
        e.preventDefault();
      };
      return () => {
        editor.suggestionsHandleKeyEnter = undefined;
        editor.suggestionsHandleKeyTab = undefined;
        editor.suggestionsHandleKeyArrow = undefined;
        editor.suggestionsHandleKeyEscape = undefined;
      };
    }
  }, [suggestions]);
  React.useEffect(() => {
    if (!focused && element.token !== true) {
      if (isValidProperty(childText)) {
        const [nodeEntry] = Editor.nodes(editor, {
          at: [],
          match: (node) => node === element,
        });
        Transforms.setNodes(editor, { token: true }, { at: nodeEntry[1] });
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
  React.useEffect(() => {
    if (element.token === true && !isValidProperty(childText)) {
      const [nodeEntry] = Editor.nodes(editor, {
        match: (node) => node === element,
      });
      convertCssPropertyToEdit(editor, nodeEntry);
    }
  }, [childText]);
  return (
    <span {...attributes} className={styles.cssProperty}>
      <span
        className={classNames(
          styles.cssPropertySpan,
          focused ? styles.inputFocused : undefined,
          element.token === true ? styles.token : undefined
        )}
      >
        {children}
      </span>
      <span contentEditable={false} className={styles.colon}>
        {": "}
      </span>
      {hasSuggestions ? (
        <div className={styles.suggestions} contentEditable={false}>
          {suggestions!.map((suggestion, i) => (
            <div
              onMouseDown={(e) => {
                selectSuggestion(editor, element, suggestion);
              }}
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
