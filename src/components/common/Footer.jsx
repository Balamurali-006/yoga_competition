import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const developers = [
  {
    id: 1,
    name: "Bala Murali",
    role: "Fullstack Developer",
    quote: "I don't just write code, I craft solutions with purpose and curiosity.",
    skills: ["React", "Next", "PHP", "MongoDB"],
    instagram: "https://www.instagram.com/.dark_hand/",
    github: "https://github.com/Balamurali-006",
    linkedin: "https://www.linkedin.com/in/balamurali-m-940879316/",
    portfolio: "https://balamuraliportfolio.netlify.app/",
  },
  {
    id: 2,
    name: "Deepitha",
    role: "Fullstack Developer",
    quote: "Developing isn't just about code — it's about curiosity meeting intention.",
    skills: ["React", "Python", "MySQL", "Java"],
    instagram: "https://www.instagram.com/afficionado_space/",
    github: "https://github.com/Deepitha123",
    linkedin: "https://www.linkedin.com/in/deepitha-m-76961928b/",
    portfolio: "https://drive.google.com/file/d/1JP42mgaIlCMrFEe8-4NuzxR5IexdTv0I/view?usp=sharing",
  },
];

const socialIcons = {
  instagram: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle className="developer-social__dot" cx="18" cy="6" r="1" />
    </svg>
  ),
  github: (
    <svg aria-hidden="true" className="developer-social__filled" viewBox="0 0 24 24">
      <path d="M12 2.5a9.5 9.5 0 0 0-3 18.52c.48.09.65-.2.65-.46v-1.64c-2.65.58-3.21-1.12-3.21-1.12-.43-1.1-1.06-1.39-1.06-1.39-.87-.59.07-.58.07-.58.96.07 1.46.98 1.46.98.86 1.46 2.24 1.04 2.79.8.09-.62.34-1.04.61-1.28-2.12-.24-4.35-1.06-4.35-4.72 0-1.04.37-1.9.98-2.57-.1-.24-.43-1.21.09-2.53 0 0 .8-.26 2.62.98A9.1 9.1 0 0 1 12 7.16c.81 0 1.62.11 2.38.33 1.82-1.24 2.62-.98 2.62-.98.52 1.32.19 2.29.09 2.53.61.67.98 1.53.98 2.57 0 3.67-2.23 4.48-4.36 4.71.35.31.65.88.65 1.78v2.46c0 .26.17.56.66.46A9.5 9.5 0 0 0 12 2.5Z" />
    </svg>
  ),
  linkedin: (
    <svg aria-hidden="true" className="developer-social__filled" viewBox="0 0 24 24">
      <path d="M5.2 8.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM3.7 9.7h3v10h-3v-10Zm4.9 0h2.9v1.37h.04c.4-.76 1.38-1.56 2.83-1.56 3.02 0 3.58 1.99 3.58 4.57v5.62h-3.02v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.91 1.3-1.91 2.63v5.07H8.6v-10Z" />
    </svg>
  ),
  portfolio: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
};

const socialProfiles = [
  ["instagram", "Instagram"],
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["portfolio", "Portfolio"],
];

const Footer = () => {
  const [developersOpen, setDevelopersOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!developersOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDevelopersOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusableElements = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [developersOpen]);

  const closeDevelopers = () => setDevelopersOpen(false);

  return (
    <>
      <footer className="site-footer">
        <span className="site-footer__copyright">
          © {new Date().getFullYear()} Ekadhma Yoga Association – All Rights Reserved
        </span>
        <span className="site-footer__credit">
          Designed and developed by developers of <strong>Team DeepLenzing</strong>
        </span>
        <div className="site-footer__actions">
          <button
            className="site-footer__developers-button"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={developersOpen}
            onClick={() => setDevelopersOpen(true)}
          >
            View developers
            <span aria-hidden="true">↗</span>
          </button>
          <Link
            to="/admin/login"
            className="site-footer__admin-link"
            aria-label="Admin login"
            title="Admin login"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
          </Link>
        </div>
      </footer>

      {developersOpen && (
        <div
          className="developers-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDevelopers();
          }}
        >
          <section
            ref={dialogRef}
            className="developers-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="developers-title"
          >
            <button
              ref={closeButtonRef}
              className="developers-modal__close"
              type="button"
              aria-label="Close developers popup"
              onClick={closeDevelopers}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>

            <div className="developers-modal__heading">
              <span className="developers-modal__eyebrow">TEAM DEEPLENZING</span>
              <h2 id="developers-title">Meet the developers</h2>
              <p>Thoughtful ideas, carefully crafted into this experience.</p>
            </div>

            <div className="developers-grid">
              {developers.map((developer) => {
                const initials = developer.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("");

                return (
                  <article className="developer-card" key={developer.id}>
                    <div className="developer-card__header">
                      <div className="developer-card__avatar" aria-hidden="true">
                        {initials}
                      </div>
                      <div>
                        <h3>{developer.name}</h3>
                        <span className="developer-card__role">{developer.role}</span>
                      </div>
                    </div>

                    <blockquote>“{developer.quote}”</blockquote>

                    <ul className="developer-card__skills" aria-label={`${developer.name}'s skills`}>
                      {developer.skills.map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>

                    <div className="developer-card__socials">
                      {socialProfiles.map(([key, label]) => (
                        <a
                          key={key}
                          href={developer[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${developer.name} on ${label}`}
                          title={label}
                        >
                          {socialIcons[key]}
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Footer;
