import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ArrowLeft, FileText, User, Building, MapPin, DollarSign, Clock, CheckCircle, XCircle, MessageSquare, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const ApplicationDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/applications/${id}`);
      setApplication(response.data);
      setNewStatus(response.data.status);
      setNotes(response.data.notes || '');
    } catch (error) {
      console.error('Failed to fetch application details:', error);
      if (error.response?.status === 404) {
        toast.error('Application not found');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view this application');
      } else {
        toast.error('Failed to load application details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!['recruiter', 'admin'].includes(user.role)) {
      toast.error('Only recruiters and admins can update application status');
      return;
    }

    try {
      setUpdating(true);
      await api.patch(`/applications/${id}/status`, { 
        status: newStatus, 
        notes: notes 
      });
      toast.success('Application status updated successfully!');
      fetchApplicationDetails();
    } catch (error) {
      console.error('Failed to update application status:', error);
      toast.error('Failed to update application status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'reviewing':
        return <MessageSquare className="h-5 w-5" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Application Not Found</h2>
        <p className="text-gray-600 mb-4">The application you're looking for doesn't exist or you don't have access to it.</p>
        <Link
          to="/applications"
          className="btn-primary"
        >
          Back to Applications
        </Link>
      </div>
    );
  }

  const canManageApplication = ['recruiter', 'admin'].includes(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/applications"
            className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
          <div className={`flex items-center px-3 py-1 rounded-full border ${getStatusColor(application.status)}`}>
            {getStatusIcon(application.status)}
            <span className="ml-2 capitalize font-medium">{application.status}</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{application.job_title}</h1>
        <div className="flex items-center space-x-6 text-gray-600">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            {application.company}
          </div>
          {application.location && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              {application.location}
            </div>
          )}
          {application.salary_range && (
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              {application.salary_range}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{application.job_description}</p>
            </div>
          </div>

          {/* Resume Content */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resume</h2>
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-gray-600">{application.resume_filename}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {application.resume_content}
              </pre>
            </div>
          </div>

          {/* Cover Letter */}
          {application.cover_letter && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cover Letter</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{application.cover_letter}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Applicant Information */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Applicant Information</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{application.applicant_name}</p>
                  <p className="text-sm text-gray-600">Applicant</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{application.applicant_email}</p>
                  <p className="text-sm text-gray-600">Email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Application Timeline */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Applied</p>
                  <p className="text-sm text-gray-600">
                    {new Date(application.applied_at).toLocaleDateString()} at {new Date(application.applied_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {application.updated_at && application.updated_at !== application.applied_at && (
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-600">
                      {new Date(application.updated_at).toLocaleDateString()} at {new Date(application.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Management */}
          {canManageApplication && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Application</h2>
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-field"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field"
                    placeholder="Add notes about this application..."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full btn-primary"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </form>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/jobs/${application.job_id}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Building className="h-4 w-4 mr-2" />
                View Job Details
              </Link>
              <Link
                to={`/candidates/${application.resume_id}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                View Full Resume
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;


