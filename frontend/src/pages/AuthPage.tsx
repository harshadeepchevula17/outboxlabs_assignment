import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { api } from '../lib/axios';

declare global {
  interface Window {
    google?: any;
  }
}

type AuthMode = 'login' | 'register';

interface AuthPageProps {
  mode: AuthMode;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

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

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;

    try {
      const res = await api.post('/auth/google', { idToken: response.credential });
      const token = res.data?.data?.token;

      if (token) {
        localStorage.setItem('outboxlabs_token', token);
      } else {
        localStorage.removeItem('outboxlabs_token');
      }

      setToast('Google authentication successful. Redirecting to dashboard...');
      window.setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error: any) {
      localStorage.removeItem('outboxlabs_token');
      const message = error?.response?.data?.error?.message || 'Google login failed';
      setErrors({ email: message });
    }
  };

  useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '718515370362-hhalfccp919bonqi9dv8avn7natuu95j.apps.googleusercontent.com';

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '380',
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const existingScript = document.getElementById('gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGsi;
        document.body.appendChild(script);
      }
    }
  }, [navigate]);

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

        {/* Official Google Identity Services Rendered Button Container */}
        <div className="w-full flex justify-center mb-4 min-h-[44px]">
          <div ref={googleBtnRef} className="w-full flex justify-center" />
        </div>

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
