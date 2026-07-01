import React from 'react';
import { Mail, Linkedin, ArrowRight } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <a href="/" className="text-lg font-bold text-gray-900 hover:opacity-70 transition-opacity">
            ZIA YAML Studio
          </a>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            Get in Touch
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Let's connect
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built this tool with Claude. Have feedback, ideas, or just want to chat about ZIA Agent Studio? Reach out!
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-16">
          {/* Email Card */}
          <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600 mb-4 text-sm">Direct line for questions and feedback</p>
              <a
                href="mailto:logesh.re@zohocorp.com"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold group/link"
              >
                logesh.re@zohocorp.com
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* LinkedIn Card */}
          <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Linkedin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">LinkedIn</h3>
              <p className="text-gray-600 mb-4 text-sm">Connect and stay updated</p>
              <a
                href="https://www.linkedin.com/in/logesh-ramasamy/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold group/link"
              >
                logesh-ramasamy
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">About this tool</h3>
          <p className="text-gray-700 mb-4">
            ZIA YAML Studio is a one-shot converter from Zoho API documentation to OpenAPI 3.0.1 YAML specs ready for ZIA Agent Studio.
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Paste Zoho API docs → Get instant OpenAPI YAML</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Built with Claude API + Vite + React</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Deployed on Catalyst Slate</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Download requires Zoho sign-in (Catalyst auth)</span>
            </li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold hover:gap-3 transition-all"
          >
            Back to Generator
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>Built with Claude Code · Hosted on Catalyst Slate</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
