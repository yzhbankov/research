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
};

// ============================================================================
// All Templates Registry
// ============================================================================

export const ALL_TEMPLATES = [
  contentWriterPipeline,
  customerSupportPipeline,
  dataAnalysisPipeline,
  codeReviewPipeline,
];
