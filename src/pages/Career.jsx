import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Career() {
  const [isMobileScreen, setIsMobileScreen] = useState(window.innerWidth <= 480);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth <= 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const getMobileTimelineVariant = (index) => ({
    hidden: {
      opacity: 0,
      x: index % 2 === 0 ? -40 : 40,
      y: 16
    },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.55, ease: 'easeOut' }
    }
  });

  const roadmapData = [
    { year: "2024", title: "Advanced Machine Learning Specialization", desc: "Focused on neural network architectures, data engineering pipelines, and predictive modeling to solve complex data challenges." },
    { year: "2023", title: "Full-Stack Software Engineering", desc: "Architected dynamic web ecosystems using React, Node.js, and advanced CSS, with a focus on high-performance and scalable user experiences." },
    { year: "2022", title: "Foundational Systems & Programming", desc: "Established a strong technical foundation in Python and JavaScript, developing algorithmic solutions and responsive web interfaces." }
  ];

  return (
    <main style={{ paddingBottom: '5rem' }}>
      <section className="page-hero-section">
        <motion.div initial="hidden" animate="show" variants={fadeInUp}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, marginBottom: '1rem' }}>Professional <span className="highlight">Timeline</span></h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px' }}>
            A professional timeline detailing my evolution from foundational programming to architecting sophisticated software ecosystems and AI integrations.
          </p>
        </motion.div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="timeline-container">
          {roadmapData.map((item, index) => (
            <motion.div 
              key={index} 
              className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}
              variants={isMobileScreen ? getMobileTimelineVariant(index) : fadeInUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
            >
              <div className="timeline-content">
                <div className="timeline-year">{item.year}</div>
                <h3 style={{ margin: '0.5rem 0' }}>{item.title}</h3>
                <p style={{ margin: 0 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
