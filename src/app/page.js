'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-600 to-purple-600 flex flex-col items-center justify-center px-4">
      <motion.h1
        className="text-6xl md:text-8xl font-extrabold text-white mb-6 text-center"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Quiz Pilot
      </motion.h1>

      <motion.p
        className="text-xl md:text-2xl text-white mb-12 max-w-3xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        Transform your documents into interactive quizzes and elevate your learning experience.
      </motion.p>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <Link href="/upload" className="px-8 py-4 bg-white text-indigo-600 rounded-full text-lg font-semibold shadow-lg hover:bg-gray-100 transition">
          Get Started
        </Link>
      </motion.div>
    </div>
  );
}
