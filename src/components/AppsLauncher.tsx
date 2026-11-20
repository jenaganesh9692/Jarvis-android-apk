import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  Trash2,
  Info,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Globe,
  Youtube,
  Camera,
  Settings,
  Compass,
  Phone,
  CreditCard,
  Clock,
  Send,
  Music,
  Folder,
  Mail,
  Image as ImageIcon,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import {
  AndroidAppItem,
  loadAllInstalledApps,
  launchAndroidApp,
  openAppAndroidSettings,
  saveCustomApp,
  removeCustomApp,
} from '../services/appLauncherService';

interface AppsLauncherProps {
  onSpeak?: (msg: string) => void;
  onOpenWhatsAppModal: () => void;
  onOpenQRModal: () => void;
  onOpenCameraModal: () => void;
}

export const AppsLauncher: React.FC<AppsLauncherProps> = ({
  onSpeak,
  onOpenWhatsAppModal,
  onOpenQRModal,
  onOpenCameraModal,
}) => {
  const [apps, setApps] = useState<AndroidAppItem[]>(loadAllInstalledApps);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'alpha' | 'category'>('alpha');
  const [lastRefreshed, setLastRefreshed] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Custom App Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPackage, setCustomPackage] = useState('');
  const [customScheme, setCustomScheme] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // Selected App Details Sheet
  const [activeAppDetails, setActiveAppDetails] = useState<AndroidAppItem | null>(null);

  // Technical notice modal state
  const [showTechNotice, setShowTechNotice] = useState(false);

  const categories = ['All', 'System', 'Social', 'Google', 'Media', 'Tools', 'Navigation', 'Finance'];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setApps(loadAllInstalledApps());
      setLastRefreshed(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setIsRefreshing(false);
      setActionStatus('App list refreshed successfully.');
      if (onSpeak) onSpeak('Installed apps list refresh ho gayi hai.');
      setTimeout(() => setActionStatus(null), 3000);
    }, 400);
  };

  const handleAppClick = (app: AndroidAppItem) => {
    // Special in-app integrations
    if (app.id === 'whatsapp' && onOpenWhatsAppModal) {
      onOpenWhatsAppModal();
      return;
    }
    if (app.id === 'camera' && onOpenCameraModal) {
      onOpenCameraModal();
      return;
    }
    if (app.id === 'gpay' || app.id === 'paytm' || app.id === 'phonepe') {
      // Prompt safely before financial app launch
      onOpenQRModal();
      return;
    }

    launchAndroidApp(app, (status) => {
      setActionStatus(status.message);
      if (onSpeak) onSpeak(status.message);
      setTimeout(() => setActionStatus(null), 3500);
    });
  };

  const handleOpenAppSettings = (app: AndroidAppItem, e: React.MouseEvent) => {
    e.stopPropagation();
    openAppAndroidSettings(app.packageName, (status) => {
      setActionStatus(status.message);
      if (onSpeak) onSpeak(status.message);
      setTimeout(() => setActionStatus(null), 3500);
    });
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPackage.trim()) return;

    const newApp = saveCustomApp({
      name: customName.trim(),
      packageName: customPackage.trim(),
      scheme: customScheme.trim() || `intent:#Intent;package=${customPackage.trim()};end`,
      category: 'Tools',
      descriptionHindi: customDesc.trim() || 'Custom installed application',
      iconType: 'sparkles',
      bgGradient: 'from-slate-700 to-indigo-800',
      isSystem: false,
    });

    setApps(loadAllInstalledApps());
    setIsAddModalOpen(false);
    setCustomName('');
    setCustomPackage('');
    setCustomScheme('');
    setCustomDesc('');
    setActionStatus(`${newApp.name} successfully add ho gaya!`);
    if (onSpeak) onSpeak(`${newApp.name} app list me shamil ho gaya hai.`);
  };

  const handleDeleteCustomApp = (id: string, name: string) => {
    removeCustomApp(id);
    setApps(loadAllInstalledApps());
    setActiveAppDetails(null);
    setActionStatus(`${name} custom app list se remove ho gaya.`);
    if (onSpeak) onSpeak(`${name} remove ho gaya hai.`);
  };

  // Filter and sort apps
  const filteredApps = useMemo(() => {
    let list = apps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.descriptionHindi.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || app.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }

    return list;
  }, [apps, searchQuery, selectedCategory, sortBy]);

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-emerald-300" />;
      case 'chrome':
        return <Globe className="w-5 h-5 text-blue-300" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-300" />;
      case 'camera':
        return <Camera className="w-5 h-5 text-amber-300" />;
      case 'settings':
        return <Settings className="w-5 h-5 text-slate-300" />;
      case 'maps':
        return <Compass className="w-5 h-5 text-emerald-300" />;
      case 'phone':
        return <Phone className="w-5 h-5 text-green-300" />;
      case 'messages':
        return <Send className="w-5 h-5 text-blue-300" />;
      case 'mail':
        return <Mail className="w-5 h-5 text-rose-300" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-300" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-indigo-300" />;
      case 'calculator':
        return <SlidersHorizontal className="w-5 h-5 text-slate-300" />;
      case 'folder':
        return <Folder className="w-5 h-5 text-cyan-300" />;
      case 'creditcard':
        return <CreditCard className="w-5 h-5 text-sky-300" />;
      case 'music':
        return <Music className="w-5 h-5 text-emerald-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-cyan-300" />;
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Banner with Technical Status */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              All Installed Apps & Launcher
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Vivo Y20G
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Android package intents dwara apps launch karein aur settings manage karein.
          </p>
        </div>

        <button
          onClick={() => setShowTechNotice(!showTechNotice)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="Android Technical Requirements"
        >
          <Info className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* Truthful Technical Android Notice Banner */}
      {showTechNotice && (
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-xs text-slate-300 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Android 11+ Package Visibility Policy:
            </span>
            <button
              onClick={() => setShowTechNotice(false)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong>Browser Sandbox vs Native Android APK:</strong> Standard web browsers security ke tehat kisi bhi website ko phone ke saare private apps bina user permission scan karne ki ijaazat nahi dete. J. A. R. V. I. S. real Android deep-links aur <code className="text-cyan-300">intent://</code> protocols use karta hai. Jab aap J. A. R. V. I. S. ko APK ke roop me package karenge, to <code className="text-cyan-300">&lt;queries&gt;</code> aur <code className="text-cyan-300">QUERY_ALL_PACKAGES</code> permission se Vivo Y20G ke sabhi apps dynamically sync ho jayenge.
          </p>
        </div>
      )}

      {/* Search Bar & Refresh Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search installed apps (e.g. WhatsApp, Chrome, Settings)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          title="Refresh App List"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-cyan-600/20 active:scale-95 transition"
          title="Add Custom App"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add App</span>
        </button>
      </div>

      {/* Categories & Sorting Controls */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <div className="flex gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
          <button
            onClick={() => setSortBy(sortBy === 'alpha' ? 'category' : 'alpha')}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:text-white transition flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span>Sort: {sortBy === 'alpha' ? 'A-Z' : 'Category'}</span>
          </button>
        </div>
      </div>

      {/* Action Status Toast */}
      {actionStatus && (
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Stats & Last Refresh info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Showing {filteredApps.length} of {apps.length} applications</span>
        <span className="text-[10px] text-slate-500">Last synced: {lastRefreshed}</span>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredApps.map((app, idx) => (
          <div
            key={`${app.id}-${idx}`}
            onClick={() => handleAppClick(app)}
            className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800/90 hover:border-cyan-500/40 text-left transition-all active:scale-[0.98] group flex items-center justify-between cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${app.bgGradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition shrink-0`}
              >
                {renderIcon(app.iconType)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition truncate">
                    {app.name}
                  </span>
                  {app.isSystem && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                      System
                    </span>
                  )}
                  {app.isCustom && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 shrink-0">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {app.descriptionHindi}
                </p>
                <p className="text-[9px] font-mono text-slate-500 truncate">
                  {app.packageName}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => handleOpenAppSettings(app, e)}
                title="Open App Android Settings"
                className="p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleAppClick(app)}
                title="Launch App"
                className="p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300">Koi app match nahi hua.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-cyan-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Add Custom App Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add Phone App Shortcut
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Apne Vivo Y20G phone ke kisi bhi installed app ka naam aur package id daal kar shamil karein.
            </p>

            <form onSubmit={handleAddCustomApp} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">App Name:</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. VLC Player, JioCinema, PUBG"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Package Name (Android ID):</label>
                <input
                  type="text"
                  required
                  value={customPackage}
                  onChange={(e) => setCustomPackage(e.target.value)}
                  placeholder="e.g. org.videolan.vlc"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Custom URI Scheme (Optional):</label>
                <input
                  type="text"
                  value={customScheme}
                  onChange={(e) => setCustomScheme(e.target.value)}
                  placeholder="e.g. vlc:// or intent:#Intent..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Short Description:</label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. Video player"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  Save App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
