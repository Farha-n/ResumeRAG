import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Briefcase, MapPin, Building, DollarSign, Calendar, User, TrendingUp, FileText, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const JobDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  const [application, setApplication] = useState({
    resume_id: '',
    cover_letter: ''
  });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    if (user.role === 'user') {
      fetchUserResumes();
    }
  }, [id, user]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserResumes = async () => {
    try {
      const response = await api.get('/resumes?limit=100');
      setUserResumes(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch user resumes:', error);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!application.resume_id) {
      toast.error('Please select a resume');
      return;
    }

    try {
      setApplying(true);
      await api.post('/applications', {
        job_id: id,
        resume_id: application.resume_id,
        cover_letter: application.cover_letter
      });
      toast.success('Application submitted successfully!');
      setShowApplyForm(false);
      setApplication({ resume_id: '', cover_letter: '' });
    } catch (error) {
      console.error('Failed to submit application:', error);
      if (error.response?.data?.error?.code === 'ALREADY_APPLIED') {
        toast.error('You have already applied for this job');
      } else {
        toast.error('Failed to submit application');
      }
    } finally {
      setApplying(false);
    }
  };

  const findMatches = async () => {
    try {
      setMatching(true);
      const response = await api.post(`/jobs/${id}/match`, { top_n: 10 });
      setMatches(response.data.matches || []);
      setShowMatches(true);
      toast.success(`Found ${response.data.matches.length} potential matches`);
    } catch (error) {
      console.error('Failed to find matches:', error);
      toast.error('Failed to find matches');
    } finally {
      setMatching(false);
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'strong':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'weak':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Not Found</h2>
        <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
        <Link
          to="/jobs"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  const canMatch = ['recruiter', 'admin'].includes(user.role);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Briefcase className="h-6 w-6 text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-600 mb-4">
              {job.company && (
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  {job.company}
                </div>
              )}
              {job.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {job.location}
                </div>
              )}
              {job.salary_range && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {job.salary_range}
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Posted {new Date(job.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <User className="h-4 w-4 mr-2" />
              Posted by {job.created_by}
            </div>
          </div>
          
          <div className="flex space-x-3">
            {user.role === 'user' && (
              <button
                onClick={() => setShowApplyForm(!showApplyForm)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                {showApplyForm ? 'Cancel' : 'Apply Now'}
              </button>
            )}
            {canMatch && (
              <button
                onClick={findMatches}
                disabled={matching}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {matching ? 'Finding Matches...' : 'Find Matches'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Application Form */}
      {showApplyForm && user.role === 'user' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Apply for this Position</h2>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label htmlFor="resume_id" className="block text-sm font-medium text-gray-700 mb-1">
                Select Resume *
              </label>
              <select
                id="resume_id"
                required
                value={application.resume_id}
                onChange={(e) => setApplication({...application, resume_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Choose a resume...</option>
                {userResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.filename}
                  </option>
                ))}
              </select>
              {userResumes.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No resumes found. <Link to="/upload" className="text-primary-600 hover:text-primary-700">Upload a resume first</Link>.
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="cover_letter" className="block text-sm font-medium text-gray-700 mb-1">
                Cover Letter
              </label>
              <textarea
                id="cover_letter"
                rows={6}
                value={application.cover_letter}
                onChange={(e) => setApplication({...application, cover_letter: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Write a cover letter explaining why you're interested in this position and how your skills match the requirements..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applying || userResumes.length === 0}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job Description */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
          </div>
        </div>
      )}

      {/* Matches Section */}
      {showMatches && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Candidate Matches</h2>
            <span className="text-sm text-gray-600">
              {matches.length} potential match{matches.length !== 1 ? 'es' : ''} found
            </span>
          </div>
          
          {matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900">{match.filename}</h3>
                        <p className="text-sm text-gray-600">by {match.uploader}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(match.recommendation)}`}>
                        {match.recommendation} match
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(match.match_score * 100)}% score
                      </span>
                    </div>
                  </div>
                  
                  {match.evidence && match.evidence.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Matching Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.evidence.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {match.missing_requirements && match.missing_requirements.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Requirements:</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.missing_requirements.map((requirement, reqIndex) => (
                          <span
                            key={reqIndex}
                            className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                          >
                            {requirement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Link
                      to={`/candidates/${match.resume_id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Full Resume →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600">
                No candidates match the requirements for this job.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Link
          to="/jobs"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Jobs
        </Link>
        
        {canMatch && !showMatches && (
          <button
            onClick={findMatches}
            disabled={matching}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {matching ? 'Finding Matches...' : 'Find Candidate Matches'}
          </button>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
