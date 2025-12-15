import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Search, User, LogOut, ChevronDown, X, Check, AlertCircle, Info, AlertTriangle, Clock, Factory, FolderKanban, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { useMachines } from '../hooks/useMachines';
import { useProjects } from '../hooks/useProjects';
import type { AlertWithDetails, Machine, ProjectWithDetails } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

interface SearchResult {
  type: 'machine' | 'project';
  id: number;
  title: string;
  subtitle: string;
  status: string;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, animatedLogout, isAdmin, isOperator } = useAuth();
  const { alerts, unreadCount, fetchUnreadCount, fetchAlerts, markAsRead, markAllAsRead } = useAlerts();
  const { machines, fetchMachines } = useMachines();
  const { projects, fetchProjects } = useProjects();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchUnreadCount();
    fetchMachines();
    fetchProjects();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchMachines, fetchProjects]);

  // Fetch full alerts when notifications panel opens
  useEffect(() => {
    if (showNotifications) {
      fetchAlerts();
    }
  }, [showNotifications, fetchAlerts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search functionality
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search machines
    machines.forEach(machine => {
      if (
        machine.name.toLowerCase().includes(lowerQuery) ||
        machine.model.toLowerCase().includes(lowerQuery) ||
        (machine.location && machine.location.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          type: 'machine',
          id: machine.id,
          title: machine.name,
          subtitle: machine.model,
          status: machine.status,
        });
      }
    });

    // Search projects
    projects.forEach(project => {
      if (
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.client_name && project.client_name.toLowerCase().includes(lowerQuery)) ||
        (project.description && project.description.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          type: 'project',
          id: project.id,
          title: project.name,
          subtitle: project.client_name || 'No client',
          status: project.status,
        });
      }
    });

    setSearchResults(results.slice(0, 8)); // Limit to 8 results
    setShowSearchResults(results.length > 0);
  }, [machines, projects]);

  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');

    if (setActiveTab) {
      if (result.type === 'machine') {
        setActiveTab('machines');
      } else if (result.type === 'project') {
        setActiveTab('projects');
      }
    }
  };

  const handleNotificationClick = async (alert: AlertWithDetails) => {
    if (!alert.is_read) {
      await markAsRead(alert.id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard';
      case 'projects':
        return 'Projects';
      case 'machines':
        return 'Machine Management';
      case 'planner':
        return 'Weekly Planner';
      case 'settings':
        return 'System Settings';
      case 'clients':
        return 'Client Management';
      default:
        return 'Dashboard';
    }
  };

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-blue-500';
    if (isOperator) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await animatedLogout();
  };

  const formatAlertTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getAlertIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'high':
        return <AlertTriangle className="text-orange-500" size={16} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      default:
        return <Info className="text-blue-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'idle':
        return 'text-yellow-400';
      case 'maintenance':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      case 'planning':
        return 'text-yellow-400';
      case 'completed':
        return 'text-blue-400';
      case 'on-hold':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-gray-800 border-b border-gray-700">
      <h1 className="text-xl font-semibold">{getPageTitle(activeTab)}</h1>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <input
            type="text"
            placeholder="Search machines, projects..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowSearchResults(true)}
            className="bg-gray-700 text-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-2 z-50 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-600 text-left"
                >
                  <div className="mr-3">
                    {result.type === 'machine' ? (
                      <Factory size={18} className="text-blue-400" />
                    ) : (
                      <FolderKanban size={18} className="text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                  </div>
                  <span className={`text-xs ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full mt-2 w-full bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-4 z-50">
              <p className="text-center text-gray-400 text-sm">No results found</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-400 hover:text-white transition-colors p-2"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 rounded-full w-5 h-5 text-xs flex items-center justify-center text-white font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600">
                <h3 className="font-medium text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                  >
                    <Check size={14} className="mr-1" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell size={32} className="mx-auto text-gray-500 mb-2" />
                    <p className="text-gray-400 text-sm">No notifications</p>
                  </div>
                ) : (
                  alerts.slice(0, 10).map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => handleNotificationClick(alert)}
                      className={`px-4 py-3 border-b border-gray-600 last:border-0 hover:bg-gray-600 cursor-pointer ${
                        !alert.is_read ? 'bg-gray-600/50' : ''
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="mr-3 mt-0.5">
                          {getAlertIcon(alert.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${!alert.is_read ? 'text-white' : 'text-gray-300'}`}>
                              {alert.title}
                            </p>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatAlertTime(alert.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{alert.message}</p>
                          {alert.machine_name && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <Factory size={12} className="mr-1" />
                              {alert.machine_name}
                            </p>
                          )}
                        </div>
                        {!alert.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {alerts.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-600">
                  <p className="text-xs text-gray-500 text-center">
                    Showing {Math.min(10, alerts.length)} of {alerts.length} notifications
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            <div className="bg-gray-700 rounded-full p-1.5">
              <User size={20} className="text-gray-300" />
            </div>
            <div className="text-left">
              <span className="text-sm font-medium block">
                {user?.full_name || user?.username || 'User'}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor()} text-white`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-600">
                <p className="text-sm font-medium text-white">{user?.full_name || user?.username}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
