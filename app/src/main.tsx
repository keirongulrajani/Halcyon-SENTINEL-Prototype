import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CsvRecordSource } from '@/adapters/csv-record-source';
import { LocalStorageRecordStore } from '@/adapters/local-storage-record-store';
import { SystemClock } from '@/adapters/system-clock';
import { SequentialClientIdGenerator } from '@/adapters/sequential-client-id-generator';
import { CryptoIdGenerator } from '@/adapters/crypto-id-generator';
import { StaticRulesSource } from '@/adapters/static-rules-source';
import { makeAssessmentService } from '@/application/assessment-service';
import { makeFindingsService } from '@/application/findings-service';
import { makeImportService } from '@/application/import-service';
import { ServicesProvider } from '@/ui/providers/services-context';
import type { Services } from '@/ui/providers/services-context';
import { DEMO_CURRENT_RELATIONSHIP_MANAGER } from '@/config/relationship-managers';
import { App } from '@/ui/App';
import './index.css';

async function bootstrap(): Promise<Services> {
  const recordStore = new LocalStorageRecordStore({});
  const rulesSource = new StaticRulesSource();
  const rules = await rulesSource.load();

  if (!recordStore.hasSeed()) {
    const csvSource = new CsvRecordSource({});
    const seedRecords = await csvSource.load();
    recordStore.seed(seedRecords);
  }

  const clock = new SystemClock();
  const clientIdGenerator = new SequentialClientIdGenerator(recordStore);
  const amendmentIdGenerator = new CryptoIdGenerator();
  const currentAssessor = DEMO_CURRENT_RELATIONSHIP_MANAGER;

  const assessmentService = makeAssessmentService({
    recordStore,
    clock,
    clientIdGenerator,
    amendmentIdGenerator,
    currentAssessor,
    rules,
  });

  const findingsService = makeFindingsService({ recordStore, rules });
  const importService = makeImportService({ recordStore });

  return { recordStore, assessmentService, findingsService, importService, currentAssessor };
}

function renderApp(services: Services): void {
  const container = document.getElementById('root');
  if (container === null) throw new Error('Root container #root not found');

  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <ServicesProvider services={services}>
          <App />
        </ServicesProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

function renderBootstrapError(message: string): void {
  const container = document.getElementById('root');
  if (container === null) return;
  container.innerHTML = `<div style="padding:24px;font-family:Inter,system-ui,sans-serif;color:#9B2226">Failed to start: ${message}</div>`;
}

bootstrap()
  .then(renderApp)
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    renderBootstrapError(message);
  });
