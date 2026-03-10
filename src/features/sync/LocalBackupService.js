/**
 * 本地定时备份服务
 * 
 * 功能：
 * 1. 每小时自动备份完整数据到 localStorage
 * 2. 保留最多3天（72个小时备份点）的历史数据
 * 3. 仅在在线状态时执行备份
 */

import { useEffect, useRef, useCallback } from 'react';
import { exportAllData } from '../settings/dataUtils';

// 备份间隔：1小时
const BACKUP_INTERVAL_MS = 60 * 60 * 1000;

// 最小备份间隔：5分钟（防止重复备份）
const MIN_BACKUP_INTERVAL_MS = 5 * 60 * 1000;

// 保留天数：3天 = 72小时
const MAX_BACKUP_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// localStorage key
const BACKUP_STORAGE_KEY = 'light_local_backups';

/**
 * 获取所有本地备份
 * @returns {Array} 备份数组
 */
export const getLocalBackups = () => {
    try {
        const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed.backups) ? parsed.backups : [];
    } catch (e) {
        console.warn('[LocalBackup] Failed to parse backups:', e);
        return [];
    }
};

/**
 * 获取最新的本地备份
 * @returns {Object|null} 最新备份或null
 */
export const getLatestBackup = () => {
    const backups = getLocalBackups();
    if (backups.length === 0) return null;
    return backups.reduce((latest, current) =>
        current.timestamp > latest.timestamp ? current : latest
    );
};

/**
 * 获取上次备份时间
 * @returns {number} 时间戳，如果无备份返回0
 */
const getLastBackupTime = () => {
    try {
        const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (stored) {
            const { lastBackupTime } = JSON.parse(stored);
            return lastBackupTime || 0;
        }
    } catch (e) {
        // ignore
    }
    return 0;
};

/**
 * 保存备份到 localStorage
 * @param {Array} backups - 备份数组
 * @param {number} lastBackupTime - 最后备份时间戳
 */
const saveBackups = (backups, lastBackupTime) => {
    try {
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({
            backups,
            lastBackupTime
        }));
    } catch (e) {
        console.error('[LocalBackup] Failed to save backups:', e);
        // 如果存储满了，尝试清理一些旧备份再保存
        if (e.name === 'QuotaExceededError') {
            const trimmedBackups = backups.slice(0, Math.floor(backups.length / 2));
            try {
                localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({
                    backups: trimmedBackups,
                    lastBackupTime
                }));
                console.warn('[LocalBackup] Storage full, trimmed old backups.');
            } catch (e2) {
                console.error('[LocalBackup] Still failed after trimming:', e2);
            }
        }
    }
};

/**
 * 清理超过3天的旧备份
 * @param {Array} backups - 备份数组
 * @returns {Array} 清理后的备份数组
 */
const cleanupOldBackups = (backups) => {
    const cutoffTime = Date.now() - MAX_BACKUP_AGE_MS;
    const cleaned = backups.filter(b => b.timestamp > cutoffTime);

    if (cleaned.length < backups.length) {
        console.info(`[LocalBackup] Cleaned ${backups.length - cleaned.length} old backups.`);
    }

    return cleaned;
};

/**
 * 执行备份
 * @param {Y.Doc} doc - Y.Doc 实例
 * @param {boolean} force - 是否强制备份（忽略最小间隔）
 * @returns {boolean} 是否成功
 */
export const performBackup = (doc, force = false) => {
    if (!doc) {
        console.warn('[LocalBackup] No Y.Doc provided, skipping backup.');
        return false;
    }

    // 防重检查：5分钟内不重复备份
    if (!force) {
        const lastTime = getLastBackupTime();
        const elapsed = Date.now() - lastTime;
        if (elapsed < MIN_BACKUP_INTERVAL_MS) {
            console.info(`[LocalBackup] Skipping backup, last backup was ${Math.round(elapsed / 1000)}s ago (min interval: ${MIN_BACKUP_INTERVAL_MS / 1000}s).`);
            return false;
        }
    }

    try {
        const now = Date.now();
        const data = exportAllData(doc);

        // 检查备份数据是否有效（防止保存空备份）
        const {
            inspirationItems = [],
            inspirationCategories = [],
            userPreferences = {}
        } = data.data || {};
        const totalItems = inspirationItems.length + inspirationCategories.length + Object.keys(userPreferences).length;

        if (totalItems === 0) {
            console.warn('[LocalBackup] Skipping backup: no data found (Y.Doc may not be synced yet).');
            return false;
        }

        // 获取现有备份
        let backups = getLocalBackups();

        // 清理旧备份
        backups = cleanupOldBackups(backups);

        // 添加新备份
        backups.push({
            timestamp: now,
            data
        });

        // 保存
        saveBackups(backups, now);

        console.info(`[LocalBackup] Backup completed at ${new Date(now).toLocaleString()}, ${totalItems} items, total ${backups.length} backups.`);
        return true;
    } catch (e) {
        console.error('[LocalBackup] Backup failed:', e);
        return false;
    }
};

/**
 * React Hook: 启用本地定时备份
 * @param {Y.Doc} doc - Y.Doc 实例
 */
export const useLocalBackup = (doc) => {
    const intervalRef = useRef(null);
    const docRef = useRef(doc);
    const initializedRef = useRef(false);

    // 保持 doc 引用更新
    useEffect(() => {
        docRef.current = doc;
    }, [doc]);

    // 检查是否应该执行备份（基于1小时间隔）
    const shouldBackup = useCallback(() => {
        // Local backup should work even if offline

        // 检查距离上次备份的时间
        const lastTime = getLastBackupTime();
        if (lastTime > 0) {
            const elapsed = Date.now() - lastTime;
            // 如果距离上次备份不足50分钟，跳过
            if (elapsed < BACKUP_INTERVAL_MS - 10 * 60 * 1000) {
                return false;
            }
        }

        return true;
    }, []);

    // 定时备份
    useEffect(() => {
        if (!doc) return;

        // 防止 Effect 重复初始化
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 初始化时检查是否需要备份
        const initialCheck = () => {
            const lastTime = getLastBackupTime();
            if (lastTime === 0) {
                // 首次备份延迟1分钟执行
                console.info('[LocalBackup] First backup scheduled in 1 minute.');
                setTimeout(() => {
                    if (docRef.current && navigator.onLine) {
                        performBackup(docRef.current);
                    }
                }, 60 * 1000);
            } else {
                const elapsed = Date.now() - lastTime;
                if (elapsed >= BACKUP_INTERVAL_MS) {
                    // 超过1小时没备份，立即备份
                    performBackup(doc);
                } else {
                    console.info(`[LocalBackup] Last backup was ${Math.round(elapsed / 60000)} minutes ago, next backup in ${Math.round((BACKUP_INTERVAL_MS - elapsed) / 60000)} minutes.`);
                }
            }
        };

        initialCheck();

        // 设置定时器（每小时检查一次）
        intervalRef.current = setInterval(() => {
            if (shouldBackup() && docRef.current) {
                performBackup(docRef.current);
            }
        }, BACKUP_INTERVAL_MS);

        // 在线状态恢复时检查备份（可选，因为现在离线也触发）
        const handleOnline = () => {
            console.info('[LocalBackup] Online status restored, checking sync status...');
            // Keep the listener for potential cloud syncing needs if any, 
            // but the interval already handles the periodic backup.
            if (shouldBackup() && docRef.current) {
                performBackup(docRef.current);
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            window.removeEventListener('online', handleOnline);
            initializedRef.current = false;
        };
    }, [doc, shouldBackup]);
};
