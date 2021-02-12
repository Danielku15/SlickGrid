export class DateEditor {
    private $input;
    private defaultValue;
    private calendarOpen = false;

    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        this.$input = $("<INPUT type=text class='editor-text' />");
        this.$input.appendTo(this.args.container);
        this.$input.focus().select();
        this.$input.datepicker({
            showOn: "button",
            buttonImageOnly: true,
            beforeShow: () => {
                this.calendarOpen = true;
            },
            onClose: () => {
                this.calendarOpen = false;

                // trigger onCompositeEditorChange event when input changes and it's a Composite Editor
                if (this.args.compositeEditorOptions) {
                    var activeCell = this.args.grid.getActiveCell();

                    // when valid, we'll also apply the new value to the dataContext item object
                    if (this.validate().valid) {
                        this.applyValue(this.args.item, this.serializeValue());
                    }
                    this.applyValue(this.args.compositeEditorOptions.formValues, this.serializeValue());
                    this.args.grid.onCompositeEditorChange.notify({ row: activeCell.row, cell: activeCell.cell, item: this.args.item, column: this.args.column, formValues: this.args.compositeEditorOptions.formValues });
                }
            }
        });

        this.$input.width(this.$input.width() - (!this.args.compositeEditorOptions ? 18 : 28));
    };

    public destroy() {
        ($ as any).datepicker.dpDiv.stop(true, true);
        this.$input.datepicker("hide");
        this.$input.datepicker("destroy");
        this.$input.remove();
    };

    public show() {
        if (this.calendarOpen) {
            ($ as any).datepicker.dpDiv.stop(true, true).show();
        }
    };

    public hide() {
        if (this.calendarOpen) {
            ($ as any).datepicker.dpDiv.stop(true, true).hide();
        }
    };

    public position(position) {
        if (!this.calendarOpen) {
            return;
        }
        ($ as any).datepicker.dpDiv
            .css("top", position.top + 30)
            .css("left", position.left);
    };

    public focus() {
        this.$input.focus();
    };

    public loadValue(item) {
        this.defaultValue = item[this.args.column.field];
        this.$input.val(this.defaultValue);
        this.$input[0].defaultValue = this.defaultValue;
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
    };
}