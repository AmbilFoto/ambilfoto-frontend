import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, UserProfile } from "@/services/api/auth.service";
import { useToast } from "@/hooks/use-toast";

interface LoginResult {
  user: UserProfile;
  token: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (
    email: string,
    password: string,
    captchaToken?: string | null
  ) => Promise<LoginResult | null>;

  loginWithFace: (
    faceImage: string,
    captchaToken?: string | null
  ) => Promise<LoginResult | null>;

  register: (
    data: any & { captcha_token?: string | null }
  ) => Promise<LoginResult | null>;

  logout: () => void;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Helper: flag sessionStorage so PhotoGallery knows to show
// the "AI sedang mencocokkan..." banner and auto-trigger the hook.
// Source helps the banner show the right message.
function flagAutoMatch(source: "login" | "face_login" | "register") {
  sessionStorage.setItem("auto_match_photos", "true");
  sessionStorage.setItem("auto_match_source", source);
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user_data");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      authService
        .verifyToken()
        .then((res) => {
          if (!res.success) logout();
        })
        .catch(logout)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // ─── LOGIN (EMAIL + PASSWORD) ─────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
    captchaToken?: string | null
  ): Promise<LoginResult | null> => {
    try {
      const response = await authService.login({
        email,
        password,
        ...(captchaToken && { captcha_token: captchaToken }),
      });

      if (response.success && response.data?.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user_data", JSON.stringify(response.data.user));

        // ✅ Flag auto-match so PhotoGallery shows the "searching" banner
        // Backend already triggered the background job — this just tells
        // the frontend to show the UX indicator and poll for new photos.
        flagAutoMatch("login");

        toast({
          title: "✅ Login berhasil",
          description: `Welcome back, ${response.data.user.full_name}`,
        });

        return { user: response.data.user, token: response.data.token };
      }

      return null;
    } catch (error: any) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.error || "Login gagal";

      if (code === "CAPTCHA_REQUIRED") {
        toast({
          title: "🔐 Verifikasi Diperlukan",
          description: "Silakan selesaikan captcha untuk melanjutkan.",
          variant: "destructive",
        });
      } else if (code === "CAPTCHA_INVALID") {
        toast({
          title: "❌ Captcha Tidak Valid",
          description: "Silakan ulangi verifikasi captcha.",
          variant: "destructive",
        });
      } else if (code === "ACCOUNT_LOCKED") {
        toast({
          title: "🔒 Akun Terkunci",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Login gagal",
          description: message,
          variant: "destructive",
        });
      }

      throw error;
    }
  };

  // ─── LOGIN WITH FACE ──────────────────────────────────────────────────────
  const loginWithFace = async (
    faceImage: string,
    captchaToken?: string | null
  ): Promise<LoginResult | null> => {
    try {
      const faceLoginData: any = { face_image: faceImage };
      if (captchaToken) faceLoginData.captcha_token = captchaToken;

      const response = await authService.loginWithFace(faceLoginData);

      if (response.success && response.data?.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user_data", JSON.stringify(response.data.user));

        // ✅ Same flag — face login also triggers backend auto-match
        flagAutoMatch("face_login");

        toast({
          title: "🧠 Wajah dikenali",
          description: `Welcome back, ${response.data.user.full_name}`,
        });

        return { user: response.data.user, token: response.data.token };
      }

      return null;
    } catch (error: any) {
      toast({
        title: "❌ Face login gagal",
        description:
          error.response?.data?.error || "Gagal verifikasi wajah",
        variant: "destructive",
      });
      throw error;
    }
  };

  // ─── REGISTER ─────────────────────────────────────────────────────────────
  const register = async (
    data: any & { captcha_token?: string | null }
  ): Promise<LoginResult | null> => {
    try {
      const response = await authService.register(data);

      if (response.success && response.data?.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user_data", JSON.stringify(response.data.user));

        // ✅ Register: user just scanned their face — trigger match immediately
        flagAutoMatch("register");

        toast({
          title: "🎉 Akun berhasil dibuat",
          description: `Welcome, ${response.data.user.full_name}`,
        });

        return { user: response.data.user, token: response.data.token };
      }

      return null;
    } catch (error: any) {
      const code = error.response?.data?.code;

      if (code === "CAPTCHA_REQUIRED" || code === "CAPTCHA_INVALID") {
        toast({
          title: "🔐 Captcha diperlukan",
          description: "Silakan selesaikan verifikasi keamanan.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Registrasi gagal",
          description: error.response?.data?.error || "Terjadi kesalahan",
          variant: "destructive",
        });
      }

      throw error;
    }
  };

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    // Clear any pending auto-match flags
    sessionStorage.removeItem("auto_match_photos");
    sessionStorage.removeItem("auto_match_source");

    toast({
      title: "👋 Logout",
      description: "Anda telah keluar",
    });
  };

  const updateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem("user_data", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        loginWithFace,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};