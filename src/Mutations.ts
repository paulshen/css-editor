import { Editor, Node, NodeEntry, Path, Transforms } from "slate";
import { ENUM_PROPERTIES } from "./Constants";

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
  Transforms.setNodes(editor, { value: undefined });
  Transforms.insertText(editor, propertyNode.value as string);
  Transforms.setSelection(editor, {
    anchor: { path: propertyNodePath, offset: 0 },
  });
  const valueNodeEntry = Editor.node(editor, Path.next(propertyNodePath));
  const value = valueNodeEntry[0].value;
  if (typeof value === "string") {
    Transforms.setNodes(
      editor,
      { property: undefined, value: undefined },
      { at: valueNodeEntry[1] }
    );
    Transforms.insertText(editor, value, {
      at: valueNodeEntry[1],
    });
  }
  Transforms.setNodes(
    editor,
    { property: undefined },
    { at: valueNodeEntry[1] }
  );
}

export function convertCssValueToEdit(
  editor: Editor,
  valueNodeEntry: NodeEntry<Node>
) {
  const [valueNode, valueNodePath] = valueNodeEntry;
  Transforms.setNodes(editor, { value: undefined });
  Transforms.insertText(editor, valueNode.value as string);
  Transforms.setSelection(editor, {
    anchor: { path: valueNodePath, offset: 0 },
  });
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
          children: [
            {
              type: "css-rule",
              children: [
                { type: "css-selector", children: [{ text: "" }] },
                { type: "css-block", children: [] },
              ],
            },
          ],
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
  const enumValues = ENUM_PROPERTIES[valueNode.property as string];
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
