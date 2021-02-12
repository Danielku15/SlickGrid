interface CompositeEditorOptions {
    /**
     * Defaults to "edit", modal type can 1 of these 3: (create, edit, mass, mass-selection)
     */
    modalType: 'edit' | 'create' | 'mass' | 'mass-selection';
    /**
     * A generic failed validation message set on the aggregated validation resuls.
     */
    validationFailedMsg: string;
    /**
     * Add an optional prefix to each validation message (only the ones shown in the modal form, not the ones in the "errors")
     */
    validationMsgPrefix: string;

    /**
     * A function to be called when the grid asks the editor to show itself.
     */
    show: () => void;
    /**
     * A function to be called when the grid asks the editor to hide itself.
     */
    hide: () => void;
    /**
     * A function to be called when the grid asks the editor to reposition itself.
     */
    position: () => void;
    /**
     * A function to be called when the editor is destroyed.
     */
    destroy: () => void;
    formValues: any;
    editors: any;
}

/***
 * A composite SlickGrid editor factory.
 * Generates an editor that is composed of multiple editors for given columns.
 * Individual editors are provided given containers instead of the original cell.
 * Validation will be performed on all editors individually and the results will be aggregated into one
 * validation result.
 *
 *
 * The returned editor will have its prototype set to CompositeEditor, so you can use the "instanceof" check.
 *
 * NOTE:  This doesn't work for detached editors since they will be created and positioned relative to the
 *        active cell and not the provided container.
 *
 */
class CompositeEditor {
    private defaultOptions:CompositeEditorOptions = {
        modalType: 'edit', // available type (create, edit, mass)
        validationFailedMsg: "Some of the fields have failed validation",
        validationMsgPrefix: null,
        show: null,
        hide: null,
        position: null,
        destroy: null,
        formValues: {},
        editors: {}
    };

    protected noop = function () {
    };

    protected firstInvalidEditor;

    protected options;
    protected columns;
    protected containers;

    /**
     * @param columns Column definitions from which editors will be pulled.
     * @param containers Container HTMLElements in which editors will be placed.
     * @param options Options
     */
    public constructor(columns, containers, options:CompositeEditorOptions) {
        this.options = $.extend({}, this.defaultOptions, options);
        this.columns = columns;
        this.containers = containers;
    }


    protected getContainerBox(i) {
        var c = this.containers[i];
        var offset = $(c).offset();
        var w = $(c).width() || 0;
        var h = $(c).height() || 0;

        return {
            top: offset && offset.top,
            left: offset && offset.left,
            bottom: offset && offset.top + h,
            right: offset && offset.left + w,
            width: w,
            height: h,
            visible: true
        };
    }

    public editor(args) {
        return new CompositeEditorHandler(this.columns, this.containers, this.options, args);
    }
}

class CompositeEditorHandler extends CompositeEditor {
    private editors = [];

    private args;

    public constructor(columns, containers, options, args) {
        super(columns, containers, options);
        this.args = args;
        this.init();
    }

    public init() {
        var newArgs: any = {};
        var idx = 0;
        while (idx < this.columns.length) {
            if (this.columns[idx].editor) {
                var column = this.columns[idx];
                newArgs = $.extend({}, this.args);
                newArgs.container = this.containers[idx];
                newArgs.column = column;
                newArgs.position = this.getContainerBox(idx);
                newArgs.commitChanges = this.noop;
                newArgs.cancelChanges = this.noop;
                newArgs.compositeEditorOptions = this.options;
                newArgs.formValues = {};

                var currentEditor = new (column.editor)(newArgs);
                this.options.editors[column.id] = currentEditor; // add every Editor instance refs
                this.editors.push(currentEditor);
            }
            idx++;
        }

        // focus on first input
        setTimeout(() => {
            if (Array.isArray(this.editors) && this.editors.length > 0 && this.editors[0].focus) {
                this.editors[0].focus();
            }
        }, 0);
    }


    public destroy() {
        var idx = 0;
        while (idx < this.editors.length) {
            this.editors[idx].destroy();
            idx++;
        }

        this.options.destroy && this.options.destroy();
        this.editors = [];
    }


    public focus() {
        // if validation has failed, set the focus to the first invalid editor
        (this.firstInvalidEditor || this.editors[0]).focus();
    }

    public isValueChanged() {
        var idx = 0;
        while (idx < this.editors.length) {
            if (this.editors[idx].isValueChanged()) {
                return true;
            }
            idx++;
        }
        return false;
    }

    public serializeValue() {
        var serializedValue = [];
        var idx = 0;
        while (idx < this.editors.length) {
            serializedValue[idx] = this.editors[idx].serializeValue();
            idx++;
        }
        return serializedValue;
    }


    public applyValue(item, state) {
        var idx = 0;
        while (idx < this.editors.length) {
            this.editors[idx].applyValue(item, state[idx]);
            idx++;
        }
    }

    public loadValue(item) {
        var idx = 0;

        while (idx < this.editors.length) {
            this.editors[idx].loadValue(item);
            idx++;
        }
    };


    public validate(targetElm) {
        var validationResults;
        var errors = [];
        var $targetElm = targetElm ? $(targetElm) : null;

        this.firstInvalidEditor = null;

        var idx = 0;
        while (idx < this.editors.length) {
            var columnDef = this.editors[idx].args && this.editors[idx].args.column || {};
            if (columnDef) {
                var $validationElm = $(".item-details-validation.editor-" + columnDef.id);
                var $labelElm = $(".item-details-label.editor-" + columnDef.id);
                var $editorElm = $("[data-editorid=" + columnDef.id + "]");
                var validationMsgPrefix = this.options && this.options.validationMsgPrefix || "";

                if (!$targetElm || ($editorElm.has($targetElm as any).length > 0)) {
                    validationResults = this.editors[idx].validate();

                    if (!validationResults.valid) {
                        this.firstInvalidEditor = this.editors[idx];
                        errors.push({
                            index: idx,
                            editor: this.editors[idx],
                            container: this.containers[idx],
                            msg: validationResults.msg
                        });

                        if ($validationElm) {
                            $validationElm.text(validationMsgPrefix + validationResults.msg);
                            $labelElm.addClass("invalid");
                            $editorElm.addClass("invalid");
                        }
                    } else if ($validationElm) {
                        $validationElm.text("");
                        $editorElm.removeClass("invalid");
                        $labelElm.removeClass("invalid");
                    }
                }
                $validationElm = null;
                $labelElm = null;
                $editorElm = null;
            }
            idx++;
        }
        $targetElm = null;

        if (errors.length) {
            return {
                valid: false,
                msg: this.options.validationFailedMsg,
                errors: errors
            };
        } else {
            return {
                valid: true,
                msg: ""
            };
        }
    }


    public hide() {
        var idx = 0;
        while (idx < this.editors.length) {
            this.editors[idx].hide && this.editors[idx].hide();
            idx++;
        }
        this.options.hide && this.options.hide();
    }


    public show() {
        var idx = 0;
        while (idx < this.editors.length) {
            this.editors[idx].show && this.editors[idx].show();
            idx++;
        }
        this.options.show && this.options.show();
    }


    public position(box) {
        this.options.position && this.options.position(box);
    }
}