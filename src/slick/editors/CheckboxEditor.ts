export class CheckboxEditor {
    private $select;
    private defaultValue;

    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        this.$select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
        this.$select.appendTo(this.args.container);
        this.$select.focus();

        // trigger onCompositeEditorChange event when input checkbox changes and it's a Composite Editor
        if (this.args.compositeEditorOptions) {
            this.$select.on("change", () => {
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
        this.$select.remove();
    };

    public focus() {
        this.$select.focus();
    };

    public loadValue(item) {
        this.defaultValue = !!item[this.args.column.field];
        if (this.defaultValue) {
            this.$select.prop('checked', true);
        } else {
            this.$select.prop('checked', false);
        }
    };

    public preClick() {
        this.$select.prop('checked', !this.$select.prop('checked'));
    };

    public serializeValue() {
        return this.$select.prop('checked');
    };

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    };

    public isValueChanged() {
        return (this.serializeValue() !== this.defaultValue);
    };

    public validate() {
        return {
            valid: true,
            msg: null
        };
    }
}