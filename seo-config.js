const seoConfig = {
    siteUrl: 'https://light.catzz.work',
    defaultLang: 'zh',
    supportedLangs: ['zh', 'en', 'ja', 'ko'],
    langNames: {
        zh: '简体中文',
        en: 'English',
        ja: '日本語',
        ko: '한국어',
    },
    site: {
        zh: {
            name: 'Light',
            tagline: '灵感与数据工作台',
            defaultTitle: 'Light | 灵感与数据工作台',
            defaultDescription: 'Light 只保留灵感记录与数据管理，让同步、导入导出和回顾更加专注。',
        },
        en: {
            name: 'Light',
            tagline: 'Inspiration and Data Workspace',
            defaultTitle: 'Light | Inspiration and Data Workspace',
            defaultDescription: 'Light keeps only inspiration capture and data management for a cleaner synced workspace.',
        },
        ja: {
            name: 'Light',
            tagline: 'インスピレーションとデータのワークスペース',
            defaultTitle: 'Light | インスピレーションとデータのワークスペース',
            defaultDescription: 'Light はインスピレーション記録とデータ管理だけに集中した同期ワークスペースです。',
        },
        ko: {
            name: 'Light',
            tagline: '영감과 데이터 워크스페이스',
            defaultTitle: 'Light | 영감과 데이터 워크스페이스',
            defaultDescription: 'Light는 영감 기록과 데이터 관리만 남긴 집중형 동기화 워크스페이스입니다.',
        },
    },
    pages: {
        '/': {
            zh: {
                title: 'Light | 灵感与数据工作台',
                description: '记录灵感、同步数据、导入导出备份，保留最核心的创作捕捉能力。',
            },
            en: {
                title: 'Light | Inspiration and Data Workspace',
                description: 'Capture ideas, sync data, and manage backups with only the essential modules intact.',
            },
            ja: {
                title: 'Light | インスピレーションとデータのワークスペース',
                description: 'ひらめきを記録し、データを同期し、バックアップを管理するための最小構成ワークスペース。',
            },
            ko: {
                title: 'Light | 영감과 데이터 워크스페이스',
                description: '아이디어 기록, 데이터 동기화, 백업 관리만 남긴 핵심 워크스페이스입니다.',
            },
        },
        '/inspiration': {
            zh: {
                title: '灵感 | Light',
                description: '用卡片快速记录、分类和归档你的灵感碎片。',
            },
            en: {
                title: 'Inspiration | Light',
                description: 'Capture, categorize, and archive ideas quickly with lightweight cards.',
            },
            ja: {
                title: 'インスピレーション | Light',
                description: 'カード形式でアイデアを素早く記録、分類、保管できます。',
            },
            ko: {
                title: '영감 | Light',
                description: '카드 기반으로 아이디어를 빠르게 기록하고 분류하며 보관하세요.',
            },
        },
        '/inspiration/archive': {
            zh: {
                title: '灵感归档 | Light',
                description: '查看已归档灵感，整理和回顾过去留下的想法。',
            },
            en: {
                title: 'Inspiration Archive | Light',
                description: 'Review archived ideas and revisit previously captured thoughts.',
            },
            ja: {
                title: 'インスピレーションアーカイブ | Light',
                description: 'アーカイブ済みのアイデアを見直し、過去の発想を振り返ります。',
            },
            ko: {
                title: '영감 보관함 | Light',
                description: '보관된 아이디어를 다시 보고 정리할 수 있습니다.',
            },
        },
        '/data': {
            zh: {
                title: '数据 | Light',
                description: '查看灵感统计、归档情况，并管理导入导出与本地备份。',
            },
            en: {
                title: 'Data | Light',
                description: 'Inspect inspiration stats and manage imports, exports, and local backups.',
            },
            ja: {
                title: 'データ | Light',
                description: 'インスピレーション統計と、インポート・エクスポート・ローカルバックアップを管理します。',
            },
            ko: {
                title: '데이터 | Light',
                description: '영감 통계와 가져오기, 내보내기, 로컬 백업을 관리합니다.',
            },
        },
    },
    getPageSeo(path, lang) {
        let normalizedPath = path;

        for (const currentLang of this.supportedLangs) {
            if (path.startsWith(`/${currentLang}/`) || path === `/${currentLang}`) {
                normalizedPath = path.substring(currentLang.length + 1);
                if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;
                break;
            }
        }

        if (!normalizedPath) normalizedPath = '/';
        if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
            normalizedPath = normalizedPath.slice(0, -1);
        }

        if (normalizedPath.startsWith('/inspiration/c/')) {
            normalizedPath = '/inspiration';
        }

        const pageConfig = this.pages[normalizedPath];
        const siteConfig = this.site[lang] || this.site[this.defaultLang];

        return pageConfig?.[lang]
            || pageConfig?.[this.defaultLang]
            || {
                title: siteConfig?.defaultTitle || 'Light',
                description: siteConfig?.defaultDescription || '',
            };
    },
    getCanonicalUrl(path, lang) {
        const normalizedPath = path === '/' ? '' : path;
        if (lang === this.defaultLang) {
            return `${this.siteUrl}${normalizedPath || '/'}`.replace(/\/$/, normalizedPath === '' ? '/' : '');
        }
        return `${this.siteUrl}/${lang}${normalizedPath}`.replace(/\/$/, normalizedPath === '' ? `/${lang}` : '');
    },
    getAlternateLinks(path) {
        return this.supportedLangs.map((lang) => ({
            hreflang: lang,
            href: this.getCanonicalUrl(path, lang),
        })).concat({
            hreflang: 'x-default',
            href: this.getCanonicalUrl(path, this.defaultLang),
        });
    },
};

export default seoConfig;
