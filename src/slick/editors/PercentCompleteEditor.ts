export class PercentCompleteEditor {
    private $picker;
    private $input;
    private defaultValue;

    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        this.$input = $("<INPUT type=text class='editor-percentcomplete' />");
        this.$input.width($(this.args.container).innerWidth() - 25);
        this.$input.appendTo(this.args.container);

        this.$picker = $("<div class='editor-percentcomplete-picker' />").appendTo(this.args.container);
        this.$picker.append("<div class='editor-percentcomplete-helper'><div class='editor-percentcomplete-wrapper'><div class='editor-percentcomplete-slider' /><div class='editor-percentcomplete-buttons' /></div></div>");

        this.$picker.find(".editor-percentcomplete-buttons").append("<button val=0>Not started</button><br/><button val=50>In Progress</button><br/><button val=100>Complete</button>");

        this.$input.focus().select();

        this.$picker.find(".editor-percentcomplete-slider").slider({
            orientation: "vertical",
            range: "min",
            value: this.defaultValue,
            slide: (event, ui) => {
                this.$input.val(ui.value);
            },
            stop: (event, ui) => {
                // trigger onCompositeEditorChange event when slider stops and it's a Composite Editor
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

        this.$picker.find(".editor-percentcomplete-buttons button").on("click", (e) => {
            this.$input.val($(this).attr("val"));
            this.$picker.find(".editor-percentcomplete-slider").slider("value", $(this).attr("val"));
        });
    };

    public destroy() {
        this.$input.remove();
        this.$picker.remove();
    };

    public focus() {
        this.$input.focus();
    };

    public loadValue(item) {
        this.$input.val(this.defaultValue = item[this.args.column.field]);
        this.$input.select();
    };

    public serializeValue() {
        return parseInt(this.$input.val(), 10) || 0;
    };

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    };

    public isValueChanged() {
        return (!(this.$input.val() === "" && this.defaultValue == null)) && ((parseInt(this.$input.val(), 10) || 0) != this.defaultValue);
    };

    public validate() {
        if (isNaN(parseInt(this.$input.val(), 10))) {
            return {
                valid: false,
                msg: "Please enter a valid positive number"
            };
        }

        return {
            valid: true,
            msg: null
        };
    };
}
