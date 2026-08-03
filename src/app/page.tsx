'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, LogIn, UserPlus, Bell, LogOut, Wallet, Upload, Loader2, Check, Copy, X, Gift, Users, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NetworkIcon } from '@/components/network-icon';
import { AiChat } from '@/components/ai-chat';
import { AdminPanel } from '@/components/admin-panel';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

interface Network { id: string; name: string; slug: string; color: string; icon: string; plans: Plan[]; }
interface Plan { id: string; networkId: string; name: string; size: number; price: number; validity: string; active: boolean; sortOrder: number; }
interface SiteSettings { site_name: string; site_tagline: string; bank_name: string; account_number: string; account_name: string; whatsapp_number: string; support_email: string; payment_instructions: string; }
interface UserOrder { id: string; phone: string; amount: number; status: string; notes: string; createdAt: string; network?: { name: string; slug: string; }; plan?: { name: string; size: number; validity: string; }; }
interface UserDeposit { id: string; amount: number; status: string; createdAt: string; paymentProof: string; }
interface UserNotification { id: string; title: string; message: string; read: boolean; createdAt: string; }

const statusColors: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatPrice(n: number) { return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`; }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch { clearTimeout(id); throw new Error('Request timed out'); }
}

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const isAuthenticated = !!userId;

  const [activeTab, setActiveTab] = useState('buy');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRef, setNotifRef] = useState<HTMLDivElement | null>(null);

  const [networks, setNetworks] = useState<Network[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ site_name: 'DataPlug.ng', site_tagline: '', bank_name: '', account_number: '', account_name: '', whatsapp_number: '', support_email: '', payment_instructions: '' });
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [fundAmount, setFundAmount] = useState('');
  const [fundProofFile, setFundProofFile] = useState<File | null>(null);
  const [fundProofPath, setFundProofPath] = useState('');
  const [fundLoading, setFundLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  // Referral
  const [whatsappShareCount, setWhatsappShareCount] = useState(0);
  const [referralCompleted, setReferralCompleted] = useState(false);
  const [requiredShares, setRequiredShares] = useState(3);
  const [rewardAmount, setRewardAmount] = useState(3000);
  const [totalRewardEarned, setTotalRewardEarned] = useState(0);
  const [shareLoading, setShareLoading] = useState(false);
  // Referral code from URL
  const [urlRefCode, setUrlRefCode] = useState('');

  // Admin
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [adminPwdLoading, setAdminPwdLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Check for referral code in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) setUrlRefCode(ref);
    }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const uid = localStorage.getItem('dataplug_userId');
    if (uid) { setUserId(uid); setUserName(localStorage.getItem('dataplug_userName') || ''); setUserPhone(localStorage.getItem('dataplug_userPhone') || ''); setBalance(localStorage.getItem('dataplug_userBalance') || '0'); }
  }, []);

  function setBalance(val: string | number) { const n = typeof val === 'string' ? parseFloat(val) || 0 : val; setUserBalance(n); }

  // Validate session + refresh balance from server
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/auth/session', { headers: { 'x-user-id': userId } });
        if (!res.ok) { localStorage.clear(); setUserId(''); setUserName(''); setUserPhone(''); setUserBalance(0); return; }
        const data = await res.json();
        if (data.balance !== undefined) {
          setUserBalance(data.balance);
          localStorage.setItem('dataplug_userBalance', String(data.balance));
        }
      } catch { /* ignore */ }
    })();
  }, [userId]);

  // Fetch public data
  useEffect(() => {
    fetchWithTimeout('/api/settings').then(r => r.json()).then(d => setSettings(d)).catch(() => {});
    fetchWithTimeout('/api/plans').then(r => r.json()).then(d => { setNetworks(d.networks || []); if (d.networks?.[0]) setSelectedNetwork(d.networks[0].slug); }).catch(() => {});
  }, []);

  // Fetch user data + refresh balance from server
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWithTimeout('/api/user/orders', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => setOrders(d.orders || [])).catch(() => {});
    fetchWithTimeout('/api/user/deposits', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => setDeposits(d.deposits || [])).catch(() => {});
    fetchWithTimeout('/api/user/notifications', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => setNotifications(d.notifications || [])).catch(() => {});
    fetchWithTimeout('/api/user/referral', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => {
      setWhatsappShareCount(d.whatsappShareCount || 0);
      setReferralCompleted(d.referralCompleted || false);
      setRequiredShares(d.requiredShares || 3);
      setRewardAmount(d.rewardAmount || 3000);
      setTotalRewardEarned(d.totalRewardEarned || 0);
    }).catch(() => {});
    // Always refresh balance from server when data loads
    fetchWithTimeout('/api/auth/session', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => {
      if (d.balance !== undefined) { setUserBalance(d.balance); localStorage.setItem('dataplug_userBalance', String(d.balance)); }
    }).catch(() => {});
  }, [isAuthenticated, userId]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (notifRef && !notifRef.contains(e.target as Node)) setShowNotifications(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifRef]);

  // Login
  async function handleLogin() {
    if (!loginPhone || !loginPassword) return;
    setLoginLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: loginPhone, password: loginPassword }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Login failed'); return; }
      localStorage.setItem('dataplug_userId', data.userId); localStorage.setItem('dataplug_userName', data.name); localStorage.setItem('dataplug_userPhone', loginPhone); localStorage.setItem('dataplug_userBalance', String(data.balance));
      setUserId(data.userId); setUserName(data.name); setUserPhone(loginPhone); setUserBalance(data.balance); setShowLogin(false); toast.success('Welcome back!');
    } catch { toast.error('Network error'); } finally { setLoginLoading(false); }
  }

  // Register
  async function handleRegister() {
    if (!regName || regName.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    if (!regPhone || regPhone.trim().length < 10) { toast.error('Phone number must be at least 10 digits'); return; }
    if (!regPassword || regPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (regPassword !== regConfirm) { toast.error('Passwords do not match'); return; }
    setRegLoading(true);
    try {
      const res = await fetchWithTimeout('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: regName, phone: regPhone, password: regPassword, referralCode: urlRefCode || undefined }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Registration failed'); return; }
      localStorage.setItem('dataplug_userId', data.userId); localStorage.setItem('dataplug_userName', regName); localStorage.setItem('dataplug_userPhone', regPhone); localStorage.setItem('dataplug_userBalance', '0');
      setUserId(data.userId); setUserName(regName); setUserPhone(regPhone); setUserBalance(0); setShowRegister(false); toast.success('Account created!');
    } catch { toast.error('Network error'); } finally { setRegLoading(false); }
  }

  // Logout
  function handleLogout() { localStorage.removeItem('dataplug_userId'); localStorage.removeItem('dataplug_userName'); localStorage.removeItem('dataplug_userPhone'); localStorage.removeItem('dataplug_userBalance'); setUserId(''); setUserName(''); setUserPhone(''); setUserBalance(0); setShowAdmin(false); setAdminAuthenticated(false); }

  // Buy data
  async function handleBuy(plan: Plan) {
    if (userBalance < plan.price) { toast.error('Insufficient balance'); return; }
    setBuyingPlan(plan.id);
    try {
      const res = await fetchWithTimeout('/api/user/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ phone: userPhone, networkId: plan.networkId, planId: plan.id, amount: plan.price }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Order failed'); return; }
      const newBal = userBalance - plan.price; setUserBalance(newBal); localStorage.setItem('dataplug_userBalance', String(newBal));
      fetchWithTimeout('/api/user/orders', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => setOrders(d.orders || []));
      toast.success(`${plan.name} data order placed!`);
    } catch { toast.error('Network error'); } finally { setBuyingPlan(null); }
  }

  // Fund wallet
  async function handleFund() {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0 || !fundProofPath) return;
    setFundLoading(true);
    try {
      const res = await fetchWithTimeout('/api/user/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ amount, paymentProof: fundProofPath }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Deposit failed'); return; }
      setFundAmount(''); setFundProofFile(null); setFundProofPath('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchWithTimeout('/api/user/deposits', { headers: { 'x-user-id': userId } }).then(r => r.json()).then(d => setDeposits(d.deposits || []));
      toast.success('Deposit request submitted! Awaiting confirmation.');
    } catch { toast.error('Network error. Please try again.'); } finally { setFundLoading(false); }
  }

  // Upload proof
  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG or WebP allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setFundProofFile(file);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetchWithTimeout('/api/upload', { method: 'POST', body: fd }, 60000);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Upload failed'); setFundProofFile(null); return; }
      setFundProofPath(data.path); toast.success('Proof uploaded');
    } catch { toast.error('Upload timed out'); setFundProofFile(null); }
  }

  // Copy account number
  function copyAccountNumber() { navigator.clipboard.writeText(settings.account_number); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  // Admin triple-tap
  function handleAdminTap() {
    const next = adminTapCount + 1;
    setAdminTapCount(next);
    if (next >= 3) { setAdminTapCount(0); setShowAdminLogin(true); }
    setTimeout(() => setAdminTapCount(0), 1000);
  }

  // Admin login
  async function handleAdminLogin() {
    if (!adminPwdInput) return;
    setAdminPwdLoading(true);
    try {
      const res = await fetchWithTimeout('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPwdInput } });
      if (!res.ok) { toast.error('Invalid admin password'); return; }
      setAdminPassword(adminPwdInput); setAdminAuthenticated(true); setShowAdminLogin(false); setShowAdmin(true); toast.success('Admin access granted');
    } catch { toast.error('Network error'); } finally { setAdminPwdLoading(false); }
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const selNet = networks.find(n => n.slug === selectedNetwork);

  // Get 2 cheapest plans per network for landing page
  const landingPlans = networks.flatMap(net => [...net.plans].sort((a, b) => a.price - b.price).slice(0, 2).map(p => ({ ...p, networkName: net.name, networkSlug: net.slug, networkColor: net.color })));

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-bold text-lg text-emerald-600">{settings.site_name}</span>
          <div className="flex items-center gap-2">
            {mounted && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>}
            {isAuthenticated ? (
              <>
                <div ref={setNotifRef} className="relative">
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={() => setShowNotifications(!showNotifications)}>
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{unreadCount}</span>}
                  </Button>
                  <AnimatePresence>{showNotifications && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-xl border bg-background shadow-lg p-4 z-50">
                      <h3 className="font-semibold text-sm mb-3">Notifications</h3>
                      {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet</p>}
                      {notifications.map(n => (
                        <div key={n.id} className={cn('p-2 rounded-lg mb-2 text-sm cursor-pointer hover:bg-muted/50', !n.read && 'bg-emerald-50 dark:bg-emerald-900/20')} onClick={() => { fetchWithTimeout('/api/user/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ notificationId: n.id }) }).catch(() => {}); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); }}>
                          <p className="font-medium">{n.title}</p><p className="text-muted-foreground text-xs mt-0.5">{n.message}</p><p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}</AnimatePresence>
                </div>
                <span className="text-sm font-medium hidden sm:inline">{formatPrice(userBalance)}</span>
                <span className="text-sm text-muted-foreground hidden sm:inline">Hi, {userName}</span>
                <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" />Logout</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowLogin(true)}><LogIn className="h-4 w-4 mr-1" />Login</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowRegister(true)}><UserPlus className="h-4 w-4 mr-1" />Register</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {!isAuthenticated ? (
          /* ===== LANDING PAGE ===== */
          <>
            {/* Hero */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-transparent dark:from-emerald-950/30 dark:to-transparent" />
              <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-sm text-emerald-600 font-medium mb-4">Trusted by thousands of Nigerians</motion.p>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">Buy Data at the<br /><span className="text-emerald-600">Best Prices</span></motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">Fund your wallet, choose your plan, get instant delivery. It&apos;s that simple.</motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-3 justify-center">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8" onClick={() => setShowRegister(true)}>Get Started</Button>
                  <Button size="lg" variant="outline" onClick={() => setShowLogin(true)}>Login</Button>
                </motion.div>
              </div>
            </section>

            {/* How It Works */}
            <section className="max-w-6xl mx-auto px-4 py-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: 'STEP 1', title: 'Create Account', desc: 'Sign up in seconds with just your phone number and a password.', icon: UserPlus },
                  { step: 'STEP 2', title: 'Fund Your Wallet', desc: 'Transfer to our account and get credited once confirmed.', icon: Wallet },
                  { step: 'STEP 3', title: 'Buy Data', desc: 'Choose from MTN, Airtel, Glo & 9Mobile. Data delivered in minutes!', icon: Upload },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                    className="text-center p-6 rounded-xl border bg-card/50"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-7 w-7 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-emerald-600 mb-2">{item.step}</p>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Plan Cards */}
            <section className="max-w-6xl mx-auto px-4 py-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Affordable Data Plans</h2>
              <p className="text-muted-foreground text-center mb-10">Starting from just ₦180. All networks available.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {landingPlans.map((plan, i) => (
                  <motion.div
                    key={plan.id || i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                    className="rounded-xl border bg-card p-5 hover:shadow-lg transition-all text-center hover:-translate-y-1"
                  >
                    <NetworkIcon slug={plan.networkSlug} name={plan.networkName} size={56} className="mx-auto mb-3" />
                    <p className="font-medium text-sm">{plan.networkName}</p>
                    <p className="text-xl font-bold">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.validity}</p>
                    <p className="text-xl font-bold text-emerald-600 mt-2">{formatPrice(plan.price)}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="max-w-6xl mx-auto px-4 py-12 text-center">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-10" onClick={() => setShowRegister(true)}>Create a Free Account to Get Started</Button>
            </section>
          </>
        ) : (
          /* ===== USER DASHBOARD ===== */
          <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Mobile balance */}
            <div className="sm:hidden mb-4 text-center">
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold text-emerald-600">{formatPrice(userBalance)}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="buy" className="flex-1"><span className="hidden sm:inline">Buy </span>Data</TabsTrigger>
                <TabsTrigger value="fund" className="flex-1"><span className="hidden sm:inline">Fund </span>Wallet</TabsTrigger>
                <TabsTrigger value="orders" className="flex-1">My <span className="hidden sm:inline">Orders</span></TabsTrigger>
                <TabsTrigger value="deposits" className="flex-1">My <span className="hidden sm:inline">Deposits</span></TabsTrigger>
                <TabsTrigger value="refer" className="flex-1"><Gift className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Refer</span></TabsTrigger>
              </TabsList>

              {/* BUY DATA */}
              <TabsContent value="buy">
                <div className="flex items-center justify-between mb-6">
                  <div className="hidden sm:block">
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatPrice(userBalance)}</p>
                  </div>
                  <Button variant="outline" className="sm:hidden" onClick={() => setActiveTab('fund')}>Fund Wallet</Button>
                </div>
                {/* Network selector */}
                <div className="flex gap-3 mb-6 flex-wrap">
                  {networks.map(net => (
                    <Button key={net.id} variant={selectedNetwork === net.slug ? 'default' : 'outline'} className={cn('flex-1 min-w-[80px]', selectedNetwork === net.slug && 'ring-2 ring-emerald-500')} onClick={() => setSelectedNetwork(net.slug)}>
                      <NetworkIcon slug={net.slug} name={net.name} size={32} className="mr-2" />
                      {net.name}
                    </Button>
                  ))}
                </div>
                {/* Plans */}
                {selNet && (
                  <>
                    <h3 className="text-lg font-semibold mb-4">{selNet.name} Data Plans</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {selNet.plans.filter(p => p.active).sort((a, b) => a.sortOrder - b.sortOrder).map(plan => (
                        <div key={plan.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                          <p className="text-lg font-bold">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.validity}</p>
                          <p className="text-xl font-bold text-emerald-600 my-2">{formatPrice(plan.price)}</p>
                          <Button className={cn('w-full', userBalance >= plan.price ? 'bg-emerald-600 hover:bg-emerald-700' : '')} disabled={userBalance < plan.price || buyingPlan === plan.id} onClick={() => handleBuy(plan)}>
                            {buyingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {userBalance >= plan.price ? 'Buy Now' : 'Insufficient Balance'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* FUND WALLET */}
              <TabsContent value="fund">
                <h2 className="text-2xl font-bold mb-6">Fund Your Wallet</h2>
                <div className="max-w-md space-y-6">
                  <div><Label>Amount (₦)</Label><div className="flex items-center gap-2 mt-1"><span className="text-muted-foreground">₦</span><Input type="number" placeholder="Enter amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} /></div></div>
                  <div className="rounded-xl border bg-muted/50 p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Bank Transfer Details</h4>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Bank</span><span className="text-sm font-medium">{settings.bank_name}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Account Number</span><div className="flex items-center gap-2"><span className="text-sm font-medium">{settings.account_number}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAccountNumber}>{copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}</Button></div></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Account Name</span><span className="text-sm font-medium">{settings.account_name}</span></div>
                  </div>
                  <p className="text-sm text-muted-foreground">{settings.payment_instructions}</p>
                  <div><Label>Payment Proof</Label>
                    <Button variant="outline" className="w-full mt-1 h-auto py-4 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{fundProofFile ? fundProofFile.name : 'Tap to upload payment proof'}</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG or WebP • Max 5MB</span>
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProofUpload} />
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!fundAmount || !fundProofPath || fundLoading} onClick={handleFund}>
                    {fundLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Deposit Request
                  </Button>
                </div>
              </TabsContent>

              {/* MY ORDERS */}
              <TabsContent value="orders">
                <h2 className="text-2xl font-bold mb-6">My Orders</h2>
                {orders.length === 0 ? <p className="text-muted-foreground text-center py-12">No orders yet. Buy data to see your orders here.</p> : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-4">
                        {order.network && <NetworkIcon slug={order.network.slug} name={order.network.name} size={44} />}
                        <div className="flex-1 min-w-[150px]">
                          <p className="font-medium">{order.plan?.name || 'Unknown'} Data</p>
                          <p className="text-sm text-muted-foreground">{order.phone} • {formatDate(order.createdAt)}</p>
                        </div>
                        <p className="font-bold text-emerald-600">{formatPrice(order.amount)}</p>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[order.status] || '')}>{order.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* MY DEPOSITS */}
              <TabsContent value="deposits">
                <h2 className="text-2xl font-bold mb-6">My Deposits</h2>
                {deposits.length === 0 ? <p className="text-muted-foreground text-center py-12">No deposits yet. Fund your wallet to get started.</p> : (
                  <div className="space-y-3">
                    {deposits.map(dep => (
                      <div key={dep.id} className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-4">
                        <div className="flex-1"><p className="font-bold text-emerald-600">{formatPrice(dep.amount)}</p><p className="text-sm text-muted-foreground">{formatDate(dep.createdAt)}</p></div>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[dep.status] || '')}>{dep.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* REFERRAL */}
              <TabsContent value="refer">
                <div className="space-y-6">
                  {/* Referral Hero Card */}
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6" /> Share & Earn</h2>
                        <p className="text-emerald-100 mt-2">Share DataPlug.ng with your friends on WhatsApp and earn <span className="font-bold text-yellow-300">₦3,000</span> wallet credit!</p>
                      </div>
                      {totalRewardEarned > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-emerald-100">Total Earned</p>
                          <p className="text-3xl font-bold">{formatPrice(totalRewardEarned)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Box — fills green in quarters */}
                  <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">Share Progress</span>
                      <span className="text-sm text-muted-foreground">{whatsappShareCount} / {requiredShares} shares</span>
                    </div>
                    {/* Quarter boxes */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-20 sm:h-24 rounded-xl border-2 flex items-center justify-center transition-all duration-700 ease-out',
                            i < whatsappShareCount
                              ? 'bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50'
                              : 'bg-muted/50 border-muted-300 dark:border-muted-700'
                          )}
                        >
                          {i < whatsappShareCount ? (
                            <Check className="h-8 w-8 text-white" />
                          ) : (
                            <span className="text-2xl font-bold text-muted-400">{(i + 1)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Progress text */}
                    {!referralCompleted ? (
                      <p className="text-sm text-center text-muted-foreground">
                        {whatsappShareCount === 0
                          ? 'Tap the button below to share and start earning!'
                          : whatsappShareCount < requiredShares
                            ? `${requiredShares - whatsappShareCount} more share${requiredShares - whatsappShareCount === 1 ? '' : 's'} to earn ₦${rewardAmount.toLocaleString()}!`
                            : ''
                        }
                      </p>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <p className="text-lg font-bold text-emerald-600">Completed! ₦{rewardAmount.toLocaleString()} credited to your wallet!</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Share Button — only show if not completed */}
                  {!referralCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border bg-card p-4"
                    >
                      <Button
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white font-bold py-4"
                        disabled={shareLoading}
                        onClick={async () => {
                          setShareLoading(true);
                          const shareLink = 'https://ln.run/gfciL';
                          const shareText = `*DataPlug.ng* \u{1F4F1} \u{1F525}\n\n*Nigeria\u2019s Cheapest Data Platform!*\n\n\u{2728} MTN | Airtel | Glo | 9Mobile\n\u{1F4B0} Affordable data for everyone\n\u{1F381} Earn free data by sharing\n\n\u{1F517} Join now: ${shareLink}\n\n*_Get connected today_* \u{1F4F1}\u{2764}\u{FE0F}`;

                          // Try Web Share API with image (works on mobile browsers)
                          let shared = false;
                          try {
                            if (navigator.canShare) {
                              const imgResponse = await fetch('/referral-banner.png');
                              const imgBlob = await imgResponse.blob();
                              const imgFile = new File([imgBlob], 'dataplug-share.png', { type: 'image/png' });

                              if (navigator.canShare({ files: [imgFile] })) {
                                await navigator.share({
                                  title: 'DataPlug.ng - Cheapest Data in Nigeria',
                                  text: shareText,
                                  url: shareLink,
                                  files: [imgFile],
                                });
                                shared = true;
                              }
                            }
                          } catch (shareErr) {
                            // User cancelled or API not supported — fallback to wa.me
                            if ((shareErr as Error).name !== 'AbortError') {
                              console.log('Web Share not available, using WhatsApp fallback');
                            }
                          }

                          // Fallback: open WhatsApp with text only
                          if (!shared) {
                            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                          }

                          // Record the share on server
                          try {
                            const res = await fetchWithTimeout('/api/user/referral', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                            });
                            const data = await res.json();
                            if (data.rewardGranted) {
                              toast.success('Congratulations! ₦3,000 credited to your wallet!');
                              setUserBalance(prev => prev + data.rewardAmount);
                              localStorage.setItem('dataplug_userBalance', String(Number(localStorage.getItem('dataplug_userBalance') || '0') + data.rewardAmount));
                            } else if (data.message) {
                              toast.success(data.message);
                            }
                            setWhatsappShareCount(data.whatsappShareCount);
                            setReferralCompleted(data.referralCompleted);
                            setTotalRewardEarned((prev: number) => prev + (data.rewardGranted ? data.rewardAmount : 0));
                          } catch {
                            toast.error('Share recorded locally. Refresh to see progress.');
                          }

                          setShareLoading(false);
                        }}
                      >
                        {shareLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <Share2 className="h-5 w-5 mr-2" />
                        )}
                        Share to WhatsApp
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">Tap to share with friends and earn ₦3,000</p>
                    </motion.div>
                  )}

                  {/* Completed State */}
                  {referralCompleted && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', duration: 0.6 }}
                      className="rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center"
                    >
                      <div className="text-4xl mb-3">{'🎉'}</div>
                      <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Reward Claimed!</h3>
                      <p className="text-emerald-600 dark:text-emerald-300">You earned ₦3,000 wallet credit by sharing DataPlug.ng!</p>
                      <p className="text-sm text-muted-foreground mt-2">Keep using DataPlug.ng for the cheapest data in Nigeria.</p>
                    </motion.div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t bg-background">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-2">
          <p>{settings.site_name} — {settings.site_tagline || 'Your Reliable Plug for Cheap Data'}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a href={`https://wa.me/${settings.whatsapp_number?.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600">WhatsApp Support</a>
            <span>|</span>
            <span>{settings.support_email || 'support@dataplug.ng'}</span>
          </div>
          <p>© {new Date().getFullYear()} {settings.site_name}. All rights reserved.</p>
          <button onClick={handleAdminTap} className="text-lg leading-none opacity-30 hover:opacity-60 transition-opacity">•</button>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Welcome Back</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Phone Number</Label><Input type="tel" placeholder="Enter phone number" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} className="mt-1" /></div>
            <div><Label>Password</Label><Input type="password" placeholder="Enter password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="mt-1" onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loginLoading} onClick={handleLogin}>{loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Login</Button>
            <Button variant="link" className="w-full" onClick={() => { setShowLogin(false); setShowRegister(true); }}>Don&apos;t have an account? Register</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REGISTER MODAL */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input placeholder="Enter full name" value={regName} onChange={e => setRegName(e.target.value)} className="mt-1" /></div>
            <div><Label>Phone Number</Label><Input type="tel" placeholder="Enter phone number" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="mt-1" /></div>
            <div><Label>Password</Label><Input type="password" placeholder="Enter password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="mt-1" /></div>
            <div><Label>Confirm Password</Label><Input type="password" placeholder="Confirm password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className="mt-1" onKeyDown={e => e.key === 'Enter' && handleRegister()} /></div>
            {urlRefCode && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-center"><Gift className="h-4 w-4 inline mr-1 text-emerald-600" /> You were referred by a friend! <span className="font-mono font-bold">{urlRefCode}</span></div>}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={regLoading} onClick={handleRegister}>{regLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Account</Button>
            <Button variant="link" className="w-full" onClick={() => { setShowRegister(false); setShowLogin(true); }}>Already have an account? Login</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADMIN LOGIN DIALOG */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Admin Login</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Enter admin password</Label><Input type="password" placeholder="Enter admin password" value={adminPwdInput} onChange={e => setAdminPwdInput(e.target.value)} className="mt-1" onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} /></div>
            <Button className="w-full" disabled={adminPwdLoading} onClick={handleAdminLogin}>{adminPwdLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Login</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADMIN PANEL */}
      {showAdmin && adminAuthenticated && <AdminPanel onClose={() => { setShowAdmin(false); setAdminAuthenticated(false); }} adminPassword={adminPassword} />}

      {/* AI CHAT */}
      <AiChat />

      {/* TOAST FIX: KBD SHORTCUT */}
      <div className="fixed bottom-0 left-0 pointer-events-none opacity-0">
        <span className="sr-only">Notifications (F8)</span>
      </div>
    </div>
  );
}
