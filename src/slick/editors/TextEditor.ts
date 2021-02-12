import { handleKeydownLRNav, handleKeydownLRNoNav } from "./Shared";

export class TextEditor {
    private $input;
    private defaultValue;
    public args;

    public constructor(args) {
        this.args = this.args;
        this.init();
    }

    public init() {
        var navOnLR = this.args.grid.getOptions().editorCellNavOnLRKeys;
        this.$input = $("<INPUT type=text class='editor-text' />")
            .appendTo(this.args.container)
            .on("keydown.nav", navOnLR ? handleKeydownLRNav : handleKeydownLRNoNav)
            .focus()
            .select();

        // don't show Save/Cancel when it's a Composite Editor and also trigger a onCompositeEditorChange event when input changes
        if (this.args.compositeEditorOptions) {
            this.$input.on("change", () => {
                var activeCell = this.args.grid.getActiveCell();

                // when valid, we'll also apply the new value to the dataContext item object
                if (this.validate().valid) {
                    this.applyValue(this.args.item, this.serializeValue());
                }
                this.applyValue(this.args.compositeEditorOptions.formValues, this.serializeValue());
                this.args.grid.onCompositeEditorChange.notify({ row: activeCell.row, cell: activeCell.cell, item: this.args.item, column: this.args.column, formValues: this.args.compositeEditorOptions.formValues });
            });
        }
    };

    public destroy() {
        this.$input.remove();
    }

    public focus() {
        this.$input.focus();
    }

    public getValue() {
        return this.$input.val();
    }

    public setValue(val) {
        this.$input.val(val);
    }

    public loadValue(item) {
        this.defaultValue = item[this.args.column.field] || "";
        this.$input.val(this.defaultValue);
        this.$input[0].defaultValue = this.defaultValue;
        this.$input.select();
    }

    public serializeValue() {
        return this.$input.val();
    }

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    }

    public isValueChanged() {
        return (!(this.$input.val() === "" && this.defaultValue == null)) && (this.$input.val() != this.defaultValue);
    }

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
