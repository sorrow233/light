import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import Spotlight from '../../../components/shared/Spotlight';
import { useAuth } from '../../auth/AuthContext';
import { useSyncedMap } from '../../sync/useSyncStore';
import UploadAccessPromptModal from './UploadAccessPromptModal';
import {
    activateUploadAccess,
    clearStoredUploadAccessState,
    isUploadAccessExpired,
    normalizeUploadAccessState,
    persistUploadAccessState,
    UPLOAD_ACCESS_STATE_VERSION,
} from '../uploadAccessService';

const preferenceKeys = {
    enabled: 'imageUploadAccessEnabled',
    token: 'imageUploadAccessToken',
    ownerId: 'imageUploadAccessOwnerId',
    activatedAt: 'imageUploadAccessActivatedAt',
    expiresAt: 'imageUploadAccessExpiresAt',
    planId: 'imageUploadAccessPlanId',
    stateVersion: 'imageUploadAccessStateVersion',
};

const formatExpiryTime = (timestamp, hasAuthorization) => {
    if (!timestamp) {
        return hasAuthorization ? '长期授权' : '未激活';
    }

    return new Date(timestamp).toLocaleString('zh-CN');
};

const UploadAccessPanel = ({ doc, onError, onSuccess }) => {
    const { user } = useAuth();
    const { data: preferences, set } = useSyncedMap(doc, 'user_preferences');
    const [membershipKey, setMembershipKey] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [promptError, setPromptError] = useState('');

    const accessState = useMemo(
        () => normalizeUploadAccessState(preferences),
        [preferences]
    );

    useEffect(() => {
        if (!accessState.token && !accessState.ownerId && !accessState.enabled) {
            clearStoredUploadAccessState();
            return;
        }

        persistUploadAccessState(accessState);
    }, [accessState]);

    const updatePreferenceState = useCallback((nextState) => {
        set(preferenceKeys.enabled, nextState.enabled);
        set(preferenceKeys.token, nextState.token);
        set(preferenceKeys.ownerId, nextState.ownerId);
        set(preferenceKeys.activatedAt, nextState.activatedAt);
        set(preferenceKeys.expiresAt, nextState.expiresAt ?? 0);
        set(preferenceKeys.planId, nextState.planId ?? '');
        set(preferenceKeys.stateVersion, nextState.stateVersion ?? UPLOAD_ACCESS_STATE_VERSION);
        persistUploadAccessState(nextState);
    }, [set]);

    const openPrompt = useCallback(() => {
        setPromptError('');
        setIsPromptOpen(true);
    }, []);

    const closePrompt = useCallback(() => {
        setPromptError('');
        setMembershipKey('');
        setIsPromptOpen(false);
    }, []);

    const handleToggle = useCallback(() => {
        if (!user?.uid) {
            onError?.('请先登录再管理同步上传权限');
            return;
        }

        if (isUploadAccessExpired(accessState)) {
            openPrompt();
            return;
        }

        if (!accessState.token || accessState.ownerId !== user.uid) {
            openPrompt();
            return;
        }

        const nextState = {
            ...accessState,
            enabled: !accessState.enabled,
        };
        updatePreferenceState(nextState);
        onSuccess?.(nextState.enabled ? '同步上传权限已开启' : '同步上传权限已关闭');
    }, [accessState, onError, onSuccess, openPrompt, updatePreferenceState, user?.uid]);

    const handleActivate = useCallback(async () => {
        if (!user) {
            setPromptError('请先登录再激活同步上传权限');
            return;
        }

        setIsActivating(true);
        setPromptError('');
        try {
            const activated = await activateUploadAccess({ user, membershipKey });
            const nextState = {
                enabled: true,
                token: activated.token,
                ownerId: activated.userId,
                activatedAt: activated.activatedAt,
                expiresAt: activated.expiresAt,
                planId: activated.planId,
                stateVersion: UPLOAD_ACCESS_STATE_VERSION,
            };

            updatePreferenceState(nextState);
            closePrompt();
            onSuccess?.('兑换码验证成功，当前账号已开启同步上传权限');
        } catch (error) {
            setPromptError(error.message || '激活失败');
        } finally {
            setIsActivating(false);
        }
    }, [closePrompt, membershipKey, onSuccess, updatePreferenceState, user]);

    const isBoundToCurrentUser = !!user?.uid && accessState.ownerId === user.uid;
    const isExpiredForCurrentUser = isBoundToCurrentUser && isUploadAccessExpired(accessState);
    const isEnabledForCurrentUser = accessState.enabled && isBoundToCurrentUser && !isExpiredForCurrentUser;
    const isVerifiedForCurrentUser = !!accessState.token && isBoundToCurrentUser && !isExpiredForCurrentUser;
    const hasAuthorization = !!accessState.token && !!accessState.ownerId;
    const statusLabel = isExpiredForCurrentUser
        ? '已过期'
        : isEnabledForCurrentUser
            ? '已开启'
            : isVerifiedForCurrentUser
                ? '已激活'
                : '未激活';
    const cardBorderClass = isEnabledForCurrentUser
        ? 'border-blue-200 dark:border-blue-900/40'
        : isExpiredForCurrentUser
            ? 'border-amber-200 dark:border-amber-900/40'
            : 'border-gray-100 dark:border-gray-800';
    const iconWrapperClass = isEnabledForCurrentUser
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        : isExpiredForCurrentUser
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'
            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-300';
    const statusBadgeClass = isExpiredForCurrentUser
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
        : isEnabledForCurrentUser
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-200';

    return (
        <>
            <Spotlight className="rounded-2xl" spotColor="rgba(59, 130, 246, 0.12)">
                <div className={`w-full p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border ${cardBorderClass}`}>
                    <div className="flex items-start gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconWrapperClass}`}>
                            {isEnabledForCurrentUser ? (
                                <ShieldCheck size={22} />
                            ) : (
                                <ShieldOff size={22} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white">同步上传权限</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        用于开启灵感图片上传能力，激活后可在多端同步使用。
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggle}
                                    className={`relative h-8 w-14 rounded-full shrink-0 transition-colors ${isEnabledForCurrentUser ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    title={isEnabledForCurrentUser ? '关闭同步上传权限' : '开启同步上传权限'}
                                >
                                    <span
                                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${isEnabledForCurrentUser ? 'translate-x-7' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                                <span className={`inline-flex rounded-full px-3 py-1 font-medium ${statusBadgeClass}`}>
                                    {statusLabel}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    有效至：{formatExpiryTime(accessState.expiresAt, hasAuthorization)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Spotlight>
            <UploadAccessPromptModal
                isOpen={isPromptOpen}
                value={membershipKey}
                error={promptError}
                isSubmitting={isActivating}
                onChange={setMembershipKey}
                onClose={closePrompt}
                onConfirm={handleActivate}
            />
        </>
    );
};

export default UploadAccessPanel;
