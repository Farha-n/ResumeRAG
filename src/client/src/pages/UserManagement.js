import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Users, Plus, Edit, Trash2, Mail, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post('/admin/users', newUser);
      toast.success('User created successfully!');
      setShowCreateForm(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      if (error.response?.data?.error?.code === 'EMAIL_EXISTS') {
        toast.error('Email already exists');
      } else {
        toast.error('Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      if (error.response?.data?.error?.code === 'CANNOT_DELETE_SELF') {
        toast.error('Cannot delete your own account');
      } else {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await api.patch(`/admin/users/${userId}`, updates);
      toast.success('User updated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      if (error.response?.data?.error?.code === 'EMAIL_EXISTS') {
        toast.error('Email already exists');
      } else {
        toast.error('Failed to update user');
      }
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">
              Manage user accounts, roles, and permissions across the system.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="input-field"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  className="input-field"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  className="input-field"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  className="input-field"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Users</h2>
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-red-100 text-red-800' :
                        u.role === 'recruiter' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const newRole = u.role === 'user' ? 'recruiter' : 
                                           u.role === 'recruiter' ? 'admin' : 'user';
                            handleUpdateUser(u.id, { role: newRole });
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Change Role"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
