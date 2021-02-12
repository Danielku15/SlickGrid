import { CheckboxEditor } from "./slick/editors/CheckboxEditor";
import { DateEditor } from "./slick/editors/DateEditor";
import { FloatEditor } from "./slick/editors/FloatEditor";
import { IntegerEditor } from "./slick/editors/IntegerEditor";
import { PercentCompleteEditor } from "./slick/editors/PercentCompleteEditor";
import { TextEditor } from "./slick/editors/TextEditor";
import { YesNoSelectEditor } from "./slick/editors/YesNoSelectEditor";

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