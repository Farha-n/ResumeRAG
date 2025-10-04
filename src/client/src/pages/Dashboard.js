import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Upload, Search, Briefcase, FileText, TrendingUp, Users, Settings, BarChart3, Shield, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalJobs: 0,
    totalMatches: 0,
    totalUsers: 0,
    recentUploads: [],
    recentJobs: [],
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch resumes
      const resumesResponse = await api.get('/resumes?limit=5');
      const resumes = resumesResponse.data.items || [];
      
      // Fetch jobs
      const jobsResponse = await api.get('/jobs?limit=5');
      const jobs = jobsResponse.data.items || [];
      
      // Fetch system health
      const healthResponse = await api.get('/health');
      const systemHealth = healthResponse.data.status;
      
      setStats({
        totalResumes: resumesResponse.data.total || 0,
        totalJobs: jobsResponse.data.total || 0,
        totalMatches: 0, // This would need a separate endpoint
        totalUsers: 3, // Based on seed data
        recentUploads: resumes,
        recentJobs: jobs,
        systemHealth: systemHealth
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your resume and job matching system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Resumes"
          value={stats.totalResumes}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Job Postings"
          value={stats.totalJobs}
          icon={Briefcase}
          color="green"
        />
        <StatCard
          title="Total Matches"
          value={stats.totalMatches}
          icon={TrendingUp}
          color="purple"
        />
        {user.role === 'admin' ? (
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="orange"
          />
        ) : (
          <StatCard
            title="System Health"
            value={stats.systemHealth}
            icon={Shield}
            color="green"
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/upload"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Upload Resume</h3>
              <p className="text-sm text-gray-600">Add a new resume to the system</p>
            </div>
          </Link>
          
          <Link
            to="/search"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Search className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Search Resumes</h3>
              <p className="text-sm text-gray-600">Find relevant candidates</p>
            </div>
          </Link>
          
          {user.role === 'recruiter' || user.role === 'admin' ? (
            <Link
              to="/jobs"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <Briefcase className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Manage Jobs</h3>
                <p className="text-sm text-gray-600">Create and manage job postings</p>
              </div>
            </Link>
          ) : (
            <Link
              to="/jobs"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <Briefcase className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Browse Jobs</h3>
                <p className="text-sm text-gray-600">View available positions</p>
              </div>
            </Link>
          )}
        </div>
        
        {/* Admin-only actions */}
        {user.role === 'admin' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-4 border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors">
                <Settings className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">System Settings</h3>
                  <p className="text-sm text-gray-600">Manage system configuration</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 border border-purple-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View system analytics and reports</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Uploads</h2>
            <Link to="/upload" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Upload New
            </Link>
          </div>
          {stats.recentUploads.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUploads.map((resume) => (
                <div key={resume.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{resume.filename}</p>
                      <p className="text-sm text-gray-600">by {resume.uploader}</p>
                    </div>
                  </div>
                  <Link
                    to={`/candidates/${resume.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No recent uploads</p>
              <Link
                to="/upload"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </Link>
            </div>
          )}
        </div>

        {/* Recent Jobs or System Status */}
        {user.role === 'recruiter' || user.role === 'admin' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Jobs</h2>
              <Link to="/jobs" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </Link>
            </div>
            {stats.recentJobs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-600">{job.company}</p>
                      </div>
                    </div>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No job postings yet</p>
                <Link
                  to="/jobs"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Create Job
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Health</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {stats.systemHealth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Search Index</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Updated
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
