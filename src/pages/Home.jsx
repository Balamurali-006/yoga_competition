import React, { useState, useEffect } from "react";

const Home = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting,
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-orange-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
            style={{ top: "10%", left: "10%", animationDelay: "0s" }}
          ></div>
          <div
            className="absolute w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
            style={{ top: "20%", right: "10%", animationDelay: "2s" }}
          ></div>
          <div
            className="absolute w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
            style={{ bottom: "10%", left: "30%", animationDelay: "4s" }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Text Content */}
          <div
            className="space-y-6 animate-on-scroll"
            id="hero-text"
            style={{
              opacity: isVisible["hero-text"] ? 1 : 0,
              transform: isVisible["hero-text"]
                ? "translateY(0)"
                : "translateY(50px)",
              transition: "all 0.8s ease-out",
            }}
          >
            <div className="inline-block">
              <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white text-sm font-semibold rounded-full shadow-lg">
                ✨ 2025 Edition Now Open
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Ekadhma Yoga
              </span>
              <br />
              <span className="text-gray-800">Competition 2025</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              Discover inner strength, balance, and mindfulness. Participate,
              compete, and celebrate the spirit of Yoga with practitioners from
              across the nation.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <a href="/register" className="group relative inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                <span className="relative z-10">Register Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>

              <a href="/leaderboard" className="inline-block px-8 py-4 bg-white text-purple-600 font-semibold rounded-full shadow-lg hover:shadow-xl border-2 border-purple-600 transform hover:scale-105 transition-all duration-300">
                View Leaderboard
              </a>
            </div>

            <div className="flex items-center gap-8 pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">5000+</div>
                <div className="text-sm text-gray-600">Participants</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">150+</div>
                <div className="text-sm text-gray-600">Events</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">3</div>
                <div className="text-sm text-gray-600">Levels</div>
              </div>
            </div>
          </div>

          {/* Image with Floating Animation */}
          <div
            className="relative animate-on-scroll"
            id="hero-image"
            style={{
              opacity: isVisible["hero-image"] ? 1 : 0,
              transform: isVisible["hero-image"]
                ? "translateY(0)"
                : "translateY(50px)",
              transition: "all 0.8s ease-out 0.2s",
            }}
          >
            <div
              className="relative"
              style={{
                transform: `translateY(${scrollY * 0.1}px)`,
                transition: "transform 0.1s ease-out",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-orange-400 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
              <img
                className="relative rounded-3xl shadow-2xl w-full"
                src="https://i.imgur.com/05M8HfO.png"
                alt="Yoga Pose"
              />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div
            className="text-center mb-16 animate-on-scroll"
            id="section-title"
            style={{
              opacity: isVisible["section-title"] ? 1 : 0,
              transform: isVisible["section-title"]
                ? "translateY(0)"
                : "translateY(30px)",
              transition: "all 0.6s ease-out",
            }}
          >
            <h2 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                Why Participate?
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of yoga enthusiasts in this transformative journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: "🧘",
                title: "Discipline",
                desc: "Enhance your mental and physical discipline through guided asanas and expert mentorship.",
                color: "from-purple-500 to-purple-600",
                delay: 0,
              },
              {
                icon: "🏆",
                title: "Competition",
                desc: "Showcase your skills in District, State, and National level events with fair judging.",
                color: "from-orange-500 to-orange-600",
                delay: 0.1,
              },
              {
                icon: "📈",
                title: "Growth",
                desc: "Improve posture, flexibility, balance, and confidence with structured training programs.",
                color: "from-pink-500 to-pink-600",
                delay: 0.2,
              },
              {
                icon: "🌟",
                title: "Recognition",
                desc: "Winners receive certificates, medals, trophies, and national recognition for excellence.",
                color: "from-indigo-500 to-indigo-600",
                delay: 0.3,
              },
            ].map((card, index) => (
              <div
                key={index}
                className="animate-on-scroll"
                id={`card-${index}`}
                style={{
                  opacity: isVisible[`card-${index}`] ? 1 : 0,
                  transform: isVisible[`card-${index}`]
                    ? "translateY(0)"
                    : "translateY(50px)",
                  transition: `all 0.6s ease-out ${card.delay}s`,
                }}
              >
                <div className="group relative h-full bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 transform hover:-translate-y-2">
                  {/* Gradient Border Effect */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`}
                  ></div>

                  <div
                    className={`text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    {card.icon}
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-gray-800">
                    {card.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed">{card.desc}</p>

                  {/* Hover Accent */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-2xl`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;