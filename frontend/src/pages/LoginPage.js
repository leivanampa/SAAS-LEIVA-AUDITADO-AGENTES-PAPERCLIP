import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ship, ArrowRight, Eye, EyeOff, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_china-trade/artifacts/je15mcr1_image.png";
const BG_IMAGE = "https://images.unsplash.com/photo-1766678067437-bcf0c9006cd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxjYXJnbyUyMHNoaXAlMjBuaWdodCUyMG9jZWFuJTIwY29udGFpbmVyfGVufDB8fHx8MTc3MzUwODU5NXww&ixlib=rb-4.1.0&q=85";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [newPassword, setNewPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin ? { email, password } : { name, email, password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      login(res.data.token, res.data.user);
      toast.success(isLogin ? "Bienvenido de vuelta" : "Cuenta creada correctamente");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email });
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
        setResetStep(2);
        toast.success("Token de recuperacion generado");
      } else {
        toast.info(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("La contrasena debe tener al menos 4 caracteres");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token: resetToken, new_password: newPassword });
      toast.success("Contrasena actualizada. Ya puedes iniciar sesion.");
      setForgotMode(false);
      setResetStep(1);
      setResetToken("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al restablecer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left - Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 md:px-16 bg-card">
        <div className="max-w-sm mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-full object-cover bg-black ring-1 ring-border" />
              <div>
                <h1 className="font-barlow text-lg font-bold uppercase tracking-tight text-white">
                  Leiva's Import
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">SAAS</p>
              </div>
            </div>
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#00ff84] transition-colors font-instrument" data-testid="back-to-web-btn">
              <ArrowLeft size={14} /> Volver a la web
            </button>
          </div>

          <h2 className="font-barlow text-2xl font-bold uppercase tracking-tight text-white mb-2">
            {forgotMode ? "Recuperar Contrasena" : isLogin ? "Iniciar Sesion" : "Crear Cuenta"}
          </h2>
          <p className="text-sm text-zinc-500 mb-8">
            {forgotMode
              ? resetStep === 1 ? "Introduce tu email para recuperar el acceso" : "Introduce tu nueva contrasena"
              : isLogin ? "Accede a tu panel de gestion" : "Registrate para empezar"}
          </p>

          {forgotMode ? (
            resetStep === 1 ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="bg-secondary/50 border-input font-mono text-sm h-11"
                    required
                    data-testid="forgot-email-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all duration-300 rounded-sm"
                  data-testid="forgot-submit-btn"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Enviar"}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => { setForgotMode(false); setResetStep(1); }} className="text-sm text-zinc-500 hover:text-[#00ff84] transition-colors" data-testid="back-to-login">
                    Volver al inicio de sesion
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Token de recuperacion</Label>
                  <Input
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="bg-secondary/50 border-input font-mono text-sm h-11"
                    required
                    data-testid="reset-token-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nueva contrasena</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contrasena"
                    className="bg-secondary/50 border-input font-mono text-sm h-11"
                    required
                    data-testid="new-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all duration-300 rounded-sm"
                  data-testid="reset-submit-btn"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Restablecer Contrasena"}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => { setForgotMode(false); setResetStep(1); setResetToken(""); }} className="text-sm text-zinc-500 hover:text-[#00ff84] transition-colors" data-testid="back-to-login-2">
                    Volver al inicio de sesion
                  </button>
                </div>
              </form>
            )
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="bg-secondary/50 border-input font-mono text-sm h-11"
                  required
                  data-testid="register-name-input"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-secondary/50 border-input font-mono text-sm h-11"
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Contrasena</Label>
                {isLogin && (
                  <button type="button" onClick={() => setForgotMode(true)} className="text-[10px] uppercase tracking-widest text-[#00ff84] hover:underline" data-testid="forgot-password-link">
                    Olvidaste tu contrasena?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/50 border-input font-mono text-sm h-11 pr-10"
                  required
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#00ff84] text-black font-bold uppercase tracking-wide hover:bg-[#33ff9d] hover:shadow-[0_0_10px_rgba(0,255,132,0.3)] transition-all duration-300 rounded-sm"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Registrarse"}
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </form>
          )}

          <div className="mt-6 text-center">
            {!forgotMode && (
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-zinc-500 hover:text-[#00ff84] transition-colors"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "No tienes cuenta? Registrate" : "Ya tienes cuenta? Inicia sesion"}
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src={BG_IMAGE}
          alt="Cargo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-sm p-6">
            <div className="flex items-center gap-2 text-[#00ff84] mb-2">
              <Ship size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Gestion Global</span>
            </div>
            <p className="text-white text-lg font-barlow font-bold uppercase">
              Control total de tus importaciones desde China
            </p>
            <p className="text-zinc-400 text-sm mt-2">
              CRM, seguimiento de envios, facturacion y gestion documental en una sola plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
