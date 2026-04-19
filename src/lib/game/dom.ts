export const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.isContentEditable ||
      target.closest(
        "input, textarea, select, button, [contenteditable='true']"
      )
  );
