import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

async function searchWeb(query: string, maxResults: number = 3): Promise<string[]> {
  try {
    // Using DuckDuckGo search (no API key required)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const sources: string[] = [];
    
    $('.result__url').each((i, element) => {
      if (i < maxResults) {
        const url = $(element).text().trim();
        if (url && !sources.includes(url)) {
          sources.push(url);
        }
      }
    });

    return sources;
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

async function extractKeyClaimsAndFactCheck(text: string, llm: ChatGoogleGenerativeAI): Promise<Array<{claim: string, verification: string, source?: string}>> {
  const claimsPrompt = `
  Extract the key factual claims from this text that can be verified:
  
  Text: "${text}"
  
  Return only the main verifiable claims, one per line, in this format:
  CLAIM: [specific factual claim]
  
  Focus on:
  - Specific facts, numbers, dates, events
  - Claims about people, companies, organizations
  - Statistical information
  - Concrete statements that can be fact-checked
  `;

  try {
    const claimsResult = await llm.invoke([{ role: "user", content: claimsPrompt }]);
    const claimsText = claimsResult.content as string;
    
    const claims = claimsText
      .split('\n')
      .filter(line => line.includes('CLAIM:'))
      .map(line => line.replace('CLAIM:', '').trim())
      .slice(0, 3); // Limit to 3 key claims

    const factChecks = [];
    
    for (const claim of claims) {
      // Search for each claim
      const sources = await searchWeb(claim, 2);
      
      // Verify the claim
      const verificationPrompt = `
      Verify this specific claim based on general knowledge and logic:
      
      CLAIM: "${claim}"
      
      Respond with:
      STATUS: [VERIFIED/DISPUTED/UNVERIFIABLE]
      REASONING: [Brief explanation]
      `;
      
      const verification = await llm.invoke([{ role: "user", content: verificationPrompt }]);
      
      factChecks.push({
        claim,
        verification: verification.content as string,
        source: sources[0] || undefined
      });
    }
    
    return factChecks;
  } catch (error) {
    console.error('Fact checking error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, model = 'gemini-2.0-flash' } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not found in environment variables' },
        { status: 500 }
      );
    }

    const llm = new ChatGoogleGenerativeAI({
      model: model,
      temperature: 0.1,
      apiKey: apiKey,
    });

    // Get fact checks and sources
    const factChecks = await extractKeyClaimsAndFactCheck(text, llm);
    const searchSources = await searchWeb(`fact check ${text.substring(0, 100)}`, 3);

    const enhancedPrompt = `
    You are an expert fact-checker and misinformation analyst. Analyze this text with EXTREME SCRUTINY and logical reasoning.

    IMPORTANT: Be very conservative with confidence scores. Only give high confidence (80%+) when you have strong evidence.

    Text to analyze: "${text}"

    Additional context from fact-checking:
    ${factChecks.map(fc => `- ${fc.claim}: ${fc.verification}`).join('\n')}

    Analyze considering:

    1. LOGICAL CONSISTENCY:
       - Does this make logical sense?
       - Are there obvious contradictions?
       - Does it align with how the world actually works?

    2. VERIFIABILITY:
       - Can the main claims be verified?
       - Are there specific details that can be fact-checked?
       - Does it contain vague or unverifiable statements?

    3. RED FLAGS:
       - Sensationalized language
       - Emotional manipulation
       - Missing context or sources
       - Extraordinary claims without evidence
       - Biased or leading language

    4. PLAUSIBILITY:
       - Is this something that could realistically happen?
       - Does it align with known facts about the entities mentioned?
       - Are the claims proportional and reasonable?

    CONFIDENCE SCORING GUIDE:
    - 100%: Absolutely certain, indisputable evidence
    - 90-95%: Overwhelming evidence, clearly verifiable
    - 80-89%: Strong evidence, highly likely
    - 70-79%: Good evidence, probably correct
    - 60-69%: Some evidence, leaning toward assessment
    - 50-59%: Insufficient evidence, uncertain
    - Below 50%: Evidence contradicts the claim

    Respond in this EXACT format:
    
    VERDICT: [REAL NEWS/FAKE NEWS/POTENTIALLY MISLEADING/INSUFFICIENT DATA]
    CONFIDENCE: [number between 0-100]%
    
    EXPLANATION:
    [2-3 sentences explaining your reasoning and why you assigned this confidence level]
    
    KEY ANALYSIS POINTS:
    • [Point 1 about credibility/logic]
    • [Point 2 about verifiability]
    • [Point 3 about red flags or supporting evidence]
    • [Point 4 about overall plausibility]
    
    FACT CHECK SUMMARY:
    ${factChecks.map(fc => `• ${fc.claim.substring(0, 100)}... - ${fc.verification.includes('VERIFIED') ? '✓ Verified' : fc.verification.includes('DISPUTED') ? '✗ Disputed' : '? Unverifiable'}`).join('\n')}
    `;

    const result = await llm.invoke([
      { role: "user", content: enhancedPrompt }
    ]);

    const analysisText = result.content as string;
    
    // Parse the structured response
    const verdictMatch = analysisText.match(/VERDICT:\s*(.+)/);
    const confidenceMatch = analysisText.match(/CONFIDENCE:\s*(\d+)%/);
    const explanationMatch = analysisText.match(/EXPLANATION:\s*([\s\S]*?)(?=KEY ANALYSIS POINTS:|$)/);
    const keyPointsMatch = analysisText.match(/KEY ANALYSIS POINTS:\s*([\s\S]*?)(?=FACT CHECK SUMMARY:|$)/);
    
    const structuredResult: AnalysisResult = {
      verdict: (verdictMatch?.[1]?.trim() as AnalysisResult['verdict']) || 'INSUFFICIENT DATA',
      confidence: parseInt(confidenceMatch?.[1] || '50'),
      explanation: explanationMatch?.[1]?.trim() || 'Analysis completed.',
      keyPoints: keyPointsMatch?.[1]?.split('•').filter(p => p.trim()).map(p => p.trim()) || [],
      sources: searchSources,
      factChecks: factChecks
    };

    return NextResponse.json({
      success: true,
      analysis: structuredResult,
      rawAnalysis: analysisText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in fake news detection:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text. Please try again.' },
      { status: 500 }
    );
  }
}
