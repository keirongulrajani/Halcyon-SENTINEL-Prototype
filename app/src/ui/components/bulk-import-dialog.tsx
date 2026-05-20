import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/components/dialog';
import { Button } from '@/ui/components/button';
import { useServices } from '@/ui/providers/services-context';
import { cn } from '@/ui/components/utils';
import {
  KpiTile,
  MissingHeadersBanner,
  FailuresList,
  DuplicatesList,
} from '@/ui/components/bulk-import-views';
import type {
  ImportPreview,
  ImportCommitResult,
} from '@/application/import-service';

interface BulkImportDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type Stage =
  | { readonly kind: 'pick' }
  | { readonly kind: 'preview'; readonly preview: ImportPreview }
  | { readonly kind: 'result'; readonly result: ImportCommitResult };

const INITIAL_STAGE: Stage = { kind: 'pick' };

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { importService } = useServices();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>(INITIAL_STAGE);
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    setStage(INITIAL_STAGE);
    setCsvContent('');
    setFileName(null);
    setPendingFileName(null);
    setShowPaste(false);
    setPasteValue('');
    setIsReadingFile(false);
    setIsParsing(false);
    if (fileInputRef.current !== null) fileInputRef.current.value = '';
  }, [open]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setPendingFileName(file.name);
    setIsReadingFile(true);
    try {
      const text = await file.text();
      setCsvContent(text);
      setFileName(file.name);
      setShowPaste(false);
      setPasteValue('');
    } finally {
      setIsReadingFile(false);
      setPendingFileName(null);
    }
  }
  function handlePasteChange(value: string) {
    setPasteValue(value);
    setCsvContent(value);
    setFileName(null);
  }
  function handleParse() {
    if (csvContent.trim() === '') return;
    setIsParsing(true);
    requestAnimationFrame(() => {
      const preview = importService.parseAndValidate(csvContent);
      setStage({ kind: 'preview', preview });
      setIsParsing(false);
    });
  }
  function handleConfirm(preview: ImportPreview) {
    setStage({ kind: 'result', result: importService.commit(preview) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {stage.kind === 'pick' && (
          <PickStage
            fileInputRef={fileInputRef}
            fileName={fileName}
            pendingFileName={pendingFileName}
            showPaste={showPaste}
            pasteValue={pasteValue}
            hasContent={csvContent.trim() !== ''}
            isReadingFile={isReadingFile}
            isParsing={isParsing}
            onFileChange={handleFileChange}
            onTogglePaste={() => setShowPaste((prev) => !prev)}
            onPasteChange={handlePasteChange}
            onParse={handleParse}
          />
        )}
        {stage.kind === 'preview' && (
          <PreviewStage
            preview={stage.preview}
            onBack={() => setStage(INITIAL_STAGE)}
            onConfirm={() => handleConfirm(stage.preview)}
          />
        )}
        {stage.kind === 'result' && (
          <>
            <DialogHeader>
              <DialogTitle>Import complete</DialogTitle>
              <DialogDescription>The records have been added to the workspace.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiTile label="Imported" value={stage.result.importedCount} tone="success" />
              <KpiTile label="Duplicates skipped" value={stage.result.duplicateCount} tone="warning" />
              <KpiTile label="Invalid rows skipped" value={stage.result.failureCount} tone="error" />
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PickStageProps {
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly fileName: string | null;
  readonly pendingFileName: string | null;
  readonly showPaste: boolean;
  readonly pasteValue: string;
  readonly hasContent: boolean;
  readonly isReadingFile: boolean;
  readonly isParsing: boolean;
  readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onTogglePaste: () => void;
  readonly onPasteChange: (value: string) => void;
  readonly onParse: () => void;
}

function PickStage(props: PickStageProps) {
  const isWorking = props.isReadingFile || props.isParsing;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bulk import client records</DialogTitle>
        <DialogDescription>
          Upload a CSV with the same columns as the seed data. Each row will be
          validated; you&rsquo;ll see a preview before anything is committed.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <input
            ref={props.fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={props.onFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => props.fileInputRef.current?.click()}
            disabled={isWorking}
          >
            {props.isReadingFile ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {props.isReadingFile
              ? 'Reading file…'
              : props.fileName === null
                ? 'Choose CSV file'
                : 'Replace file'}
          </Button>
          {props.isReadingFile && props.pendingFileName !== null && (
            <p
              className="text-label tabular text-neutral flex items-center gap-1"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Reading {props.pendingFileName}…
            </p>
          )}
          {!props.isReadingFile && props.fileName !== null && (
            <p className="text-label tabular">Selected: {props.fileName}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={props.onTogglePaste}
            className="text-label text-primary text-left underline-offset-2 hover:underline"
            aria-expanded={props.showPaste}
          >
            {props.showPaste ? 'Hide paste area' : 'Paste CSV text instead'}
          </button>
          {props.showPaste && (
            <textarea
              value={props.pasteValue}
              onChange={(event) => props.onPasteChange(event.target.value)}
              placeholder="Paste CSV content here, including the header row."
              rows={8}
              className={cn(
                'w-full rounded-md border border-neutral/30 bg-card p-3',
                'text-body font-mono tabular',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              )}
            />
          )}
        </div>
      </div>

      <DialogFooter>
        <Button onClick={props.onParse} disabled={!props.hasContent || isWorking}>
          {props.isParsing && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {props.isParsing ? 'Parsing…' : 'Parse & preview'}
        </Button>
      </DialogFooter>
    </>
  );
}

interface PreviewStageProps {
  readonly preview: ImportPreview;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
}

function PreviewStage({ preview, onBack, onConfirm }: PreviewStageProps) {
  const blocked = preview.missingHeaders.length > 0;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Import preview</DialogTitle>
        <DialogDescription>
          {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} parsed from the file.
        </DialogDescription>
      </DialogHeader>

      {blocked ? (
        <MissingHeadersBanner headers={preview.missingHeaders} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiTile label="Ready to import" value={preview.newRecords.length} tone="success" />
            <KpiTile label="Duplicates (will be skipped)" value={preview.duplicates.length} tone="warning" />
            <KpiTile label="Invalid rows (will be skipped)" value={preview.failures.length} tone="error" />
          </div>
          {preview.failures.length > 0 && <FailuresList failures={preview.failures} />}
          {preview.duplicates.length > 0 && <DuplicatesList duplicates={preview.duplicates} />}
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={onBack}>Back</Button>
        {!blocked && (
          <Button onClick={onConfirm} disabled={preview.newRecords.length === 0}>
            Confirm import
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

