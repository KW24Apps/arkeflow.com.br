import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-sea-foam">ARKE</span>
            <span className="text-electric-cyan font-normal">flow</span>
          </h1>
          <p className="text-steel text-xs mt-2 uppercase tracking-[0.2em]">Tech Solutions</p>
        </div>

        {/* Card */}
        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-8">
          <h2 className="text-sea-foam text-lg font-semibold mb-6">Acesse sua conta</h2>
          <LoginForm />
        </div>

      </div>
    </main>
  )
}
