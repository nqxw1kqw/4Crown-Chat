'use client';

import React, { useEffect, useState } from 'react';
import { useAppData } from '@/components/providers/AppDataProvider';
import { hasStoredLocale } from '@/i18n/LocaleContext';
import LanguageGate from '@/components/boot/LanguageGate';
import BootLoader from '@/components/boot/BootLoader';
import BootError from '@/components/boot/BootError';
import IdentityModal from '@/components/profile/IdentityModal';
import Navbar from '@/components/layout/Navbar';
import ProfileModal from '@/components/profile/ProfileModal';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { phase, bootDone, retry } = useAppData();
  // null = chưa đọc được localStorage (server render + cữ hydrate đầu tiên).
  const [languageDone, setLanguageDone] = useState<boolean | null>(null);
  const [loaderDone, setLoaderDone] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setLanguageDone(hasStoredLocale()); setLoaderDone(sessionStorage.getItem("4crown-boot-done") === "1"); }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (languageDone === null) return null;

  if (!languageDone) {
    return <LanguageGate onContinue={() => setLanguageDone(true)} />;
  }

  if (!loaderDone) {
    return <BootLoader bootDone={bootDone} onComplete={() => { sessionStorage.setItem("4crown-boot-done", "1"); setLoaderDone(true); }} />;
  }

  if (phase === 'error') {
    return (
      <BootError
        onRetry={() => {
          setLoaderDone(false);
          retry();
        }}
      />
    );
  }

  if (phase === 'identity') {
    return <IdentityModal />;
  }

  return (
    <>
      <Navbar onOpenProfile={() => setProfileOpen(true)} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8 2xl:px-12 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
}
