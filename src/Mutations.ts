import { Editor, Node, NodeEntry, Path, Transforms } from "slate";
import { getValidPropertyValues } from "./CSSData";

export function insertRule(editor: Editor, insertPath: Path) {
  Transforms.insertNodes(
    editor,
    {
      type: "css-rule",
      children: [
        { type: "css-selector", children: [{ text: "" }] },
        { type: "css-block", children: [] },
      ],
    },
    { at: insertPath }
  );
  Transforms.setSelection(editor, {
    anchor: { path: insertPath, offset: 0 },
    focus: { path: insertPath, offset: 0 },
  });
}

export function convertCssPropertyToEdit(
  editor: Editor,
  propertyNodeEntry: NodeEntry<Node>
) {
  const [propertyNode, propertyNodePath] = propertyNodeEntry;
  Transforms.setNodes(editor, { token: undefined }, { at: propertyNodePath });
  const [, valueNodePath] = Editor.node(editor, Path.next(propertyNodePath));
  Transforms.setNodes(
    editor,
    { property: undefined, token: undefined },
    { at: valueNodePath }
  );
}

export function convertCssValueToEdit(
  editor: Editor,
  valueNodeEntry: NodeEntry<Node>
) {
  const [valueNode, valueNodePath] = valueNodeEntry;
  Transforms.setNodes(editor, { token: undefined }, { at: valueNodePath });
}

export function insertAtRule(editor: Editor, insertPath: Path) {
  Transforms.insertNodes(
    editor,
    {
      type: "css-atrule",
      children: [
        {
          type: "css-atrule-prelude",
          children: [{ text: "" }],
        },
        {
          type: "css-atrule-block",
          children: [{ text: "" }],
        },
      ],
    },
    { at: insertPath }
  );
  Transforms.setSelection(editor, {
    anchor: { path: insertPath, offset: 0 },
    focus: { path: insertPath, offset: 0 },
  });
}

export function insertDeclaration(editor: Editor, newDeclarationPath: Path) {
  Transforms.insertNodes(
    editor,
    {
      type: "css-declaration",
      children: [
        { type: "css-property", children: [{ text: "" }] },
        { type: "css-value", children: [{ text: "" }] },
      ],
    },
    { at: newDeclarationPath }
  );
  Transforms.setSelection(editor, {
    anchor: { path: newDeclarationPath, offset: 0 },
    focus: { path: newDeclarationPath, offset: 0 },
  });
}

export function rotateEnumValue(
  editor: Editor,
  valueNodeEntry: NodeEntry<Node>,
  isDownDirection: boolean
) {
  const [valueNode, valuePath] = valueNodeEntry;
  const enumValues = getValidPropertyValues(valueNode.property as string)!;
  const index = enumValues.indexOf(valueNode.value as string);
  const nextIndex =
    (index + enumValues.length + (isDownDirection ? 1 : -1)) %
    enumValues.length;
  Transforms.setNodes(
    editor,
    { value: enumValues[nextIndex] },
    { at: valuePath }
  );
}

export function unwrapAtRule(editor: Editor, atRulePath: Path) {
  Transforms.unwrapNodes(editor, {
    at: [...atRulePath, 1],
  });
  Transforms.delete(editor, { at: [...atRulePath, 0] });
  Transforms.unwrapNodes(editor, {
    at: atRulePath,
  });
}
