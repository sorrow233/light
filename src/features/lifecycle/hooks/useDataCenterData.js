import { useMemo } from 'react';
import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format, subDays } from 'date-fns';
import { getTextLength, isTimestampInInterval, resolveTimestamp } from './dataCenterUtils';

const filterActiveIdeas = (ideas = []) => ideas.filter((idea) => (idea.stage || 'inspiration') !== 'archive');
const resolveIdeaChars = (idea) => getTextLength(idea.content) + getTextLength(idea.note);

export const useDataCenterStats = (allIdeas = [], categories = []) => {
    return useMemo(() => {
        const ideas = filterActiveIdeas(allIdeas);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        let totalChars = 0;
        let todayChars = 0;
        let thisWeekChars = 0;
        let todayIdeas = 0;
        let thisWeekIdeas = 0;
        let completedTodoCount = 0;

        ideas.forEach((idea) => {
            const itemChars = resolveIdeaChars(idea);
            const timestamp = resolveTimestamp(idea, ['timestamp', 'updatedAt', 'createdAt']);

            totalChars += itemChars;

            if (idea.category === 'todo' && idea.completed) {
                completedTodoCount += 1;
            }

            if (timestamp > 0 && now - timestamp < oneDay) {
                todayChars += itemChars;
                todayIdeas += 1;
            }

            if (timestamp > 0 && now - timestamp < oneWeek) {
                thisWeekChars += itemChars;
                thisWeekIdeas += 1;
            }
        });

        return {
            totalChars,
            todayChars,
            thisWeekChars,
            totalIdeas: ideas.length,
            archivedIdeas: Math.max(allIdeas.length - ideas.length, 0),
            categoryCount: categories.length,
            completedTodoCount,
            todayIdeas,
            thisWeekIdeas,
        };
    }, [allIdeas, categories]);
};

export const useChartData = (allIdeas = []) => {
    return useMemo(() => {
        const now = new Date();
        const ideas = filterActiveIdeas(allIdeas);

        const getStatsForInterval = (items, intervalStart, type) => {
            const result = { words: 0, inspirations: 0 };

            items.forEach((idea) => {
                const timestamp = resolveTimestamp(idea, ['timestamp', 'updatedAt', 'createdAt']);
                if (!isTimestampInInterval(timestamp, intervalStart, type)) return;

                result.words += resolveIdeaChars(idea);
                result.inspirations += 1;
            });

            return result;
        };

        const daily = eachDayOfInterval({ start: subDays(now, 13), end: now }).map((date) => {
            const stats = getStatsForInterval(ideas, date, 'day');
            return { label: format(date, 'MM/dd'), value: stats.words, inspirations: stats.inspirations };
        });

        const weekly = eachWeekOfInterval({ start: subDays(now, 7 * 7), end: now }, { weekStartsOn: 1 }).map((date) => {
            const stats = getStatsForInterval(ideas, date, 'week');
            return { label: format(date, 'MM/dd'), value: stats.words, inspirations: stats.inspirations };
        });

        const monthly = eachMonthOfInterval({ start: subDays(now, 30 * 5), end: now }).map((date) => {
            const stats = getStatsForInterval(ideas, date, 'month');
            return { label: format(date, 'MMM'), value: stats.words, inspirations: stats.inspirations };
        });

        return { daily, weekly, monthly };
    }, [allIdeas]);
};
