import { Event } from './slick/core/Event';
import { EventData } from './slick/core/EventData';
import { EventHandler } from './slick/core/EventHandler';
import { Range } from './slick/core/Range';
import { SlickMap } from './slick/core/SlickMap';
import { NonDataItem } from './slick/core/NonDataItem';
import { Group } from './slick/core/Group';
import { GroupTotals } from './slick/core/GroupTotals';
import { EditorLock, GlobalEditorLock } from './slick/core/EditorLock';
import { keyCode } from './slick/core/keyCode';
import { GridAutosizeColsMode } from './slick/core/GridAutosizeColsMode';
import { ColAutosizeMode } from './slick/core/ColAutosizeMode';
import { RowSelectionMode } from './slick/core/RowSelectionMode';
import { ValueFilterMode } from './slick/core/ValueFilterMode';
import { preClickClassName } from './slick/core/preClickClassName';
import { WidthEvalMode } from './slick/core/WidthEvalMode';

export const Core = {
    Event,
    EventData,
    EventHandler,
    Range,
    Map: SlickMap,
    NonDataRow: NonDataItem,
    Group,
    GroupTotals,
    EditorLock,

    GlobalEditorLock,
    keyCode,
    preClickClassName,

    GridAutosizeColsMode,
    ColAutosizeMode,
    RowSelectionMode,
    ValueFilterMode,
    WidthEvalMode
}