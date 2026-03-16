import { INSPIRATION_CATEGORIES } from '../../../../utils/constants';

export const DEFAULT_INSPIRATION_CATEGORY_ID = INSPIRATION_CATEGORIES[0]?.id || 'note';

export const encodeCategoryRoutePart = (value) => encodeURIComponent(String(value || '').trim());

export const decodeCategoryRoutePart = (value) => {
    if (!value) return null;

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export const buildInspirationCategoryPath = (categoryId) => {
    if (!categoryId) return '/inspiration';
    return `/inspiration/c/${encodeCategoryRoutePart(categoryId)}`;
};

export const resolveCategoryFallback = (categories = []) => (
    categories.find((category) => category.id === DEFAULT_INSPIRATION_CATEGORY_ID)
    || categories[0]
    || null
);
