class TextEditor {
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



class IntegerEditor {
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

    public loadValue(item) {
        this.defaultValue = item[this.args.column.field];
        this.$input.val(this.defaultValue);
        this.$input[0].defaultValue = this.defaultValue;
        this.$input.select();
    };

    public serializeValue() {
        return parseInt(this.$input.val(), 10) || 0;
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
                msg: "Please enter a valid integer"
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
}

class FloatEditor {
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



class DateEditor {
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

class YesNoSelectEditor {
    private $select;
    private defaultValue;

    public args;

    public constructor(args) {
        this.args = args;
        this.init();
    }

    public init() {
        this.$select = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='yes'>Yes</OPTION><OPTION value='no'>No</OPTION></SELECT>");
        this.$select.appendTo(this.args.container);
        this.$select.focus();

        // trigger onCompositeEditorChange event when input changes and it's a Composite Editor
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
        this.$select.val((this.defaultValue = item[this.args.column.field]) ? "yes" : "no");
        this.$select.select();
    };

    public serializeValue() {
        return (this.$select.val() == "yes");
    };

    public applyValue(item, state) {
        item[this.args.column.field] = state;
    };

    public isValueChanged() {
        return (this.$select.val() != this.defaultValue);
    };

    public validate() {
        return {
            valid: true,
            msg: null
        };
    };
}

class CheckboxEditor {
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

class PercentCompleteEditor {
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

/*
 * Depending on the value of Grid option 'editorCellNavOnLRKeys', us
 * Navigate to the cell on the left if the cursor is at the beginning of the input string
 * and to the right cell if it's at the end. Otherwise, move the cursor within the text
 */
function handleKeydownLRNav(this:any, e) {
    var cursorPosition = this.selectionStart;
    var textLength = this.value.length;
    if ((e.keyCode === $.ui.keyCode.LEFT && cursorPosition > 0) ||
        e.keyCode === $.ui.keyCode.RIGHT && cursorPosition < textLength - 1) {
        e.stopImmediatePropagation();
    }
}

function handleKeydownLRNoNav(this:any, e) {
    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
        e.stopImmediatePropagation();
    }
}

export const Editors = {
    Text: TextEditor,
    Integer: IntegerEditor,
    Float: FloatEditor,
    Date: DateEditor,
    YesNoSelect: YesNoSelectEditor,
    Checkbox: CheckboxEditor,
    PercentComplete: PercentCompleteEditor,
    LongText: LongTextEditor
};