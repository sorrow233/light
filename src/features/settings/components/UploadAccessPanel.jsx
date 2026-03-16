import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import Spotlight from '../../../components/shared/Spotlight';
import { useAuth } from '../../auth/AuthContext';
import { useSyncedMap } from '../../sync/useSyncStore';
import UploadAccessPromptModal from './UploadAccessPromptModal';
import {
    activateUploadAccess,
    clearStoredUploadAccessState,
    normalizeUploadAccessState,
    persistUploadAccessState,
} from '../uploadAccessService';

const preferenceKeys = {
    enabled: 'imageUploadAccessEnabled',
    token: 'imageUploadAccessToken',
    ownerId: 'imageUploadAccessOwnerId',
    activatedAt: 'imageUploadAccessActivatedAt',
};

const formatActivationTime = (timestamp) => {
    if (!timestamp) return '未激活';
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

    const handleReset = useCallback(() => {
        const nextState = {
            enabled: false,
            token: '',
            ownerId: '',
            activatedAt: 0,
        };

        updatePreferenceState(nextState);
        setMembershipKey('');
        clearStoredUploadAccessState();
        onSuccess?.('已清除当前账号的同步上传授权');
    }, [onSuccess, updatePreferenceState]);

    const isBoundToCurrentUser = !!user?.uid && accessState.ownerId === user.uid;
    const statusTone = accessState.enabled && isBoundToCurrentUser
        ? 'emerald'
        : accessState.token
            ? 'amber'
            : 'gray';

    const toneClasses = {
        emerald: {
            border: 'border-emerald-100 dark:border-emerald-900/30',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
        },
        amber: {
            border: 'border-amber-100 dark:border-amber-900/30',
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconText: 'text-amber-600 dark:text-amber-400',
            badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
        },
        gray: {
            border: 'border-gray-100 dark:border-gray-800',
            iconBg: 'bg-gray-100 dark:bg-gray-800',
            iconText: 'text-gray-500 dark:text-gray-400',
            badge: 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
        }
    };

    const currentTone = toneClasses[statusTone];

    return (
        <>
            <Spotlight className="rounded-2xl" spotColor="rgba(251, 191, 36, 0.12)">
                <div className={`p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border ${currentTone.border}`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentTone.iconBg}`}>
                            {accessState.enabled && isBoundToCurrentUser ? (
                                <ShieldCheck size={22} className={currentTone.iconText} />
                            ) : (
                                <ShieldOff size={22} className={currentTone.iconText} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">同步上传权限</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        开启时会弹出兑换码输入框，验证后绑定当前账号
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggle}
                                    className={`relative w-14 h-8 rounded-full transition-colors ${accessState.enabled && isBoundToCurrentUser ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    title={accessState.enabled ? '关闭同步上传权限' : '开启同步上传权限'}
                                >
                                    <span
                                        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${accessState.enabled && isBoundToCurrentUser ? 'translate-x-7' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-white/80 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">状态</div>
                                    <div className={`mt-2 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${currentTone.badge}`}>
                                        {accessState.enabled && isBoundToCurrentUser
                                            ? '已开启'
                                            : accessState.token
                                                ? '已验证待开启'
                                                : '未激活'}
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-white/80 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">激活时间</div>
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 break-all">
                                        {formatActivationTime(accessState.activatedAt)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl bg-white/80 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-800">
                                <div className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">绑定账号</div>
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 break-all">
                                    {accessState.ownerId || '尚未绑定'}
                                </div>
                                <div className="mt-1 text-[11px] text-gray-400">
                                    当前登录：{user?.uid || '未登录'}
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                {!isBoundToCurrentUser && (
                                    <button
                                        onClick={openPrompt}
                                        className="px-4 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        输入兑换码激活
                                    </button>
                                )}
                                {isBoundToCurrentUser && !accessState.enabled && (
                                    <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 text-sm text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                                        当前账号已验证，可直接打开开关。
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                                <span>开启权限时会弹窗输入兑换码，兑换码只绑定当前 UID。</span>
                                {(accessState.token || accessState.ownerId) && (
                                    <button
                                        onClick={handleReset}
                                        className="text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        清除授权
                                    </button>
                                )}
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
