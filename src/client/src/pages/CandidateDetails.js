import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { FileText, User, Calendar, Download, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const CandidateDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);

  useEffect(() => {
    fetchResumeDetails();
  }, [id]);

  const fetchResumeDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/resumes/${id}`);
      setResume(response.data);
    } catch (error) {
      console.error('Failed to fetch resume details:', error);
      if (error.response?.status === 404) {
        toast.error('Resume not found');
      } else {
        toast.error('Failed to load resume details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      await api.delete(`/resumes/${id}`);
      toast.success('Resume deleted successfully');
      // Redirect to upload page or dashboard
      window.location.href = '/upload';
    } catch (error) {
      console.error('Failed to delete resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resume Not Found</h2>
        <p className="text-gray-600 mb-4">The resume you're looking for doesn't exist or you don't have access to it.</p>
        <Link
          to="/upload"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Upload Resume
        </Link>
      </div>
    );
  }

  const canDelete = user.role === 'admin' || (user.role === 'user' && resume.uploader === user.name);
  const isPIIRedacted = user.role !== 'recruiter' && user.role !== 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Resume Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">{resume.filename}</h1>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-600 mb-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {resume.uploader}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
              </div>
            </div>
            
            {isPIIRedacted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <EyeOff className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    Personal information has been redacted for privacy. Only recruiters can view full details.
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
            <Link
              to="/search"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search Similar
            </Link>
          </div>
        </div>
      </div>

      {/* Resume Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Resume Content</h2>
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
          >
            {showFullContent ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show Full Content
              </>
            )}
          </button>
        </div>
        
        <div className="prose max-w-none">
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {showFullContent ? resume.content : resume.content.substring(0, 1000) + '...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Parsed Data */}
      {resume.parsedData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Parsed Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">File Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Word Count:</span>
                  <span className="font-medium">{resume.parsedData.wordCount || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parsed At:</span>
                  <span className="font-medium">
                    {resume.parsedData.extractedAt ? 
                      new Date(resume.parsedData.extractedAt).toLocaleString() : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Content Preview</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  {resume.parsedData.content || 'No preview available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embeddings Info */}
      {resume.embeddings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Index</h2>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-blue-800">Indexed for Search</span>
            </div>
            <p className="text-sm text-blue-700">
              This resume has been processed and indexed for semantic search. 
              It can be found through the search functionality.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Link
          to="/upload"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Uploads
        </Link>
        
        <div className="flex space-x-2">
          <Link
            to="/search"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search Similar
          </Link>
          <Link
            to="/jobs"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Find Jobs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetails;
