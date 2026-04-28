'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Lottie from 'lottie-react';
import { authApi } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      saveAuth(res.accessToken, res.user, res.user?.company?.slug);
      toast.success(`Welcome back, ${res.user.email}`);
      const isSuperadmin = res.user.role === 'superadmin';
      const redirect =
        searchParams.get('redirect') ||
        (isSuperadmin ? '/superadmin/dashboard' : '/dashboard');
      router.push(redirect);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
        <input
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900
                     placeholder-gray-400 transition-all duration-200
                     focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-900
                       placeholder-gray-400 transition-all duration-200
                       focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-brand-600 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group w-full rounded-xl py-3 text-sm font-semibold text-white
                   bg-brand-600 hover:bg-brand-700 active:scale-[.98]
                   transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2
                   flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
        ) : (
          <>Sign in<ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 pt-1">
        Demo:{' '}
        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">admin@acme.com</span>
        {' / '}
        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Admin@123</span>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch('/robot-animation.json')
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        /* Form panel entrance */
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-slide-up { animation: lp-slide-up .55s cubic-bezier(.22,1,.36,1) both; }

        /* Robot intro: slides up from below + fades in */
        @keyframes lp-robot-intro {
          0%   { opacity: 0; transform: translateY(60px) scale(.9); }
          60%  { opacity: 1; transform: translateY(-8px) scale(1.02); }
          80%  { transform: translateY(4px) scale(.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lp-robot-intro { animation: lp-robot-intro .9s .2s cubic-bezier(.22,1,.36,1) both; }

        /* Subtle idle hover after intro */
        @keyframes lp-robot-idle {
          0%, 100% { transform: translateY(0px) rotate(-.4deg); }
          50%       { transform: translateY(-10px) rotate(.4deg); }
        }
        .lp-robot-idle { animation: lp-robot-intro .9s .2s cubic-bezier(.22,1,.36,1) both,
                                    lp-robot-idle 4.5s 1.2s ease-in-out infinite; }

        /* Name badge pop */
        @keyframes lp-badge-pop {
          0%   { opacity: 0; transform: scale(.7) translateY(6px); }
          70%  { transform: scale(1.06) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lp-badge-pop { animation: lp-badge-pop .5s .95s cubic-bezier(.34,1.56,.64,1) both; }

        /* Text lines stagger */
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-text-1 { animation: lp-fade-up .45s 1.1s ease both; }
        .lp-text-2 { animation: lp-fade-up .45s 1.25s ease both; }
        .lp-stats   { animation: lp-fade-up .45s 1.4s ease both; }

        /* Orb pulse */
        @keyframes lp-orb {
          0%, 100% { transform: scale(1); opacity: .4; }
          50%       { transform: scale(1.2); opacity: .6; }
        }
        .lp-orb-a { animation: lp-orb 7s ease-in-out infinite; }
        .lp-orb-b { animation: lp-orb 9s 2s ease-in-out infinite reverse; }

        /* Shadow that follows the robot */
        @keyframes lp-shadow {
          0%, 100% { transform: scaleX(1); opacity: .25; }
          50%       { transform: scaleX(.82); opacity: .14; }
        }
        .lp-shadow { animation: lp-shadow 4.5s 1.2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex">

        {/* ── LEFT: white form panel ── */}
        <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-brand-50 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-10 w-48 h-48 rounded-full bg-brand-50 blur-3xl pointer-events-none" />

          <div className="relative z-10 w-full max-w-sm lp-slide-up">
            {/* Logo */}
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-7">
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/30">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4 6v-2m0 0a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">Staffly</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back 👋</h1>
              <p className="text-sm text-gray-500">Sign in to your HR workspace.</p>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 p-7 bg-white">
              <Suspense fallback={<div className="h-52 animate-pulse rounded-xl bg-gray-50" />}>
                <LoginForm />
              </Suspense>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Staffly · All rights reserved
            </p>
          </div>
        </div>

        {/* ── RIGHT: glassy green panel with robot intro ── */}
        <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden">

          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800" />

          {/* Animated orbs */}
          <div className="lp-orb-a absolute -top-16 -right-16 w-80 h-80 rounded-full bg-brand-400/40 blur-[70px] pointer-events-none" />
          <div className="lp-orb-b absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-brand-900/50 blur-[70px] pointer-events-none" />

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1.2px, transparent 0)`,
              backgroundSize: '26px 26px',
            }}
          />

          {/* Glass card */}
          <div className="relative z-10 mx-10 flex flex-col items-center text-center
                          rounded-3xl border border-white/20
                          bg-white/10 backdrop-blur-xl
                          shadow-[0_8px_48px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.22)]
                          px-10 pt-4 pb-10 max-w-md w-full">

            {/* Robot — the star of the show */}
            <div className="relative w-full flex flex-col items-center">
              {/* Ground shadow under robot */}
              <div className="lp-shadow absolute bottom-2 left-1/2 -translate-x-1/2
                              w-40 h-5 rounded-full bg-brand-900/40 blur-md" />

              <div className="lp-robot-idle w-72 h-72">
                {animationData && (
                  <Lottie
                    animationData={animationData}
                    loop
                    className="w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* Name badge — pops in after robot lands */}
            <div className="lp-badge-pop flex items-center gap-2 bg-white/20 border border-white/30
                            backdrop-blur-sm rounded-full px-4 py-1.5 -mt-2 mb-4
                            shadow-[0_2px_12px_rgba(0,0,0,.12)]">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-sm font-semibold text-white tracking-wide">Hi, I'm Staffly!</span>
              <span className="text-base">🤖</span>
            </div>

            {/* Tagline */}
            <h2 className="lp-text-1 text-2xl font-bold text-white mb-2 leading-snug">
              Your AI-powered<br />HR companion
            </h2>
            <p className="lp-text-2 text-brand-100 text-sm leading-relaxed px-2">
              I help you hire smarter, manage attendance, run payroll, and keep your team happy — all from one place.
            </p>

            {/* Stats */}
            <div className="lp-stats mt-7 grid grid-cols-3 gap-3 w-full">
              {[['10K+', 'Users'], ['99.9%', 'Uptime'], ['50+', 'Modules']].map(([val, lbl]) => (
                <div key={lbl}
                  className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm p-3
                             hover:bg-white/18 transition-colors duration-200">
                  <p className="text-lg font-bold text-white">{val}</p>
                  <p className="text-[11px] text-brand-100 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
