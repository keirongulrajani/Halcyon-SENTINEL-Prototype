import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AssessmentService } from '@/application/assessment-service';
import type { FindingsService } from '@/application/findings-service';
import type { ImportService } from '@/application/import-service';
import type { RecordStore } from '@/domain/ports';

export interface Services {
  readonly recordStore: RecordStore;
  readonly assessmentService: AssessmentService;
  readonly findingsService: FindingsService;
  readonly importService: ImportService;
  readonly currentAssessor: string;
}

const ServicesContext = createContext<Services | null>(null);

interface ServicesProviderProps {
  readonly services: Services;
  readonly children: ReactNode;
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (services === null) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return services;
}
