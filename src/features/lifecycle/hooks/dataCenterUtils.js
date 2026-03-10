import { isSameDay, isSameMonth, isSameWeek } from 'date-fns';

const WEEK_OPTIONS = { weekStartsOn: 1 };

const normalizeNumericTimestamp = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value < 1e11) return value * 1000;
    if (value > 1e14) return Math.floor(value / 1000);
    return value;
};

export const normalizeTimestamp = (value) => {
    if (value == null) return 0;

    if (typeof value === 'number') return normalizeNumericTimestamp(value);

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        if (/^\d+$/.test(trimmed)) return normalizeNumericTimestamp(Number(trimmed));

        const parsed = Date.parse(trimmed);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.getTime() : 0;
    }

    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : 0;
    }

    if (typeof value === 'object') {
        if (typeof value.seconds === 'number') {
            const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
            return Math.floor(value.seconds * 1000 + nanos / 1e6);
        }

        if (typeof value._seconds === 'number') {
            const nanos = typeof value._nanoseconds === 'number' ? value._nanoseconds : 0;
            return Math.floor(value._seconds * 1000 + nanos / 1e6);
        }
    }

    return 0;
};

export const resolveTimestamp = (item, candidateKeys = ['timestamp', 'updatedAt', 'createdAt']) => {
    for (const key of candidateKeys) {
        const timestamp = normalizeTimestamp(item?.[key]);
        if (timestamp > 0) return timestamp;
    }
    return 0;
};

export const getTextLength = (value) => (typeof value === 'string' ? value.length : 0);

export const isTimestampInInterval = (timestamp, intervalStart, type) => {
    if (!timestamp) return false;

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return false;

    if (type === 'day') return isSameDay(date, intervalStart);
    if (type === 'week') return isSameWeek(date, intervalStart, WEEK_OPTIONS);
    if (type === 'month') return isSameMonth(date, intervalStart);
    return false;
};
