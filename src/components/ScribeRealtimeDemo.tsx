import { CommitStrategy, useScribe } from '@elevenlabs/react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

const primaryButtonClass =
  'demo-primary-button';

const secondaryButtonStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(16, 24, 40, 0.04)',
  border: '1px solid rgba(16, 24, 40, 0.08)',
  borderRadius: 999,
  color: '#101828',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '0.875rem',
  fontWeight: 400,
  gap: '0.42rem',
  height: '1.75rem',
  justifyContent: 'center',
  lineHeight: '140%',
  letterSpacing: 0,
  padding: '0 0.75rem',
  transition: 'transform 0.2s ease-out, background-color 0.2s ease-out'
};

const disabledButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  cursor: 'not-allowed',
  opacity: 0.55
};

const panelStyle: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '1.15rem',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
  padding: '1rem'
};

const shellStyle: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '1.25rem',
  padding: '0.9rem',
  position: 'relative'
};

const toolbarStyle: CSSProperties = {
  paddingBottom: '0.85rem'
};

const infoPillStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(16, 24, 40, 0.035)',
  borderRadius: 999,
  color: '#475467',
  display: 'inline-flex',
  fontSize: '0.78rem',
  fontWeight: 500,
  lineHeight: 1.1,
  padding: '0.4rem 0.68rem'
};

const transcriptCardStyle: CSSProperties = {
  background: 'transparent'
};

const commitTransferLayerStyle: CSSProperties = {
  inset: 0,
  pointerEvents: 'none',
  position: 'absolute',
  zIndex: 30
};

const languageBadgeStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(16, 24, 40, 0.05)',
  borderRadius: 999,
  color: '#475467',
  display: 'inline-flex',
  fontSize: '0.68rem',
  fontWeight: 600,
  lineHeight: 1,
  padding: '0.24rem 0.5rem',
  textTransform: 'uppercase'
};

const liveBlockStyle: CSSProperties = {
  background: 'transparent',
  borderRadius: '0.75rem',
  padding: '0.72rem 0.8rem'
};

const sectionHeaderStyle: CSSProperties = {
  paddingBottom: '0.65rem'
};

const emptyStateStyle: CSSProperties = {
  background: 'transparent',
  borderRadius: '0.85rem',
  color: '#667085'
};

const committedSourceTextStyle: CSSProperties = {
  color: '#475467',
  marginTop: '0.5rem'
};

const committedTranslationTextStyle: CSSProperties = {
  color: '#101828',
  fontSize: '1.02rem',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  lineHeight: 1.45
};

const languagePickerGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem'
};

const languagePickerLabelStyle: CSSProperties = {
  color: '#667085',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  lineHeight: 1,
  textTransform: 'uppercase'
};

const languagePickerSelectStyle: CSSProperties = {
  appearance: 'none',
  background: '#FFFFFF',
  border: '1px solid rgba(16, 24, 40, 0.13)',
  borderRadius: '0.72rem',
  color: '#101828',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  height: '2.2rem',
  minWidth: '9.25rem',
  padding: '0 0.62rem'
};

const disabledLanguagePickerSelectStyle: CSSProperties = {
  ...languagePickerSelectStyle,
  cursor: 'not-allowed',
  opacity: 0.6
};

type LanguageOption = {
  code: string;
  label: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'lt', label: 'Lithuanian' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pl', label: 'Polish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' }
];

function getLanguageLabel(code: string): string {
  const match = LANGUAGE_OPTIONS.find((option) => option.code === code);
  return match?.label ?? code.toUpperCase();
}

type TranslatorStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'unsupported' | 'error';

type DownloadProgressEventLike = Event & {
  loaded?: number;
  total?: number;
};

type TranslatorMonitorLike = {
  addEventListener: (
    eventName: 'downloadprogress',
    listener: (event: DownloadProgressEventLike) => void
  ) => void;
};

type ChromeTranslator = {
  ready?: Promise<void>;
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
};

type ChromeTranslatorApi = {
  availability: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: TranslatorMonitorLike) => void;
  }) => Promise<ChromeTranslator>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function getChromeTranslatorApi(): ChromeTranslatorApi | null {
  const globalWithTranslator = globalThis as { Translator?: ChromeTranslatorApi };
  return globalWithTranslator.Translator ?? null;
}

function getTranslatorProgress(event: DownloadProgressEventLike): number | null {
  if (typeof event.loaded !== 'number') {
    return null;
  }

  if (event.loaded >= 0 && event.loaded <= 1) {
    return Math.round(event.loaded * 100);
  }

  if (typeof event.total === 'number' && event.total > 0) {
    return Math.round((event.loaded / event.total) * 100);
  }

  return Math.round(event.loaded);
}

function getTranslatorStatusMessage(
  status: TranslatorStatus,
  progress: number | null,
  inputLanguageLabel: string,
  targetLanguageLabel: string
): string | null {
  if (status === 'idle') {
    return null;
  }

  if (status === 'checking') {
    return `Preparing Chrome AI translator (${inputLanguageLabel} -> ${targetLanguageLabel})...`;
  }

  if (status === 'downloading') {
    if (typeof progress === 'number') {
      return `Downloading Chrome AI language pack (${progress}%)...`;
    }
    return 'Downloading Chrome AI language pack...';
  }

  if (status === 'ready') {
    return `Chrome AI translation active: ${inputLanguageLabel} -> ${targetLanguageLabel}.`;
  }

  if (status === 'unsupported') {
    return 'Chrome AI translator is unavailable in this browser.';
  }

  return 'Chrome AI translator failed to initialize.';
}

async function fetchScribeToken(): Promise<string> {
  const response = await fetch('/api/scribe-token', {
    method: 'POST',
    headers: {
      accept: 'application/json'
    }
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    token?: string;
  };

  if (!response.ok || !payload.token) {
    throw new Error(payload.error ?? 'Failed to generate a realtime Scribe token.');
  }

  return payload.token;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function ScribeRealtimeDemo() {
  const [inputLanguage, setInputLanguage] = useState('lt');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [localError, setLocalError] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedSegments, setTranslatedSegments] = useState<Record<string, string>>({});
  const [liveTranslatedPartial, setLiveTranslatedPartial] = useState('');
  const [isLiveTranslating, setIsLiveTranslating] = useState(false);
  const [translatorStatus, setTranslatorStatus] = useState<TranslatorStatus>('idle');
  const [translatorProgress, setTranslatorProgress] = useState<number | null>(null);
  const [translatorReadyVersion, setTranslatorReadyVersion] = useState(0);

  const translatorRef = useRef<ChromeTranslator | null>(null);
  const translatorPairRef = useRef<string | null>(null);
  const translatingIdsRef = useRef<Set<string>>(new Set());
  const liveTranslationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTranslationRequestRef = useRef(0);
  const lastLiveTranslatedSourceRef = useRef('');
  const rootContainerRef = useRef<HTMLDivElement | null>(null);
  const livePreviewPanelRef = useRef<HTMLDivElement | null>(null);
  const livePreviewSourceRef = useRef<HTMLDivElement | null>(null);
  const liveSourceBlockRef = useRef<HTMLDivElement | null>(null);
  const commitTransferLayerRef = useRef<HTMLDivElement | null>(null);
  const committedSegmentRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const seenCommittedIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedCommittedIdsRef = useRef(false);
  const activeTransferAnimationRef = useRef<Animation | null>(null);
  const activeTransferGhostRef = useRef<HTMLDivElement | null>(null);
  const translationLanguagePair = `${inputLanguage}->${targetLanguage}`;
  const isSameLanguage = inputLanguage === targetLanguage;
  const inputLanguageLabel = getLanguageLabel(inputLanguage);
  const targetLanguageLabel = getLanguageLabel(targetLanguage);

  const scribe = useScribe({
    commitStrategy: CommitStrategy.VAD,
    modelId: 'scribe_v2_realtime',
    onError: (error) => {
      setLocalError(getErrorMessage(error, 'Transcription failed.'));
    }
  });

  useEffect(() => {
    return () => {
      if (liveTranslationTimeoutRef.current) {
        clearTimeout(liveTranslationTimeoutRef.current);
      }
      liveTranslationTimeoutRef.current = null;
      liveTranslationRequestRef.current += 1;
      lastLiveTranslatedSourceRef.current = '';
      if (activeTransferAnimationRef.current) {
        activeTransferAnimationRef.current.cancel();
      }
      activeTransferAnimationRef.current = null;
      if (activeTransferGhostRef.current) {
        activeTransferGhostRef.current.remove();
      }
      activeTransferGhostRef.current = null;
      if (commitTransferLayerRef.current) {
        commitTransferLayerRef.current.innerHTML = '';
      }
      scribe.disconnect();
      translatorRef.current?.destroy?.();
      translatorRef.current = null;
      translatorPairRef.current = null;
      translatingIdsRef.current.clear();
    };
  }, [scribe.disconnect]);

  const activeError = localError ?? translationError ?? scribe.error;
  const translatorStatusMessage = isSameLanguage
    ? 'Input and output languages match; transcript is shown as-is.'
    : getTranslatorStatusMessage(
        translatorStatus,
        translatorProgress,
        inputLanguageLabel,
        targetLanguageLabel
      );

  const initializeTranslator = async (): Promise<ChromeTranslator | null> => {
    if (isSameLanguage) {
      translatorRef.current?.destroy?.();
      translatorRef.current = null;
      translatorPairRef.current = translationLanguagePair;
      setTranslatorStatus('ready');
      setTranslatorProgress(null);
      setTranslationError(null);
      setTranslatorReadyVersion((previous) => previous + 1);
      return null;
    }

    if (translatorRef.current && translatorPairRef.current === translationLanguagePair) {
      setTranslatorStatus('ready');
      return translatorRef.current;
    }

    if (translatorRef.current) {
      translatorRef.current.destroy?.();
      translatorRef.current = null;
      translatorPairRef.current = null;
    }

    const translatorApi = getChromeTranslatorApi();
    if (!translatorApi) {
      setTranslatorStatus('unsupported');
      return null;
    }

    setTranslatorStatus('checking');
    setTranslatorProgress(null);
    setTranslationError(null);

    try {
      const availability = await translatorApi.availability({
        sourceLanguage: inputLanguage,
        targetLanguage
      });

      if (availability === 'unsupported' || availability === 'unavailable') {
        setTranslatorStatus('unsupported');
        translatorPairRef.current = translationLanguagePair;
        return null;
      }

      if (availability === 'downloadable' || availability === 'downloading') {
        setTranslatorStatus('downloading');
      }

      const translator = await translatorApi.create({
        sourceLanguage: inputLanguage,
        targetLanguage,
        monitor: (monitor) => {
          monitor.addEventListener('downloadprogress', (event) => {
            if (translatorRef.current && translatorPairRef.current === translationLanguagePair) {
              return;
            }
            const progress = getTranslatorProgress(event);
            if (typeof progress === 'number') {
              setTranslatorProgress(progress);
            }
            setTranslatorStatus('downloading');
          });
        }
      });

      if (translator.ready) {
        await translator.ready;
      }

      translatorRef.current = translator;
      translatorPairRef.current = translationLanguagePair;
      setTranslatorStatus('ready');
      setTranslatorProgress(null);
      setTranslatorReadyVersion((previous) => previous + 1);
      return translator;
    } catch (error) {
      setTranslatorStatus('error');
      setTranslationError(getErrorMessage(error, 'Chrome AI translator failed to initialize.'));
      return null;
    }
  };

  const handleStart = async () => {
    setLocalError(null);
    setTranslationError(null);

    try {
      void initializeTranslator();
      const token = await fetchScribeToken();

      await scribe.connect({
        languageCode: inputLanguage,
        token,
        microphone: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (error) {
      setLocalError(
        getErrorMessage(error, 'Could not start microphone transcription. Please try again.')
      );
    }
  };

  const handleStop = () => {
    scribe.disconnect();
  };

  const handleClear = () => {
    setLocalError(null);
    setTranslationError(null);
    setTranslatedSegments({});
    setLiveTranslatedPartial('');
    setIsLiveTranslating(false);
    if (liveTranslationTimeoutRef.current) {
      clearTimeout(liveTranslationTimeoutRef.current);
    }
    liveTranslationTimeoutRef.current = null;
    liveTranslationRequestRef.current += 1;
    lastLiveTranslatedSourceRef.current = '';
    if (activeTransferAnimationRef.current) {
      activeTransferAnimationRef.current.cancel();
    }
    activeTransferAnimationRef.current = null;
    if (activeTransferGhostRef.current) {
      activeTransferGhostRef.current.remove();
    }
    activeTransferGhostRef.current = null;
    if (commitTransferLayerRef.current) {
      commitTransferLayerRef.current.innerHTML = '';
    }
    seenCommittedIdsRef.current = new Set();
    hasHydratedCommittedIdsRef.current = false;
    translatingIdsRef.current.clear();
    scribe.clearTranscripts();
  };

  useEffect(() => {
    setTranslationError(null);
    setTranslatedSegments({});
    setLiveTranslatedPartial('');
    setIsLiveTranslating(false);

    if (liveTranslationTimeoutRef.current) {
      clearTimeout(liveTranslationTimeoutRef.current);
    }
    liveTranslationTimeoutRef.current = null;
    liveTranslationRequestRef.current += 1;
    lastLiveTranslatedSourceRef.current = '';

    translatingIdsRef.current.clear();
    translatorRef.current?.destroy?.();
    translatorRef.current = null;
    translatorPairRef.current = null;
    setTranslatorProgress(null);
    setTranslatorStatus(isSameLanguage ? 'ready' : 'idle');
  }, [translationLanguagePair, isSameLanguage]);

  const nonEmptyCommittedTranscripts = useMemo(
    () => scribe.committedTranscripts.filter((segment) => segment.text.trim().length > 0),
    [scribe.committedTranscripts]
  );

  useEffect(() => {
    const currentIds = new Set(nonEmptyCommittedTranscripts.map((segment) => segment.id));

    if (!hasHydratedCommittedIdsRef.current) {
      seenCommittedIdsRef.current = currentIds;
      hasHydratedCommittedIdsRef.current = true;
      return;
    }

    const newestCommittedSegment = nonEmptyCommittedTranscripts
      .filter((segment) => !seenCommittedIdsRef.current.has(segment.id))
      .sort((firstSegment, secondSegment) => secondSegment.timestamp - firstSegment.timestamp)[0];

    seenCommittedIdsRef.current = currentIds;

    if (!newestCommittedSegment) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (typeof window === 'undefined') {
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        return;
      }

      const rootElement = rootContainerRef.current;
      const sourceElement =
        liveSourceBlockRef.current ?? livePreviewSourceRef.current ?? livePreviewPanelRef.current;
      const targetElement = committedSegmentRefs.current[newestCommittedSegment.id];
      const transferLayerElement = commitTransferLayerRef.current;
      if (!rootElement || !sourceElement || !targetElement || !transferLayerElement) {
        return;
      }

      const rootRect = rootElement.getBoundingClientRect();
      const sourceRect = sourceElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      if (
        sourceRect.width < 1 ||
        sourceRect.height < 1 ||
        targetRect.width < 1 ||
        targetRect.height < 1
      ) {
        return;
      }

      const targetIsVisible =
        targetRect.bottom >= rootRect.top &&
        targetRect.top <= rootRect.bottom &&
        targetRect.right >= rootRect.left &&
        targetRect.left <= rootRect.right;
      if (!targetIsVisible) {
        return;
      }

      if (activeTransferAnimationRef.current) {
        activeTransferAnimationRef.current.cancel();
      }
      activeTransferAnimationRef.current = null;
      if (activeTransferGhostRef.current) {
        activeTransferGhostRef.current.remove();
      }
      activeTransferGhostRef.current = null;

      const sourceInsetX = 8;
      const sourceInsetY = 8;
      const startLeft = sourceRect.left - rootRect.left + sourceInsetX;
      const startTop = sourceRect.top - rootRect.top + sourceInsetY;
      const startWidth = Math.max(120, sourceRect.width - sourceInsetX * 2);
      const destinationLeft = targetRect.left - rootRect.left + 12;
      const destinationTop = targetRect.top - rootRect.top + 12;
      const destinationWidth = Math.max(
        120,
        Math.min(targetRect.width - 24, Math.max(startWidth * 0.82, startWidth - 24))
      );
      const translateX = destinationLeft - startLeft;
      const translateY = destinationTop - startTop;
      const scaleX = destinationWidth / startWidth;
      const scaleY = 0.9;
      const transferLabel =
        newestCommittedSegment.text.trim().replace(/\s+/g, ' ').slice(0, 170) ||
        'Committed segment';

      const ghostElement = document.createElement('div');
      ghostElement.setAttribute('aria-hidden', 'true');
      ghostElement.textContent = transferLabel;
      ghostElement.style.position = 'absolute';
      ghostElement.style.left = `${startLeft}px`;
      ghostElement.style.top = `${startTop}px`;
      ghostElement.style.width = `${startWidth}px`;
      ghostElement.style.margin = '0';
      ghostElement.style.padding = '0.58rem 0.72rem';
      ghostElement.style.pointerEvents = 'none';
      ghostElement.style.zIndex = '40';
      ghostElement.style.opacity = '0.96';
      ghostElement.style.background = 'rgba(255, 255, 255, 0.96)';
      ghostElement.style.border = '1px solid rgba(16, 24, 40, 0.09)';
      ghostElement.style.borderRadius = '0.72rem';
      ghostElement.style.boxShadow = '0 12px 20px -14px rgba(16, 24, 40, 0.62)';
      ghostElement.style.color = '#101828';
      ghostElement.style.fontSize = '0.82rem';
      ghostElement.style.fontWeight = '500';
      ghostElement.style.lineHeight = '1.35';
      ghostElement.style.letterSpacing = '0';
      ghostElement.style.whiteSpace = 'nowrap';
      ghostElement.style.overflow = 'hidden';
      ghostElement.style.textOverflow = 'ellipsis';
      ghostElement.style.transformOrigin = 'left center';
      ghostElement.style.willChange = 'transform, opacity';
      transferLayerElement.appendChild(ghostElement);

      if (typeof ghostElement.animate !== 'function') {
        ghostElement.remove();
        return;
      }

      const transferAnimation = ghostElement.animate(
        [
          {
            opacity: 0.96,
            transform: 'translate3d(0px, 0px, 0px) scale(1, 1)'
          },
          {
            opacity: 0.84,
            transform: `translate3d(${translateX * 0.7}px, ${translateY * 0.72}px, 0px) scale(${1 + (scaleX - 1) * 0.5}, 0.96)`
          },
          {
            opacity: 0,
            transform: `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scaleX}, ${scaleY})`
          }
        ],
        {
          duration: 480,
          easing: 'cubic-bezier(0.2, 0.85, 0.22, 1)',
          fill: 'forwards'
        }
      );

      activeTransferAnimationRef.current = transferAnimation;
      activeTransferGhostRef.current = ghostElement;

      const cleanupGhost = () => {
        if (activeTransferAnimationRef.current === transferAnimation) {
          activeTransferAnimationRef.current = null;
        }
        if (activeTransferGhostRef.current === ghostElement) {
          activeTransferGhostRef.current = null;
        }
        ghostElement.remove();
      };
      transferAnimation.addEventListener('finish', cleanupGhost, { once: true });
      transferAnimation.addEventListener('cancel', cleanupGhost, { once: true });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [nonEmptyCommittedTranscripts]);

  useEffect(() => {
    const nextSegment = nonEmptyCommittedTranscripts.find(
      (segment) =>
        !translatedSegments[segment.id] && !translatingIdsRef.current.has(segment.id)
    );

    if (!nextSegment) {
      return;
    }

    if (isSameLanguage) {
      setTranslatedSegments((previous) => ({
        ...previous,
        [nextSegment.id]: nextSegment.text
      }));
      return;
    }

    const translator = translatorRef.current;
    if (!translator) {
      return;
    }

    let cancelled = false;
    translatingIdsRef.current.add(nextSegment.id);

    const translateNextSegment = async () => {
      try {
        const translatedText = await translator.translate(nextSegment.text);
        if (cancelled) {
          return;
        }
        setTranslatedSegments((previous) => ({
          ...previous,
          [nextSegment.id]: translatedText
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTranslatedSegments((previous) => ({
          ...previous,
          [nextSegment.id]: 'Translation unavailable.'
        }));
        setTranslationError(
          getErrorMessage(error, 'Chrome AI failed to translate one transcript segment.')
        );
      } finally {
        translatingIdsRef.current.delete(nextSegment.id);
      }
    };

    void translateNextSegment();

    return () => {
      cancelled = true;
    };
  }, [isSameLanguage, nonEmptyCommittedTranscripts, translatedSegments, translatorReadyVersion]);

  const liveSourceText = scribe.partialTranscript.trim();

  useEffect(() => {
    const translator = translatorRef.current;

    if (!liveSourceText) {
      if (liveTranslationTimeoutRef.current) {
        clearTimeout(liveTranslationTimeoutRef.current);
      }
      liveTranslationTimeoutRef.current = null;
      liveTranslationRequestRef.current += 1;
      lastLiveTranslatedSourceRef.current = '';
      setLiveTranslatedPartial('');
      setIsLiveTranslating(false);
      return;
    }

    if (isSameLanguage) {
      if (liveTranslationTimeoutRef.current) {
        clearTimeout(liveTranslationTimeoutRef.current);
      }
      liveTranslationTimeoutRef.current = null;
      liveTranslationRequestRef.current += 1;
      lastLiveTranslatedSourceRef.current = liveSourceText;
      setLiveTranslatedPartial(liveSourceText);
      setIsLiveTranslating(false);
      return;
    }

    if (!translator || translatorStatus !== 'ready') {
      if (liveTranslationTimeoutRef.current) {
        clearTimeout(liveTranslationTimeoutRef.current);
      }
      liveTranslationTimeoutRef.current = null;
      liveTranslationRequestRef.current += 1;
      lastLiveTranslatedSourceRef.current = '';
      setLiveTranslatedPartial('');
      setIsLiveTranslating(false);
      return;
    }

    if (lastLiveTranslatedSourceRef.current === liveSourceText) {
      setIsLiveTranslating(false);
      return;
    }

    if (liveTranslationTimeoutRef.current) {
      clearTimeout(liveTranslationTimeoutRef.current);
    }

    setIsLiveTranslating(true);
    const requestId = liveTranslationRequestRef.current + 1;
    liveTranslationRequestRef.current = requestId;

    liveTranslationTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const translatedText = await translator.translate(liveSourceText);
          if (liveTranslationRequestRef.current !== requestId) {
            return;
          }
          setLiveTranslatedPartial(translatedText);
          lastLiveTranslatedSourceRef.current = liveSourceText;
        } catch {
          if (liveTranslationRequestRef.current !== requestId) {
            return;
          }
          setLiveTranslatedPartial('Translation unavailable.');
          lastLiveTranslatedSourceRef.current = liveSourceText;
        } finally {
          if (liveTranslationRequestRef.current === requestId) {
            setIsLiveTranslating(false);
          }
        }
      })();
    }, 220);

    return () => {
      if (liveTranslationTimeoutRef.current) {
        clearTimeout(liveTranslationTimeoutRef.current);
      }
      liveTranslationTimeoutRef.current = null;
    };
  }, [isSameLanguage, liveSourceText, translatorReadyVersion, translatorStatus]);

  const orderedSegments = useMemo(
    () =>
      [...nonEmptyCommittedTranscripts].sort(
        (firstSegment, secondSegment) => secondSegment.timestamp - firstSegment.timestamp
      ),
    [nonEmptyCommittedTranscripts]
  );
  const canStart = !scribe.isConnected && scribe.status !== 'connecting';
  const hasTranscript = orderedSegments.length > 0;
  const hasLiveSourceText = liveSourceText.length > 0;
  const showLivePreview = scribe.isConnected || hasLiveSourceText;
  const languageControlsDisabled = scribe.isConnected || scribe.status === 'connecting';
  const liveSourceDisplayText =
    hasLiveSourceText || !scribe.isConnected
      ? liveSourceText
      : `Listening for ${inputLanguageLabel}...`;
  const liveTranslatedText =
    !hasLiveSourceText && scribe.isConnected
      ? `Waiting for ${inputLanguageLabel} speech...`
      : isSameLanguage
        ? liveSourceText
        : translatorStatus === 'unsupported'
          ? 'Chrome AI translator unavailable in this browser.'
          : translatorStatus !== 'ready'
            ? 'Waiting for Chrome AI translator...'
            : liveTranslatedPartial || (isLiveTranslating ? 'Translating...' : 'Translating...');
  const livePlaceholderText = scribe.isConnected
    ? `Listening... start speaking ${inputLanguageLabel} to see live text and ${targetLanguageLabel} translation.`
    : 'Press Start mic to begin realtime transcription and translation.';
  const translatorInfoTone =
    translatorStatus === 'error'
      ? '#B42318'
      : translatorStatus === 'unsupported'
        ? '#B54708'
        : '#475467';

  return (
    <div className="scribe-demo" ref={rootContainerRef} style={shellStyle}>
      <div className="scribe-toolbar" style={toolbarStyle}>
        <div className="scribe-toolbar-actions">
          {scribe.isConnected ? (
            <button className={primaryButtonClass} onClick={handleStop} type="button">
              Stop
            </button>
          ) : (
            <button
              className={primaryButtonClass}
              disabled={!canStart}
              onClick={handleStart}
              type="button"
            >
              {scribe.status === 'connecting' ? 'Connecting...' : 'Start mic'}
            </button>
          )}

          <button
            onClick={handleClear}
            style={hasTranscript || hasLiveSourceText ? secondaryButtonStyle : disabledButtonStyle}
            type="button"
          >
            Clear
          </button>
        </div>

        <div className="scribe-language-controls">
          <label style={languagePickerGroupStyle}>
            <span style={languagePickerLabelStyle}>Input</span>
            <select
              aria-label="Input language"
              disabled={languageControlsDisabled}
              onChange={(event) => {
                setInputLanguage(event.target.value);
              }}
              style={
                languageControlsDisabled
                  ? disabledLanguagePickerSelectStyle
                  : languagePickerSelectStyle
              }
              value={inputLanguage}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={languagePickerGroupStyle}>
            <span style={languagePickerLabelStyle}>Translate to</span>
            <select
              aria-label="Translation language"
              disabled={languageControlsDisabled}
              onChange={(event) => {
                setTargetLanguage(event.target.value);
              }}
              style={
                languageControlsDisabled
                  ? disabledLanguagePickerSelectStyle
                  : languagePickerSelectStyle
              }
              value={targetLanguage}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {translatorStatusMessage && (
        <div className="scribe-status-row" style={{ marginTop: '-0.05rem' }}>
          <span style={{ ...infoPillStyle, color: translatorInfoTone }}>{translatorStatusMessage}</span>
        </div>
      )}

      {activeError && (
        <p
          className="scribe-error-message"
          style={{
            background: 'rgba(217, 45, 32, 0.06)',
            border: '1px solid rgba(217, 45, 32, 0.2)',
            borderRadius: '0.75rem',
            color: '#B42318',
            padding: '0.5rem 0.7rem'
          }}
        >
          {activeError}
        </p>
      )}

      <div className="scribe-panels">
        <section style={panelStyle}>
          <div
            className="scribe-section-header"
            style={sectionHeaderStyle}
          >
            <h3 className="scribe-section-title" style={{ color: '#101828' }}>
              Live preview
            </h3>
          </div>

          <div
            aria-live="polite"
            className="scribe-live-preview"
            ref={livePreviewPanelRef}
            style={{ color: showLivePreview ? '#111827' : '#667085' }}
          >
            {showLivePreview ? (
              <div className="scribe-live-blocks" ref={livePreviewSourceRef}>
                <div ref={liveSourceBlockRef} style={liveBlockStyle}>
                  <p className="scribe-overline" style={{ color: '#667085', marginBottom: '0.42rem' }}>
                    {inputLanguage.toUpperCase()}
                  </p>
                  <p className="scribe-body" style={{ color: '#101828' }}>
                    {liveSourceDisplayText}
                  </p>
                </div>
                <div style={liveBlockStyle}>
                  <p className="scribe-overline" style={{ color: '#667085', marginBottom: '0.42rem' }}>
                    {targetLanguage.toUpperCase()}
                  </p>
                  <p className="scribe-body" style={{ color: '#344054' }}>
                    {liveTranslatedText}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="scribe-empty-state"
                style={emptyStateStyle}
              >
                {livePlaceholderText}
              </div>
            )}
          </div>
        </section>

        <section style={panelStyle}>
          <div
            className="scribe-section-header"
            style={sectionHeaderStyle}
          >
            <h3 className="scribe-section-title" style={{ color: '#101828' }}>
              Committed transcript + {targetLanguageLabel} translation
            </h3>
          </div>

          <div
            aria-live="polite"
            className="scribe-committed-scroll"
            style={{ color: '#344054' }}
          >
            {!hasTranscript ? (
              <div
                className="scribe-empty-state"
                style={{
                  ...emptyStateStyle,
                  minHeight: '6rem'
                }}
              >
                Finalized {inputLanguageLabel} segments and {targetLanguageLabel} translations appear
                here.
              </div>
            ) : (
              <ol className="scribe-list">
                {orderedSegments.map((segment) => (
                  <li
                    className="scribe-list-item"
                    key={segment.id}
                    ref={(node) => {
                      if (node) {
                        committedSegmentRefs.current[segment.id] = node;
                        return;
                      }
                      delete committedSegmentRefs.current[segment.id];
                    }}
                    style={transcriptCardStyle}
                  >
                    <div className="scribe-list-row">
                      <div className="scribe-list-badges">
                        <span style={languageBadgeStyle}>{inputLanguage.toUpperCase()}</span>
                        <span style={languageBadgeStyle}>{targetLanguage.toUpperCase()}</span>
                      </div>
                      <p className="scribe-overline" style={{ color: '#667085' }}>
                        {formatTimestamp(segment.timestamp)}
                      </p>
                    </div>

                    <div style={{ marginTop: '0.62rem' }}>
                      <p className="scribe-body" style={committedTranslationTextStyle}>
                        {translatedSegments[segment.id] ??
                          (isSameLanguage
                            ? segment.text
                            : translatorStatus === 'unsupported'
                            ? 'Chrome AI translator unavailable in this browser.'
                            : 'Translating...')}
                      </p>
                      <p className="scribe-body" style={committedSourceTextStyle}>
                        {segment.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
      <div aria-hidden ref={commitTransferLayerRef} style={commitTransferLayerStyle} />
    </div>
  );
}
