import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Search as SearchIcon, FileText, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [k, setK] = useState(5);

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      const response = await api.get('/ask/history?limit=10');
      setSearchHistory(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/ask', { query, k });
      setResults(response.data.results || []);
      fetchSearchHistory(); // Refresh history
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (historyQuery) => {
    setQuery(historyQuery);
  };

  const getRelevanceColor = (relevance) => {
    switch (relevance) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Resumes</h1>
        <p className="text-gray-600">
          Ask questions about uploaded resumes and get relevant matches with evidence.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about resumes (e.g., 'Find candidates with Python experience')"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="k" className="text-sm text-gray-600">Results:</label>
              <select
                id="k"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Search Results</h2>
            <span className="text-sm text-gray-600">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </span>
          </div>
          
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900">{result.filename}</h3>
                      <p className="text-sm text-gray-600">by {result.uploader}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(result.relevance)}`}>
                      {result.relevance} relevance
                    </span>
                    <span className="text-sm text-gray-600">
                      {Math.round(result.similarity_score * 100)}% match
                    </span>
                  </div>
                </div>
                
                {result.snippets && result.snippets.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Relevant Snippets:</h4>
                    <div className="space-y-2">
                      {result.snippets.map((snippet, snippetIndex) => (
                        <p key={snippetIndex} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {snippet}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Link
                    to={`/candidates/${result.resume_id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Full Resume →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Searches</h2>
          <div className="space-y-2">
            {searchHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => handleHistoryClick(item.query)}
              >
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{item.query}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(item.searchedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Search Tips</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• Use specific keywords related to skills, experience, or qualifications</li>
          <li>• Try different phrasings if you don't get good results</li>
          <li>• The system uses semantic search to find relevant content</li>
          <li>• Results are ranked by relevance and similarity score</li>
          <li>• Click on any result to view the full resume</li>
        </ul>
      </div>
    </div>
  );
};

export default Search;
