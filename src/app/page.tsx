

'use client';
import { useState } from 'react';

interface AnalysisResult {
  verdict: 'REAL NEWS' | 'FAKE NEWS' | 'POTENTIALLY MISLEADING' | 'INSUFFICIENT DATA';
  confidence: number;
  explanation: string;
  keyPoints: string[];
  sources: string[];
  factChecks: Array<{
    claim: string;
    verification: string;
    source?: string;
  }>;
}

export default function Home() {
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const models = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)', description: 'Fast and accurate' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Reliable performance' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Enhanced reasoning' },
  ];

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'REAL NEWS': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAKE NEWS': return 'bg-red-100 text-red-800 border-red-200';
      case 'POTENTIALLY MISLEADING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 font-bold';
    if (confidence >= 60) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const handleVerify = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/detect-fake-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, model: selectedModel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze text');
      }

      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Fake News Detection
          </h1>
          <p className="text-xl text-gray-600">
            Advanced AI-powered fact-checking and misinformation detection
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              News Text to Analyze
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the news article, social media post, or any text you want to verify for authenticity..."
              className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {text.length} characters
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleVerify}
            disabled={isLoading || !text.trim()}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
              isLoading || !text.trim()
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transform hover:scale-[1.02] shadow-lg'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Analyzing with AI...
              </div>
            ) : (
              'Analyze for Fake News'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Main Verdict Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className={`px-4 py-2 rounded-full border text-lg font-bold ${getVerdictColor(result.verdict)}`}>
                  {result.verdict}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Confidence Level</div>
                  <div className={`text-3xl font-bold ${getConfidenceColor(result.confidence)}`}>
                    {result.confidence}%
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h3>
                <p className="text-gray-700 leading-relaxed">{result.explanation}</p>
              </div>

              {/* Confidence Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Confidence Level</span>
                  <span>{result.confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      result.confidence >= 80 ? 'bg-green-500' :
                      result.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Key Analysis Points */}
            {result.keyPoints && result.keyPoints.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  🔍 Key Analysis Points
                </h3>
                <ul className="space-y-3">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-3 mt-1">•</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fact Checks */}
            {result.factChecks && result.factChecks.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  ✅ Fact Verification
                </h3>
                <div className="space-y-4">
                  {result.factChecks.map((factCheck, index) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="font-medium text-gray-800 mb-1">
                        Claim: {factCheck.claim}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {factCheck.verification}
                      </div>
                      {factCheck.source && (
                        <div className="text-xs text-blue-600 mt-1">
                          Source reference: {factCheck.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  🔗 Related Sources
                </h3>
                <div className="space-y-2">
                  {result.sources.map((source, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <a 
                        href={source.startsWith('http') ? source : `https://${source}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                      >
                        {source}
                      </a>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * These sources were found during automated fact-checking. Please verify independently.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
