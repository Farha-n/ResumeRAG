import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { FileText, Clock, CheckCircle, XCircle, Eye, MessageSquare, User, Building, MapPin, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: ''
  });
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    total: 0,
    nextOffset: null
  });

  useEffect(() => {
    fetchApplications();
  }, [pagination.offset, filters]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...filters
      });

      const endpoint = user.role === 'user' ? '/applications/my-applications' : '/applications';
      const response = await api.get(`${endpoint}?${params}`);
      setApplications(response.data.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
        nextOffset: response.data.next_offset
      }));
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const loadMore = () => {
    if (pagination.nextOffset !== null) {
      setPagination(prev => ({ ...prev, offset: prev.nextOffset }));
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await api.patch(`/applications/${applicationId}/status`, { status: newStatus });
      toast.success(`Application ${newStatus} successfully!`);
      fetchApplications();
    } catch (error) {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'reviewing':
        return <Eye className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const canManageApplications = ['recruiter', 'admin'].includes(user.role);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user.role === 'user' ? 'My Applications' : 'Job Applications'}
            </h1>
            <p className="text-gray-600">
              {user.role === 'user' 
                ? 'Track the status of your job applications'
                : 'Review and manage job applications'
              }
            </p>
          </div>
          {user.role === 'user' && (
            <Link to="/jobs" className="btn-primary">
              Browse Jobs
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      {canManageApplications && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="border border-gray-200 rounded-lg p-6 hover:border-primary-300 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {application.job_title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Building className="h-4 w-4 mr-2" />
                        {application.company}
                      </div>
                      {application.location && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {application.location}
                        </div>
                      )}
                      {application.salary_range && (
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="h-4 w-4 mr-2" />
                          {application.salary_range}
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        {user.role === 'user' ? 'Applied' : application.applicant_name}
                      </div>
                    </div>
                    
                    {application.cover_letter && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Cover Letter:</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {application.cover_letter}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Applied: {new Date(application.applied_at).toLocaleDateString()}</span>
                      {application.updated_at && application.updated_at !== application.applied_at && (
                        <span>Updated: {new Date(application.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Link
                      to={`/applications/${application.id}`}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </Link>
                    
                    {canManageApplications && (
                      <div className="flex space-x-2">
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'reviewing')}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'accepted')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {application.status === 'reviewing' && (
                          <>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'accepted')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Pagination */}
            {pagination.nextOffset !== null && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  className="btn-secondary"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600">
              {user.role === 'user' 
                ? 'You haven\'t applied to any jobs yet.'
                : 'No applications match your current filters.'
              }
            </p>
            {user.role === 'user' && (
              <Link
                to="/jobs"
                className="inline-flex items-center mt-4 btn-primary"
              >
                Browse Jobs
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {applications.filter(app => app.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-800">Pending</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {applications.filter(app => app.status === 'reviewing').length}
            </div>
            <div className="text-sm text-blue-800">Reviewing</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(app => app.status === 'accepted').length}
            </div>
            <div className="text-sm text-green-800">Accepted</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {applications.filter(app => app.status === 'rejected').length}
            </div>
            <div className="text-sm text-red-800">Rejected</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Applications;


