import classNames from "classnames";
import * as React from "react";
import { Editor, Element, Range, Transforms } from "slate";
import {
  ReactEditor,
  RenderElementProps,
  useSelected,
  useSlate,
} from "slate-react";
import styles from "./App.module.css";
import { getValidPropertyValues } from "./CSSData";
import { convertCssValueToEdit } from "./Mutations";
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
  Transforms.setSelection(editor, {
    anchor: { path: nodePath, offset: value.length },
    focus: { path: nodePath, offset: value.length },
  });
}

export default function CSSValueElement(props: RenderElementProps) {
  const { attributes, children, element } = props;
  const editor = useSlate();
  const selected = useSelected();
  let focused = false;
  if (editor.selection !== null) {
    const aboveValue = Editor.above(editor, {
      match: (node) => node === element,
    });
    focused = aboveValue !== undefined;
  }
  const [hideSuggestions, setHideSuggestions] = React.useState(false);
  if (!focused && hideSuggestions) {
    setHideSuggestions(false);
  }
  React.useEffect(() => {
    if (!focused) {
      setValueNodeValue(editor, element);
    }
  }, [focused]);
  const childText = element.children[0].text as string;
  const suggestions = React.useMemo(() => {
    if (!focused || hideSuggestions) {
      return undefined;
    }
    if (element.token === true) {
      return undefined;
    }
    if (typeof element.property !== "string") {
      return undefined;
    }
    const enumValues = getValidPropertyValues(element.property);
    if (enumValues === undefined) {
      return undefined;
    }
    return enumValues
      .filter((option) => option.startsWith(childText))
      .slice(0, 8);
  }, [focused, hideSuggestions, element.property, element.token, childText]);
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
    if (element.token === true) {
      let removeToken = element.property === undefined;
      if (typeof element.property === "string") {
        const enumValues = getValidPropertyValues(element.property);
        removeToken = !enumValues?.includes(childText);
      }
      if (removeToken) {
        const [nodeEntry] = Editor.nodes(editor, {
          match: (node) => node === element,
        });
        convertCssValueToEdit(editor, nodeEntry);
      }
    }
  }, [childText]);
  return (
    <span
      {...attributes}
      className={classNames(
        styles.cssValue,
        focused ? styles.inputFocused : undefined,
        element.token === true ? styles.token : undefined
      )}
    >
      {children}
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
