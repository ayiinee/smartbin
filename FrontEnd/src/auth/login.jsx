import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Recycle } from "lucide-react";

const Login = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <main className="flex min-h-screen w-full overflow-hidden bg-white font-body text-slate-900">
      <section className="relative hidden w-1/2 flex-col justify-end bg-[#163022] p-12 lg:flex">
        <div
          className="absolute inset-0 z-0 h-full w-full bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDsSUevCKu-IJugwOvtgOB6skvqmaWBQWveTiDkBHo5irYMiTdEDAowvgPQo-Lz6pB_f5gEBZYdmYnWxajy1OyKjs5aDaahtZU7mUMi35jWdr7dvsF528Rxr0xFeCwCFukCF8idLiWbaYCdcxQG6BgBAiEdB_hCkDNi3kP_TQtCKb9taCzBUjs6botZzaR-ErIceYnYbvLr7EUwj_rt5FafPHlS3InvxnQR7ArXnTUioBycwA6cFqBjlEml6hg4iqt1PYq79dBWYub')",
          }}
        />
        <div className="absolute inset-0 z-10 bg-linear-to-t from-[#102216] via-[#102216]/70 to-transparent" />
        <div className="relative z-20 max-w-lg pb-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-primary">
              <Recycle size={24} />
            </span>
            <span className="text-2xl font-bold tracking-tight text-white font-display">
              SmartBin AI
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-bold leading-tight text-white">
            Empowering Sustainable Futures
          </h1>
          <p className="text-lg leading-relaxed text-emerald-100/90">
            Join the world&apos;s leading intelligent waste management platform.
            Monitor smart bins, track sustainability metrics, and optimize your
            ecological footprint in real time.
          </p>
          <div className="mt-8 flex gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-secondary">12k+</span>
              <span className="text-sm text-emerald-200/70">
                Smart Bins Active
              </span>
            </div>
            <div className="h-12 w-px bg-emerald-200/30" />
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-secondary">85%</span>
              <span className="text-sm text-emerald-200/70">
                Waste Reduction
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-12">
        <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Recycle size={20} />
          </span>
          <span className="text-lg font-bold text-slate-900 font-display">
            SmartBin AI
          </span>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
              Welcome Back
            </h2>
            <p className="font-medium text-slate-600">
              Please enter your details to sign in.
            </p>
          </div>

          <form className="mt-8 space-y-6" method="POST">
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-900"
                htmlFor="email"
              >
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="flex h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pl-10 text-sm text-slate-900 placeholder:text-gray-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-slate-900"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  placeholder="********"
                  className="flex h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pl-10 pr-10 text-sm text-slate-900 placeholder:text-gray-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <a
                className="text-sm font-semibold text-primary hover:text-secondary"
                href="/forgot-password"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="group relative flex w-full items-center justify-center rounded-lg bg-linear-to-r from-primary to-accent px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:from-secondary hover:to-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Sign in
              <span className="absolute right-4 top-3.5 translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                <ArrowRight size={18} />
              </span>
            </button>

            <div className="relative mt-6">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 font-medium text-gray-500">
                  Or continue with SSO
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <span className="text-sm font-semibold text-slate-500">
                  SSO
                </span>
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <a
                className="font-bold text-primary hover:text-secondary"
                href="/signup"
              >
                Create an account
              </a>
            </p>
          </form>
        </div>

        <div className="absolute bottom-6 w-full text-center text-xs font-medium text-slate-400 lg:left-0 lg:w-auto lg:pl-12 lg:text-left">
          <div className="flex justify-center gap-6 lg:justify-start">
            <a className="transition-colors hover:text-primary" href="#">
              Privacy Policy
            </a>
            <a className="transition-colors hover:text-primary" href="#">
              Terms of Service
            </a>
            <a className="transition-colors hover:text-primary" href="#">
              Help Center
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;