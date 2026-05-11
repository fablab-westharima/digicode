/**
 * 管理画面
 * ユーザー管理 + Feature Flags管理
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Search, Trash2, ChevronLeft, ChevronRight, Download as DownloadIcon } from 'lucide-react';
import i18n from '@/i18n';
import {
  fetchAdminFeedback,
  patchAdminFeedback,
  downloadAdminFeedbackCsv,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackCategory,
} from '@/services/feedbackService';
import {
  FREE_REASON_PRESETS,
  isKnownPreset,
  presetTranslationKey,
} from '@/utils/featureFlagPresets';

// i18n.language → toLocaleDateString locale 対応
const LOCALE_MAP: Record<string, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-ES',
  'pt-PT': 'pt-PT',
  'zh-TW': 'zh-TW',
};

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language || 'ja',
    'Authorization': `Bearer ${token}`,
  };
}

// ---- Types ----

interface AdminUser {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: string;
  planSource: string | null;
  planNote: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  freeUntil: string | null;
  freeReason: string | null;
  updatedAt: string;
}

// ---- Plan Badge ----

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-600',
    lite: 'bg-blue-600',
    pro: 'bg-orange-600',
    enterprise: 'bg-purple-600',
  };
  return (
    <Badge className={`${colors[plan] || 'bg-gray-600'} text-white text-xs`}>
      {plan.toUpperCase()}
    </Badge>
  );
}

// ---- Users Tab ----

function UsersTab() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editNote, setEditNote] = useState('');
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      if (inactiveDays) params.set('inactive_days', inactiveDays);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('sort', 'last_login_at');
      params.set('order', 'desc');

      const res = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json() as { users: AdminUser[]; total: number };
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, inactiveDays, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePlanChange = async (userId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plan: editPlan,
          source: 'admin_granted',
          note: editNote || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      setEditingUser(null);
      setEditPlan('');
      setEditNote('');
      fetchUsers();
    } catch (err) {
      console.error('Failed to update plan:', err);
    }
  };

  const handleDelete = async (userId: number, email: string) => {
    if (!confirm(t('admin.users.delete.confirm', { email }))) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const isInactive = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return true;
    const daysSince = (Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 90;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const locale = LOCALE_MAP[i18n.language] ?? 'en-US';
    return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">{t('admin.users.filters.searchLabel')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
            <Input
              placeholder={t('admin.users.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              className="pl-9 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
            />
          </div>
        </div>
        <div className="w-[140px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">{t('admin.users.filters.planLabel')}</Label>
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v === 'all' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue placeholder={t('admin.users.filters.planAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.users.filters.planAll')}</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="lite">Lite</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">{t('admin.users.filters.inactiveLabel')}</Label>
          <Select value={inactiveDays} onValueChange={(v) => { setInactiveDays(v === 'none' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue placeholder={t('admin.users.filters.inactiveNone')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('admin.users.filters.inactiveNone')}</SelectItem>
              <SelectItem value="30">{t('admin.users.filters.inactive30')}</SelectItem>
              <SelectItem value="90">{t('admin.users.filters.inactive90')}</SelectItem>
              <SelectItem value="180">{t('admin.users.filters.inactive180')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#2E333D] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161B22]">
            <tr className="text-[#8B949E]">
              <th className="text-left px-4 py-3 font-medium">{t('admin.users.table.email')}</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">{t('admin.users.table.plan')}</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">{t('admin.users.table.source')}</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">{t('admin.users.table.lastLogin')}</th>
              <th className="text-right px-4 py-3 font-medium w-[140px]">{t('admin.users.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2E333D]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B949E]">{t('admin.users.loading')}</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B949E]">{t('admin.users.empty')}</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className={`${isInactive(u.lastLoginAt) ? 'bg-red-900/10' : ''}`}>
                <td className="px-4 py-3 text-[#E6EDF3]">
                  <div className="flex items-center gap-2">
                    {u.email}
                    {u.isAdmin && <Badge variant="outline" className="text-[10px] border-yellow-600 text-yellow-400">Admin</Badge>}
                  </div>
                  {u.planNote && <div className="text-xs text-[#8B949E] mt-0.5">{u.planNote}</div>}
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={u.plan} />
                </td>
                <td className="px-4 py-3 text-[#8B949E] text-xs">
                  {u.planSource === 'admin_granted' ? t('admin.users.sources.admin') : u.planSource === 'stripe' ? 'Stripe' : '-'}
                </td>
                <td className={`px-4 py-3 text-xs ${isInactive(u.lastLoginAt) ? 'text-red-400' : 'text-[#8B949E]'}`}>
                  {formatDate(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingUser === u.id ? (
                    <div className="flex flex-col gap-2">
                      <Select value={editPlan} onValueChange={setEditPlan}>
                        <SelectTrigger className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-xs">
                          <SelectValue placeholder={t('admin.users.edit.planPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="lite">Lite</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={t('admin.users.edit.notePlaceholder')}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-xs"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handlePlanChange(u.id)} disabled={!editPlan}>
                          {t('admin.common.apply')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingUser(null)}>
                          {t('admin.common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#8B949E] hover:text-[#E6EDF3]"
                        onClick={() => { setEditingUser(u.id); setEditPlan(u.plan); setEditNote(u.planNote || ''); }}
                      >
                        {t('admin.users.actions.edit')}
                      </Button>
                      {!u.isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(u.id, u.email)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#8B949E]">
        <span>{t('admin.users.pagination.total', { count: total })}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>{currentPage} / {totalPages}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + limit)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Feature Flags Tab ----

function FlagsTab() {
  const { t, i18n } = useTranslation();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editFreeUntil, setEditFreeUntil] = useState('');
  const [editFreeReason, setEditFreeReason] = useState('');

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/flags`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch flags');
      const data = await res.json() as { flags: FeatureFlag[] };
      setFlags(data.flags);
    } catch (err) {
      console.error('Failed to fetch flags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleSave = async (key: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/flags/${key}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          enabled: editEnabled,
          free_until: editFreeUntil ? new Date(editFreeUntil + 'T23:59:59Z').toISOString() : null,
          free_reason: editFreeReason || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      setEditingKey(null);
      fetchFlags();
      // フラグ変更を即座に反映するためリロード
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('Failed to update flag:', err);
    }
  };

  const getFlagStatus = (flag: FeatureFlag) => {
    if (!flag.enabled) return { label: t('admin.flags.status.open'), color: 'bg-green-600' };
    if (flag.freeUntil && new Date(flag.freeUntil) > new Date()) {
      const locale = LOCALE_MAP[i18n.language] ?? 'en-US';
      return { label: t('admin.flags.status.freeUntil', { date: new Date(flag.freeUntil).toLocaleDateString(locale) }), color: 'bg-green-600' };
    }
    return { label: t('admin.flags.status.paid'), color: 'bg-orange-600' };
  };

  const formatDateForInput = (isoDate: string | null) => {
    if (!isoDate) return '';
    return new Date(isoDate).toISOString().split('T')[0];
  };

  if (loading) return <div className="text-center text-[#8B949E] py-8">{t('admin.flags.loading')}</div>;

  return (
    <div className="space-y-4">
      {flags.length === 0 ? (
        <div className="text-center text-[#8B949E] py-8">{t('admin.flags.empty')}</div>
      ) : flags.map((flag) => {
        const status = getFlagStatus(flag);
        const isEditing = editingKey === flag.key;

        return (
          <div key={flag.key} className="border border-[#2E333D] rounded-lg p-4 bg-[#161B22]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[#E6EDF3] font-medium">{flag.key}</h3>
                {flag.freeReason && (
                  <p className="text-xs text-[#8B949E] mt-0.5">
                    {isKnownPreset(flag.freeReason) ? t(presetTranslationKey(flag.freeReason)) : flag.freeReason}
                  </p>
                )}
              </div>
              <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
            </div>

            {isEditing ? (
              <div className="space-y-3 pt-3 border-t border-[#2E333D]">
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">{t('admin.flags.edit.limitLabel')}</Label>
                  <Select value={editEnabled ? 'true' : 'false'} onValueChange={(v) => setEditEnabled(v === 'true')}>
                    <SelectTrigger className="w-[200px] bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('admin.flags.edit.limitPaid')}</SelectItem>
                      <SelectItem value="false">{t('admin.flags.edit.limitOpen')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">{t('admin.flags.edit.freeUntilLabel')}</Label>
                  <Input
                    type="date"
                    value={editFreeUntil}
                    onChange={(e) => setEditFreeUntil(e.target.value)}
                    className="w-[200px] bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                  {editFreeUntil && (
                    <Button size="sm" variant="ghost" className="text-xs text-[#8B949E]" onClick={() => setEditFreeUntil('')}>
                      {t('admin.flags.edit.freeUntilClear')}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">{t('admin.flags.edit.noteLabel')}</Label>
                  <Select
                    value={isKnownPreset(editFreeReason) ? editFreeReason : undefined}
                    onValueChange={setEditFreeReason}
                  >
                    <SelectTrigger className="flex-1 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue placeholder={t('admin.flags.edit.notePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {FREE_REASON_PRESETS.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {t(presetTranslationKey(preset))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editFreeReason && (
                    <Button size="sm" variant="ghost" className="text-xs text-[#8B949E]" onClick={() => setEditFreeReason('')}>
                      {t('admin.flags.edit.noteClear')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>{t('admin.common.cancel')}</Button>
                  <Button size="sm" onClick={() => handleSave(flag.key)}>{t('admin.common.apply')}</Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-[#8B949E] hover:text-[#E6EDF3]"
                  onClick={() => {
                    setEditingKey(flag.key);
                    setEditEnabled(flag.enabled);
                    setEditFreeUntil(formatDateForInput(flag.freeUntil));
                    setEditFreeReason(flag.freeReason || '');
                  }}
                >
                  {t('admin.flags.edit.button')}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Feedback Tab ----

const FEEDBACK_STATUSES: FeedbackStatus[] = ['new', 'triaged', 'planned', 'closed'];
const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'ui', 'block', 'docs', 'other'];

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const colors: Record<FeedbackStatus, string> = {
    new: 'bg-blue-600',
    triaged: 'bg-yellow-600',
    planned: 'bg-purple-600',
    closed: 'bg-gray-600',
  };
  const { t } = useTranslation();
  return (
    <Badge className={`${colors[status]} text-white text-xs`}>
      {t(`admin.feedback.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

function FeedbackTab() {
  const { t, i18n: i18nInst } = useTranslation();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | ''>('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<FeedbackItem | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('new');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminFeedback({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit,
        offset,
        sort: 'created_desc',
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, offset]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = (item: FeedbackItem) => {
    setDetail(item);
    setEditStatus(item.status);
    setEditAdminNote(item.adminNote ?? '');
  };

  const closeDetail = () => {
    setDetail(null);
    setEditAdminNote('');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await patchAdminFeedback(detail.id, {
        status: editStatus,
        adminNote: editAdminNote,
      });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setDetail(updated);
    } catch (err) {
      console.error('Failed to patch feedback:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAdminFeedbackCsv();
    } catch (err) {
      console.error('Failed to export feedback CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const locale = LOCALE_MAP[i18nInst.language] ?? 'en-US';
    return new Date(date).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Filters + Export */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="w-[160px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">
            {t('admin.feedback.filter.statusLabel', { defaultValue: 'ステータス' })}
          </Label>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? '' : (v as FeedbackStatus));
              setOffset(0);
            }}
          >
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('admin.feedback.filter.allStatus', { defaultValue: '全て' })}
              </SelectItem>
              {FEEDBACK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.feedback.status.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">
            {t('admin.feedback.filter.categoryLabel', { defaultValue: 'カテゴリ' })}
          </Label>
          <Select
            value={categoryFilter || 'all'}
            onValueChange={(v) => {
              setCategoryFilter(v === 'all' ? '' : (v as FeedbackCategory));
              setOffset(0);
            }}
          >
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('admin.feedback.filter.allCategory', { defaultValue: '全て' })}
              </SelectItem>
              {FEEDBACK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`feedback.field.category.options.${c}`, { defaultValue: c })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            {exporting
              ? t('admin.feedback.export.exporting', { defaultValue: 'エクスポート中...' })
              : t('admin.feedback.export.button', { defaultValue: 'CSV エクスポート' })}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#2E333D] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161B22]">
            <tr className="text-[#8B949E]">
              <th className="text-left px-4 py-3 font-medium w-[60px]">
                {t('admin.feedback.column.id', { defaultValue: 'ID' })}
              </th>
              <th className="text-left px-4 py-3 font-medium w-[140px]">
                {t('admin.feedback.column.createdAt', { defaultValue: '受付日時' })}
              </th>
              <th className="text-left px-4 py-3 font-medium w-[200px]">
                {t('admin.feedback.column.userEmail', { defaultValue: 'ユーザー' })}
              </th>
              <th className="text-left px-4 py-3 font-medium w-[80px]">
                {t('admin.feedback.column.userPlan', { defaultValue: 'プラン' })}
              </th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">
                {t('admin.feedback.column.category', { defaultValue: 'カテゴリ' })}
              </th>
              <th className="text-left px-4 py-3 font-medium">
                {t('admin.feedback.column.title', { defaultValue: 'タイトル' })}
              </th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">
                {t('admin.feedback.column.status', { defaultValue: 'ステータス' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2E333D]">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#8B949E]">
                  {t('admin.feedback.loading', { defaultValue: '読み込み中...' })}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#8B949E]">
                  {t('admin.feedback.empty', { defaultValue: '要望はまだありません' })}
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr
                  key={it.id}
                  className="cursor-pointer hover:bg-[#161B22]"
                  onClick={() => openDetail(it)}
                >
                  <td className="px-4 py-3 text-[#8B949E] text-xs">#{it.id}</td>
                  <td className="px-4 py-3 text-[#8B949E] text-xs">{formatDate(it.createdAt)}</td>
                  <td className="px-4 py-3 text-[#E6EDF3] text-xs truncate max-w-[200px]">
                    {it.userEmail ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {it.userPlan ? <PlanBadge plan={it.userPlan} /> : '-'}
                  </td>
                  <td className="px-4 py-3 text-[#8B949E] text-xs">
                    {t(`feedback.field.category.options.${it.category}`, { defaultValue: it.category })}
                  </td>
                  <td className="px-4 py-3 text-[#E6EDF3] truncate max-w-[300px]">{it.title}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#8B949E]">
        <span>{t('admin.feedback.pagination.total', { count: total, defaultValue: '{{count}} 件' })}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>{currentPage} / {totalPages}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + limit)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detail !== null} onOpenChange={(o) => { if (!o) closeDetail(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t('admin.feedback.detail.title', { defaultValue: '要望詳細' })} #{detail.id}
                </DialogTitle>
                <DialogDescription>
                  {formatDate(detail.createdAt)} — {detail.userEmail ?? '-'}{' '}
                  {detail.userPlan && `(${detail.userPlan})`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">
                      {t('admin.feedback.detail.category', { defaultValue: 'カテゴリ' })}:
                    </span>{' '}
                    {t(`feedback.field.category.options.${detail.category}`, { defaultValue: detail.category })}
                  </div>
                  <div>
                    <span className="font-medium">
                      {t('admin.feedback.detail.locale', { defaultValue: '言語' })}:
                    </span>{' '}
                    {detail.locale ?? '-'}
                  </div>
                  <div>
                    <span className="font-medium">
                      {t('admin.feedback.detail.appVersion', { defaultValue: 'バージョン' })}:
                    </span>{' '}
                    {detail.appVersion ?? '-'}
                  </div>
                  <div className="truncate">
                    <span className="font-medium">
                      {t('admin.feedback.detail.userAgent', { defaultValue: 'User Agent' })}:
                    </span>{' '}
                    <span title={detail.userAgent ?? ''}>{detail.userAgent ?? '-'}</span>
                  </div>
                </div>

                {/* Title (read-only) */}
                <div className="space-y-1.5">
                  <Label>{t('admin.feedback.detail.titleField', { defaultValue: 'タイトル' })}</Label>
                  <div className="rounded-md border border-[#2E333D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3]">
                    {detail.title}
                  </div>
                </div>

                {/* Body (read-only) */}
                <div className="space-y-1.5">
                  <Label>{t('admin.feedback.detail.body', { defaultValue: '本文' })}</Label>
                  <div className="rounded-md border border-[#2E333D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] whitespace-pre-wrap break-words">
                    {detail.body}
                  </div>
                </div>

                {/* Status (editable) */}
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-edit-status">
                    {t('admin.feedback.detail.status', { defaultValue: 'ステータス' })}
                  </Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as FeedbackStatus)}>
                    <SelectTrigger id="feedback-edit-status" className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`admin.feedback.status.${s}`, { defaultValue: s })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* admin_note */}
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-admin-note">
                    {t('admin.feedback.detail.adminNote', { defaultValue: '管理メモ' })}
                  </Label>
                  <Textarea
                    id="feedback-admin-note"
                    value={editAdminNote}
                    onChange={(e) => setEditAdminNote(e.target.value)}
                    rows={4}
                    placeholder={t('admin.feedback.detail.adminNotePlaceholder', { defaultValue: '管理者向けの内部メモ（重複統合 / 対応状況等）' })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={closeDetail}>
                  {t('admin.feedback.detail.close', { defaultValue: '閉じる' })}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving
                    ? t('admin.feedback.detail.saving', { defaultValue: '保存中...' })
                    : t('admin.feedback.detail.save', { defaultValue: '保存' })}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Main AdminPage ----

export function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'users' | 'flags' | 'feedback'>('users');

  // 非adminはリダイレクト
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center text-[#8B949E]">
          <p>{t('admin.notAdmin.message')}</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
            {t('admin.notAdmin.backHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      {/* Header */}
      <div className="border-b border-[#2E333D] px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('admin.backLink')}
          </Button>
          <h1 className="text-lg font-semibold">{t('admin.title')}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#2E333D]">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
            onClick={() => setActiveTab('users')}
          >
            {t('admin.tabs.users')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'flags'
                ? 'border-blue-500 text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
            onClick={() => setActiveTab('flags')}
          >
            {t('admin.tabs.flags')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'feedback'
                ? 'border-blue-500 text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
            onClick={() => setActiveTab('feedback')}
          >
            {t('admin.tabs.feedback', { defaultValue: '要望' })}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'flags' && <FlagsTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
      </div>
    </div>
  );
}
