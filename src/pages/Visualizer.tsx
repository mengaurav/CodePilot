import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, ArrowRight,
  Timer, Ruler, Search, BarChart3, GitBranch, Info, Eye, Zap, Cpu,
  Activity, TrendingUp, Clock3, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/Navbar';
import {
  AlgorithmStep, GraphAlgoStep, SimpleGraph, LineComplexity,
  bubbleSortSteps, insertionSortSteps, mergeSortSteps, quickSortSteps,
  linearSearchSteps, binarySearchSteps,
  bfsSteps, dfsSteps, buildSampleGraph,
  PSEUDOCODE, COMPLEXITY, PSEUDOCODE_LINE_COMPLEXITY,
} from '@/lib/algorithms';

type AlgoCategory = 'sorting' | 'searching' | 'graph';
type AlgoName = string;

const ALGORITHMS: Record<AlgoCategory, { name: string; label: string }[]> = {
  sorting: [
    { name: 'Bubble Sort', label: 'Bubble' },
    { name: 'Insertion Sort', label: 'Insertion' },
    { name: 'Merge Sort', label: 'Merge' },
    { name: 'Quick Sort', label: 'Quick' },
  ],
  searching: [
    { name: 'Linear Search', label: 'Linear' },
    { name: 'Binary Search', label: 'Binary' },
  ],
  graph: [
    { name: 'BFS', label: 'BFS' },
    { name: 'DFS', label: 'DFS' },
  ],
};

const CATEGORY_ICONS: Record<AlgoCategory, typeof BarChart3> = {
  sorting: BarChart3,
  searching: Search,
  graph: GitBranch,
};

const COLOR_LEGEND = [
  { color: 'bg-sky-500', label: 'Comparing' },
  { color: 'bg-rose-500', label: 'Swapping' },
  { color: 'bg-emerald-500', label: 'Sorted / Found' },
  { color: 'bg-amber-500', label: 'Pivot / Searching' },
  { color: 'bg-violet-500', label: 'Visited (Graph)' },
  { color: 'bg-muted', label: 'Default' },
];

// Graph layout positions
const GRAPH_POSITIONS: Record<string, { x: number; y: number }> = {
  A: { x: 200, y: 40 }, B: { x: 100, y: 130 }, C: { x: 300, y: 130 },
  D: { x: 60, y: 230 }, E: { x: 340, y: 230 }, F: { x: 200, y: 310 },
};

function generateArray(size: number): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
}

export default function Visualizer() {
  const [category, setCategory] = useState<AlgoCategory>('sorting');
  const [algo, setAlgo] = useState<AlgoName>('Bubble Sort');
  const [arraySize, setArraySize] = useState(15);
  const [speed, setSpeed] = useState(300);
  const [searchTarget, setSearchTarget] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Steps state
  const [sourceArray, setSourceArray] = useState<number[]>(() => generateArray(15));
  const [steps, setSteps] = useState<AlgorithmStep[]>(() => bubbleSortSteps(generateArray(15)));
  const [graphSteps, setGraphSteps] = useState<GraphAlgoStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [graph] = useState<SimpleGraph>(() => buildSampleGraph());

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const playingRef = useRef(false);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const graphStepsRef = useRef(graphSteps);
  graphStepsRef.current = graphSteps;
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  // ── Execution-time tracking ──────────────────────────────────────
  const execStartTimeRef = useRef<number | null>(null);   // performance.now() at play-start
  const playStartStepRef = useRef(0);                     // step index when play started
  const [elapsedMs, setElapsedMs] = useState(0);          // ms since play began
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startElapsedTimer = () => {
    execStartTimeRef.current = performance.now();
    playStartStepRef.current = currentStepRef.current;
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      if (execStartTimeRef.current !== null) {
        setElapsedMs(Math.round(performance.now() - execStartTimeRef.current));
      }
    }, 50);
  };

  const stopElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  // clean up on unmount
  useEffect(() => () => stopElapsedTimer(), []);
  // reset timer whenever a new generate happens
  useEffect(() => { setElapsedMs(0); execStartTimeRef.current = null; }, [steps, graphSteps]);
  

  const isGraph = category === 'graph';
  const totalSteps = isGraph ? graphSteps.length : steps.length;
  const currentData = !isGraph && steps[currentStep] ? steps[currentStep] : null;
  const currentGraphData = isGraph && graphSteps[currentStep] ? graphSteps[currentStep] : null;
  const pseudocode = PSEUDOCODE[algo] || [];
  const lineComplexities = PSEUDOCODE_LINE_COMPLEXITY[algo] || [];
  const complexity = COMPLEXITY[algo];
  const activeStep = isGraph ? currentGraphData : currentData;
  const activeLine = isGraph ? (currentGraphData?.currentLine ?? -1) : (currentData?.currentLine ?? -1);

  // Real-time Time & Space Complexity of the active pseudocode line
  const activeLineComplexity = activeLine >= 0 && activeLine < lineComplexities.length
    ? lineComplexities[activeLine]
    : null;

  const currentRealtimeTime = activeLineComplexity?.time || activeStep?.stepTime || 'O(1)';
  const currentRealtimeSpace = activeLineComplexity?.space || activeStep?.stepSpace || (complexity ? complexity.space : 'O(1)');

  // Generate steps
  const generate = useCallback(() => {
    setIsPlaying(false);
    playingRef.current = false;
    setCurrentStep(0);

    const parseCustomArray = (): number[] | null => {
      if (!customInput.trim()) return null;
      const nums = customInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      return nums.length >= 2 ? nums : null;
    };

    if (category === 'sorting') {
      const arr = parseCustomArray() || generateArray(arraySize);
      setSourceArray(arr);
      let s: AlgorithmStep[] = [];
      if (algo === 'Bubble Sort') s = bubbleSortSteps(arr);
      else if (algo === 'Insertion Sort') s = insertionSortSteps(arr);
      else if (algo === 'Merge Sort') s = mergeSortSteps(arr);
      else if (algo === 'Quick Sort') s = quickSortSteps(arr);
      setSteps(s);
      setGraphSteps([]);
    } else if (category === 'searching') {
      const arr = parseCustomArray() || generateArray(arraySize);
      setSourceArray(arr);
      const target = parseInt(searchTarget) || arr[Math.floor(Math.random() * arr.length)];
      let s: AlgorithmStep[] = [];
      if (algo === 'Linear Search') s = linearSearchSteps(arr, target);
      else if (algo === 'Binary Search') s = binarySearchSteps(arr, target);
      setSteps(s);
      setGraphSteps([]);
    } else {
      const startNode = graph.nodes[0].id;
      let gs: GraphAlgoStep[] = [];
      if (algo === 'BFS') gs = bfsSteps(graph, startNode);
      else if (algo === 'DFS') gs = dfsSteps(graph, startNode);
      setGraphSteps(gs);
      setSteps([]);
    }
  }, [category, algo, arraySize, searchTarget, graph, customInput]);

  useEffect(() => { generate(); }, [generate]);

  // Playback
  const playAnimation = useCallback(async () => {
    playingRef.current = true;
    setIsPlaying(true);
    startElapsedTimer();
    const total = isGraph ? graphStepsRef.current.length : stepsRef.current.length;
    let step = currentStepRef.current;
    while (step < total - 1 && playingRef.current) {
      step++;
      setCurrentStep(step);
      currentStepRef.current = step;
      await new Promise(r => setTimeout(r, speedRef.current));
    }
    stopElapsedTimer();
    playingRef.current = false;
    setIsPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGraph]);

  const pause = () => {
    playingRef.current = false;
    setIsPlaying(false);
    stopElapsedTimer();
  };
  const stepForward = () => { if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1); };
  const stepBack = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };
  const restart = () => { setCurrentStep(0); pause(); };

  const handleCategoryChange = (c: AlgoCategory) => {
    setCategory(c);
    setAlgo(ALGORITHMS[c][0].name);
  };

  // Get bar color
  const getBarColor = (idx: number, step: AlgorithmStep | null) => {
    if (!step) return 'bg-primary/40';
    if (step.found === idx) return 'bg-emerald-500';
    if (step.sorted?.includes(idx)) return 'bg-emerald-500/80';
    if (step.swapping?.includes(idx)) return 'bg-rose-500';
    if (step.pivot === idx) return 'bg-amber-500';
    if (step.searching === idx) return 'bg-amber-500';
    if (step.comparing?.includes(idx)) return 'bg-sky-500';
    return 'bg-primary/40';
  };

  const maxVal = currentData ? Math.max(...currentData.array, 1) : 100;

  // ── Real-time stats derived from current step ─────────────────────
  const rtOps       = activeStep?.operations    ?? 0;
  const rtComps     = activeStep?.comparisons   ?? 0;
  const rtSwaps     = activeStep?.swaps         ?? 0;

  // Pass = number of times we've hit pseudocode line 1 (outer loop)
  // We derive this by counting how many steps up to currentStep have currentLine === 1
  const rtPass = (() => {
    const src = isGraph ? graphSteps : steps;
    if (!src || src.length === 0) return 0;
    let count = 0;
    for (let i = 0; i <= currentStep && i < src.length; i++) {
      if (src[i]?.currentLine === 1) count++;
    }
    return count;
  })();

  // Inner iteration = number of times currentLine === 2 within the current pass block
  const rtIteration = (() => {
    const src = isGraph ? graphSteps : steps;
    if (!src || src.length === 0) return 0;
    let count = 0;
    const startIdx = Math.min(currentStep, src.length - 1);
    for (let i = startIdx; i >= 0; i--) {
      if (src[i]?.currentLine === 1) break;
      if (src[i]?.currentLine === 2) count++;
    }
    return count;
  })();

  const isFinished = currentStep === totalSteps - 1 && totalSteps > 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 px-3 sm:px-4 pb-8">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <Eye className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Algorithm Visualizer</h1>
                <p className="text-sm text-muted-foreground">Watch sorting, searching, and graph algorithms step by step</p>
              </div>
            </div>
          </motion.div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-4">
            {(Object.keys(ALGORITHMS) as AlgoCategory[]).map(c => {
              const Icon = CATEGORY_ICONS[c];
              return (
                <motion.div key={c} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant={category === c ? 'default' : 'outline'}
                    size="sm"
                    className={`rounded-full gap-1.5 capitalize ${category === c ? 'shadow-md shadow-primary/20' : ''}`}
                    onClick={() => handleCategoryChange(c)}
                  >
                    <Icon className="w-3.5 h-3.5" /> {c}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Algorithm selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ALGORITHMS[category].map((a, i) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Button
                  variant={algo === a.name ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => { setAlgo(a.name); }}
                  className={`text-xs ${algo === a.name ? 'shadow-md shadow-primary/20' : 'hover:bg-secondary/80'}`}
                >
                  {a.label}
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1fr_280px] gap-4 sm:gap-6">
            {/* Main visualization area */}
            <div className="space-y-4">
              {/* Visualization canvas */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-2 border-b border-border/50 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{algo}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Real-time Time & Space Complexity of the active pseudocode line */}
                    <Badge
                      variant="outline"
                      className="text-xs font-mono gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 py-1 px-2.5 transition-all shadow-sm"
                      title={`Active Line ${activeLine + 1} Time Complexity: ${currentRealtimeTime}`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-muted-foreground font-normal">Time:</span>
                      <span className="font-bold">{currentRealtimeTime}</span>
                    </Badge>

                    <Badge
                      variant="outline"
                      className="text-xs font-mono gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 py-1 px-2.5 transition-all shadow-sm"
                      title={`Active Line ${activeLine + 1} Space Complexity: ${currentRealtimeSpace}`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground font-normal">Space:</span>
                      <span className="font-bold">{currentRealtimeSpace}</span>
                    </Badge>

                    {complexity && (
                      <Badge variant="outline" className="text-[10px] font-mono gap-1">
                        <Timer className="w-3 h-3" /> {complexity.time}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Step {currentStep + 1}/{totalSteps || 1}
                    </Badge>
                  </div>
                </div>

                {/* Bar chart / Array visualization */}
                {!isGraph && currentData && (
                  <div className="p-4 flex items-end gap-[2px] justify-center" style={{ minHeight: 260 }}>
                    {currentData.array.map((val, i) => (
                      <motion.div
                        key={i}
                        className={`rounded-t-sm transition-colors duration-150 ${getBarColor(i, currentData)}`}
                        style={{ width: `${Math.max(100 / currentData.array.length - 1, 4)}%`, minWidth: 4 }}
                        initial={false}
                        animate={{ height: `${(val / maxVal) * 220}px` }}
                        transition={{ duration: 0.15 }}
                      >
                        {currentData.array.length <= 20 && (
                          <div className="text-[9px] text-center font-mono text-primary-foreground font-bold pt-1 truncate">
                            {val}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Graph visualization */}
                {isGraph && (
                  <div className="p-4" style={{ minHeight: 360 }}>
                    <svg viewBox="0 0 400 360" className="w-full max-w-md mx-auto">
                      {/* Edges */}
                      {graph.edges.map((e, i) => {
                        const from = GRAPH_POSITIONS[e.from] || { x: 50, y: 50 };
                        const to = GRAPH_POSITIONS[e.to] || { x: 50, y: 50 };
                        return (
                          <line
                            key={i}
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="hsl(var(--border))" strokeWidth="2"
                          />
                        );
                      })}
                      {/* Nodes */}
                      {graph.nodes.map(n => {
                        const pos = GRAPH_POSITIONS[n.id] || { x: 50, y: 50 };
                        const isVisited = Boolean(currentGraphData?.visited?.includes(n.id));
                        const isCurrent = currentGraphData?.current === n.id;
                        return (
                          <g key={n.id}>
                            <motion.circle
                              cx={pos.x} cy={pos.y} r={22}
                              fill={isCurrent ? 'hsl(24 80% 52%)' : isVisited ? 'hsl(162 60% 40%)' : 'hsl(var(--muted))'}
                              stroke={isCurrent ? 'hsl(24 80% 45%)' : 'hsl(var(--border))'}
                              strokeWidth="2"
                              animate={{ scale: isCurrent ? 1.15 : 1 }}
                              transition={{ duration: 0.2 }}
                            />
                            <text
                              x={pos.x} y={pos.y + 5}
                              textAnchor="middle"
                              className="text-sm font-bold"
                              fill={isCurrent || isVisited ? 'white' : 'hsl(var(--foreground))'}
                            >
                              {n.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}

                {/* Empty state */}
                {!isGraph && !currentData && (
                  <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
                    Click Generate to start
                  </div>
                )}
              </div>

              {/* Step description */}
              <div className="glass-card p-3">
                <p className="text-sm font-mono text-foreground">
                  {isGraph
                    ? (currentGraphData?.description || 'Ready')
                    : (currentData?.description || 'Ready')}
                </p>
              </div>

              {/* Playback controls */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button variant="outline" size="icon" onClick={restart} className="rounded-full h-9 w-9">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={stepBack} disabled={currentStep === 0} className="rounded-full h-9 w-9">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={isPlaying ? pause : playAnimation}
                    className="rounded-full h-11 w-11 shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={stepForward} disabled={currentStep >= totalSteps - 1} className="rounded-full h-9 w-9">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>

                {/* Size & Speed sliders */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {!isGraph && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Ruler className="w-3 h-3" /> Array Size: {arraySize}
                      </label>
                      <Slider
                        value={[arraySize]} min={5} max={50} step={1}
                        onValueChange={v => setArraySize(v[0])}
                      />
                    </div>
                  )}
                  <div className={isGraph ? 'col-span-2' : ''}>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <Timer className="w-3 h-3" /> Speed: {speed}ms
                    </label>
                    <Slider
                      value={[speed]} min={50} max={1000} step={25}
                      onValueChange={v => setSpeed(v[0])}
                    />
                  </div>
                </div>

                {/* Custom data input */}
                {!isGraph && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Custom Data (comma-separated numbers, or leave empty for random)
                    </label>
                    <Input
                      placeholder="e.g. 42, 17, 88, 5, 63, 29"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                {/* Search target + Generate */}
                <div className="flex gap-2 mt-4">
                  {category === 'searching' && (
                    <Input
                      type="number"
                      placeholder="Search target"
                      value={searchTarget}
                      onChange={e => setSearchTarget(e.target.value)}
                      className="font-mono text-sm w-32"
                    />
                  )}
                  <Button onClick={generate} className="gap-1.5 flex-1">
                    <ArrowRight className="w-4 h-4" /> Generate & Reset
                  </Button>
                </div>
              </div>

              {/* Color Legend */}
              <div className="glass-card p-4">
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Color Legend
                </h4>
                <div className="flex flex-wrap gap-3">
                  {COLOR_LEGEND.map(c => (
                    <div key={c.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${c.color}`} />
                      <span className="text-[11px] text-muted-foreground">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar: Pseudocode + Complexity */}
            <div className="space-y-4">
              {/* Pseudocode */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Pseudocode</h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-medium">Time</span>
                </div>
                <div className="p-3 space-y-1">
                  {pseudocode.map((line, i) => {
                    const lineComp = lineComplexities[i];
                    const isActive = activeLine === i;
                    return (
                      <motion.div
                        key={i}
                        className={`font-mono text-xs py-1.5 px-2 rounded flex items-center justify-between gap-2 transition-all ${
                          isActive
                            ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/40'
                        }`}
                        animate={isActive ? { x: [0, 2, 0] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center min-w-0 overflow-hidden">
                          <span className="text-muted-foreground/50 mr-2.5 select-none w-4 text-right shrink-0">{i + 1}</span>
                          <span className="truncate">{line}</span>
                        </div>
                        {lineComp && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-sm'
                                  : 'bg-muted/60 text-muted-foreground/75 border-border/40'
                              }`}
                              title={`Line ${i + 1} Complexity — Time: ${lineComp.time} | Space: ${lineComp.space}`}
                            >
                              {lineComp.time}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Real-Time Complexity Panel ──────────────────── */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Live Analysis</h3>
                  </div>
                  {isFinished && (
                    <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Done
                    </span>
                  )}
                  {isPlaying && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-primary animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      Running
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-2.5">
                  {/* Theoretical complexities – fixed */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Time</span>
                      </div>
                      <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                        {currentRealtimeTime}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Cpu className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Space</span>
                      </div>
                      <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {currentRealtimeSpace}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/40" />

                  {/* Runtime counters */}
                  <div className="space-y-1.5">
                    {[
                      { icon: Hash,        label: 'Current Step',  value: `${currentStep + 1} / ${totalSteps || 1}`, color: 'text-sky-500' },
                      { icon: TrendingUp,  label: 'Total Ops',     value: rtOps,        color: 'text-violet-500' },
                      { icon: BarChart3,   label: 'Comparisons',   value: rtComps,      color: 'text-rose-500' },
                      { icon: Activity,    label: 'Swaps / Moves', value: rtSwaps,      color: 'text-orange-500' },
                      { icon: Timer,       label: 'Pass',          value: rtPass || '—', color: 'text-primary' },
                      { icon: Ruler,       label: 'Iteration',     value: rtIteration || '—', color: 'text-primary' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <motion.div
                        key={label}
                        className="flex items-center justify-between"
                        layout
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3 h-3 ${color} shrink-0`} />
                          <span className="text-[11px] text-muted-foreground">{label}</span>
                        </div>
                        <motion.span
                          key={String(value)}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`font-mono font-bold text-xs ${color}`}
                        >
                          {value}
                        </motion.span>
                      </motion.div>
                    ))}

                    {/* Execution time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">Exec Time</span>
                      </div>
                      <motion.span
                        key={elapsedMs}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.1 }}
                        className="font-mono font-bold text-xs text-cyan-500"
                      >
                        {elapsedMs > 0 ? `${elapsedMs} ms` : '—'}
                      </motion.span>
                    </div>
                  </div>

                  {/* Op growth mini bar */}
                  {totalSteps > 1 && (
                    <>
                      <div className="border-t border-border/40" />
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Operation Growth</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{Math.round((currentStep / (totalSteps - 1)) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                            animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
                            transition={{ duration: 0.15 }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Complexity */}
              {complexity && (
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Complexity</h3>
                  <div className="space-y-2">
                    {complexity.best && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Best Case</span>
                        <span className="font-mono font-semibold text-accent">{complexity.best}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Average Time</span>
                      <span className="font-mono font-semibold text-primary">{complexity.time}</span>
                    </div>
                    {complexity.worst && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Worst Case</span>
                        <span className="font-mono font-semibold text-destructive">{complexity.worst}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Space</span>
                      <span className="font-mono font-semibold text-foreground">{complexity.space}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Algorithm info */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">About {algo}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {algo === 'Bubble Sort' && 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. Simple but inefficient for large datasets.'}
                  {algo === 'Insertion Sort' && 'Builds the sorted array one element at a time by inserting each element into its correct position. Efficient for small or nearly sorted datasets.'}
                  {algo === 'Merge Sort' && 'Divides the array in half, recursively sorts each half, then merges them. Guaranteed O(n log n) but uses extra space.'}
                  {algo === 'Quick Sort' && 'Picks a pivot, partitions elements around it, then recursively sorts subarrays. Fast in practice with O(n log n) average case.'}
                  {algo === 'Linear Search' && 'Checks each element sequentially until a match is found. Works on unsorted arrays but is slow for large datasets.'}
                  {algo === 'Binary Search' && 'Repeatedly divides a sorted array in half to find the target. Extremely efficient with O(log n) comparisons.'}
                  {algo === 'BFS' && 'Explores all neighbors at the current depth before moving deeper. Uses a queue. Finds shortest path in unweighted graphs.'}
                  {algo === 'DFS' && 'Explores as far as possible along each branch before backtracking. Uses recursion/stack. Useful for cycle detection and topological sorting.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
