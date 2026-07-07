import type { EditorElement, EditorAction } from "./types";

type State = {
  elements: EditorElement[];
  history: EditorElement[][];
};

export const initialState: State = { elements: [], history: [] };

export function editorReducer(state: State, action: EditorAction): State {
  switch (action.type) {
    case "add":
      return {
        elements: [...state.elements, action.element],
        history: [...state.history, state.elements],
      };
    case "move":
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.id ? { ...el, x: action.x, y: action.y } : el
        ),
      };
    case "resize":
      return {
        elements: state.elements.map((el) =>
          el.id === action.id ? { ...el, size: action.size } : el
        ),
        history: [...state.history, state.elements],
      };
    case "rotate":
      return {
        elements: state.elements.map((el) =>
          el.id === action.id ? { ...el, rotation: action.rotation } : el
        ),
        history: [...state.history, state.elements],
      };
    case "delete":
      return {
        elements: state.elements.filter((el) => el.id !== action.id),
        history: [...state.history, state.elements],
      };
    case "clear":
      return {
        elements: [],
        history: [...state.history, state.elements],
      };
    case "undo":
      if (state.history.length === 0) return state;
      return {
        elements: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      };
    default:
      return state;
  }
}
