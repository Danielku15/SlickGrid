interface IEditor {
    init(): void;
    destroy(): void;
    focus(): void;
    loadValue(item: any): void;
    serializeValue(): any;
    applyValue(item: any, state: any): void;
    isValueChanged(): boolean;
    validate(): void;
}

class TextEditor {

}
class IntegerEditor {

}
class FloatEditor {

}
class DateEditor {

}
class YesNoSelectEditor {

}
class CheckboxEditor {

}
class PercentCompleteEditor {

}
class LongTextEditor {

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