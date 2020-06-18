import {
  BlockPlain,
  CssNode,
  CssNodePlain,
  fromPlainObject,
  generate,
  parse,
  SelectorListPlain,
  StyleSheet,
} from "css-tree";
import parserCss from "prettier/parser-postcss";
import prettier from "prettier/standalone";
import * as React from "react";
import { Element, Node, Text } from "slate";
import styles from "./App.module.css";
import SlateEditor from "./SlateEditor";

function slateNodeToCssTreePlain(node: Node): CssNodePlain | undefined {
  if (!Element.isElement(node)) {
    throw new Error(`Unexpected non-element node`);
  }
  switch (node.type) {
    case "css-rule":
      return {
        type: "Rule",
        prelude: slateNodeToCssTreePlain(node.children[0]) as SelectorListPlain,
        block: slateNodeToCssTreePlain(node.children[1]) as BlockPlain,
      };
    case "css-atrule": {
      const atRulePrelude = node.children[0] as Element;
      const atRuleBlock = node.children[1];
      const atRulePreludeSplit = (atRulePrelude.children[0].text as string)
        .split(" ")
        .filter((s) => s.trim() !== "");
      return {
        type: "Atrule",
        name: atRulePreludeSplit[0],
        prelude: {
          type: "Raw",
          value: atRulePreludeSplit.slice(1).join(" "),
        },
        block: slateNodeToCssTreePlain(atRuleBlock) as BlockPlain,
      };
    }
    case "css-atrule-block": {
      return {
        type: "Block",
        children: node.children
          .map(slateNodeToCssTreePlain)
          .filter((node) => node !== undefined) as CssNodePlain[],
      };
    }
    case "css-selector":
      return {
        type: "SelectorList",
        children: [
          {
            type: "Selector",
            children: [
              {
                type: "Raw",
                value: (node.children[0] as Text).text,
              },
            ],
          },
        ],
      };
    case "css-block":
      return {
        type: "Block",
        children: node.children
          .map(slateNodeToCssTreePlain)
          .filter((node) => node !== undefined) as CssNodePlain[],
      };
    case "css-declaration":
      const propertyNode = node.children[0] as Element;
      const valueNode = node.children[1] as Element;
      const propertyValue = (propertyNode.value !== undefined
        ? propertyNode.value
        : propertyNode.children[0].text) as string;
      if (propertyValue === "") {
        return undefined;
      }
      return {
        type: "Declaration",
        important: false,
        property: propertyValue,
        value: {
          type: "Raw",
          value: (valueNode.value !== undefined
            ? valueNode.value
            : valueNode.children[0].text) as string,
        },
      };
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

function convertSlateValueToCssTree(slateValue: Node[]) {
  return fromPlainObject({
    type: "StyleSheet",
    children: slateValue
      .map(slateNodeToCssTreePlain)
      .filter((node) => node !== undefined) as CssNodePlain[],
  });
}

function convertCssNodeToSlateValue(node: CssNode): Node {
  switch (node.type) {
    case "Rule":
      return {
        type: "css-rule",
        children: [
          convertCssNodeToSlateValue(node.prelude),
          convertCssNodeToSlateValue(node.block),
        ],
      };
    case "Block":
      return {
        type: "css-block",
        children: node.children.map(convertCssNodeToSlateValue).toArray(),
      };
    case "SelectorList":
      return {
        type: "css-selector",
        children: [
          {
            text: node.children
              .map((node) => generate(node))
              .toArray()
              .join(""),
          },
        ],
      };
    case "Declaration":
      return {
        type: "css-declaration",
        children: [
          {
            type: "css-property",
            value: node.property,
            children: [{ text: "" }],
          },
          {
            type: "css-value",
            children: [{ text: generate(node.value) }],
          },
        ],
      };
    case "Atrule":
      let blockChildren = node.block?.children
        .map(convertCssNodeToSlateValue)
        .toArray();
      if (blockChildren === undefined || blockChildren.length === 0) {
        blockChildren = [{ text: "" }];
      }
      return {
        type: "css-atrule",
        children: [
          {
            type: "css-atrule-prelude",
            children: [
              {
                text:
                  node.name +
                  (node.prelude !== null ? " " + generate(node.prelude) : ""),
              },
            ],
          },
          {
            type: "css-atrule-block",
            children: blockChildren,
          },
        ],
      };
    default:
      throw new Error(`Unexpected css-tree type: ${node.type}`);
  }
}

export default function App() {
  const [showSlate, setShowSlate] = React.useState(true);
  const [textValue, setTextValue] = React.useState("");
  const [slateValue, setSlateValue] = React.useState<Node[]>([
    {
      type: "css-atrule",
      children: [
        {
          type: "css-atrule-prelude",
          children: [{ text: "media (min-width: 900px)" }],
        },
        {
          type: "css-atrule-block",
          children: [
            {
              type: "css-rule",
              children: [
                {
                  type: "css-selector",
                  children: [{ text: "#main" }],
                },
                {
                  type: "css-block",
                  children: [
                    {
                      type: "css-declaration",
                      children: [
                        {
                          type: "css-property",
                          children: [{ text: "border" }],
                        },
                        {
                          type: "css-value",
                          children: [{ text: "1px solid black" }],
                        },
                      ],
                    },
                    {
                      type: "css-declaration",
                      children: [
                        {
                          type: "css-property",
                          children: [{ text: "color" }],
                        },
                        {
                          type: "css-value",
                          children: [{ text: "red" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "css-rule",
      children: [
        {
          type: "css-selector",
          children: [{ text: ".foo" }],
        },
        {
          type: "css-block",
          children: [
            {
              type: "css-declaration",
              children: [
                {
                  type: "css-property",
                  children: [{ text: "border" }],
                },
                {
                  type: "css-value",
                  children: [{ text: "1px solid black" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  return (
    <div>
      <div>
        <button
          onClick={() => {
            if (showSlate) {
              setTextValue(
                prettier.format(
                  generate(convertSlateValueToCssTree(slateValue)),
                  { parser: "css", plugins: [parserCss] }
                )
              );
              setShowSlate(false);
            } else {
              const cssTree = parse(textValue);
              setSlateValue(
                (cssTree as StyleSheet).children
                  .map(convertCssNodeToSlateValue)
                  .toArray()
              );
              setShowSlate(true);
            }
          }}
        >
          Toggle
        </button>
      </div>
      {showSlate ? (
        <SlateEditor value={slateValue} setValue={setSlateValue} />
      ) : (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className={styles.textarea}
        />
      )}
    </div>
  );
}
