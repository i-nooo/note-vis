import { Store } from "@tanstack/store";

export const store = new Store({
  footnoteVisible: true,
});

export const toggleFootnoteVisibility = () => {
  const newVisibility = !store.state.footnoteVisible;
  store.setState((state) => ({
    ...state,
    footnoteVisible: newVisibility,
  }));
};
