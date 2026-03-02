// ============================================================================
// Sample Pipeline Templates
// ============================================================================
// Pre-built pipeline configurations that users can load as starting points.
// These demonstrate various use cases and agent chain patterns.
// ============================================================================

import { Pipeline, PipelineNode, PipelineEdge } from '../models/types';
import { createDefaultAgentConfig } from '../store/pipelineStore';

// ============================================================================
// Template 1: Content Writing Pipeline
// Input → Researcher → Outline Writer → Draft Writer → Editor → Output
// ============================================================================

export const contentWriterPipeline: Pipeline = {
  id: 'template-content-writer',
  name: 'Blog Post Writer',
  description:
    'End-to-end blog post creation: research a topic, create an outline, write the draft, and polish the final version.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-topic',
      type: 'input',
      position: { x: 50, y: 300 },
      data: {
        label: 'Blog Topic',
        inputConfig: { dataType: 'text', source: 'manual', defaultValue: 'AI in Healthcare' },
      },
    },
    {
      id: 'agent-researcher',
      type: 'agent',
      position: { x: 320, y: 200 },
      data: {
        label: 'Researcher',
        agentConfig: createDefaultAgentConfig({
          name: 'Topic Researcher',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt:
            'You are an expert research analyst. Given a topic, provide a comprehensive research brief including key facts, statistics, recent developments, and different perspectives. Be thorough and cite specific data points.',
          userPromptTemplate:
            'Research the following topic thoroughly and provide a comprehensive research brief:\n\nTopic: {{input}}\n\nInclude:\n- Key facts and statistics\n- Recent developments (2024-2025)\n- Different perspectives and debates\n- Potential subtopics to cover',
          temperature: 0.3,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-outliner',
      type: 'agent',
      position: { x: 590, y: 200 },
      data: {
        label: 'Outline Writer',
        agentConfig: createDefaultAgentConfig({
          name: 'Outline Creator',
          role: 'generator',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a skilled content strategist. Given research material, create a well-structured blog post outline with engaging headings, subheadings, and key points for each section.',
          userPromptTemplate:
            'Based on this research, create a detailed blog post outline:\n\n{{input}}\n\nInclude:\n- Compelling title options (3)\n- H2 and H3 headings\n- Key points under each section\n- Suggested word count per section\n- Call-to-action ideas',
          temperature: 0.5,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'agent-writer',
      type: 'agent',
      position: { x: 860, y: 200 },
      data: {
        label: 'Draft Writer',
        agentConfig: createDefaultAgentConfig({
          name: 'Blog Writer',
          role: 'generator',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a talented blog writer known for engaging, well-researched articles. Write in a conversational yet authoritative tone. Use short paragraphs, clear transitions, and concrete examples.',
          userPromptTemplate:
            'Write a complete blog post based on this outline:\n\n{{input}}\n\nRequirements:\n- 1500-2000 words\n- Engaging introduction with a hook\n- Clear, scannable structure\n- Concrete examples and data\n- Strong conclusion with actionable takeaways\n- SEO-friendly (natural keyword usage)',
          temperature: 0.7,
          maxTokens: 4096,
        }),
      },
    },
    {
      id: 'agent-editor',
      type: 'agent',
      position: { x: 1130, y: 200 },
      data: {
        label: 'Editor',
        agentConfig: createDefaultAgentConfig({
          name: 'Content Editor',
          role: 'transformer',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a meticulous editor. Review and improve the blog post for clarity, grammar, flow, and engagement. Fix any issues while preserving the author\'s voice. Add a meta description and suggested tags.',
          userPromptTemplate:
            'Edit and polish this blog post:\n\n{{input}}\n\nFix:\n- Grammar and spelling\n- Sentence flow and transitions\n- Paragraph length (keep short)\n- Remove redundancy\n\nAdd:\n- Meta description (155 chars)\n- 5 suggested tags\n- Social media excerpt (280 chars)',
          temperature: 0.3,
          maxTokens: 4096,
        }),
      },
    },
    {
      id: 'output-article',
      type: 'output',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Final Article',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-topic', target: 'agent-researcher' },
    { id: 'e2', source: 'agent-researcher', target: 'agent-outliner' },
    { id: 'e3', source: 'agent-outliner', target: 'agent-writer' },
    { id: 'e4', source: 'agent-writer', target: 'agent-editor' },
    { id: 'e5', source: 'agent-editor', target: 'output-article' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 300000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: false,
    cacheTTL: 3600,
    errorHandling: 'stop',
  },
  tags: ['content', 'writing', 'blog', 'marketing'],
  isPublic: true,
  isTemplate: true,
  sampleInput: 'How Artificial Intelligence is Transforming Modern Healthcare: From Early Diagnosis to Personalized Treatment Plans',
};

// ============================================================================
// Template 2: Customer Support Pipeline
// Input → Classifier → [Condition] → Technical Agent / Billing Agent / General Agent → QA → Output
// ============================================================================

export const customerSupportPipeline: Pipeline = {
  id: 'template-customer-support',
  name: 'Customer Support Router',
  description:
    'Intelligent customer support pipeline that classifies incoming tickets, routes them to specialized agents, and performs quality assurance on responses.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-ticket',
      type: 'input',
      position: { x: 50, y: 300 },
      data: {
        label: 'Customer Ticket',
        inputConfig: { dataType: 'text', source: 'manual' },
      },
    },
    {
      id: 'agent-classifier',
      type: 'agent',
      position: { x: 320, y: 300 },
      data: {
        label: 'Ticket Classifier',
        agentConfig: createDefaultAgentConfig({
          name: 'Ticket Classifier',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You classify customer support tickets into categories. Respond ONLY with a JSON object: {"category": "technical|billing|general", "urgency": "low|medium|high", "sentiment": "positive|neutral|negative", "summary": "one-line summary"}',
          userPromptTemplate: 'Classify this customer support ticket:\n\n{{input}}',
          temperature: 0.1,
          maxTokens: 256,
        }),
      },
    },
    {
      id: 'condition-route',
      type: 'condition',
      position: { x: 590, y: 300 },
      data: {
        label: 'Route by Category',
        conditionConfig: {
          expression: 'input.category',
          branches: [
            { label: 'Technical', condition: 'input.category === "technical"' },
            { label: 'Billing', condition: 'input.category === "billing"' },
            { label: 'General', condition: 'input.category === "general"' },
          ],
        },
      },
    },
    {
      id: 'agent-technical',
      type: 'agent',
      position: { x: 860, y: 150 },
      data: {
        label: 'Technical Support',
        agentConfig: createDefaultAgentConfig({
          name: 'Technical Support Agent',
          role: 'generator',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a technical support specialist. Provide clear, step-by-step troubleshooting guidance. Be patient and thorough. If the issue requires escalation, indicate that clearly.',
          userPromptTemplate:
            'A customer has a technical issue. Provide a helpful response:\n\nTicket: {{input}}',
          temperature: 0.4,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'agent-billing',
      type: 'agent',
      position: { x: 860, y: 300 },
      data: {
        label: 'Billing Support',
        agentConfig: createDefaultAgentConfig({
          name: 'Billing Support Agent',
          role: 'generator',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a billing support specialist. Handle billing inquiries with professionalism. Explain charges clearly, offer resolution options, and follow company policies.',
          userPromptTemplate:
            'A customer has a billing question. Provide a helpful response:\n\nTicket: {{input}}',
          temperature: 0.3,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'agent-general',
      type: 'agent',
      position: { x: 860, y: 450 },
      data: {
        label: 'General Support',
        agentConfig: createDefaultAgentConfig({
          name: 'General Support Agent',
          role: 'generator',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a friendly customer support agent. Help customers with general inquiries. Be warm, helpful, and proactive in offering assistance.',
          userPromptTemplate:
            'A customer needs general assistance. Provide a helpful response:\n\nTicket: {{input}}',
          temperature: 0.5,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'agent-qa',
      type: 'agent',
      position: { x: 1130, y: 300 },
      data: {
        label: 'QA Review',
        agentConfig: createDefaultAgentConfig({
          name: 'Quality Assurance',
          role: 'validator',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You review customer support responses for quality. Check for: accuracy, tone, completeness, empathy, and actionable next steps. If the response passes QA, return it as-is with a "QA: PASS" header. If it needs improvement, return an improved version with "QA: REVISED" header.',
          userPromptTemplate: 'Review this customer support response for quality:\n\n{{input}}',
          temperature: 0.2,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'output-response',
      type: 'output',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Final Response',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-ticket', target: 'agent-classifier' },
    { id: 'e2', source: 'agent-classifier', target: 'condition-route' },
    { id: 'e3', source: 'condition-route', target: 'agent-technical', label: 'technical' },
    { id: 'e4', source: 'condition-route', target: 'agent-billing', label: 'billing' },
    { id: 'e5', source: 'condition-route', target: 'agent-general', label: 'general' },
    { id: 'e6', source: 'agent-technical', target: 'agent-qa' },
    { id: 'e7', source: 'agent-billing', target: 'agent-qa' },
    { id: 'e8', source: 'agent-general', target: 'agent-qa' },
    { id: 'e9', source: 'agent-qa', target: 'output-response' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 120000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: true,
    cacheTTL: 1800,
    errorHandling: 'retry',
  },
  tags: ['support', 'customer-service', 'routing', 'classification'],
  isPublic: true,
  isTemplate: true,
  sampleInput: 'Hi, I\'ve been charged twice for my monthly subscription this month. Order #ORD-84921. The duplicate charge of $29.99 appeared on March 1st. I need a refund for the extra charge as soon as possible. This is really frustrating.',
};

// ============================================================================
// Template 3: Data Analysis Pipeline
// Input → Data Cleaner → Analyzer → Insight Generator → Report Formatter → Output
// ============================================================================

export const dataAnalysisPipeline: Pipeline = {
  id: 'template-data-analysis',
  name: 'Data Analysis & Reporting',
  description:
    'Automated data analysis pipeline: clean raw data, perform analysis, generate insights, and format a professional report.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-data',
      type: 'input',
      position: { x: 50, y: 300 },
      data: {
        label: 'Raw Data',
        inputConfig: { dataType: 'text', source: 'manual' },
      },
    },
    {
      id: 'agent-cleaner',
      type: 'agent',
      position: { x: 320, y: 300 },
      data: {
        label: 'Data Cleaner',
        agentConfig: createDefaultAgentConfig({
          name: 'Data Cleaner',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a data preparation specialist. Clean and structure raw data. Identify data types, handle missing values, normalize formats, and output clean structured data as JSON.',
          userPromptTemplate:
            'Clean and structure this raw data. Output as clean JSON:\n\n{{input}}',
          temperature: 0.1,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-analyzer',
      type: 'agent',
      position: { x: 590, y: 300 },
      data: {
        label: 'Data Analyzer',
        agentConfig: createDefaultAgentConfig({
          name: 'Statistical Analyzer',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt:
            'You are a data analyst. Perform thorough statistical analysis on structured data. Calculate key metrics, identify trends, correlations, outliers, and patterns. Present findings with specific numbers.',
          userPromptTemplate:
            'Perform a comprehensive analysis on this data:\n\n{{input}}\n\nInclude:\n- Summary statistics\n- Key trends and patterns\n- Outliers and anomalies\n- Correlations between variables\n- Year-over-year comparisons if applicable',
          temperature: 0.2,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-insights',
      type: 'agent',
      position: { x: 860, y: 300 },
      data: {
        label: 'Insight Generator',
        agentConfig: createDefaultAgentConfig({
          name: 'Business Insight Generator',
          role: 'generator',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a business intelligence consultant. Transform data analysis into actionable business insights. Prioritize insights by impact, suggest concrete action items, and identify risks and opportunities.',
          userPromptTemplate:
            'Generate actionable business insights from this analysis:\n\n{{input}}\n\nFor each insight:\n1. Clear finding statement\n2. Business impact (high/medium/low)\n3. Recommended action\n4. Expected outcome',
          temperature: 0.5,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-formatter',
      type: 'agent',
      position: { x: 1130, y: 300 },
      data: {
        label: 'Report Formatter',
        agentConfig: createDefaultAgentConfig({
          name: 'Report Formatter',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You format analytical insights into a professional executive report. Use clear sections, bullet points, and highlight key numbers. The report should be scannable by busy executives.',
          userPromptTemplate:
            'Format these insights into an executive report:\n\n{{input}}\n\nFormat:\n- Executive Summary (3-4 sentences)\n- Key Metrics Dashboard (bullet points)\n- Top Insights (numbered, prioritized)\n- Recommended Actions (actionable list)\n- Risk Factors\n- Next Steps',
          temperature: 0.3,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'output-report',
      type: 'output',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Executive Report',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-data', target: 'agent-cleaner' },
    { id: 'e2', source: 'agent-cleaner', target: 'agent-analyzer' },
    { id: 'e3', source: 'agent-analyzer', target: 'agent-insights' },
    { id: 'e4', source: 'agent-insights', target: 'agent-formatter' },
    { id: 'e5', source: 'agent-formatter', target: 'output-report' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 180000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: true,
    cacheTTL: 7200,
    errorHandling: 'stop',
  },
  tags: ['data', 'analysis', 'reporting', 'business-intelligence'],
  isPublic: true,
  isTemplate: true,
  sampleInput: `Monthly Sales Data (Jan-Jun 2025):
January: Revenue $142,500 | Units 1,230 | Returns 45 | New Customers 312
February: Revenue $158,200 | Units 1,410 | Returns 38 | New Customers 287
March: Revenue $134,800 | Units 1,180 | Returns 62 | New Customers 245
April: Revenue $171,300 | Units 1,520 | Returns 29 | New Customers 398
May: Revenue $189,600 | Units 1,690 | Returns 41 | New Customers 421
June: Revenue $203,100 | Units 1,810 | Returns 35 | New Customers 456
Top products: Widget Pro (38%), Widget Basic (27%), Widget Plus (20%), Accessories (15%)
Regions: North America 52%, Europe 28%, Asia-Pacific 20%`,
};

// ============================================================================
// Template 4: Code Review Pipeline
// Input → Code Analyzer → Bug Finder → Improvement Suggester → Summary → Output
// ============================================================================

export const codeReviewPipeline: Pipeline = {
  id: 'template-code-review',
  name: 'Automated Code Review',
  description:
    'Multi-agent code review: analyze code structure, find potential bugs, suggest improvements, and produce a review summary.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-code',
      type: 'input',
      position: { x: 50, y: 300 },
      data: {
        label: 'Code to Review',
        inputConfig: { dataType: 'text', source: 'manual' },
      },
    },
    {
      id: 'agent-analyzer',
      type: 'agent',
      position: { x: 320, y: 200 },
      data: {
        label: 'Code Analyzer',
        agentConfig: createDefaultAgentConfig({
          name: 'Code Structure Analyzer',
          role: 'analyzer',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a senior software architect. Analyze the code structure, design patterns, and architecture. Assess readability, maintainability, and adherence to best practices.',
          userPromptTemplate:
            'Analyze this code:\n\n```\n{{input}}\n```\n\nAssess:\n- Code structure and organization\n- Design patterns used\n- Readability and naming\n- Error handling\n- Performance characteristics',
          temperature: 0.2,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-bugfinder',
      type: 'agent',
      position: { x: 320, y: 420 },
      data: {
        label: 'Bug Finder',
        agentConfig: createDefaultAgentConfig({
          name: 'Bug Detector',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt:
            'You are a security-focused code reviewer specializing in finding bugs, vulnerabilities, and edge cases. Look for: null pointer issues, race conditions, injection vulnerabilities, memory leaks, off-by-one errors, and unhandled exceptions.',
          userPromptTemplate:
            'Find bugs and security issues in this code:\n\n```\n{{input}}\n```\n\nFor each issue:\n- Severity: Critical / High / Medium / Low\n- Line reference\n- Description\n- Fix suggestion',
          temperature: 0.1,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-improver',
      type: 'agent',
      position: { x: 650, y: 300 },
      data: {
        label: 'Improvement Suggester',
        agentConfig: createDefaultAgentConfig({
          name: 'Code Improvement Agent',
          role: 'generator',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a code improvement specialist. Given code analysis and bug reports, suggest concrete improvements with code examples. Prioritize changes by impact.',
          userPromptTemplate:
            'Based on the analysis and bug reports, suggest improvements:\n\n{{input}}\n\nFor each suggestion:\n1. Priority (P0-P3)\n2. Description\n3. Code example (before/after)\n4. Effort estimate (trivial/small/medium/large)',
          temperature: 0.4,
          maxTokens: 3072,
        }),
      },
    },
    {
      id: 'agent-summarizer',
      type: 'agent',
      position: { x: 950, y: 300 },
      data: {
        label: 'Review Summarizer',
        agentConfig: createDefaultAgentConfig({
          name: 'Review Summarizer',
          role: 'aggregator',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You create concise, actionable code review summaries. Consolidate all findings into a clear, prioritized review document suitable for a pull request comment.',
          userPromptTemplate:
            'Create a code review summary from these findings:\n\n{{input}}\n\nFormat as a PR review comment with:\n- Overall Assessment (APPROVE / REQUEST_CHANGES / COMMENT)\n- Score (1-10)\n- Critical Issues (must fix)\n- Suggestions (nice to have)\n- Positive Notes (what\'s good)',
          temperature: 0.3,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'output-review',
      type: 'output',
      position: { x: 1220, y: 300 },
      data: {
        label: 'Code Review',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-code', target: 'agent-analyzer' },
    { id: 'e2', source: 'input-code', target: 'agent-bugfinder' },
    { id: 'e3', source: 'agent-analyzer', target: 'agent-improver', label: 'analysis' },
    { id: 'e4', source: 'agent-bugfinder', target: 'agent-improver', label: 'bugs' },
    { id: 'e5', source: 'agent-improver', target: 'agent-summarizer' },
    { id: 'e6', source: 'agent-summarizer', target: 'output-review' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 180000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: false,
    cacheTTL: 3600,
    errorHandling: 'stop',
  },
  tags: ['code', 'review', 'development', 'quality'],
  isPublic: true,
  isTemplate: true,
  sampleInput: `function processUsers(users) {
  var result = [];
  for (var i = 0; i <= users.length; i++) {
    var user = users[i];
    if (user.age > 18) {
      var data = JSON.parse(user.metadata);
      result.push({
        name: user.name,
        email: user.email,
        score: eval(user.scoreExpression),
        info: data
      });
    }
  }
  return result;
}

async function fetchUserData(userId) {
  const response = await fetch("/api/users/" + userId);
  const data = response.json();
  localStorage.setItem("user_" + userId, JSON.stringify(data));
  return data;
}`,
};

// ============================================================================
// Template 5: AI Job Search Pipeline
// Input → Splitter → CV Analyzer + Job Matcher → Ranker → Gap Identifier → CV Rewriter → Keyword Aligner → Outputs
// ============================================================================

export const jobSearchPipeline: Pipeline = {
  id: 'template-job-search',
  name: 'AI Job Search & CV Optimizer',
  description:
    'Automated job search matching and CV optimization: parse job postings and a CV, score and rank matches, identify skill gaps, and produce a tailored resume.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-combined',
      type: 'input',
      position: { x: 50, y: 350 },
      data: {
        label: 'Job Postings + CV',
        inputConfig: { dataType: 'text', source: 'manual' },
      },
    },
    {
      id: 'agent-splitter',
      type: 'agent',
      position: { x: 280, y: 350 },
      data: {
        label: 'Input Splitter',
        agentConfig: createDefaultAgentConfig({
          name: 'Input Splitter',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a precise text parser. You receive combined input containing job postings and a CV separated by delimiters. Parse them into a structured JSON object. Output ONLY valid JSON, no markdown fences.',
          userPromptTemplate:
            'Parse the following combined input into JSON with two keys: "positions" (array of job objects with title, company, requirements, responsibilities) and "cv" (the full CV text).\n\n{{input}}',
          temperature: 0.1,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-cv-analyzer',
      type: 'agent',
      position: { x: 510, y: 470 },
      data: {
        label: 'CV Analyzer',
        agentConfig: createDefaultAgentConfig({
          name: 'CV Analyzer',
          role: 'analyzer',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are an expert career analyst. Extract a structured candidate profile from a CV. Identify skills, experience level, education, key achievements, and career trajectory. Output valid JSON.',
          userPromptTemplate:
            'Analyze this parsed input and extract a structured candidate profile from the CV section.\n\n{{input}}\n\nOutput JSON with: name, yearsExperience, currentRole, skills (array of {name, level: "expert"|"proficient"|"familiar"}), education (array), achievements (array), industries (array), and a brief careerSummary string.',
          temperature: 0.2,
          maxTokens: 1536,
        }),
      },
    },
    {
      id: 'agent-job-matcher',
      type: 'agent',
      position: { x: 740, y: 220 },
      data: {
        label: 'Job Matcher',
        agentConfig: createDefaultAgentConfig({
          name: 'Job Matcher',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt:
            'You are a job matching specialist. Given job positions and a candidate profile, score each job on fit. Consider skills match, experience level, career trajectory, and growth potential. Output valid JSON.',
          userPromptTemplate:
            'You have two inputs merged below. Score each job position against the candidate profile.\n\n{{input}}\n\nFor each position output JSON array of: {title, company, overallScore (0-100), skillsMatch (0-100), experienceMatch (0-100), growthPotential (0-100), matchedSkills (array), missingSkills (array), notes (string)}',
          temperature: 0.3,
          maxTokens: 2048,
        }),
      },
    },
    {
      id: 'agent-ranker',
      type: 'agent',
      position: { x: 970, y: 220 },
      data: {
        label: 'Job Filter & Ranker',
        agentConfig: createDefaultAgentConfig({
          name: 'Job Filter & Ranker',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt:
            'You are a career strategy advisor. Filter out weak job matches (overallScore < 40), rank remaining jobs, and provide a strategic recommendation. Output a ranked list with actionable advice.',
          userPromptTemplate:
            'Filter and rank these job match results. Remove any with overallScore below 40.\n\n{{input}}\n\nOutput JSON: {rankings: [{rank, title, company, overallScore, verdict: "Strong Match"|"Good Match"|"Stretch Role", keyAdvantages (array), keyRisks (array), applicationStrategy (string)}], topRecommendation (string)}',
          temperature: 0.2,
          maxTokens: 1536,
        }),
      },
    },
    {
      id: 'output-ranked-jobs',
      type: 'output',
      position: { x: 1200, y: 120 },
      data: {
        label: 'Ranked Jobs',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
    {
      id: 'agent-gap-identifier',
      type: 'agent',
      position: { x: 970, y: 470 },
      data: {
        label: 'Gap Identifier',
        agentConfig: createDefaultAgentConfig({
          name: 'Gap Identifier',
          role: 'analyzer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are a career gap analyst. Compare a candidate profile against top-ranked job requirements. Identify addressable gaps that can be highlighted or reframed in a CV. Focus on gaps that the candidate can realistically address through CV wording.',
          userPromptTemplate:
            'Compare the candidate profile and job rankings below. Identify skill and experience gaps for the top-ranked positions.\n\n{{input}}\n\nOutput JSON: {addressableGaps: [{gap, severity: "critical"|"moderate"|"minor", currentEvidence (string or null), suggestedReframe (string)}], keywordsToAdd (array of strings), sectionsToStrengthen (array of {section, suggestion})}',
          temperature: 0.3,
          maxTokens: 1536,
        }),
      },
    },
    {
      id: 'agent-cv-rewriter',
      type: 'agent',
      position: { x: 1200, y: 470 },
      data: {
        label: 'CV Rewriter',
        agentConfig: createDefaultAgentConfig({
          name: 'CV Rewriter',
          role: 'generator',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          systemPrompt:
            'You are a professional resume writer. Rewrite CV sections to address identified gaps while remaining truthful. Emphasize transferable skills, reframe experience to match target roles, and use strong action verbs. Do NOT fabricate experience.',
          userPromptTemplate:
            'Rewrite the CV based on the gap analysis below. Address each gap through better framing of existing experience. Keep all facts truthful.\n\n{{input}}\n\nOutput the rewritten CV sections in clean, professional format with clear headings. Include a tailored Professional Summary targeting the top-ranked positions.',
          temperature: 0.5,
          maxTokens: 3072,
        }),
      },
    },
    {
      id: 'agent-keyword-aligner',
      type: 'agent',
      position: { x: 1430, y: 470 },
      data: {
        label: 'Keyword Aligner',
        agentConfig: createDefaultAgentConfig({
          name: 'Keyword Aligner',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You are an ATS (Applicant Tracking System) optimization specialist. Optimize a CV for keyword matching without making it sound robotic. Naturally integrate missing keywords, ensure proper formatting for ATS parsing, and output the final polished CV.',
          userPromptTemplate:
            'Optimize this rewritten CV for ATS keyword matching. Naturally integrate relevant industry keywords.\n\n{{input}}\n\nOutput the final, polished CV ready for submission. Include an "ATS Optimization Notes" section at the end listing keywords added and ATS compatibility score (0-100).',
          temperature: 0.2,
          maxTokens: 3072,
        }),
      },
    },
    {
      id: 'output-tailored-cv',
      type: 'output',
      position: { x: 1660, y: 470 },
      data: {
        label: 'Tailored CV',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-combined', target: 'agent-splitter' },
    { id: 'e2', source: 'agent-splitter', target: 'agent-cv-analyzer', label: 'cv' },
    { id: 'e3', source: 'agent-splitter', target: 'agent-job-matcher', label: 'positions' },
    { id: 'e4', source: 'agent-cv-analyzer', target: 'agent-job-matcher', label: 'profile' },
    { id: 'e5', source: 'agent-job-matcher', target: 'agent-ranker' },
    { id: 'e6', source: 'agent-ranker', target: 'output-ranked-jobs' },
    { id: 'e7', source: 'agent-cv-analyzer', target: 'agent-gap-identifier', label: 'profile' },
    { id: 'e8', source: 'agent-ranker', target: 'agent-gap-identifier', label: 'rankings' },
    { id: 'e9', source: 'agent-gap-identifier', target: 'agent-cv-rewriter' },
    { id: 'e10', source: 'agent-cv-rewriter', target: 'agent-keyword-aligner' },
    { id: 'e11', source: 'agent-keyword-aligner', target: 'output-tailored-cv' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 300000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: false,
    cacheTTL: 3600,
    errorHandling: 'stop',
  },
  tags: ['job-search', 'cv', 'resume', 'career', 'matching'],
  isPublic: true,
  isTemplate: true,
  sampleInput: `===JOB_POSTINGS===

--- Position 1 ---
Title: Senior Full-Stack Engineer
Company: Nexora Technologies
Location: Remote (US)
Salary: $160,000 - $195,000

Requirements:
- 5+ years of full-stack development experience
- Expert in React/TypeScript and Node.js
- Experience with PostgreSQL, Redis, and cloud infrastructure (AWS or GCP)
- Strong understanding of CI/CD pipelines and DevOps practices
- Experience with microservices architecture
- Excellent communication skills for cross-functional collaboration

Responsibilities:
- Design and implement scalable web applications serving 10M+ users
- Lead technical design reviews and mentor junior engineers
- Own end-to-end feature delivery from architecture to deployment
- Collaborate with product and design teams on technical feasibility
- Improve system reliability, performance, and observability

--- Position 2 ---
Title: Engineering Manager, Platform
Company: DataStream Inc.
Location: Hybrid - San Francisco, CA
Salary: $190,000 - $230,000

Requirements:
- 7+ years software engineering experience, 2+ years in management
- Track record of building and leading high-performing teams (5-10 engineers)
- Strong technical background in distributed systems or data platforms
- Experience with agile methodologies and engineering metrics
- Excellent stakeholder management and communication skills
- Prior experience scaling teams during rapid growth

Responsibilities:
- Lead a team of 8 platform engineers building core data infrastructure
- Define technical roadmap aligned with company OKRs
- Hire, develop, and retain top engineering talent
- Drive architectural decisions for the data platform
- Partner with product, data science, and SRE teams

--- Position 3 ---
Title: Backend Engineer, Payments
Company: FinFlow
Location: Remote (US/EU)
Salary: $140,000 - $170,000

Requirements:
- 3+ years backend development experience
- Proficiency in Node.js or Python
- Experience with payment systems, financial APIs, or fintech
- Strong understanding of database design and SQL
- Familiarity with event-driven architectures
- Knowledge of security best practices and PCI compliance

Responsibilities:
- Build and maintain payment processing microservices
- Integrate with third-party payment providers (Stripe, Adyen)
- Ensure PCI DSS compliance across payment flows
- Design fault-tolerant systems for financial transactions
- Write comprehensive tests and documentation

===CV===

ALEX CHEN
Senior Software Engineer
alex.chen@email.com | github.com/alexchen | linkedin.com/in/alexchen
San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software engineer with 6 years building web applications and backend services. Passionate about clean code, scalable architecture, and mentoring junior developers.

EXPERIENCE

Senior Software Engineer | CloudBase Corp | Jan 2022 - Present (3 years)
- Led migration of monolithic Rails app to Node.js microservices, reducing response times by 40%
- Built real-time analytics dashboard using React, TypeScript, and D3.js serving 50K daily users
- Mentored 3 junior developers through structured code reviews and pair programming sessions
- Implemented CI/CD pipeline with GitHub Actions reducing deployment time from 2 hours to 15 minutes
- Designed and deployed PostgreSQL read-replica architecture handling 5M daily queries

Software Engineer | TechStart Inc. | Jun 2019 - Dec 2021 (2.5 years)
- Developed customer-facing React SPA with Redux state management
- Built RESTful APIs in Node.js/Express serving mobile and web clients
- Integrated Stripe payment processing handling $2M monthly transaction volume
- Managed AWS infrastructure (EC2, RDS, S3, CloudFront) for production environment
- Reduced API error rate from 2.3% to 0.4% through systematic debugging and monitoring

Junior Developer | WebWorks Agency | Jul 2018 - May 2019 (1 year)
- Built responsive websites and web applications for 12+ agency clients
- Worked with React, Vue.js, PHP, and MySQL across diverse projects
- Participated in client requirement gathering and sprint planning

EDUCATION
B.S. Computer Science | UC Berkeley | 2018

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python (basic), SQL
Frontend: React, Next.js, Redux, Tailwind CSS, D3.js
Backend: Node.js, Express, GraphQL, REST APIs
Databases: PostgreSQL, MongoDB, Redis
Cloud/DevOps: AWS (EC2, RDS, S3, Lambda), Docker, GitHub Actions, Terraform (basic)
Other: Git, Agile/Scrum, Microservices, CI/CD`,
};

// ============================================================================
// Template 6: Data Fetcher Pipeline (Code Execution)
// Input → AI Agent (generates JS fetch code) → Code Executor → AI Agent (summarizes) → Output
// ============================================================================

export const dataFetcherPipeline: Pipeline = {
  id: 'template-data-fetcher',
  name: 'Data Fetcher (Code Execution)',
  description:
    'User describes what data to fetch. AI generates JavaScript code. Code Executor runs it. Another AI summarizes the result.',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  authorId: 'system',
  nodes: [
    {
      id: 'input-prompt',
      type: 'input',
      position: { x: 50, y: 300 },
      data: {
        label: 'Fetch Request',
        inputConfig: { dataType: 'text', source: 'manual' },
      },
    },
    {
      id: 'agent-codegen',
      type: 'agent',
      position: { x: 350, y: 300 },
      data: {
        label: 'Code Generator',
        agentConfig: createDefaultAgentConfig({
          name: 'Code Generator',
          role: 'generator',
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt: `You are a JavaScript code generator. The user will describe data they want to fetch from the internet.

Your job: write a short async JavaScript code snippet that uses fetch() to retrieve the data and returns the parsed JSON result.

CRITICAL RULES:
- Output ONLY raw, executable JavaScript code
- Do NOT wrap in markdown fences (\`\`\`), do NOT add any explanation text
- The code runs inside an async function body, so you can use await directly
- Use "return" to return the final value
- "fetch" is available in scope for HTTP requests
- "input" variable holds the raw user request string (you usually don't need it)
- Always handle the response with response.json() or response.text()
- Keep it simple: fetch, parse, return`,
          userPromptTemplate: `Write JavaScript fetch code for this request:

{{input}}

Output ONLY executable JavaScript. No markdown, no explanation. Use return.`,
          temperature: 0.1,
          maxTokens: 512,
        }),
      },
    },
    {
      id: 'code-executor',
      type: 'code',
      position: { x: 650, y: 300 },
      data: {
        label: 'Run Code',
        codeConfig: { language: 'javascript', timeout: 15000, allowNetwork: true, autoFixRetries: 3 },
      },
    },
    {
      id: 'agent-summarizer',
      type: 'agent',
      position: { x: 950, y: 300 },
      data: {
        label: 'Summarize Result',
        agentConfig: createDefaultAgentConfig({
          name: 'Result Summarizer',
          role: 'transformer',
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt:
            'You receive raw API response data (usually JSON). Summarize it into a clear, human-readable format. Highlight the most important values. Use bullet points and bold for key numbers.',
          userPromptTemplate:
            'Here is raw data fetched from an API. Summarize the key information in a clear, readable way:\n\n{{input}}',
          temperature: 0.3,
          maxTokens: 1024,
        }),
      },
    },
    {
      id: 'output-summary',
      type: 'output',
      position: { x: 1250, y: 300 },
      data: {
        label: 'Final Summary',
        outputConfig: { dataType: 'text', destination: 'display' },
      },
    },
  ] as PipelineNode[],
  edges: [
    { id: 'e1', source: 'input-prompt', target: 'agent-codegen' },
    { id: 'e2', source: 'agent-codegen', target: 'code-executor' },
    { id: 'e3', source: 'code-executor', target: 'agent-summarizer' },
    { id: 'e4', source: 'agent-summarizer', target: 'output-summary' },
  ] as PipelineEdge[],
  globalVariables: {},
  settings: {
    maxExecutionTime: 120000,
    enableLogging: true,
    logLevel: 'info',
    enableCaching: false,
    cacheTTL: 3600,
    errorHandling: 'stop',
  },
  tags: ['code-execution', 'fetch', 'api', 'data'],
  isPublic: true,
  isTemplate: true,
  sampleInput: 'Fetch the current Bitcoin price in USD from this URL: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
};

// ============================================================================
// All Templates Registry
// ============================================================================

export const ALL_TEMPLATES = [
  contentWriterPipeline,
  customerSupportPipeline,
  dataAnalysisPipeline,
  codeReviewPipeline,
  jobSearchPipeline,
  dataFetcherPipeline,
];
