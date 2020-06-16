import { Editor, Element, Node, NodeEntry, Path, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { ENUM_PROPERTIES } from "./Constants";

export function setValueNodeValue(
  editor: ReactEditor,
  valueNode: undefined,
  valueNodePath: Path
): void;
export function setValueNodeValue(
  editor: ReactEditor,
  valueNode: Element
): void;
export function setValueNodeValue(
  editor: ReactEditor,
  valueNode: Element | undefined,
  valueNodePath?: Path
) {
  const element =
    valueNode !== undefined
      ? valueNode
      : Editor.node(editor, valueNodePath!)[0];
  if (
    element.value === undefined &&
    typeof element.property === "string" &&
    Array.isArray(element.children)
  ) {
    const childText = element.children[0].text;
    if (
      typeof childText === "string" &&
      typeof element.property === "string" &&
      ENUM_PROPERTIES[element.property] !== undefined &&
      ENUM_PROPERTIES[element.property].includes(childText)
    ) {
      let nodePath = valueNodePath;
      if (nodePath === undefined) {
        const [valueNodeEntry] = Editor.nodes(editor, {
          at: [],
          match: (node) => node === element,
        });
        nodePath = valueNodeEntry[1];
      }
      Transforms.delete(editor, { at: [...nodePath, 0] });
      Transforms.setNodes(editor, { value: childText }, { at: nodePath });
    }
  }
}

export function nodeAtOrAbove(
  editor: Editor,
  nodeTypes: Array<string>
): NodeEntry<Element> | undefined {
  const [nodeEntry] = Editor.levels(editor, {
    match: (node) => nodeTypes.includes(node.type as string),
    reverse: true,
  });
  return nodeEntry as NodeEntry<Element> | undefined;
}
