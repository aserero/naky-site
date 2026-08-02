import React, { useEffect, useRef, useState } from 'react';
import { CONTACT } from '@/lib/constants';

const counters = [
  { value: 500, suffix: '+', label: 'Clients satisfaits', emoji: '😊' },
  { value: 3200, suffix: '+', label: 'Interventions réalisées', emoji: '🧹' },
  { value: 98, suffix: '%', label: 'Taux de satisfaction', emoji: '⭐' },
  { value: 50, suffix: '%', label: "d'économie grâce au crédit d'impôt", emoji: '💶' },
];

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);

  return count;
}

function Counter({ value, suffix, label, emoji, start }) {
  const count = useCountUp(value, 1800, start);
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white/70 backdrop-blur rounded-2xl shadow-sm">
      <span className="text-3xl mb-2">{emoji}</span>
      <span className="text-4xl font-bold text-[#E95678]">
        {count.toLocaleString('fr-FR')}{suffix}
      </span>
      <span className="text-sm text-slate-600 mt-2 leading-snug">{label}</span>
    </div>
  );
}

export default function AnimatedCounters() {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-4 w-full max-w-sm mx-auto md:mx-0">
      <div className="grid grid-cols-2 gap-4">
        {counters.map((c) => (
          <Counter key={c.label} {...c} start={started} />
        ))}
      </div>
      <a
        href={CONTACT.phoneHref}
        className="flex items-center justify-center gap-3 bg-white/70 backdrop-blur rounded-2xl shadow-sm px-6 py-4 text-slate-800 font-semibold hover:text-[#E95678] transition-colors text-lg"
      >
        <svg className="w-5 h-5 text-[#E95678] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        {CONTACT.phone}
      </a>
    </div>
  );
}