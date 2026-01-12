import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

const DEFAULT_TEXT =
  "Rapid serial visual presentation (RSVP) is a scientific method for studying the timing of vision. In RSVP, a sequence of stimuli is shown to an observer at one location in their visual field. The observer is instructed to report one of these stimuli - the target - which has a feature that differentiates it from the rest of the stream. For instance, observers may see a sequence of stimuli consisting of gray letters with the exception of one red letter. They are told to report the red letter. People make errors in this task in the form of reports of stimuli that occurred before or after the target. The position in time of the letter they report, relative to the target, is an estimate of the timing of visual selection on that trial. The term, and methodologies to study it, was first introduced by Mary C. Potter.";

const TEXT_SIZES = [32, 40, 48, 60, 72, 84] as const;
const MIN_WPM = 100;
const MAX_WPM = 1000;
const DEFAULT_WPM = 300;
const DEFAULT_COLOR = '#f87171';

type StripChars = {
  punctuation: boolean;
  brackets: boolean;
  quotes: boolean;
};

export default function RSVPReader() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(DEFAULT_WPM);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [textSize, setTextSize] = useState<number>(3);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [orpColor, setOrpColor] = useState<string>(DEFAULT_COLOR);
  const [stripChars, setStripChars] = useState<StripChars>({
    punctuation: false,
    brackets: false,
    quotes: false
  });

  const intervalRef = useRef<number | null>(null);

  // Process text
  useEffect(() => {
    if (!text) return;

    let processed = text;

    if (stripChars.punctuation) {
      processed = processed.replace(/[.,!?;:]/g, '');
    }
    if (stripChars.brackets) {
      processed = processed.replace(/[\[\](){}]/g, '');
    }
    if (stripChars.quotes) {
      processed = processed.replace(/['"]/g, '');
    }

    const wordArray = processed.split(/\s+/).filter(w => w.length > 0);
    setWords(wordArray);
    setCurrentIndex(0);
  }, [text, stripChars]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    const msPerWord = 60000 / wpm;

    intervalRef.current = window.setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= words.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, msPerWord);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, wpm, words.length]);

  const togglePlay = (): void => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(p => !p);
  };

  const reset = (): void => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleProgressClick = (
    e: React.MouseEvent<HTMLDivElement>
  ): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    const idx = Math.floor(pct * words.length);
    setCurrentIndex(Math.min(Math.max(0, idx), words.length - 1));
    setIsPlaying(false);
  };

  const handleWpmChange = (val: string): void => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= MIN_WPM && num <= MAX_WPM) {
      setWpm(num);
    }
  };

  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len === 1) return 0;
    if (len <= 5) return 1;
    return Math.floor(len * 0.3);
  };

  const currentWord = words[currentIndex] ?? '';
  const progress =
    words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  const orpIdx = getORPIndex(currentWord);

  const wordParts = {
    before: currentWord.slice(0, orpIdx),
    orp: currentWord[orpIdx] ?? '',
    after: currentWord.slice(orpIdx + 1)
  };

  const styles = {
    bg: theme === 'dark'
      ? 'bg-gradient-to-br from-black via-gray-900 to-black'
      : 'bg-gradient-to-br from-gray-100 via-white to-gray-100',
    card: theme === 'dark'
      ? 'bg-white/10 backdrop-blur-lg border-white/20'
      : 'bg-black/5 backdrop-blur-lg border-black/10',
    text: theme === 'dark' ? 'text-white' : 'text-gray-900',
    display: theme === 'dark' ? 'bg-black/30' : 'bg-white/50',
    input: theme === 'dark' ? 'bg-black/30' : 'bg-white/70',
    border: theme === 'dark' ? 'border-white/20' : 'border-black/20',
    progressBg: theme === 'dark' ? 'bg-white/20' : 'bg-black/20'
  };

  return (
    <div className={`min-h-screen ${styles.bg} flex items-center justify-center p-4`}>
      <div className="w-full max-w-4xl">
        <div className={`${styles.card} rounded-2xl shadow-2xl p-8 border`}>
          <h1 className={`text-4xl font-bold ${styles.text} mb-6 text-center`}>
            RSVP Speed Reader
          </h1>

          {/* Word display */}
          <div className={`${styles.display} rounded-xl p-16 mb-6 min-h-[200px] flex items-center justify-center relative`}>
            <div className="flex items-center justify-center">
              <div
                className={`font-bold ${styles.text} tracking-tight font-mono flex items-baseline`}
                style={{ fontSize: `${TEXT_SIZES[textSize]}px` }}
              >
                <span className="opacity-90 text-right inline-block" style={{ width: '300px' }}>
                  {wordParts.before}
                </span>
                <span
                  className="px-1 border-b-4 inline-block"
                  style={{
                    color: orpColor,
                    backgroundColor: `${orpColor}20`,
                    borderColor: orpColor
                  }}
                >
                  {wordParts.orp}
                </span>
                <span className="opacity-90 text-left inline-block" style={{ width: '300px' }}>
                  {wordParts.after}
                </span>
              </div>
            </div>
            <div className={`absolute bottom-8 left-0 right-0 text-center ${styles.text} opacity-60 text-sm`}>
              Word {currentIndex + 1} of {words.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div
              className={`w-full ${styles.progressBg} rounded-full h-3 cursor-pointer hover:h-4 transition-all`}
              onClick={handleProgressClick}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(to right, ${orpColor}80, ${orpColor})`
                }}
              />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={reset}
              className="text-white p-4 rounded-full transition-all shadow-lg"
              style={{ background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)` }}
              title="Reset"
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={togglePlay}
              className="text-white p-6 rounded-full transition-all shadow-lg"
              style={{ background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)` }}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white p-4 rounded-full transition-all shadow-lg"
              style={{ background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)` }}
              title="Settings"
            >
              <Settings size={24} />
            </button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className={`${styles.card} rounded-xl p-6 mb-6 border`}>
              <h3 className={`${styles.text} text-xl font-semibold mb-4`}>Settings</h3>

              {/* WPM slider */}
              <div className="mb-6">
                <label className={`${styles.text} block mb-2`}>
                  Speed (Words Per Minute)
                </label>
                <div className="flex gap-3 items-center mb-2">
                  <input
                    type="number"
                    min={MIN_WPM}
                    max={MAX_WPM}
                    step="50"
                    value={wpm}
                    onChange={e => handleWpmChange(e.target.value)}
                    className={`${styles.input} ${styles.text} ${styles.border} rounded-lg px-4 py-2 border focus:outline-none w-24`}
                  />
                  <span className={styles.text}>WPM</span>
                </div>
                <input
                  type="range"
                  min={MIN_WPM}
                  max={MAX_WPM}
                  step="50"
                  value={wpm}
                  onChange={e => setWpm(Number(e.target.value))}
                  className="w-full"
                />
                <div className={`flex justify-between ${styles.text} opacity-60 text-sm mt-1`}>
                  <span>{MIN_WPM}</span>
                  <span>{MAX_WPM}</span>
                </div>
              </div>

              {/* Text size buttons */}
              <div className="mb-6">
                <label className={`${styles.text} block mb-2`}>Text Size</label>
                <div className="grid grid-cols-6 gap-2">
                  {TEXT_SIZES.map((size, i) => (
                    <button
                      key={i}
                      onClick={() => setTextSize(i)}
                      className={`py-2 px-3 rounded-lg transition-all ${textSize === i
                        ? 'text-white shadow-lg'
                        : `${styles.input} ${styles.text} ${styles.border} border`
                        }`}
                      style={textSize === i ? {
                        background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)`
                      } : {}}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme toggle */}
              <div className="mb-6">
                <label className={`${styles.text} block mb-2`}>Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all ${theme === 'dark'
                      ? 'text-white shadow-lg'
                      : `${styles.input} ${styles.text} ${styles.border} border`
                      }`}
                    style={theme === 'dark' ? {
                      background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)`
                    } : {}}
                  >
                    Dark Mode
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all ${theme === 'light'
                      ? 'text-white shadow-lg'
                      : `${styles.input} ${styles.text} ${styles.border} border`
                      }`}
                    style={theme === 'light' ? {
                      background: `linear-gradient(to right, ${orpColor}, ${orpColor}dd)`
                    } : {}}
                  >
                    Light Mode
                  </button>
                </div>
              </div>

              {/* Color picker */}
              <div className="mb-6">
                <label className={`${styles.text} block mb-2`}>
                  ORP Highlight Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={orpColor}
                    onChange={e => setOrpColor(e.target.value)}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={orpColor}
                    onChange={e => setOrpColor(e.target.value)}
                    className={`${styles.input} ${styles.text} ${styles.border} rounded-lg px-4 py-2 border focus:outline-none flex-1`}
                    placeholder="#f87171"
                  />
                </div>
              </div>

              {/* Character stripping checkboxes */}
              <div className="mb-2">
                <label className={`${styles.text} block mb-2`}>
                  Strip Characters
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripChars.punctuation}
                      onChange={e => setStripChars({ ...stripChars, punctuation: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={styles.text}>Punctuation ( . , ! ? ; : )</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripChars.brackets}
                      onChange={e => setStripChars({ ...stripChars, brackets: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={styles.text}>Brackets ( [ ] ( ) {'{}'} )</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripChars.quotes}
                      onChange={e => setStripChars({ ...stripChars, quotes: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={styles.text}>Quotes ( ' " )</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Text input area */}
          <div className={`${styles.card} rounded-xl p-6 border`}>
            <label className={`${styles.text} block mb-2 font-semibold`}>
              Your Text:
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className={`w-full ${styles.input} ${styles.text} rounded-lg p-4 border ${styles.border} focus:outline-none min-h-[120px]`}
              placeholder="Paste your text here to speed read..."
            />
          </div>

          <div className={`mt-6 text-center ${styles.text} opacity-60 text-sm`}>
            <p>The highlighted character is the Optimal Recognition Point (ORP)</p>
            <p className="mt-1">Keep your eyes focused on this spot for maximum reading speed</p>
          </div>

          <div
            className="mt-4 text-center text-sm"
            style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
          >
            <p>
              For more information you can watch{' '}
              <a
                href="https://www.youtube.com/watch?v=NdKcDPBQ-Lw"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: orpColor }}
              >
                this
              </a>
              {' '}video by{' '}
              <a
                href="https://www.youtube.com/@BuffedYT"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: orpColor }}
              >
                BuffedYT
              </a>
              {' '}for some more information on how it works and to test your reading and comprehension speed.
            </p>
          </div>

          <div
            className="mt-4 text-center text-sm"
            style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
          >
            <p className="mt-2 text-xs opacity-75">
              Default text sourced from{' '}
              <a
                href="https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
                style={{ color: orpColor }}
              >
                Wikipedia
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}