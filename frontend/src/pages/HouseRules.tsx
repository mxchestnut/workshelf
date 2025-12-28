/**
 * House Rules Page
 */

export default function HouseRules() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">House Rules</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: November 5, 2025</p>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <p className="text-lg text-gray-700 mb-6">
              Welcome to NPC! Our community thrives on creativity, respect, and collaboration. 
              These House Rules help ensure everyone has a positive experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🤝 Be Respectful</h2>
            <p className="text-gray-700 mb-4">
              Treat all community members with kindness and respect.
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use welcoming and inclusive language</li>
              <li>Respect different viewpoints and experiences</li>
              <li>Accept constructive criticism gracefully</li>
              <li>Focus on what's best for the community</li>
              <li>Show empathy towards other members</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🚫 Zero Tolerance</h2>
            <p className="text-gray-700 mb-4">
              The following behaviors will result in immediate account suspension or termination:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Harassment or bullying</strong> - Including targeted attacks, stalking, or intimidation</li>
              <li><strong>Hate speech</strong> - Content promoting discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or age</li>
              <li><strong>Sexual content involving minors</strong> - Any sexualization of children is strictly prohibited</li>
              <li><strong>Threats or violence</strong> - Threats of harm, violence, or dangerous behavior</li>
              <li><strong>Doxxing</strong> - Sharing private information without consent</li>
              <li><strong>Spam or scams</strong> - Unsolicited advertising, phishing, or fraudulent schemes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">✍️ Content Guidelines</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Original Work</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Only post content you have the right to share</li>
              <li>Give credit when building upon others' ideas</li>
              <li>Respect copyright and intellectual property</li>
              <li>Fan fiction is welcome, but must be clearly labeled</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Mature Content</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Mark content with mature themes appropriately</li>
              <li>Use content warnings for violence, strong language, or adult themes</li>
              <li>Graphic sexual content must be tagged and age-restricted</li>
              <li>Gore or extreme violence requires warnings</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Quality Standards</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Put effort into your posts and contributions</li>
              <li>Use proper formatting to make content readable</li>
              <li>Stay on topic in groups and discussions</li>
              <li>Avoid excessive self-promotion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">💬 Community Interaction</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Feedback & Critique</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Give constructive, helpful feedback</li>
              <li>Focus on the work, not the person</li>
              <li>Be specific about what works and what could improve</li>
              <li>Ask before giving unsolicited criticism</li>
              <li>Accept that not all feedback needs to be implemented</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Discussions</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Stay civil, even when you disagree</li>
              <li>Back up claims with sources when possible</li>
              <li>Admit when you're wrong</li>
              <li>Don't derail conversations</li>
              <li>Report problematic content instead of engaging</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔒 Privacy & Safety</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Don't share others' personal information</li>
              <li>Be cautious about sharing your own personal details</li>
              <li>Report suspicious behavior or safety concerns</li>
              <li>Don't ask for or share contact information publicly</li>
              <li>Block users who make you uncomfortable</li>
              <li>Use direct messages responsibly</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">👥 Group-Specific Rules</h2>
            <p className="text-gray-700 mb-4">
              Individual groups may have additional rules beyond these House Rules:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Review and follow each group's specific guidelines</li>
              <li>Respect group moderators' decisions</li>
              <li>Stay on-topic for the group's purpose</li>
              <li>Don't cross-post excessively between groups</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">⚠️ Reporting & Enforcement</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">How to Report</h3>
            <p className="text-gray-700 mb-4">
              If you see content or behavior that violates these rules:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Use the "Report" button on the content</li>
              <li>Provide specific details about the violation</li>
              <li>Don't publicly call out rule violations (report privately)</li>
              <li>For urgent safety concerns, contact us directly at support@nerdchurchpartners.org</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3">Enforcement Actions</h3>
            <p className="text-gray-700 mb-4">
              Violations may result in:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Warning</strong> - First-time minor violations</li>
              <li><strong>Content Removal</strong> - Removal of violating posts</li>
              <li><strong>Temporary Suspension</strong> - 24 hours to 30 days</li>
              <li><strong>Permanent Ban</strong> - Severe or repeated violations</li>
              <li><strong>Report to Authorities</strong> - Illegal content or activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🌟 Good Community Citizenship</h2>
            <p className="text-gray-700 mb-4">
              Beyond following the rules, here's how to be a great community member:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Welcome new members and help them get started</li>
              <li>Share your knowledge and expertise generously</li>
              <li>Celebrate others' successes and milestones</li>
              <li>Participate in community events and discussions</li>
              <li>Give credit and recognition where it's due</li>
              <li>Help maintain a positive, creative atmosphere</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📞 Questions or Concerns?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these House Rules or need clarification:
            </p>
            <p className="text-gray-700">
              Email: <a href="mailto:support@nerdchurchpartners.org" className="text-blue-600 hover:underline">support@nerdchurchpartners.org</a>
            </p>
          </section>

          <section className="mb-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-gray-700">
              <strong>Remember:</strong> These rules exist to protect our community and foster creativity. 
              When in doubt, ask yourself: "Is this respectful? Is this constructive? Is this something 
              I'd want to see in my own feed?" If the answer is yes, you're probably good to go! 🎨
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
