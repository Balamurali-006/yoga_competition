import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/register", label: "Register", icon: "📝" },
    { path: "/school-registration", label: "School Entry", icon: "🏫" },
    { path: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    { path: "/committee/login", label: "Committee", icon: "👥" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg"
            : "bg-white/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full flex items-center justify-center text-xl sm:text-2xl transform group-hover:scale-110 transition-transform duration-300">
                  🧘
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                  Ekadhma Yoga
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-500 -mt-0.5 sm:-mt-1">Competition 2025</p>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3 xl:px-4 py-2 rounded-full font-medium transition-all duration-300 text-sm xl:text-base ${
                    isActive(link.path)
                      ? "text-white"
                      : "text-gray-700 hover:text-purple-600"
                  }`}
                >
                  {isActive(link.path) && (
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-500 rounded-full"></span>
                  )}
                  <span className="relative flex items-center space-x-1.5 xl:space-x-2">
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                  {!isActive(link.path) && (
                    <span className="absolute inset-0 bg-gray-100 rounded-full opacity-0 hover:opacity-100 transition-opacity -z-10"></span>
                  )}
                </Link>
              ))}
            </div>

            {/* CTA Button (Desktop) */}
            <div className="hidden lg:block flex-shrink-0">
              <Link
                to="/register"
                className="group relative px-4 xl:px-6 py-2.5 xl:py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden text-sm xl:text-base"
              >
                <span className="relative z-10">Join Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden relative w-10 h-10 flex items-center justify-center focus:outline-none flex-shrink-0"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-full bg-gray-800 rounded-full transform transition-all duration-300 ${
                    open ? "rotate-45 translate-y-2" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-full bg-gray-800 rounded-full transition-all duration-300 ${
                    open ? "opacity-0" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-full bg-gray-800 rounded-full transform transition-all duration-300 ${
                    open ? "-rotate-45 -translate-y-2" : ""
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            open ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-gray-200">
            <div className="px-4 sm:px-6 py-4 space-y-1">
              {navLinks.map((link, index) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-lg scale-105"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: open ? "slideIn 0.3s ease-out forwards" : "none",
                  }}
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                </Link>
              ))}
              <div className="pt-4">
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Join Now
                </Link>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16 sm:h-20"></div>
    </>
  );
};

export default Navbar;