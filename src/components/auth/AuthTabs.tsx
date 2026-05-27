'use client'

import { useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

export default function AuthTabs() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab('login')}
          className={`pb-3 px-1 font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'login'
              ? 'text-evergreen border-b-2 border-evergreen'
              : 'text-shadow-grey hover:text-evergreen'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setActiveTab('signup')}
          className={`pb-3 px-1 font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'signup'
              ? 'text-evergreen border-b-2 border-evergreen'
              : 'text-shadow-grey hover:text-evergreen'
          }`}
        >
          Registro
        </button>
      </div>

      <div>
        {activeTab === 'login' && <LoginForm isTabbed={true} />}
        {activeTab === 'signup' && <SignupForm isTabbed={true} />}
      </div>
    </div>
  )
}
