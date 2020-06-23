import * as React from "react";
import { Editor, Element, Path, Transforms, Range } from "slate";
import { useSlate } from "slate-react";
import { getValidPropertyValues } from "./CSSData";
import {
  insertDeclaration,
  insertRule,
  rotateEnumValue,
  unwrapAtRule,
} from "./Mutations";
import styles from "./SlateEditorPanel.module.css";
import { nodeAtOrAbove } from "./Utils";

type ActionSection = {
  title: string;
  buttons: Array<{
    label: string;
    onClick: (e: React.MouseEvent) => void;
    keyboardShortcut?: string | undefined;
    disabled?: boolean;
  }>;
};

function Actions({ editor }: { editor: Editor }) {
  const sections: Array<ActionSection> = [];

  const cssValue = nodeAtOrAbove(editor, ["css-value"]);
  if (cssValue !== undefined) {
    const [cssValueNode] = cssValue;
    if (
      typeof cssValueNode.property === "string" &&
      cssValueNode.token === true
    ) {
      const value = cssValueNode.children[0].text as string;
      const enumValues = getValidPropertyValues(cssValueNode.property);
      if (enumValues !== undefined && enumValues.indexOf(value) !== -1) {
        sections.push({
          title: "Value",
          buttons: [
            {
              label: "Rotate Value Up",
              onClick: (e) => {
                rotateEnumValue(editor, cssValue, false);
                e.preventDefault();
              },
              keyboardShortcut: "⌥ + ↑",
            },
            {
              label: "Rotate Value Down",
              onClick: (e) => {
                rotateEnumValue(editor, cssValue, true);
                e.preventDefault();
              },
              keyboardShortcut: "⌥ + ↓",
            },
          ],
        });
      }
    }
  }

  let insertDeclarationPath: Path | undefined;
  const cssDeclaration = nodeAtOrAbove(editor, ["css-declaration"]);
  const cssRule = nodeAtOrAbove(editor, ["css-rule"]);
  const cssAtRule = nodeAtOrAbove(editor, ["css-atrule"]);

  if (cssDeclaration !== undefined) {
    const [, cssDeclarationPath] = cssDeclaration;
    insertDeclarationPath = Path.next(cssDeclarationPath);
    const [parentNode] = Editor.parent(editor, cssDeclarationPath);
    const childIndex = cssDeclarationPath[cssDeclarationPath.length - 1];
    sections.push({
      title: `Declaration ${Editor.string(editor, [...cssDeclarationPath, 0])}`,
      buttons: [
        {
          label: "Delete Declaration",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssDeclarationPath });
            e.preventDefault();
          },
          keyboardShortcut: "⇧ + ⌫",
        },
        {
          label: "Move Declaration Up",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssDeclarationPath,
              to: Path.previous(cssDeclarationPath),
            });
            e.preventDefault();
          },
          disabled: cssDeclarationPath[cssDeclarationPath.length - 1] === 0,
          keyboardShortcut: "⌥ + ↑",
        },
        {
          label: "Move Declaration Down",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssDeclarationPath,
              to: Path.next(cssDeclarationPath),
            });
            e.preventDefault();
          },
          disabled: childIndex === parentNode.children.length - 1,
          keyboardShortcut: "⌥ + ↓",
        },
      ],
    });
  }

  if (cssRule !== undefined) {
    const [, cssRulePath] = cssRule;
    const [parentNode] = Editor.parent(editor, cssRulePath);
    const childIndex = cssRulePath[cssRulePath.length - 1];
    if (insertDeclarationPath === undefined) {
      insertDeclarationPath = [...cssRulePath, 1, 0];
    }
    const insertDeclarationPath_ = insertDeclarationPath;

    sections.push({
      title: `Rule ${Editor.string(editor, [...cssRulePath, 0])}`,
      buttons: [
        {
          label: "Insert Declaration",
          onClick: (e) => {
            insertDeclaration(editor, insertDeclarationPath_);
            e.preventDefault();
          },
          keyboardShortcut: "⏎",
        },
        {
          label: "Delete Rule",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssRulePath });
            e.preventDefault();
          },
          keyboardShortcut: cssDeclaration === undefined ? "⇧ + ⌫" : undefined,
        },
        {
          label: "Move Rule Up",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssRulePath,
              to: Path.previous(cssRulePath),
            });
            e.preventDefault();
          },
          disabled: cssRulePath[cssRulePath.length - 1] === 0,
          keyboardShortcut: "⌥ + ⇧ + ↑",
        },
        {
          label: "Move Rule Down",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssRulePath,
              to: Path.next(cssRulePath),
            });
            e.preventDefault();
          },
          disabled: childIndex === parentNode.children.length - 1,
          keyboardShortcut: "⌥ + ⇧ + ↓",
        },
      ],
    });
  }

  if (cssAtRule !== undefined) {
    const [, cssAtRulePath] = cssAtRule;
    const [parentNode] = Editor.parent(editor, cssAtRulePath);
    const childIndex = cssAtRulePath[cssAtRulePath.length - 1];

    sections.push({
      title: `At Rule ${Editor.string(editor, [...cssAtRulePath, 0])}`,
      buttons: [
        {
          label: "Delete At Rule",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssAtRulePath });
            e.preventDefault();
          },
          keyboardShortcut: cssRule === undefined ? "⇧ + ⌫" : undefined,
        },
        {
          label: "Unwrap At Rule",
          onClick: (e) => {
            unwrapAtRule(editor, cssAtRulePath);
            e.preventDefault();
          },
        },
        {
          label: "Move At Rule Up",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssAtRulePath,
              to: Path.previous(cssAtRulePath),
            });
            e.preventDefault();
          },
          disabled: cssAtRulePath[cssAtRulePath.length - 1] === 0,
        },
        {
          label: "Move At Rule Down",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssAtRulePath,
              to: Path.next(cssAtRulePath),
            });
            e.preventDefault();
          },
          disabled: childIndex === parentNode.children.length - 1,
        },
      ],
    });
  }

  {
    let insertRulePath = [0];
    if (cssRule !== undefined) {
      const [, cssRulePath] = cssRule;
      insertRulePath = Path.next(cssRulePath);
    }
    sections.push({
      title: "",
      buttons: [
        {
          label: "Insert Rule",
          onClick: (e) => {
            insertRule(editor, insertRulePath);
            e.preventDefault();
          },
          keyboardShortcut: "⇧ + ⏎",
        },
      ],
    });
  }

  const aboveBlock = nodeAtOrAbove(editor, ["css-block", "css-atrule-block"]);
  if (aboveBlock !== undefined) {
    const [aboveBlockNode, aboveBlockPath] = aboveBlock;
    sections.push({
      title: "",
      buttons: [
        {
          label: `Go to block ${
            aboveBlockNode.type === "css-block" ? "selector" : "prelude"
          }`,
          onClick: (e) => {
            const selectorEdges = Editor.edges(
              editor,
              Path.previous(aboveBlockPath)
            );
            Transforms.setSelection(editor, {
              anchor: selectorEdges[0],
              focus: selectorEdges[1],
            });
            e.preventDefault();
          },
          keyboardShortcut:
            editor.selection !== null && Range.isCollapsed(editor.selection)
              ? "⎋"
              : undefined,
        },
      ],
    });
  }

  return (
    <div>
      <table className={styles.actionSectionTable}>
        <tbody>
          {sections.map(({ title, buttons }, i) => (
            <React.Fragment key={i}>
              <tr>
                <th colSpan={2} className={styles.actionSectionTitle}>
                  {title}
                </th>
              </tr>
              {buttons.map(
                ({ label, onClick, disabled, keyboardShortcut }, j) => (
                  <tr key={j}>
                    <td>
                      <button onMouseDown={onClick} disabled={disabled}>
                        {label}
                      </button>
                    </td>
                    <td>
                      {keyboardShortcut !== undefined ? keyboardShortcut : null}
                    </td>
                  </tr>
                )
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SlateEditorPanel() {
  const editor = useSlate();
  if (editor.selection !== null) {
    let [node, nodePath] = Editor.node(editor, editor.selection);
    if (nodePath.length === 0) {
      return null;
    }
    if (!Element.isElement(node)) {
      const parentEntry = Editor.parent(editor, nodePath);
      node = parentEntry[0];
      nodePath = parentEntry[1];
    }
    const levelNodes = [];
    for (const levelEntry of Editor.levels(editor)) {
      const [levelNode, levelPath] = levelEntry;
      levelNodes.push(
        <div key={JSON.stringify(levelPath)}>{(levelNode as any).type}</div>
      );
    }
    return (
      <div className={styles.panel}>
        <Actions editor={editor} />
        {/* <div>{levelNodes}</div>
        <div>{JSON.stringify(node)}</div>
        {JSON.stringify(nodePath)} */}
      </div>
    );
  }
  return null;
}
