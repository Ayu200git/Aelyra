import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./themeToggle";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { logout } from "@/store/slices/authSlice";
import { resetChats, setSidebarOpen, toggleSidebar } from "@/store/slices/chatSlice";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { sidebarOpen } = useAppSelector((state) => state.chat);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = async () => {
    await dispatch(logout());
    dispatch(resetChats()); 
    navigate("/login");
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-1"
              onClick={() => dispatch(toggleSidebar())}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Aelyra" className="h-8 w-8 rounded-full" />
            <span className="text-xl font-bold hidden sm:inline">Aelyra</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMenu(!showMenu)}
              >
                {user?.avatar ? (
                  <img
                    src={user?.profileImage ? `data:image/png;base64,${user.profileImage}` : defaultProfileIcon}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </Button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
