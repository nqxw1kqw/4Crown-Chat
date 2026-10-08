import { LocaleProvider } from '@/i18n/LocaleContext';
import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppDataProvider } from '@/components/providers/AppDataProvider';
import AppGate from '@/components/app/AppGate';

// AppGate không render children khi còn ở màn hình language/boot,
// nên Next không thể validate instant navigation cho các page bên trong.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ToastProvider>
        <TooltipProvider delayDuration={200}>
          <AppDataProvider>
            <AppGate>{children}</AppGate>
          </AppDataProvider>
        </TooltipProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
