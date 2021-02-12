/*
 * An example of a "detached" editor.
 * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
 * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
 */
class LongTextEditor {
    private $input;
    private $wrapper;
    private defaultValue;

    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        var compositeEditorOptions = this.args.compositeEditorOptions;
        var navOnLR = this.args.grid.getOptions().editorCellNavOnLRKeys;
        var $container = compositeEditorOptions ? this.args.container : $('body');

        this.$wrapper = $("<DIV class='slick-large-editor-text' style='z-index:10000;background:white;padding:5px;border:3px solid gray; border-radius:10px;'/>")
            .appendTo($container);
        if (compositeEditorOptions) {
            this.$wrapper.css({ position: 'relative', padding: 0, border: 0 });
        } else {
            this.$wrapper.css({ position: 'absolute' });
        }

        this.$input = $("<TEXTAREA hidefocus rows=5 style='background:white;width:250px;height:80px;border:0;outline:0'>")
            .appendTo(this.$wrapper);

        // trigger onCompositeEditorChange event when input changes and it's a Composite Editor
        if (compositeEditorOptions) {
            this.$input.on("change", () => {
                var activeCell = this.args.grid.getActiveCell();

                // when valid, we'll also apply the new value to the dataContext item object
                if (this.validate().valid) {
                    this.applyValue(this.args.item, this.serializeValue());
                }
                this.applyValue(this.args.compositeEditorOptions.formValues, this.serializeValue());
                this.args.grid.onCompositeEditorChange.notify({ row: activeCell.row, cell: activeCell.cell, item: this.args.item, column: this.args.column, formValues: this.args.compositeEditorOptions.formValues });
            });
        } else {
            $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
                .appendTo(this.$wrapper);

            this.$wrapper.find("button:first").on("click", this.save);
            this.$wrapper.find("button:last").on("click", this.cancel);
            const handleKeyDown = this.handleKeyDown.bind(this);
            this.$input.on("keydown", function (this: any, e) {
                handleKeyDown(this, e)
            });
            this.position(this.args.position);
        }

        this.$input.focus().select();
    };

    public handleKeyDown(input, e) {
        if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
            this.save();
        } else if (e.which == $.ui.keyCode.ESCAPE) {
            e.preventDefault();
            this.cancel();
        } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
            e.preventDefault();
            this.args.grid.navigatePrev();
        } else if (e.which == $.ui.keyCode.TAB) {
            e.preventDefault();
            this.args.grid.navigateNext();
        } else if (e.which == $.ui.keyCode.LEFT || e.which == $.ui.keyCode.RIGHT) {
            if (this.args.grid.getOptions().editorCellNavOnLRKeys) {
                var cursorPosition = input.selectionStart;
                var textLength = input.value.length;
                if (e.keyCode === $.ui.keyCode.LEFT && cursorPosition === 0) {
                    this.args.grid.navigatePrev();
                }
                if (e.keyCode === $.ui.keyCode.RIGHT && cursorPosition >= textLength - 1) {
                    this.args.grid.navigateNext();
                }
            }
        }
    };

    public save() {
        this.args.commitChanges();
    };

    public cancel() {
        this.$input.val(this.defaultValue);
        this.args.cancelChanges();
    };

    public hide() {
        this.$wrapper.hide();
    };

    public show() {
        this.$wrapper.show();
    };

    public position(position) {
        this.$wrapper
            .css("top", position.top - 5)
            .css("left", position.left - 5);
    };

    public destroy() {
        this.$wrapper.remove();
    };

    public focus() {
        this.$input.focus();
    };

    public loadValue(item) {
        this.$input.val(this.defaultValue = item[this.args.column.field]);
        this.$input.select();
    };

    public serializeValue() {
        return this.$input.val();
    };

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    };

    public isValueChanged() {
        return (!(this.$input.val() === "" && this.defaultValue == null)) && (this.$input.val() != this.defaultValue);
    };

    public validate() {
        if (this.args.column.validator) {
            var validationResults = this.args.column.validator(this.$input.val(), this.args);
            if (!validationResults.valid) {
                return validationResults;
            }
        }

        return {
            valid: true,
            msg: null
        };
    }
}
