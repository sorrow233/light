import React from 'react';
import { Code2 } from 'lucide-react';
import { buildCodeBlockTheme } from './codeBlockTheme';

const CodeBlockActionButton = ({
    accentHex,
    onClick,
    title,
    className = '',
    label = null,
}) => {
    const theme = buildCodeBlockTheme(accentHex);

    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            title={title}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-[1.03] active:scale-95 ${className}`}
            style={theme.toolbarButtonStyle}
        >
            <Code2 size={14} strokeWidth={2.1} />
            {label ? <span>{label}</span> : null}
        </button>
    );
};

export default CodeBlockActionButton;
