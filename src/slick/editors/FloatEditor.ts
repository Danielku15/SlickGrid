import { handleKeydownLRNav, handleKeydownLRNoNav } from "./Shared";

export class FloatEditor {
    private $input;
    private defaultValue;
    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        var navOnLR = this.args.grid.getOptions().editorCellNavOnLRKeys;
        this.$input = $("<INPUT type=text class='editor-text' />")
            .appendTo(this.args.container)
            .on("keydown.nav", navOnLR ? handleKeydownLRNav : handleKeydownLRNoNav)
            .focus()
            .select();

        // trigger onCompositeEditorChange event when input changes and it's a Composite Editor
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
    };

    public focus() {
        this.$input.focus();
    };

    private getDecimalPlaces() {
        // returns the number of fixed decimal places or null
        var rtn = this.args.column.editorFixedDecimalPlaces;
        if (typeof rtn == 'undefined') {
            rtn = FloatEditor.DefaultDecimalPlaces;
        }
        return (!rtn && rtn !== 0 ? null : rtn);
    }

    public loadValue(item) {
        this.defaultValue = item[this.args.column.field];

        var decPlaces = this.getDecimalPlaces();
        if (decPlaces !== null
            && (this.defaultValue || this.defaultValue === 0)
            && this.defaultValue.toFixed) {
            this.defaultValue = this.defaultValue.toFixed(decPlaces);
        }

        this.$input.val(this.defaultValue);
        this.$input[0].defaultValue = this.defaultValue;
        this.$input.select();
    };

    public serializeValue() {
        var rtn: any = parseFloat(this.$input.val());
        if (FloatEditor.AllowEmptyValue) {
            if (!rtn && rtn !== 0) { rtn = ''; }
        } else {
            rtn = rtn || 0;
        }

        var decPlaces = this.getDecimalPlaces();
        if (decPlaces !== null
            && (rtn || rtn === 0)
            && rtn.toFixed) {
            rtn = parseFloat(rtn.toFixed(decPlaces));
        }

        return rtn;
    };

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    };

    public isValueChanged() {
        return (!(this.$input.val() === "" && this.defaultValue == null)) && (this.$input.val() != this.defaultValue);
    };

    public validate() {
        if (isNaN(this.$input.val())) {
            return {
                valid: false,
                msg: "Please enter a valid number"
            };
        }

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
    };

    public static DefaultDecimalPlaces = null;
    public static AllowEmptyValue = false;
}

