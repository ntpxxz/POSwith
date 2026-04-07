import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface TimerBarProps {
  totalSeconds: number;
  onExpire: () => void;
}

export default function TimerBar({ totalSeconds, onExpire }: TimerBarProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining <= 0, onExpire]);

  const progress = remaining / totalSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const barColor = remaining > 60
    ? 'bg-pos-accent-success'
    : remaining > 20
    ? 'bg-pos-accent-warning'
    : 'bg-pos-accent-danger';

  const textColor = remaining > 60
    ? 'text-pos-accent-success'
    : remaining > 20
    ? 'text-pos-accent-warning'
    : 'text-pos-accent-danger';

  const shouldPulse = remaining <= 20 && remaining > 0;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-pos-xs text-pos-text-secondary">Time remaining</span>
        <span className={clsx('font-mono text-pos-md font-bold', textColor, shouldPulse && 'animate-pulse')}>
          {timeStr}
        </span>
      </div>
      <div className="w-full h-2 bg-pos-bg-primary rounded-full overflow-hidden">
        <motion.div
          className={clsx('h-full rounded-full', barColor, shouldPulse && 'animate-pulse')}
          initial={{ width: '100%' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
