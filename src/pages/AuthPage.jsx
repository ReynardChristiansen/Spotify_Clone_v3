import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo, { LogoMark } from '../components/ui/Logo';

const inputClasses =
  'w-full rounded-xl border border-white/5 bg-ink-800 px-4 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition-all duration-150 focus:border-accent-400/40 focus:bg-ink-700';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const clearForm = () => {
    setUserName('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError('');
    clearForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (isRegister) {
        await register(userName, password);
      } else {
        await login(userName, password);
      }
      clearForm();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full gap-2 p-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden rounded-2xl bg-ink-900 p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-400/5 blur-3xl" />

        <Logo />

        <div className="relative">
          <div className="mb-8 flex gap-3">
            <LogoMark className="h-14 w-14 animate-float-slow" />
            <LogoMark className="h-14 w-14 animate-float-slow opacity-40 [animation-delay:1.2s]" />
            <LogoMark className="h-14 w-14 animate-float-slow opacity-15 [animation-delay:2.4s]" />
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight">
            All your music.
            <br />
            One place.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
            Stream millions of songs, follow your favorite artists and build a
            library that goes wherever you go — even as an installed app.
          </p>
        </div>

        <p className="relative text-xs text-zinc-600">
          Hirmify · Free to listen, forever.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-ink-900 px-4">
        <div className="w-full max-w-sm animate-fade-up py-10">
          <div className="mb-9 flex justify-center lg:hidden">
            <Logo />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            {isRegister
              ? 'Start building your music library today.'
              : 'Log in to keep listening.'}
          </p>

          {/* autoComplete off/new-password keeps the browser from re-filling
              saved credentials after logout */}
          <form onSubmit={handleSubmit} autoComplete="off" className="mt-8 flex flex-col gap-3">
            <input
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Username"
              autoComplete="off"
              autoFocus
              required
              className={inputClasses}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              required
              className={inputClasses}
            />
            {isRegister && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
                className={`${inputClasses} animate-fade-up`}
              />
            )}

            {error && (
              <p className="animate-fade-up rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-xl bg-accent-400 py-3.5 text-sm font-bold text-ink-950 transition-all hover:bg-accent-300 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : 'Log in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-zinc-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={switchMode}
              className="font-semibold text-accent-400 transition-colors hover:text-accent-300"
            >
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
