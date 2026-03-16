import { Pencil, RotateCcw, Trash2 } from 'lucide-react';

const LEFT_MOTION_RANGE = [0, -80, -200];
const RIGHT_MOTION_RANGE = [0, 80, 200];
const LEFT_ICON_OPACITY_RANGE = [0, -80, -150];
const RIGHT_ICON_OPACITY_RANGE = [0, 80, 150];
const LEFT_ICON_SCALE_RANGE = [0.5, 0.5, 1.2];
const RIGHT_ICON_SCALE_RANGE = [0.5, 0.5, 1.2];

export const SWIPE_ACTION_IDS = {
    delete: 'delete',
    openNote: 'open_note',
    restore: 'restore',
};

const createSwipeAction = ({
    id,
    direction,
    icon,
    backgroundColors,
    iconClassName,
    exitDirection = null,
}) => ({
    id,
    icon,
    iconClassName,
    exitDirection,
    backgroundColors,
    motionRange: direction === 'left' ? LEFT_MOTION_RANGE : RIGHT_MOTION_RANGE,
    iconOpacityRange: direction === 'left' ? LEFT_ICON_OPACITY_RANGE : RIGHT_ICON_OPACITY_RANGE,
    iconScaleRange: direction === 'left' ? LEFT_ICON_SCALE_RANGE : RIGHT_ICON_SCALE_RANGE,
    triggerOffset: direction === 'left' ? -200 : 150,
    velocityThreshold: direction === 'left' ? -400 : 400,
    velocityOffsetGate: direction === 'left' ? -50 : 50,
    containerClassName: direction === 'left'
        ? 'absolute inset-0 rounded-xl flex items-center justify-end pr-6 -z-10'
        : 'absolute inset-0 rounded-xl flex items-center justify-start pl-6 -z-10',
});

const MAIN_VIEW_ACTIONS = {
    left: createSwipeAction({
        id: SWIPE_ACTION_IDS.openNote,
        direction: 'left',
        icon: Pencil,
        iconClassName: 'text-white',
        backgroundColors: [
            'rgba(252, 231, 243, 0)',
            'rgba(252, 231, 243, 0.85)',
            'rgba(244, 114, 182, 1)',
        ],
    }),
    right: createSwipeAction({
        id: SWIPE_ACTION_IDS.delete,
        direction: 'right',
        icon: Trash2,
        iconClassName: 'text-white',
        backgroundColors: [
            'rgba(254, 242, 242, 0)',
            'rgba(254, 226, 226, 0.85)',
            'rgba(239, 68, 68, 1)',
        ],
        exitDirection: 'right',
    }),
};

const ARCHIVE_VIEW_ACTIONS = {
    left: createSwipeAction({
        id: SWIPE_ACTION_IDS.delete,
        direction: 'left',
        icon: Trash2,
        iconClassName: 'text-white',
        backgroundColors: [
            'rgba(254, 242, 242, 0)',
            'rgba(254, 226, 226, 0.85)',
            'rgba(239, 68, 68, 1)',
        ],
        exitDirection: 'left',
    }),
    right: createSwipeAction({
        id: SWIPE_ACTION_IDS.restore,
        direction: 'right',
        icon: RotateCcw,
        iconClassName: 'text-white',
        backgroundColors: [
            'rgba(252, 231, 243, 0)',
            'rgba(252, 231, 243, 0.75)',
            'rgba(244, 114, 182, 1)',
        ],
        exitDirection: 'right',
    }),
};

export const getInspirationSwipeActions = ({ isArchiveView = false } = {}) =>
    (isArchiveView ? ARCHIVE_VIEW_ACTIONS : MAIN_VIEW_ACTIONS);

export const shouldTriggerSwipeAction = (action, dragInfo) => {
    if (!action || !dragInfo) return false;

    const offsetX = Number(dragInfo.offset?.x || 0);
    const velocityX = Number(dragInfo.velocity?.x || 0);

    if (action.triggerOffset < 0) {
        return offsetX < action.triggerOffset
            || (velocityX < action.velocityThreshold && offsetX < action.velocityOffsetGate);
    }

    return offsetX > action.triggerOffset
        || (velocityX > action.velocityThreshold && offsetX > action.velocityOffsetGate);
};
