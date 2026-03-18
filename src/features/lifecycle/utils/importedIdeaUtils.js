import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_INSPIRATION_CATEGORY_ID } from '../components/inspiration/categoryRouteUtils';

export const createImportedIdea = ({ text, timestamp, colorIndex, source = 'external' }) => ({
    id: uuidv4(),
    content: text,
    timestamp: timestamp || Date.now(),
    colorIndex,
    category: DEFAULT_INSPIRATION_CATEGORY_ID,
    stage: 'inspiration',
    source,
    tags: source === 'nexmap' ? ['NexMap'] : ['API']
});

export const shouldRevealImportedIdea = (selectedCategory) => (
    selectedCategory !== DEFAULT_INSPIRATION_CATEGORY_ID
);
