'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, CreditCard, ShoppingCart, Settings, LayoutDashboard,
  Plus, Pencil, Trash2, ChevronDown, Copy, Check, Eye, Bell,
  AlertCircle, LogOut, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { NetworkIcon } from '@/components/network-icon';
import { cn } from '@/lib/utils';

interface AdminPanelProps {
  onClose: () => void;
  adminPassword: string;
}

interface DashboardStats {
  totalUsers: number;
  pendingDeposits: number;
  totalOrders: number;
  totalRevenue: number;
}

interface Deposit {
  id: string;
  userId: string;
  amount: number;
  status: string;
  paymentProof: string;
  message: string;
  adminNotes: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}

interface Order {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  status: string;
  notes: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
  network: {
    id: string;
    name: string;
    slug: string;
  };
  plan: {
    id: string;
    name: string;
    size: string;
  };
}

interface User {
  id: string;
  name: string;
  phone: string;
  balance: number;
  active: boolean;
  createdAt: string;
}

interface Plan {
  id: string;
  networkId: string;
  name: string;
  size: string;
  price: number;
  validity: string;
  active: boolean;
  network: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminNetwork {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  paymentInstructions: string;
  adminPassword: string;
}

const defaultSettings: SiteSettings = {
  siteName: '',
  siteDescription: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  contactEmail: '',
  contactPhone: '',
  contactWhatsApp: '',
  paymentInstructions: '',
  adminPassword: '',
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'deposits', label: 'Deposits', icon: CreditCard },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'plans', label: 'Data Plans', icon: LayoutDashboard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AdminPanel({ onClose, adminPassword }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [depositFilter, setDepositFilter] = useState('all');

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all');

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planNetworkFilter, setPlanNetworkFilter] = useState('all');

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [depositDetailOpen, setDepositDetailOpen] = useState(false);
  const [depositStatus, setDepositStatus] = useState('');
  const [depositMessage, setDepositMessage] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositUpdating, setDepositUpdating] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderUpdating, setOrderUpdating] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userActive, setUserActive] = useState(false);
  const [balanceAdjustment, setBalanceAdjustment] = useState('');
  const [userUpdating, setUserUpdating] = useState(false);

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [adminNetworks, setAdminNetworks] = useState<AdminNetwork[]>([]);
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    networkId: '', name: '', size: '', price: '', validity: '', active: true,
  });
  const [planSaving, setPlanSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState('');

  const apiHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-password': adminPassword,
  }), [adminPassword]);

  const fetchJSON = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...apiHeaders(), ...options?.headers },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      let msg = `API error: ${res.status}`;
      try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }, [apiHeaders]);

  useEffect(() => {
    fetchJSON('/api/admin/auth', { method: 'POST' }).catch(() => onClose());
  }, [fetchJSON, onClose]);

  const fetchDashboard = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await fetchJSON('/api/admin/dashboard');
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [fetchJSON]);

  const fetchDeposits = useCallback(async (status?: string) => {
    setDepositsLoading(true);
    try {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      const data = await fetchJSON(`/api/admin/deposits${query}`);
      setDeposits(Array.isArray(data?.deposits) ? data.deposits : Array.isArray(data) ? data : []);
    } catch {
      setDeposits([]);
    } finally {
      setDepositsLoading(false);
    }
  }, [fetchJSON]);

  const fetchOrders = useCallback(async (status?: string) => {
    setOrdersLoading(true);
    try {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      const data = await fetchJSON(`/api/admin/orders${query}`);
      setOrders(Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [fetchJSON]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchJSON('/api/admin/users');
      setUsers(Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [fetchJSON]);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const data = await fetchJSON('/api/admin/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : Array.isArray(data) ? data : []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [fetchJSON]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await fetchJSON('/api/admin/settings');
      setSettings({ ...defaultSettings, ...data });
    } catch {
      setSettings(defaultSettings);
    } finally {
      setSettingsLoading(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchJSON('/api/admin/networks')
      .then((d) => setAdminNetworks(Array.isArray(d?.networks) ? d.networks : []))
      .catch(() => {});
  }, [fetchJSON]);

  useEffect(() => {
    if (activeTab === 'deposits') fetchDeposits(depositFilter);
  }, [activeTab, depositFilter, fetchDeposits]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders(orderFilter);
  }, [activeTab, orderFilter, fetchOrders]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'plans') fetchPlans();
  }, [activeTab, fetchPlans]);

  useEffect(() => {
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, fetchSettings]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const openDepositDetail = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setDepositStatus(deposit.status);
    setDepositMessage(deposit.message || '');
    setDepositNotes(deposit.adminNotes || '');
    setDepositDetailOpen(true);
  };

  const handleUpdateDeposit = async () => {
    if (!selectedDeposit) return;
    setDepositUpdating(true);
    try {
      await fetchJSON(`/api/admin/deposits/${selectedDeposit.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: depositStatus,
          adminNotes: depositNotes,
          message: depositMessage,
        }),
      });
      setDepositDetailOpen(false);
      fetchDeposits(depositFilter);
      fetchDashboard();
    } catch {
    } finally {
      setDepositUpdating(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setOrderNotes(order.notes || '');
    setOrderDetailOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setOrderUpdating(true);
    try {
      await fetchJSON(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: orderStatus, notes: orderNotes }),
      });
      setOrderDetailOpen(false);
      fetchOrders(orderFilter);
    } catch {
    } finally {
      setOrderUpdating(false);
    }
  };

  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setUserActive(user.active);
    setBalanceAdjustment('');
    setUserDetailOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setUserUpdating(true);
    try {
      const payload: Record<string, unknown> = { active: userActive };
      if (balanceAdjustment) {
        payload.balanceAdjustment = parseFloat(balanceAdjustment);
      }
      await fetchJSON(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setUserDetailOpen(false);
      fetchUsers();
    } catch {
    } finally {
      setUserUpdating(false);
    }
  };

  const openAddPlan = () => {
    setPlanForm({ networkId: '', name: '', size: '', price: '', validity: '', active: true });
    setAddPlanOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      networkId: plan.networkId,
      name: plan.name,
      size: plan.size,
      price: String(plan.price),
      validity: plan.validity,
      active: plan.active,
    });
    setEditPlanOpen(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await fetchJSON(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      fetchPlans();
    } catch {
    }
  };

  const handleSavePlan = async (isEdit: boolean) => {
    setPlanSaving(true);
    try {
      const body = {
        networkId: planForm.networkId,
        name: planForm.name,
        size: parseFloat(planForm.size) || 0,
        price: parseFloat(planForm.price) || 0,
        validity: planForm.validity,
        active: planForm.active,
      };
      if (!body.networkId) { alert('Please select a network'); return; }
      if (!body.name) { alert('Please enter a plan name'); return; }
      if (!body.size || body.size <= 0) { alert('Please enter a valid data size'); return; }
      if (!body.price || body.price <= 0) { alert('Please enter a valid price'); return; }
      if (!body.validity) { alert('Please enter a validity period'); return; }
      if (isEdit && editingPlanId) {
        await fetchJSON(`/api/admin/plans/${editingPlanId}`, {
          method: 'PUT', body: JSON.stringify(body),
        });
      } else {
        await fetchJSON('/api/admin/plans', {
          method: 'POST', body: JSON.stringify(body),
        });
      }
      setEditPlanOpen(false);
      setAddPlanOpen(false);
      fetchPlans();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save plan';
      alert(msg);
    } finally {
      setPlanSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const payload: Record<string, string> = { ...settings };
      if (!payload.adminPassword) delete payload.adminPassword;
      await fetchJSON('/api/admin/settings', {
        method: 'PUT', body: JSON.stringify(payload),
      });
    } catch {
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const openImageViewer = (src: string) => {
    setImageViewerSrc(src);
    setImageViewerOpen(true);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h1 className="text-lg font-bold text-emerald-600">Admin Panel</h1>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <button
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'processing')
      return <Badge variant="outline" className="border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400">{status}</Badge>;
    if (s === 'approved' || s === 'delivered' || s === 'active')
      return <Badge className="bg-emerald-600 hover:bg-emerald-700">{status}</Badge>;
    if (s === 'rejected' || s === 'failed' || s === 'inactive')
      return <Badge variant="destructive">{status}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Total Users
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" /> Pending Deposits
              {stats.pendingDeposits > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                  {stats.pendingDeposits}
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.pendingDeposits}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" /> Total Orders
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalOrders.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" /> Total Revenue
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">
          <AlertCircle className="h-4 w-4" /> Failed to load dashboard stats.
        </div>
      )}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleTabChange('deposits')}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <CreditCard className="mb-2 h-6 w-6 text-emerald-600" />
            <p className="font-medium">Manage Deposits</p>
            <p className="text-xs text-muted-foreground">Review and approve deposits</p>
          </button>
          <button
            onClick={() => handleTabChange('plans')}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <LayoutDashboard className="mb-2 h-6 w-6 text-emerald-600" />
            <p className="font-medium">Data Plans</p>
            <p className="text-xs text-muted-foreground">Add and manage data plans</p>
          </button>
          <button
            onClick={() => handleTabChange('users')}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <Users className="mb-2 h-6 w-6 text-emerald-600" />
            <p className="font-medium">All Users</p>
            <p className="text-xs text-muted-foreground">View and manage users</p>
          </button>
          <button
            onClick={() => handleTabChange('settings')}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
          >
            <Settings className="mb-2 h-6 w-6 text-emerald-600" />
            <p className="font-medium">Settings</p>
            <p className="text-xs text-muted-foreground">Configure site settings</p>
          </button>
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Pending Deposits</h3>
          <button
            onClick={() => handleTabChange('deposits')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View All →
          </button>
        </div>
        {depositsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : deposits.filter((d) => d.status.toLowerCase() === 'pending').length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No pending deposits at the moment.
          </p>
        ) : (
          <div className="space-y-2">
            {deposits
              .filter((d) => d.status.toLowerCase() === 'pending')
              .slice(0, 5)
              .map((deposit) => (
                <button
                  key={deposit.id}
                  onClick={() => openDepositDetail(deposit)}
                  className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300"
                >
                  <div>
                    <p className="font-medium">{deposit.user?.name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {deposit.user?.phone || 'N/A'} • {formatDate(deposit.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(deposit.amount)}</span>
                    {renderStatusBadge('Pending')}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDeposits = () => {
    const filterTabs = ['all', 'pending', 'approved', 'rejected'];
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Deposits</h2>
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setDepositFilter(tab)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
                depositFilter === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        {depositsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : deposits.length === 0 ? (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            No deposits found.
          </p>
        ) : (
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <button
                key={deposit.id}
                onClick={() => openDepositDetail(deposit)}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300"
              >
                <div>
                  <p className="font-medium">{deposit.user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {deposit.user?.phone || 'N/A'} • {formatDate(deposit.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(deposit.amount)}</span>
                  {renderStatusBadge(deposit.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOrders = () => {
    const filterTabs = ['all', 'processing', 'delivered', 'failed'];
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Orders</h2>
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setOrderFilter(tab)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
                orderFilter === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        {ordersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            No orders found.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => openOrderDetail(order)}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300"
              >
                <div className="flex items-center gap-3">
                  {order.network && (
                    <NetworkIcon
                      slug={order.network.slug}
                      name={order.network.name}
                      size={28}
                    />
                  )}
                  <div>
                    <p className="font-medium">{order.user?.name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.plan?.name || 'Unknown Plan'} • {order.plan?.size || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(order.amount)}</span>
                  {renderStatusBadge(order.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Users</h2>
      {usersLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          No users found.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => openUserDetail(user)}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.phone}</p>
                <p className="text-sm font-semibold text-emerald-600">
                  {formatCurrency(user.balance)}
                </p>
              </div>
              {renderStatusBadge(user.active ? 'Active' : 'Inactive')}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlans = () => {
    const filteredPlans =
      planNetworkFilter === 'all'
        ? plans
        : plans.filter((p) => p.network?.slug === planNetworkFilter);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Data Plans</h2>
          <div className="flex items-center gap-3">
            <Select value={planNetworkFilter} onValueChange={setPlanNetworkFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Networks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="mtn">MTN</SelectItem>
                <SelectItem value="airtel">Airtel</SelectItem>
                <SelectItem value="glo">Glo</SelectItem>
                <SelectItem value="9mobile">9Mobile</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openAddPlan} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Add Plan
            </Button>
          </div>
        </div>
        {plansLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            No plans found.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {plan.network && (
                      <NetworkIcon
                        slug={plan.network.slug}
                        name={plan.network.name}
                        size={24}
                      />
                    )}
                    <div>
                      <p className="font-medium">
                        {plan.network?.name || 'Unknown'} — {plan.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.size} • {plan.validity}
                      </p>
                    </div>
                  </div>
                  {plan.active ? (
                    <Badge className="bg-emerald-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(plan.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditPlan(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      {settingsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-lg font-semibold">Site Information</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  placeholder="DataPlug.ng"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  placeholder="Affordable data plans for all networks"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-lg font-semibold">Bank Details</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  placeholder="Wema Bank"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="bankAccountNumber"
                    value={settings.bankAccountNumber}
                    onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                    placeholder="1234567890"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.bankAccountNumber)}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountName">Account Name</Label>
                <Input
                  id="bankAccountName"
                  value={settings.bankAccountName}
                  onChange={(e) => setSettings({ ...settings, bankAccountName: e.target.value })}
                  placeholder="DataPlug Technologies"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="support@dataplug.ng"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="08012345678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactWhatsApp">WhatsApp Number</Label>
                <Input
                  id="contactWhatsApp"
                  value={settings.contactWhatsApp}
                  onChange={(e) => setSettings({ ...settings, contactWhatsApp: e.target.value })}
                  placeholder="08012345678"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-lg font-semibold">Payment Instructions</h3>
            <div className="space-y-1.5">
              <Label htmlFor="paymentInstructions">Instructions shown to users before payment</Label>
              <Textarea
                id="paymentInstructions"
                value={settings.paymentInstructions}
                onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
                placeholder="Transfer to the account details below and upload your proof of payment. Your account will be credited within 5 minutes after verification."
                rows={4}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-lg font-semibold">Security</h3>
            <div className="space-y-1.5">
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={settings.adminPassword}
                onChange={(e) => setSettings({ ...settings, adminPassword: e.target.value })}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep current password
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {settingsSaving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'deposits':
        return renderDeposits();
      case 'orders':
        return renderOrders();
      case 'users':
        return renderUsers();
      case 'plans':
        return renderPlans();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebar}
      </div>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-[60] md:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[80] md:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4 pt-16 md:p-8 md:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Deposit Detail Dialog */}
      <Dialog open={depositDetailOpen} onOpenChange={setDepositDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deposit Details</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">User</span>
                  <span className="font-medium">{selectedDeposit.user?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="font-medium">{selectedDeposit.user?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedDeposit.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(selectedDeposit.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {renderStatusBadge(selectedDeposit.status)}
                </div>
              </div>
              {selectedDeposit.paymentProof && (
                <div className="space-y-1.5">
                  <Label>Payment Proof</Label>
                  <button
                    onClick={() => openImageViewer(selectedDeposit.paymentProof)}
                    className="relative block w-full overflow-hidden rounded-lg border"
                  >
                    <img
                      src={selectedDeposit.paymentProof}
                      alt="Payment proof"
                      className="h-40 w-full object-contain bg-muted"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700',
                    depositStatus === 'approved' && 'bg-green-50 text-green-700'
                  )}
                  onClick={() => setDepositStatus('approved')}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700',
                    depositStatus === 'rejected' && 'bg-red-50 text-red-700'
                  )}
                  onClick={() => setDepositStatus('rejected')}
                >
                  Reject
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depositMessage">Message to User (optional)</Label>
                <Input
                  id="depositMessage"
                  value={depositMessage}
                  onChange={(e) => setDepositMessage(e.target.value)}
                  placeholder="e.g. Payment verified and credited"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depositNotes">Admin Notes</Label>
                <Textarea
                  id="depositNotes"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDepositDetailOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateDeposit}
                  disabled={depositUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {depositUpdating ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {selectedOrder.network && (
                    <NetworkIcon
                      slug={selectedOrder.network.slug}
                      name={selectedOrder.network.name}
                      size={32}
                    />
                  )}
                  <div>
                    <p className="font-medium">{selectedOrder.plan?.name || 'Unknown Plan'}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.plan?.size || ''} • {selectedOrder.network?.name || ''}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">User</span>
                  <span className="font-medium">{selectedOrder.user?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="font-medium">{selectedOrder.user?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedOrder.plan?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedOrder.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orderStatus">Status</Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger id="orderStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orderNotes">Notes</Label>
                <Textarea
                  id="orderNotes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Order notes..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleUpdateOrder}
                  disabled={orderUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {orderUpdating ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="font-medium">{selectedUser.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedUser.balance)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="userActive">Active</Label>
                <Switch
                  id="userActive"
                  checked={userActive}
                  onCheckedChange={setUserActive}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balanceAdjustment">Balance Adjustment</Label>
                <Input
                  id="balanceAdjustment"
                  value={balanceAdjustment}
                  onChange={(e) => setBalanceAdjustment(e.target.value)}
                  placeholder="+500 or -200"
                />
                <p className="text-xs text-muted-foreground">
                  Use positive number to add funds, negative to deduct
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setUserDetailOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  disabled={userUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {userUpdating ? 'Applying...' : 'Apply'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Form Dialog (shared for Add & Edit) */}
      <Dialog open={editPlanOpen || addPlanOpen} onOpenChange={(open) => {
        if (!open) {
          setEditPlanOpen(false);
          setAddPlanOpen(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editPlanOpen ? 'Edit Plan' : 'Add Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Select
                value={planForm.networkId}
                onValueChange={(val) => setPlanForm({ ...planForm, networkId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {adminNetworks.map((net) => (
                    <SelectItem key={net.id} value={net.id}>
                      <div className="flex items-center gap-2">
                        <NetworkIcon slug={net.slug} name={net.name} size={20} />
                        {net.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g. SME Data"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="planSize">Size (GB)</Label>
                <Input
                  id="planSize"
                  type="number"
                  value={planForm.size}
                  onChange={(e) => setPlanForm({ ...planForm, size: e.target.value })}
                  placeholder="1.5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="planPrice">Price (₦)</Label>
                <Input
                  id="planPrice"
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planValidity">Validity</Label>
              <Input
                id="planValidity"
                value={planForm.validity}
                onChange={(e) => setPlanForm({ ...planForm, validity: e.target.value })}
                placeholder="e.g. 30 days"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="planActive">Active</Label>
              <Switch
                id="planActive"
                checked={planForm.active}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, active: checked })}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditPlanOpen(false);
                  setAddPlanOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSavePlan(!!editPlanOpen)}
                disabled={planSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {planSaving
                  ? 'Saving...'
                  : editPlanOpen
                    ? 'Update'
                    : 'Create'
                }
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {imageViewerSrc && (
            <img
              src={imageViewerSrc}
              alt="Payment proof full size"
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
