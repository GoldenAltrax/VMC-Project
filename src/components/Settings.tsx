import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { User, Lock, Users, Building2, Info, Plus, Edit, Trash2, X, Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../hooks/useClients';
import type { User as UserType, CreateUserInput, Client, CreateClientInput, UpdateClientInput } from '../types';

type SettingsTab = 'profile' | 'users' | 'clients' | 'about';

export function Settings() {
  const { user, isAdmin, token } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    ...(isAdmin ? [{ id: 'users' as const, label: 'Users', icon: Users }] : []),
    { id: 'clients' as const, label: 'Clients', icon: Building2 },
    { id: 'about' as const, label: 'About', icon: Info },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">System Settings</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'users' && isAdmin && <UserManagement />}
        {activeTab === 'clients' && <ClientManagement />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, token } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      await invoke('change_password', { token, oldPassword, newPassword });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center">
        <User size={20} className="mr-2" />
        Profile Settings
      </h3>

      {/* User Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700/50 rounded-lg">
        <div>
          <p className="text-sm text-gray-400">Username</p>
          <p className="font-medium">{user?.username}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Full Name</p>
          <p className="font-medium">{user?.full_name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Email</p>
          <p className="font-medium">{user?.email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Role</p>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            user?.role === 'Admin' ? 'bg-blue-500/20 text-blue-400' :
            user?.role === 'Operator' ? 'bg-green-500/20 text-green-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Change Password */}
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-md font-medium flex items-center mb-4">
          <Lock size={18} className="mr-2" />
          Change Password
        </h4>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 flex items-center">
            <AlertCircle size={18} className="mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 flex items-center">
            <Check size={18} className="mr-2" />
            Password changed successfully
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-10 text-white"
                required
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-10 text-white"
                required
                minLength={6}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
              disabled={saving}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg flex items-center"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

function UserManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await invoke<UserType[]>('get_users', { token });
      setUsers(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (input: CreateUserInput) => {
    try {
      await invoke('create_user', { token, input });
      await fetchUsers();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateUser = async (id: number, input: { email?: string; full_name?: string; role?: string; is_active?: boolean }) => {
    try {
      await invoke('update_user', { token, id, input });
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await invoke('delete_user', { token, id });
      await fetchUsers();
      setDeleteConfirm(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Users size={20} className="mr-2" />
          User Management
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
        >
          <Plus size={18} className="mr-2" />
          Add User
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700">
              <th className="text-left p-3 rounded-tl-lg">Username</th>
              <th className="text-left p-3">Full Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                <td className="p-3 font-medium">{user.username}</td>
                <td className="p-3">{user.full_name || '-'}</td>
                <td className="p-3">{user.email || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'Admin' ? 'bg-blue-500/20 text-blue-400' :
                    user.role === 'Operator' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1 text-gray-400 hover:text-blue-400"
                      title="Edit user"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(user.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserFormModal
          title="Create User"
          onSave={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserFormModal
          title="Edit User"
          user={editingUser}
          onSave={(input) => handleUpdateUser(editingUser.id, input)}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserFormModalProps {
  title: string;
  user?: UserType;
  onSave: (input: any) => Promise<void>;
  onClose: () => void;
}

function UserFormModal({ title, user, onSave, onClose }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'Viewer',
    is_active: user?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (user) {
        // Update - don't include username/password
        await onSave({
          email: formData.email || undefined,
          full_name: formData.full_name || undefined,
          role: formData.role,
          is_active: formData.is_active,
        });
      } else {
        // Create
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await onSave({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          full_name: formData.full_name || undefined,
          role: formData.role,
        });
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                  minLength={6}
                  disabled={saving}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            >
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {user && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2 rounded bg-gray-700 border-gray-600 text-blue-500"
                disabled={saving}
              />
              <label htmlFor="is_active" className="text-sm">Active</label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientManagement() {
  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient, clearError } = useClients();
  const { canEdit, isAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (id: number) => {
    try {
      await deleteClient(id);
      setDeleteConfirm(null);
    } catch {
      // Error handled in hook
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading clients...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Building2 size={20} className="mr-2" />
          Client Management
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Add Client
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{client.name}</h4>
              {canEdit && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="p-1 text-gray-400 hover:text-blue-400"
                  >
                    <Edit size={16} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirm(client.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {client.contact_email && (
              <p className="text-sm text-gray-400">{client.contact_email}</p>
            )}
            {client.contact_phone && (
              <p className="text-sm text-gray-400">{client.contact_phone}</p>
            )}
            {client.address && (
              <p className="text-sm text-gray-500 mt-1">{client.address}</p>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <p className="text-gray-400 col-span-2 text-center py-8">No clients found</p>
        )}
      </div>

      {/* Create/Edit Client Modal */}
      {(showCreateModal || editingClient) && (
        <ClientFormModal
          client={editingClient}
          onSave={async (input) => {
            if (editingClient) {
              await updateClient(editingClient.id, input as UpdateClientInput);
            } else {
              await createClient(input as CreateClientInput);
            }
            setShowCreateModal(false);
            setEditingClient(null);
          }}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClient(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this client? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ClientFormModalProps {
  client?: Client | null;
  onSave: (input: CreateClientInput | UpdateClientInput) => Promise<void>;
  onClose: () => void;
}

function ClientFormModal({ client, onSave, onClose }: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    contact_email: client?.contact_email || '',
    contact_phone: client?.contact_phone || '',
    address: client?.address || '',
    notes: client?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: formData.name,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{client ? 'Edit Client' : 'Add Client'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {client ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center">
        <Info size={20} className="mr-2" />
        About VMC Planner
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-gray-700/50 rounded-lg">
          <h4 className="font-medium mb-2">VMC Planner System</h4>
          <p className="text-sm text-gray-400">
            A comprehensive machine scheduling and project management system for
            Vertical Machining Center operations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-400">Version</p>
            <p className="font-medium">1.0.0</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-400">Build</p>
            <p className="font-medium">Tauri 2.0 + React 18</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-400">Database</p>
            <p className="font-medium">SQLite 3</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-400">Last Updated</p>
            <p className="font-medium">{new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="p-4 bg-gray-700/50 rounded-lg">
          <h4 className="font-medium mb-2">Features</h4>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Machine management with status tracking</li>
            <li>Weekly planner with load scheduling</li>
            <li>Project and client management</li>
            <li>Role-based access control</li>
            <li>Dashboard with real-time statistics</li>
            <li>Export to Excel and PDF</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
