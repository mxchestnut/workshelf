import React from 'react'
import { ExternalLink, MessageCircle, Users, Shield, Download } from 'lucide-react'

/**
 * Matrix Setup & Onboarding
 * Explains how to use Matrix for group communication
 */
export default function MatrixSetup() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Matrix Communication</h1>
        <p className="text-gray-600">
          Workshelf uses Matrix for group messaging - a secure, decentralized communication protocol.
        </p>
      </div>

      {/* What is Matrix */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">What is Matrix?</h2>
            <p className="text-gray-700 mb-4">
              Matrix is an open-source, secure messaging protocol similar to email - you can use any Matrix client 
              to communicate across the network. It's used by governments, organizations, and communities worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* How Workshelf Uses Matrix */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Users className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">How Workshelf Uses Matrix</h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <strong>Group Spaces:</strong> When you create a group on Workshelf, we automatically create 
                a Matrix Space for your group members to communicate.
              </div>
              <div>
                <strong>Bring Your Own Client:</strong> You can use any Matrix client (Element, FluffyChat, Nheko, etc.) 
                to join and participate in your group conversations.
              </div>
              <div>
                <strong>Your Account, Your Control:</strong> You maintain full control of your Matrix account and 
                can use it outside of Workshelf too.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Download className="w-6 h-6 text-purple-600 mt-1" />
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Choose a Matrix Client</h3>
                </div>
                <div className="ml-10 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <strong>Element</strong>
                      <p className="text-sm text-gray-600">Most popular, feature-rich client</p>
                    </div>
                    <a 
                      href="https://element.io/download" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      Download <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <strong>FluffyChat</strong>
                      <p className="text-sm text-gray-600">Simple, cute interface</p>
                    </div>
                    <a 
                      href="https://fluffychat.im/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      Download <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <strong>More Clients</strong>
                      <p className="text-sm text-gray-600">See all available Matrix clients</p>
                    </div>
                    <a 
                      href="https://matrix.org/ecosystem/clients/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      Browse <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Create or Connect Your Matrix Account</h3>
                </div>
                <div className="ml-10 text-gray-700">
                  <p className="mb-2">When you open your Matrix client for the first time, you can either:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Create a new account on matrix.org or another homeserver</li>
                    <li>Sign in with an existing Matrix account</li>
                  </ul>
                  <p className="mt-2 text-sm text-gray-600">
                    Note: Your Matrix account is separate from Workshelf - you'll use it to join group spaces.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Join Your Group Spaces</h3>
                </div>
                <div className="ml-10 text-gray-700">
                  <p className="mb-2">On Workshelf, when you're part of a group:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Look for the "Join Matrix Space" button on the group page</li>
                    <li>Click it to get the Matrix room link</li>
                    <li>Open the link in your Matrix client to join the conversation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Privacy */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Security & Privacy</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>End-to-End Encryption:</strong> Matrix supports E2EE for all messages by default</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Open Source:</strong> All Matrix clients and servers are open source and auditable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span><strong>Your Data:</strong> You control your data - messages are stored on your homeserver</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Help Resources */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
        <div className="space-y-3">
          <a 
            href="https://matrix.org/docs/guides/introduction" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
          >
            <span>Matrix Introduction Guide</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
          <a 
            href="https://matrix.org/faq/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
          >
            <span>Matrix FAQ</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
          <a 
            href="https://element.io/help" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
          >
            <span>Element Help Center</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  )
}
