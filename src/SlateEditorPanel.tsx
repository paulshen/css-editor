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
} from "./Mutations";
import styles from "./SlateEditorPanel.module.css";
import { nodeAtOrAbove } from "./Utils";

function Actions({ editor }: { editor: Editor }) {
  const buttons = [];

  const cssProperty = nodeAtOrAbove(editor, ["css-property"]);
  if (cssProperty !== undefined) {
    const [cssPropertyNode, cssPropertyPath] = cssProperty;
    if (cssPropertyNode.value !== undefined) {
      buttons.push(
        <div>
          <div>Property</div>
          <div>
            <button
              onMouseDown={(e) => {
                convertCssPropertyToEdit(editor, cssProperty);
                e.preventDefault();
              }}
            >
              Edit
            </button>
          </div>
        </div>
      );
    }
  }

  const cssValue = nodeAtOrAbove(editor, ["css-value"]);
  if (cssValue !== undefined) {
    const [cssValueNode] = cssValue;
    if (
      typeof cssValueNode.property === "string" &&
      typeof cssValueNode.value === "string"
    ) {
      let enumButtons = null;
      const enumValues = ENUM_PROPERTIES[cssValueNode.property];
      if (
        enumValues !== undefined &&
        enumValues.indexOf(cssValueNode.value) !== -1
      ) {
        enumButtons = (
          <>
            <div>
              <div>
                <button
                  onMouseDown={(e) => {
                    rotateEnumValue(editor, cssValue, false);
                    e.preventDefault();
                  }}
                >
                  Rotate Value Up
                </button>
              </div>
              <div>
                <button
                  onMouseDown={(e) => {
                    rotateEnumValue(editor, cssValue, true);
                    e.preventDefault();
                  }}
                >
                  Rotate Value Down
                </button>
              </div>
            </div>
          </>
        );
      }
      buttons.push(
        <div>
          <div>Value</div>
          <div>
            <button
              onMouseDown={(e) => {
                convertCssValueToEdit(editor, cssValue);
                e.preventDefault();
              }}
            >
              Edit
            </button>
          </div>
          {enumButtons}
        </div>
      );
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
    buttons.push(
      <div>
        <div>Declaration</div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.delete(editor, { at: cssDeclarationPath });
              e.preventDefault();
            }}
          >
            Delete Declaration
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssDeclarationPath,
                to: Path.previous(cssDeclarationPath),
              });
              e.preventDefault();
            }}
            disabled={cssDeclarationPath[cssDeclarationPath.length - 1] === 0}
          >
            Move Declaration Up
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssDeclarationPath,
                to: Path.next(cssDeclarationPath),
              });
              e.preventDefault();
            }}
            disabled={childIndex === parentNode.children.length - 1}
          >
            Move Declaration Down
          </button>
        </div>
      </div>
    );
  }

  if (cssRule !== undefined) {
    const [, cssRulePath] = cssRule;
    const [parentNode] = Editor.parent(editor, cssRulePath);
    const childIndex = cssRulePath[cssRulePath.length - 1];
    if (insertDeclarationPath === undefined) {
      insertDeclarationPath = [...cssRulePath, 1, 0];
    }
    const insertDeclarationPath_ = insertDeclarationPath;

    buttons.push(
      <div>
        <div>Rule</div>
        <div>
          <button
            onMouseDown={(e) => {
              insertDeclaration(editor, insertDeclarationPath_);
              e.preventDefault();
            }}
          >
            Insert Declaration
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.delete(editor, { at: cssRulePath });
              e.preventDefault();
            }}
          >
            Delete Rule
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssRulePath,
                to: Path.previous(cssRulePath),
              });
              e.preventDefault();
            }}
            disabled={cssRulePath[cssRulePath.length - 1] === 0}
          >
            Move Block Up
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssRulePath,
                to: Path.next(cssRulePath),
              });
              e.preventDefault();
            }}
            disabled={childIndex === parentNode.children.length - 1}
          >
            Move Block Down
          </button>
        </div>
      </div>
    );
  }

  if (cssAtRule !== undefined) {
    const [, cssAtRulePath] = cssAtRule;
    const [parentNode] = Editor.parent(editor, cssAtRulePath);
    const childIndex = cssAtRulePath[cssAtRulePath.length - 1];

    buttons.push(
      <div>
        <div>At Rule</div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.delete(editor, { at: cssAtRulePath });
              e.preventDefault();
            }}
          >
            Delete At Rule
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssAtRulePath,
                to: Path.previous(cssAtRulePath),
              });
              e.preventDefault();
            }}
            disabled={cssAtRulePath[cssAtRulePath.length - 1] === 0}
          >
            Move At Rule Up
          </button>
        </div>
        <div>
          <button
            onMouseDown={(e) => {
              Transforms.moveNodes(editor, {
                at: cssAtRulePath,
                to: Path.next(cssAtRulePath),
              });
              e.preventDefault();
            }}
            disabled={childIndex === parentNode.children.length - 1}
          >
            Move At Rule Down
          </button>
        </div>
      </div>
    );
  }

  {
    let insertRulePath = [0];
    if (cssRule !== undefined) {
      const [, cssRulePath] = cssRule;
      insertRulePath = Path.next(cssRulePath);
    }
    buttons.push(
      <div>
        <button
          onMouseDown={(e) => {
            insertRule(editor, insertRulePath);
            e.preventDefault();
          }}
        >
          Insert Rule
        </button>
      </div>
    );
  }

  const aboveBlock = nodeAtOrAbove(editor, ["css-block", "css-atrule-block"]);
  if (aboveBlock !== undefined) {
    const [aboveBlockNode, aboveBlockPath] = aboveBlock;
    buttons.push(
      <div>
        <button
          onMouseDown={(e) => {
            const selectorEdges = Editor.edges(
              editor,
              Path.previous(aboveBlockPath)
            );
            Transforms.setSelection(editor, {
              anchor: selectorEdges[0],
              focus: selectorEdges[1],
            });
            e.preventDefault();
          }}
        >
          Go to block{" "}
          {aboveBlockNode.type === "css-block" ? "selector" : "prelude"}
        </button>
      </div>
    );
  }

  return <div>{buttons}</div>;
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
