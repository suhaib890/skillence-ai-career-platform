'use client';

import React, { useState } from 'react';
import { Linkedin, Github, UserRound } from 'lucide-react';
import styles from './DeveloperTeam.module.css';

const developers = [
  {
    name: 'Suhaib\nAshraf',
    displayName: 'Suhaib Ashraf',
    role: 'AI/ML Engineer',
    linkedin: 'https://www.linkedin.com/in/suhaib-ashraf01/',
    github: 'https://github.com/suhaib890',
    desc: 'Full-stack developer building AI-driven career tools.',
  },
  {
    name: 'Auj\nKhan',
    displayName: 'Auj Khan',
    role: 'Full Stack AI/ML',
    linkedin: '#',
    github: '#',
    desc: 'Developer working on the Skillence platform.',
  },
  {
    name: 'Wazid',
    displayName: 'Wazid',
    role: 'Frontend Developer',
    linkedin: '#',
    github: '#',
    desc: 'Developer contributing to frontend and integrations.',
  },
];

export default function DeveloperTeam() {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        Meet the{' '}
        <span className={styles.headingHighlight}>Developer Team</span>
      </h2>
      <div className={styles.grid}>
        {developers.map((dev, idx) => (
          <FlipCard key={idx} dev={dev} />
        ))}
      </div>
    </section>
  );
}

function FlipCard({ dev }: { dev: typeof developers[0] }) {
  const [flipped, setFlipped] = useState(false);

  function handleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('a')) return;
    setFlipped(!flipped);
  }

  return (
    <div
      className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}
      onClick={handleClick}
    >
      <div className={styles.flipInner}>
        {/* FRONT */}
        <div className={styles.flipFront}>
          <div className={styles.avatarWrap}>
            <UserRound size={40} />
          </div>
          <div className={styles.cardInner}>
            <p className={styles.name}>
              {dev.name.split('\n').map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <p className={styles.role}>{dev.role}</p>
            <div className={styles.socialRow}>
              <a
                href={dev.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label={`${dev.displayName} LinkedIn`}
              >
                <Linkedin />
              </a>
              <a
                href={dev.github}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label={`${dev.displayName} GitHub`}
              >
                <Github />
              </a>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className={styles.flipBack}>
          <div
            className={styles.avatarWrap}
            style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none', marginBottom: '0.75rem' }}
          >
            <UserRound size={36} />
          </div>
          <p className={styles.backName}>{dev.displayName}</p>
          <p className={styles.backRole}>{dev.role}</p>
          <p className={styles.backDesc}>{dev.desc}</p>
          <div className={styles.socialRow}>
            <a
              href={dev.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label={`${dev.displayName} LinkedIn`}
            >
              <Linkedin />
            </a>
            <a
              href={dev.github}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label={`${dev.displayName} GitHub`}
            >
              <Github />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}