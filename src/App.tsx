import * as React from "react";
import { createEditor, Node } from "slate";
import { Editable, Slate, withReact } from "slate-react";

function App() {
  const editor = React.useMemo(() => withReact(createEditor()), []);
  const [value, setValue] = React.useState<Node[]>([
    {
      type: "paragraph",
      children: [{ text: "A line of text in a paragraph." }],
    },
  ]);
  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(newValue) => setValue(newValue)}
    >
      <Editable />
    </Slate>
  );
}

export default App;
