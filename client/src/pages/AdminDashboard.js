import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Users, FileText, Briefcase, BarChart3, Settings, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResumes: 0,
    totalJobs: 0,
    totalMatches: 0,
    systemHealth: 'healthy',
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data including admin stats
      const [resumesResponse, jobsResponse, healthResponse, adminStatsResponse] = await Promise.all([
        api.get('/resumes?limit=100'),
        api.get('/jobs?limit=100'),
        api.get('/health'),
        api.get('/admin/stats').catch(() => ({ data: {} })) // Fallback if stats fail
      ]);
      
      setStats({
        totalUsers: adminStatsResponse.data.totalUsers || 0,
        totalResumes: adminStatsResponse.data.totalResumes || resumesResponse.data.total || 0,
        totalJobs: adminStatsResponse.data.totalJobs || jobsResponse.data.total || 0,
        totalApplications: adminStatsResponse.data.totalApplications || 0,
        systemHealth: healthResponse.data.status,
        recentActivity: [
          ...(resumesResponse.data.items || []).map(item => ({
            type: 'resume',
            action: 'uploaded',
            item: item.filename,
            user: item.uploader,
            timestamp: item.uploadedAt
          })),
          ...(jobsResponse.data.items || []).map(item => ({
            type: 'job',
            action: 'created',
            item: item.title,
            user: item.created_by,
            timestamp: item.created_at
          }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)
      });
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend = null }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );

  if (user.role !== 'admin') {
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
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-red-100">
              System overview and administrative controls for ResumeRAG
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8" />
            <span className="text-lg font-semibold">ADMIN</span>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Resumes"
          value={stats.totalResumes}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Job Postings"
          value={stats.totalJobs}
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          title="Applications"
          value={stats.totalApplications}
          icon={FileText}
          color="orange"
        />
        <StatCard
          title="System Health"
          value={stats.systemHealth}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <div className="text-lg font-semibold text-green-800">API Server</div>
            <div className="text-sm text-green-600">Running</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <div className="text-lg font-semibold text-green-800">Database</div>
            <div className="text-sm text-green-600">Connected</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <div className="text-lg font-semibold text-green-800">Search Index</div>
            <div className="text-sm text-green-600">Updated</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {activity.type === 'resume' ? (
                    <FileText className="h-5 w-5 text-blue-500 mr-3" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-green-500 mr-3" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {activity.item} {activity.action}
                    </p>
                    <p className="text-sm text-gray-600">by {activity.user}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Management</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <Settings className="h-5 w-5 text-blue-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">System Settings</p>
                <p className="text-sm text-gray-600">Configure system parameters</p>
              </div>
            </button>
            <button className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <BarChart3 className="h-5 w-5 text-purple-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Analytics & Reports</p>
                <p className="text-sm text-gray-600">View detailed analytics</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
          <div className="space-y-3">
            <Link to="/admin/users" className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
              <Users className="h-5 w-5 text-green-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-600">View and manage user accounts</p>
              </div>
            </Link>
            <button className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">System Logs</p>
                <p className="text-sm text-gray-600">View system logs and errors</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


