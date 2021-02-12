
/*
 * Depending on the value of Grid option 'editorCellNavOnLRKeys', us
 * Navigate to the cell on the left if the cursor is at the beginning of the input string
 * and to the right cell if it's at the end. Otherwise, move the cursor within the text
 */
export function handleKeydownLRNav(this:any, e) {
    var cursorPosition = this.selectionStart;
    var textLength = this.value.length;
    if ((e.keyCode === $.ui.keyCode.LEFT && cursorPosition > 0) ||
        e.keyCode === $.ui.keyCode.RIGHT && cursorPosition < textLength - 1) {
        e.stopImmediatePropagation();
    }
}

export function handleKeydownLRNoNav(this:any, e) {
    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
        e.stopImmediatePropagation();
    }
}