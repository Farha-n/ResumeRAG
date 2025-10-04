import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../services/api';
import { Upload as UploadIcon, FileText, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const results = [];

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('resume', file);

        const response = await api.post('/resumes', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        results.push({
          file: file,
          success: true,
          data: response.data,
        });
      } catch (error) {
        results.push({
          file: file,
          success: false,
          error: error.response?.data?.error?.message || 'Upload failed',
        });
      }
    }

    setUploadedFiles(prev => [...prev, ...results]);
    setUploading(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully!`);
    }
    if (results.some(r => !r.success)) {
      toast.error('Some files failed to upload');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Resumes</h1>
        <p className="text-gray-600">
          Upload PDF, DOCX, DOC, or TXT files to add resumes to the system.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg text-primary-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, DOCX, DOC, and TXT files (max 10MB each)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
            <span className="text-gray-600">Processing files...</span>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Results</h2>
          <div className="space-y-3">
            {uploadedFiles.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  result.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{result.file.name}</p>
                    <p className="text-sm text-gray-600">
                      {result.success
                        ? `${result.data.wordCount} words processed`
                        : result.error}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Upload Guidelines</h3>
        <ul className="text-blue-800 space-y-2">
          <li>• Supported formats: PDF, DOCX, DOC, TXT</li>
          <li>• Maximum file size: 10MB per file</li>
          <li>• Files are automatically parsed and indexed for search</li>
          <li>• PII (Personal Identifiable Information) is redacted for non-recruiters</li>
          <li>• You can upload multiple files at once</li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;
