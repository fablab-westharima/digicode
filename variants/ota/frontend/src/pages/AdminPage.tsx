/**
 * 管理画面
 * ユーザー管理 + Feature Flags管理
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
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
    basic: 'bg-blue-600',
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
    if (!confirm(`本当に ${email} を削除しますか？この操作は取り消せません。`)) return;
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
    return new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">検索</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
            <Input
              placeholder="メールアドレスで検索..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              className="pl-9 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
            />
          </div>
        </div>
        <div className="w-[140px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">プラン</Label>
          <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v === 'all' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue placeholder="全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Label className="text-[#8B949E] text-xs mb-1 block">放置アカウント</Label>
          <Select value={inactiveDays} onValueChange={(v) => { setInactiveDays(v === 'none' ? '' : v); setOffset(0); }}>
            <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
              <SelectValue placeholder="フィルタなし" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">フィルタなし</SelectItem>
              <SelectItem value="30">30日以上</SelectItem>
              <SelectItem value="90">90日以上</SelectItem>
              <SelectItem value="180">180日以上</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#2E333D] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161B22]">
            <tr className="text-[#8B949E]">
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">プラン</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">付与元</th>
              <th className="text-left px-4 py-3 font-medium w-[100px]">最終ログイン</th>
              <th className="text-right px-4 py-3 font-medium w-[140px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2E333D]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B949E]">読み込み中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8B949E]">ユーザーが見つかりません</td></tr>
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
                  {u.planSource === 'admin_granted' ? '管理者' : u.planSource === 'stripe' ? 'Stripe' : '-'}
                </td>
                <td className={`px-4 py-3 text-xs ${isInactive(u.lastLoginAt) ? 'text-red-400' : 'text-[#8B949E]'}`}>
                  {formatDate(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingUser === u.id ? (
                    <div className="flex flex-col gap-2">
                      <Select value={editPlan} onValueChange={setEditPlan}>
                        <SelectTrigger className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-xs">
                          <SelectValue placeholder="プラン選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="メモ（任意）"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-xs"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => handlePlanChange(u.id)} disabled={!editPlan}>
                          適用
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingUser(null)}>
                          取消
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
                        変更
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
        <span>合計: {total}ユーザー</span>
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
    if (!flag.enabled) return { label: '全員に開放中', color: 'bg-green-600' };
    if (flag.freeUntil && new Date(flag.freeUntil) > new Date()) {
      return { label: `無料開放中 (${new Date(flag.freeUntil).toLocaleDateString('ja-JP')}まで)`, color: 'bg-green-600' };
    }
    return { label: '課金が必要', color: 'bg-orange-600' };
  };

  const formatDateForInput = (isoDate: string | null) => {
    if (!isoDate) return '';
    return new Date(isoDate).toISOString().split('T')[0];
  };

  if (loading) return <div className="text-center text-[#8B949E] py-8">読み込み中...</div>;

  return (
    <div className="space-y-4">
      {flags.length === 0 ? (
        <div className="text-center text-[#8B949E] py-8">Feature Flagsが登録されていません</div>
      ) : flags.map((flag) => {
        const status = getFlagStatus(flag);
        const isEditing = editingKey === flag.key;

        return (
          <div key={flag.key} className="border border-[#2E333D] rounded-lg p-4 bg-[#161B22]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[#E6EDF3] font-medium">{flag.key}</h3>
                {flag.freeReason && <p className="text-xs text-[#8B949E] mt-0.5">{flag.freeReason}</p>}
              </div>
              <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
            </div>

            {isEditing ? (
              <div className="space-y-3 pt-3 border-t border-[#2E333D]">
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">課金制限</Label>
                  <Select value={editEnabled ? 'true' : 'false'} onValueChange={(v) => setEditEnabled(v === 'true')}>
                    <SelectTrigger className="w-[200px] bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">課金が必要（Pro以上）</SelectItem>
                      <SelectItem value="false">全員に開放</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">無料開放終了日</Label>
                  <Input
                    type="date"
                    value={editFreeUntil}
                    onChange={(e) => setEditFreeUntil(e.target.value)}
                    className="w-[200px] bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                  {editFreeUntil && (
                    <Button size="sm" variant="ghost" className="text-xs text-[#8B949E]" onClick={() => setEditFreeUntil('')}>
                      クリア
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-[#8B949E] text-sm w-[100px]">メモ</Label>
                  <Input
                    placeholder="キャンペーン名など"
                    value={editFreeReason}
                    onChange={(e) => setEditFreeReason(e.target.value)}
                    className="flex-1 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>取消</Button>
                  <Button size="sm" onClick={() => handleSave(flag.key)}>適用</Button>
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
                  設定を変更
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Main AdminPage ----

export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'users' | 'flags'>('users');

  // 非adminはリダイレクト
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-center text-[#8B949E]">
          <p>管理者権限が必要です</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
            ホームに戻る
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
            戻る
          </Button>
          <h1 className="text-lg font-semibold">DigiCode Admin</h1>
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
            ユーザー管理
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'flags'
                ? 'border-blue-500 text-[#E6EDF3]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
            onClick={() => setActiveTab('flags')}
          >
            Feature Flags
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? <UsersTab /> : <FlagsTab />}
      </div>
    </div>
  );
}
