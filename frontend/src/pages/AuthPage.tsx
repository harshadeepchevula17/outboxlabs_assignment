import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../lib/axios';

type AuthMode = 'login' | 'register';

interface AuthPageProps {
  mode: AuthMode;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const pageTitle = useMemo(() => (isLogin ? 'Login' : 'Register'), [isLogin]);
  const alternatePath = isLogin ? '/register' : '/login';
  const alternateLabel = isLogin ? 'Register' : 'Login';

  const handleChange = (field: 'email' | 'password' | 'confirmPassword' | 'name', value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!emailRegex.test(form.email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!isLogin && !form.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required';
    }

    if (!isLogin) {
      if (!form.confirmPassword) {
        nextErrors.confirmPassword = 'Confirm password is required';
      } else if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : {
            email: form.email,
            password: form.password,
            name: form.name.trim(),
          };

      const response = await api.post(endpoint, payload);
      const token = response.data?.data?.token;

      if (token) {
        localStorage.setItem('outboxlabs_token', token);
      } else {
        localStorage.removeItem('outboxlabs_token');
      }

      setToast(
        isLogin ? 'Login successful. Redirecting to dashboard...' : 'Account created. Redirecting to dashboard...'
      );

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error: any) {
      localStorage.removeItem('outboxlabs_token');
      const details = error?.response?.data?.error?.details;
      const message = error?.response?.data?.error?.message || 'Authentication failed';

      if (details && Array.isArray(details)) {
        const firstField = details[0]?.field;
        if (firstField === 'password') {
          setErrors({ password: details[0].message });
        } else if (firstField === 'email') {
          setErrors({ email: details[0].message });
        } else {
          setErrors({ email: message });
        }
      } else {
        setErrors({ email: message });
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#efefef] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[460px] rounded-[8px] border border-[#d8d8d8] bg-[#f3f3f3] shadow-[0_0_0_1px_rgba(15,23,42,0.02)] px-7 py-7 md:px-8 md:py-8">
        <h1 className="text-center text-[2.1rem] md:text-[2.35rem] font-semibold tracking-[-0.04em] text-[#1d1d1f] mb-6">
          {pageTitle}
        </h1>

        <button
          type="button"
          className="w-full h-[44px] flex items-center justify-center gap-3 rounded-[6px] border border-[#cde0d7] bg-[#dfeee7] text-[#1d3b2d] font-medium text-sm md:text-[0.95rem] transition hover:bg-[#d1e6db] focus:outline-none focus:ring-2 focus:ring-[#b9d6c4]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
            />
            <path fill="#34A853" d="M3.7 7.4l3.4 2.5c.9-1.8 3-3.1 5-3.1 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.1 14.7 2 12 2 8.2 2 5.1 4.2 3.7 7.4z" />
            <path fill="#FBBC05" d="M3.7 16.6A10 10 0 0 1 3 12c0-.7.1-1.4.3-2.1l3.6 2.7c-.2.6-.3 1.2-.3 1.9 0 2.5 1.9 4.1 4.4 4.1 1.3 0 2.4-.5 3.2-1.3l3 2.9c-1.7 1.6-4.2 2.6-7.1 2.6-5.2 0-9.7-4.1-9.7-9.1z" />
            <path fill="#4285F4" d="M12 22c2.4 0 4.5-.8 6-2.2l-3-2.8c-.8.6-1.8.9-3 .9-2.9 0-5.4-2-6-4.7l-3.4 2.6A10 10 0 0 0 12 22z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[#666] text-[0.74rem] uppercase tracking-[0.08em]">
          <span className="h-px flex-1 bg-[#cfcfcf]" />
          <span className="text-[0.75rem] normal-case tracking-normal">or sign in through email</span>
          <span className="h-px flex-1 bg-[#cfcfcf]" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder="Email ID"
              aria-invalid={Boolean(errors.email)}
              className={`h-[46px] w-full rounded-[6px] border bg-[#ececec] px-3.5 text-[0.96rem] text-[#111827] placeholder:text-[#7c7c7c] transition focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-400 focus:ring-red-200' : 'border-[#d0d0d0] focus:ring-[#cddaff]'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                placeholder="Password"
                aria-invalid={Boolean(errors.password)}
                className={`h-[46px] w-full rounded-[6px] border bg-[#ececec] px-3.5 pr-11 text-[0.96rem] text-[#111827] placeholder:text-[#7c7c7c] transition focus:outline-none focus:ring-2 ${
                  errors.password ? 'border-red-400 focus:ring-red-200' : 'border-[#d0d0d0] focus:ring-[#cddaff]'
                }`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#111827]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Full Name"
                aria-invalid={Boolean(errors.name)}
                className={`h-[46px] w-full rounded-[6px] border bg-[#ececec] px-3.5 text-[0.96rem] text-[#111827] placeholder:text-[#7c7c7c] transition focus:outline-none focus:ring-2 ${
                  errors.name ? 'border-red-400 focus:ring-red-200' : 'border-[#d0d0d0] focus:ring-[#cddaff]'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(event) => handleChange('confirmPassword', event.target.value)}
                  placeholder="Confirm Password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={`h-[46px] w-full rounded-[6px] border bg-[#ececec] px-3.5 pr-11 text-[0.96rem] text-[#111827] placeholder:text-[#7c7c7c] transition focus:outline-none focus:ring-2 ${
                    errors.confirmPassword ? 'border-red-400 focus:ring-red-200' : 'border-[#d0d0d0] focus:ring-[#cddaff]'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#111827]"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>
          )}

          <button
            type="submit"
            className="mt-2 flex h-[46px] w-full items-center justify-center gap-2 rounded-[6px] bg-[#15a34a] text-sm font-semibold text-white transition hover:bg-[#128d3f] focus:outline-none focus:ring-2 focus:ring-[#9ad6b0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLogin ? 'Login' : 'Create Account'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#4b5563]">
          {isLogin ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link to={alternatePath} className="font-medium text-[#111827] underline-offset-2 hover:underline">
            {alternateLabel}
          </Link>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
