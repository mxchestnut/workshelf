import React from 'react';
import { ArrowLeft } from 'lucide-react';

const AIPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => window.history.back()}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-6">AI Assistance Policy</h1>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Approach to AI</h2>
          <p className="mb-4">
            Workshelf provides AI-powered tools to help you improve your writing craft. 
            These tools are designed to assist, inspire, and streamline your creative process—not replace it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What AI Tools Do</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Writing Prompts:</strong> Generate creative prompts to overcome writer's block</li>
            <li><strong>Character Questions:</strong> Develop deeper character backgrounds with targeted questions</li>
            <li><strong>Plot Structure:</strong> Analyze and suggest improvements to your story structure</li>
            <li><strong>Pacing Analysis:</strong> Identify pacing issues and suggest adjustments</li>
            <li><strong>Synonyms & Word Choice:</strong> Enhance your vocabulary with context-aware suggestions</li>
            <li><strong>Title Ideas:</strong> Brainstorm compelling titles for your work</li>
            <li><strong>Outline Structure:</strong> Organize your ideas into coherent outlines</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What AI Tools Don't Do</h2>
          <p className="mb-4">
            <strong>AI prompts and suggestions are not writing content.</strong> They are creative aids 
            designed to spark your imagination and help you develop your own ideas.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>AI tools do not write your book for you</li>
            <li>They do not replace your unique voice and creativity</li>
            <li>They do not own or claim rights to your work</li>
            <li>Suggestions are starting points—you decide what to use</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Ethical Use</h2>
          <p className="mb-4">
            We believe in transparent and ethical AI use:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>You retain full ownership</strong> of everything you create with Workshelf's tools</li>
            <li><strong>AI assistance is disclosed</strong> when appropriate in our documentation</li>
            <li><strong>Your work remains yours</strong>—AI suggestions are tools, not co-authors</li>
            <li><strong>Content integrity checks</strong> help ensure your work is authentically yours</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Use AI tools for brainstorming and exploration</li>
            <li>Review and customize all suggestions to match your voice</li>
            <li>Treat AI output as inspiration, not final content</li>
            <li>Maintain your creative authority over your work</li>
            <li>Use content integrity tools to verify originality</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Questions?</h2>
          <p>
            If you have questions about our AI tools or how to use them ethically, 
            please reach out to our support team. We're here to help you create your best work.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AIPolicy;
