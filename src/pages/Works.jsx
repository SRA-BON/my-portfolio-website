import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { GithubIcon } from '../components/Icons';

export default function Works() {
  const [isMobileScreen, setIsMobileScreen] = useState(window.innerWidth <= 480);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth <= 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const getMobileCardVariant = (index) => ({
    hidden: {
      opacity: 0,
      x: index % 2 === 0 ? -40 : 40,
      y: 16
    },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut" }
    }
  });

  const projects = [
    { title: "PrintCraft Store", description: "A MERN stack based e-commerce website featuring interactive canvas customization, a live chatbot, and seamless user experience.", category: "Web Development", github: "https://github.com/SRA-BON/printcraft-store.git", demo: "https://printcraft-store.vercel.app", bgImage: "/bg/bg (2).png" },
    { title: "Uni-Transport System", description: "A complete digital transport and parking management system for university transit, featuring digital booking and wallet payments.", category: "Web Development", github: "https://github.com/SRA-BON/University-Transport-Parking-Management-System-.git", demo: "https://uni-basement-system.web.app/login", bgImage: "/bg/bg (7).png" },
    { title: "BridgeNet Campus", description: "A comprehensive computer networks project covering socket programming, NS-3 simulation, and Cisco Packet Tracer configurations.", category: "Networking", github: "https://github.com/SRA-BON/BridgeNet-Campus", bgImage: "/bg/bg (9).png" },
    { title: "Horizon Pulse", description: "A highly detailed, custom 3D racing open-world car game built from scratch using Python and raw PyOpenGL.", category: "Game Development", github: "https://github.com/SRA-BON/horizon-pulse", bgImage: "/bg/bg (1).png" },
    { title: "Real Estate Price Prediction", description: "A Machine Learning model trained on the Melbourne housing dataset to accurately predict real estate property prices.", category: "Machine Learning", github: "https://github.com/SRA-BON/real-state-price-prediction-using-Machine-Learning-.git", bgImage: "/bg/bg (5).png" },
    { title: "Tree Sterility Analysis", description: "A Machine Learning analysis project focused on predicting and analyzing tree sterility using environmental datasets.", category: "Machine Learning", github: "https://github.com/SRA-BON/Tree-sterility-analysis-using-ML.git", bgImage: "/bg/bg (8).png" },
    { title: "VSFS (Very Simple File System)", description: "A minimalist, functional file system implementation built entirely in C to explore OS-level data structures.", category: "Systems Programming", github: "https://github.com/SRA-BON/VSFS-.git", bgImage: "/bg/bg (3).png" }
  ];

  const getDemoLabel = (category) => {
    if (category === "Web Development") return "Visit";
    if (category === "Game Development") return "Play";
    return "Explore";
  };

  return (
    <main style={{ paddingBottom: '5rem' }}>
      <section className="page-hero-section">
        <motion.div initial="hidden" animate="show" variants={fadeInUp}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, marginBottom: '1rem' }}>Selected <span className="highlight">Works</span></h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px' }}>
            A curated collection of my recent projects, demonstrating expertise in web development, machine learning, and game engineering. Each project reflects a commitment to technical excellence and user-focused design.
          </p>
        </motion.div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <motion.div 
          className="works-grid"
          variants={!isMobileScreen ? staggerContainer : undefined}
          initial={!isMobileScreen ? "hidden" : undefined}
          animate={!isMobileScreen ? "show" : undefined}
        >
          {projects.map((item, idx) => (
            <motion.div
              key={idx}
              className="work-card"
              variants={isMobileScreen ? getMobileCardVariant(idx) : fadeInUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div className="work-card-bg" style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url('${item.bgImage}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.3s ease'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  {item.category}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="work-links">
                  <a href={item.github || "#"} target={item.github ? "_blank" : "_self"} rel="noreferrer" style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <GithubIcon size={18} /> Source
                  </a>
                  <a href={item.demo || "#"} target={item.demo ? "_blank" : "_self"} rel="noreferrer" style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                    <ExternalLink size={18} /> {getDemoLabel(item.category)}
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
