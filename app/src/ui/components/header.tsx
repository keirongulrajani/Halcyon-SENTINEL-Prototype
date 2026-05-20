import { Link, NavLink } from 'react-router-dom';
import { useServices } from '@/ui/providers/services-context';
import { cn } from './utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/records', label: 'Records', end: false },
  { to: '/findings', label: 'Findings', end: false },
  { to: '/intake', label: 'New assessment', end: false },
] as const;

export function Header() {
  const { currentAssessor } = useServices();

  return (
    <header className="bg-primary text-white">
      <div className="max-w-[1400px] mx-auto px-page py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex flex-col leading-tight no-underline text-white">
          <span className="text-h1 font-bold">Halcyon</span>
          <span className="text-label text-white/70 font-normal">SENTINEL Onboarding</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 text-body rounded-card no-underline transition-colors',
                  'min-h-[44px] inline-flex items-center',
                  isActive
                    ? 'bg-white text-primary font-medium'
                    : 'text-white/90 hover:bg-white/10',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-label text-white/80">
          <span className="hidden md:inline">Signed in as</span>
          <strong className="font-medium text-white">{currentAssessor}</strong>
        </div>
      </div>
    </header>
  );
}
