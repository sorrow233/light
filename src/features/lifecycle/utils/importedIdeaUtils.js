import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_INSPIRATION_CATEGORY_ID } from '../components/inspiration/categoryRouteUtils';

export const resolveImportedCategory = (categories = []) => (
    categories[0]?.id || DEFAULT_INSPIRATION_CATEGORY_ID
);

export const resolveImportedCategoryLabel = (categories = [], categoryId) => (
    categories.find((category) => category.id === categoryId)?.label || '默认分类'
);

export const createImportedIdea = ({ text, timestamp, colorIndex, source = 'external', categoryId }) => ({
    id: uuidv4(),
    content: text,
    timestamp: timestamp || Date.now(),
    colorIndex,
    category: categoryId || DEFAULT_INSPIRATION_CATEGORY_ID,
    stage: 'inspiration',
    source,
    tags: source === 'nexmap' ? ['NexMap'] : ['API']
});

export const shouldRevealImportedIdea = (selectedCategory, importedCategoryId) => (
    selectedCategory !== importedCategoryId
);
