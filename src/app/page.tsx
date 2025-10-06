'use client';
import { useState, useRef } from 'react';

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const models = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)', description: 'Fast and accurate' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Reliable performance' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Enhanced reasoning' },
  ];

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'REAL NEWS': return 'bg-green-100 text-green-900 border-green-300';
      case 'FAKE NEWS': return 'bg-red-100 text-red-900 border-red-300';
      case 'POTENTIALLY MISLEADING': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default: return 'bg-gray-100 text-gray-900 border-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-700 font-semibold';
    if (confidence >= 60) return 'text-yellow-700 font-semibold';
    return 'text-red-700 font-semibold';
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: selectedModel }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze text');
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,#0f172a_0%,#1e3a8a_40%,#111827_100%)] flex flex-col items-center justify-start pt-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1
          className="typewriter text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight"
          aria-label="TruthLens - AI-Powered Fake News Detection"
        >
          🤖 TruthLens - AI-Powered Fake News Detection
        </h1>

        <p className="subtitle text-lg md:text-xl text-white max-w-2xl mx-auto opacity-0">
          Uncover the truth with advanced AI-powered fact-checking and misinformation detection
        </p>
      </div>

      {/* Chat Input Section */}
      <div className="w-full max-w-3xl mb-12 text-6xl">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleInput}
          placeholder="What do you want to know?"
          className="w-full min-h-[80px] p-6 text-2xl border border-gray-200 rounded-2xl shadow-lg focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 bg-white transition-all duration-300 resize-none placeholder-gray-400"
        />
        <div className="text-right text-sm text-white mt-2">
          {text.length} characters
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-8 mb-12">
        {/* Model Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Select AI Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 bg-white transition-all duration-300"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} - {model.description}
              </option>
            ))}
          </select>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleVerify}
          disabled={isLoading || !text.trim()}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
            isLoading || !text.trim()
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white hover:from-indigo-700 hover:to-blue-600 transform hover:scale-[1.01] shadow-md hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white mr-3"></div>
              Analyzing with AI...
            </div>
          ) : (
            'Analyze for Fake News'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-3xl bg-red-50 border border-red-300 text-red-800 px-6 py-4 rounded-xl mb-8">
          <div className="flex items-center">
            <span className="text-xl mr-2">⚠️</span>
            <div><strong>Error:</strong> {error}</div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="w-full max-w-3xl space-y-8">
          {/* Main Verdict Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-6">
              <div className={`px-4 py-2 rounded-full border text-lg font-semibold ${getVerdictColor(result.verdict)}`}>
                {result.verdict}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Confidence Level</div>
                <div className={`text-2xl font-semibold ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence}%
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h3>
              <p className="text-gray-600 leading-relaxed">{result.explanation}</p>
            </div>

            {/* Confidence Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Confidence Level</span>
                <span>{result.confidence}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    result.confidence >= 80 ? 'bg-green-500' :
                    result.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Analysis Points */}
          {result.keyPoints && result.keyPoints.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">🔍 Key Analysis Points</h3>
              <ul className="space-y-3">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-indigo-500 mr-3 mt-1">•</span>
                    <span className="text-gray-600">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fact Checks */}
          {result.factChecks && result.factChecks.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">✅ Fact Verification</h3>
              <div className="space-y-4">
                {result.factChecks.map((factCheck, index) => (
                  <div key={index} className="border-l-4 border-indigo-200 pl-4 py-2">
                    <div className="font-medium text-gray-800 mb-1">Claim: {factCheck.claim}</div>
                    <div className="text-gray-600 text-sm">{factCheck.verification}</div>
                    {factCheck.source && (
                      <div className="text-xs text-indigo-600 mt-1">Source reference: {factCheck.source}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">🔗 Related Sources</h3>
              <div className="space-y-2">
                {result.sources.map((source, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <a
                      href={source.startsWith('http') ? source : `https://${source}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm break-all"
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

      {/* ---- Styles once per page ---- */}
      <style jsx>{`
        /* Keyframes */
        @keyframes typing { from { width: 0 } to { width: 100% } }
        @keyframes blink { 50% { border-color: transparent } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }

        /* H1 typewriter + caret */
        .typewriter {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 4px solid #6366f1; /* indigo-500 */
          animation:
            typing 3.2s steps(40, end) 0.3s 1 both,
            blink 1s step-end infinite 3.5s; /* caret starts blinking after typing */
        }

        /* Subtitle appears after H1 finishes typing */
        .subtitle {
          animation: fadeIn 1s ease-in forwards;
          animation-delay: 4s; /* match typewriter total duration above */
        }

        /* Bigger placeholder + typewriter animation (plays while empty) */
        .typewriter-textarea::placeholder {
          font-size: 1.25rem;            /* ~text-xl */
          opacity: 0.75;
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          border-right: 3px solid #6366f1;
          animation:
            typing 3s steps(40, end),
            blink 1s step-end infinite;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .typewriter, .subtitle, .typewriter-textarea::placeholder {
            animation: none;
            border-right: 0;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
