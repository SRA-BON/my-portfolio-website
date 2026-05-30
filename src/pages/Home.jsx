import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Mail, ExternalLink } from 'lucide-react';
import { GithubIcon, LinkedinIcon, FacebookIcon } from '../components/Icons';
import { Link } from 'react-router-dom';
import StarField from '../components/StarField';
import NatureField from '../components/NatureField';

export default function Home({ theme = 'gaming' }) {
  const containerRef = useRef(null);
  const showStars = theme === 'gaming';
  const showNature = theme === 'light';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', onResize);

    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Good morning!');
      else if (hour >= 12 && hour < 17) setGreeting('Good afternoon!');
      else setGreeting('Good evening!');
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);

    return () => {
      window.removeEventListener('resize', onResize);
      clearInterval(interval);
    };
  }, []);

  const scrollHeight = isMobile ? '250vh' : '400vh';
  const { scrollYProgress } = useScroll();

  // Animation ranges optimized for a more immediate feel
  // Hello animates from opacity 0 to 1 and drops down as soon as scrolling starts
  const hiRange = [0, 0.08];
  const nameRange = [0.05, 0.25];
  const descRange = [0.2, 0.45];
  const ctaRange = [0.4, 0.65];

  // "Hello," drops from top
  const hiYRaw = useTransform(scrollYProgress, hiRange, ['-15vh', '0vh']);
  const hiOpacity = useTransform(scrollYProgress, hiRange, [0, 1]);
  const hiY = useSpring(hiYRaw, { stiffness: 120, damping: 12, mass: 1 });
  
  // "I'm Srabon." fades in
  const nameOpacity = useTransform(scrollYProgress, nameRange, [0, 1]);
  const nameYRaw = useTransform(scrollYProgress, nameRange, [30, 0]);
  const nameY = useSpring(nameYRaw, { stiffness: 120, damping: 12, mass: 1 });

  // Description fades in
  const descOpacity = useTransform(scrollYProgress, descRange, [0, 1]);
  const descYRaw = useTransform(scrollYProgress, descRange, [30, 0]);
  const descY = useSpring(descYRaw, { stiffness: 120, damping: 12, mass: 1 });

  // Socials and Buttons fade in
  const ctaOpacity = useTransform(scrollYProgress, ctaRange, [0, 1]);
  const ctaYRaw = useTransform(scrollYProgress, ctaRange, [30, 0]);
  const ctaY = useSpring(ctaYRaw, { stiffness: 120, damping: 12, mass: 1 });

  // ─── DYNA / MITE scroll animation ───
  const dynaRange = [0, 0.15, 0.35];
  const dynaXRaw = useTransform(scrollYProgress, dynaRange, [isMobile ? 50 : 100, 0, isMobile ? -60 : -120]);
  const miteXRaw = useTransform(scrollYProgress, dynaRange, [isMobile ? -50 : -100, 0, isMobile ? 60 : 120]);
  const dynamiteOpacity = useTransform(scrollYProgress, [0, 0.1, 0.3, 0.4], [0, 0.08, 0.08, 0]);

  const dynaX = useSpring(dynaXRaw, { stiffness: 60, damping: 20, mass: 1.5 });
  const miteX = useSpring(miteXRaw, { stiffness: 60, damping: 20, mass: 1.5 });

  const dynamiteTextStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900,
    fontStyle: 'italic',
    fontSize: isMobile ? 'clamp(5rem, 30vw, 10rem)' : 'clamp(10rem, 22vw, 22rem)',
    lineHeight: 1,
    color: 'var(--primary-color)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '-0.04em',
    textShadow: '0 0 80px rgba(var(--primary-color), 0.15)',
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <main>
      {/* Scroll-responsive Parallax Hero Section */}
      <section ref={containerRef} style={{ height: scrollHeight, position: 'relative', padding: 0 }}>
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          height: '100dvh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          overflow: 'hidden',
          padding: isMobile ? '0 1rem' : '0 1.5rem',
          textAlign: 'center'
        }}>
          {/* Starfield — dark & gaming themes only */}
          {showStars && <StarField />}
          {/* NatureField — light theme only */}
          {showNature && <NatureField />}

          {/* ─── DYNA / MITE background text ─── */}
          <motion.div
            style={{ opacity: dynamiteOpacity }}
            aria-hidden="true"
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
              gap: isMobile ? '0' : '0.5rem',
            }}>
              <motion.span style={{ ...dynamiteTextStyle, x: dynaX }}>
                DYNA
              </motion.span>
              <motion.span style={{ ...dynamiteTextStyle, x: miteX }}>
                MITE
              </motion.span>
            </div>
          </motion.div>

          {/* Content sits above the DYNA/MITE text */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px' }}>

          <motion.h1 style={{ 
            fontSize: 'clamp(3.5rem, 12vw, 8rem)', 
            fontWeight: 800, 
            margin: 0, 
            lineHeight: 1,
            opacity: hiOpacity,
            y: hiY 
          }}>
            {greeting}
          </motion.h1>

          <motion.div style={{ opacity: nameOpacity, y: nameY, textAlign: 'center', marginTop: isMobile ? '0.5rem' : '1rem' }}>
            <h2 style={{ fontSize: 'clamp(2.25rem, 10vw, 5rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
              I'm <span className="highlight">Srabon</span>
            </h2>
          </motion.div>

          <motion.div style={{ opacity: descOpacity, y: descY, textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ fontSize: 'clamp(1.15rem, 4vw, 1.75rem)', opacity: 0.8, maxWidth: '600px', margin: '0 auto', padding: '0 1rem' }}>
              Software Engineer & AI Integrator
            </p>
            <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', opacity: 0.6, maxWidth: '500px', margin: '1rem auto 0', padding: '0 1rem', lineHeight: 1.5 }}>
              I architect sophisticated, high-performance web ecosystems and integrate intelligent machine learning solutions to create seamless, data-driven digital experiences.
            </p>
          </motion.div>

          <motion.div style={{ opacity: ctaOpacity, y: ctaY, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '1.5rem' : '2rem', marginTop: isMobile ? '2rem' : '3rem' }}>
            <div style={{ display: 'flex', gap: isMobile ? '2rem' : '1.5rem' }}>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&cc=srabon.mondol.2003@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="Email" style={{ color: 'var(--text-color)', transition: 'color 0.2s ease' }} className="social-link"><Mail size={isMobile ? 28 : 28} /></a>
              <a href="https://github.com/SRA-BON" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{ color: 'var(--text-color)', transition: 'color 0.2s ease' }} className="social-link"><GithubIcon size={isMobile ? 28 : 28} /></a>
              <a href="https://www.linkedin.com/in/srabon-mondal-0565303b0" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: 'var(--text-color)', transition: 'color 0.2s ease' }} className="social-link"><LinkedinIcon size={isMobile ? 28 : 28} /></a>
              <a href="https://www.facebook.com/share/19QATUKjqY/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'var(--text-color)', transition: 'color 0.2s ease' }} className="social-link"><FacebookIcon size={isMobile ? 28 : 28} /></a>
            </div>

            <div className="cta-group">
              <Link to="/career" className="btn-primary">Career</Link>
              <Link to="/works" className="btn-secondary">View Works</Link>
            </div>
          </motion.div>

          </div>{/* end content wrapper */}
        </div>
      </section>

      <section id="about">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="section-title">About Me</h2>
          <p style={{ maxWidth: '800px', fontSize: '1.125rem', opacity: 0.8 }}>
            I am a results-driven Software Engineer and AI Integrator specializing in the intersection of high-performance web architecture and intelligent systems. 
            With a strong foundation in machine learning and full-stack development, I focus on building scalable, efficient, and user-centric digital solutions that solve complex real-world challenges.
          </p>
        </motion.div>
      </section>

      <section id="contact">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Let's Connect</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.125rem', opacity: 0.8 }}>
            I am currently open to new opportunities, collaborations, and discussions regarding innovative technology projects. 
            Whether you have a specific proposal or simply wish to connect, feel free to reach out.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&cc=srabon.mondol.2003@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="Email" style={{ color: 'var(--text-color)' }} className="social-link"><Mail size={32} /></a>
              <a href="https://github.com/SRA-BON" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{ color: 'var(--text-color)' }} className="social-link"><GithubIcon size={32} /></a>
              <a href="https://www.linkedin.com/in/srabon-mondal-0565303b0" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: 'var(--text-color)' }} className="social-link"><LinkedinIcon size={32} /></a>
              <a href="https://www.facebook.com/share/19QATUKjqY/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'var(--text-color)' }} className="social-link"><FacebookIcon size={32} /></a>
            </div>
        </motion.div>
      </section>
    </main>
  );
}
