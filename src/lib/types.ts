export type EditorElement = {
  id: number;
  type: "text" | "emoji" | "image";
  x: number;
  y: number;
  size: number;
  rotation: number;
  content: string;
  ratio?: number;
};

export type EditorAction =
  | { type: "add"; element: EditorElement }
  | { type: "move"; id: number; x: number; y: number }
  | { type: "resize"; id: number; size: number }
  | { type: "rotate"; id: number; rotation: number }
  | { type: "delete"; id: number }
  | { type: "clear" }
  | { type: "undo" };
