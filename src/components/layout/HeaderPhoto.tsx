import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, LogOut, Settings, User, Calendar, Image, LayoutDashboard, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PhotographerHeader = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
               <div className="container mx-auto flex h-24 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/photographer/dashboard" className="flex items-center gap-2 transition-all duration-200 hover:opacity-80">
          <img 
            src="https://res.cloudinary.com/dwyi4d3rq/image/upload/v1765171746/ambilfoto-logo_hvn8s2.png" 
            alt="Logo AmbilFoto.id" 
            className="h-20 w-auto"
          />
        </Link>

        {/* Navigasi & Menu Pengguna */}
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <>
              {/* Tombol Aksi Cepat - Buat Event */}
              <Link to="/photographer/events/new" className="hidden md:block">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Buat Event
                </Button>
              </Link>

              {/* Dropdown Menu Pengguna */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="hidden md:inline">{user?.full_name || 'Fotografer'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">Akun Fotografer</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Link Dashboard */}
                  <DropdownMenuItem asChild>
                    <Link to="/photographer/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/photographer/events" className="cursor-pointer">
                      <Calendar className="mr-2 h-4 w-4" />
                      Event Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="md:hidden">
                    <Link to="/photographer/events/new" className="cursor-pointer">
                      <Plus className="mr-2 h-4 w-4" />
                      Buat Event
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Pengaturan */}
                  <DropdownMenuItem asChild>
                    <Link to="/photographer/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Profil Bisnis
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Keluar */}
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isAuthenticated && (
            <>
              <Link to="/login">
                <Button variant="ghost">Masuk</Button>
              </Link>
              <Link to="/register">
                <Button>Mulai Sekarang</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default PhotographerHeader;