import * as React from "react";
import { Editor, Element, Path, Transforms } from "slate";
import { useSlate } from "slate-react";
import { ENUM_PROPERTIES } from "./Constants";
import {
  convertCssPropertyToEdit,
  convertCssValueToEdit,
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
    disabled?: boolean;
  }>;
};

function Actions({ editor }: { editor: Editor }) {
  const sections: Array<ActionSection> = [];

  const cssProperty = nodeAtOrAbove(editor, ["css-property"]);
  if (cssProperty !== undefined) {
    const [cssPropertyNode, cssPropertyPath] = cssProperty;
    if (cssPropertyNode.value !== undefined) {
      sections.push({
        title: "Property",
        buttons: [
          {
            label: "Edit",
            onClick: (e) => {
              convertCssPropertyToEdit(editor, cssProperty);
              e.preventDefault();
            },
          },
        ],
      });
    }
  }

  const cssValue = nodeAtOrAbove(editor, ["css-value"]);
  if (cssValue !== undefined) {
    const [cssValueNode] = cssValue;
    if (
      typeof cssValueNode.property === "string" &&
      typeof cssValueNode.value === "string"
    ) {
      let enumButtons: Array<{
        label: string;
        onClick: (e: React.MouseEvent) => void;
      }> = [];
      const enumValues = ENUM_PROPERTIES[cssValueNode.property];
      if (
        enumValues !== undefined &&
        enumValues.indexOf(cssValueNode.value) !== -1
      ) {
        enumButtons = [
          {
            label: "Rotate Value Up",
            onClick: (e) => {
              rotateEnumValue(editor, cssValue, false);
              e.preventDefault();
            },
          },
          {
            label: "Rotate Value Down",
            onClick: (e) => {
              rotateEnumValue(editor, cssValue, true);
              e.preventDefault();
            },
          },
        ];
      }
      sections.push({
        title: "Value",
        buttons: [
          {
            label: "Edit",
            onClick: (e) => {
              convertCssValueToEdit(editor, cssValue);
              e.preventDefault();
            },
          },
          ...enumButtons,
        ],
      });
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
      title: "Declaration",
      buttons: [
        {
          label: "Delete Declaration",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssDeclarationPath });
            e.preventDefault();
          },
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
      title: "Rule",
      buttons: [
        {
          label: "Insert Declaration",
          onClick: (e) => {
            insertDeclaration(editor, insertDeclarationPath_);
            e.preventDefault();
          },
        },
        {
          label: "Delete Rule",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssRulePath });
            e.preventDefault();
          },
        },
        {
          label: "Move Block Up",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssRulePath,
              to: Path.previous(cssRulePath),
            });
            e.preventDefault();
          },
          disabled: cssRulePath[cssRulePath.length - 1] === 0,
        },
        {
          label: "Move Block Down",
          onClick: (e) => {
            Transforms.moveNodes(editor, {
              at: cssRulePath,
              to: Path.next(cssRulePath),
            });
            e.preventDefault();
          },
          disabled: childIndex === parentNode.children.length - 1,
        },
      ],
    });
  }

  if (cssAtRule !== undefined) {
    const [, cssAtRulePath] = cssAtRule;
    const [parentNode] = Editor.parent(editor, cssAtRulePath);
    const childIndex = cssAtRulePath[cssAtRulePath.length - 1];

    sections.push({
      title: "At Rule",
      buttons: [
        {
          label: "Delete At Rule",
          onClick: (e) => {
            Transforms.delete(editor, { at: cssAtRulePath });
            e.preventDefault();
          },
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
        },
      ],
    });
  }

  return (
    <div>
      {sections.map(({ title, buttons }, i) => (
        <div className={styles.actionSection} key={i}>
          <div>{title}</div>
          {buttons.map(({ label, onClick, disabled }, j) => (
            <div key={j}>
              <button onMouseDown={onClick} disabled={disabled}>
                {label}
              </button>
            </div>
          ))}
        </div>
      ))}
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
        <div>{levelNodes}</div>
        <div>{JSON.stringify(node)}</div>
        {JSON.stringify(nodePath)}
      </div>
    );
  }
  return null;
}
