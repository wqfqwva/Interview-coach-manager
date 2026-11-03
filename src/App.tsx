import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SetupView } from './components/SetupView';
import { InterviewCockpit } from './components/InterviewCockpit';
import { ReportView } from './components/ReportView';
import {
  InterviewSetup,
  InterviewRound,
  FinalReportData,
} from './types/interview';
import {
  evaluateAnswerDynamically,
  generateReportDynamically,
  getOpeningQuestionForPersona,
} from './utils/dynamicEvaluator';

export default function App() {
  const [currentView, setCurrentView] = useState<'setup' | 'interview' | 'report'>('setup');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Interview state
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [maxRounds, setMaxRounds] = useState<number>(3); // Dynamically set per user selection
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentIntent, setCurrentIntent] = useState<string>('');
  const [focusKeywords, setFocusKeywords] = useState<string[]>([]);
  const [recommendedTimeSec, setRecommendedTimeSec] = useState<number>(90); // Dynamically set per user selection
  const [interviewerAttitude, setInterviewerAttitude] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<FinalReportData | null>(null);

  // Sync theme with document class
  useEffect(() => {
    const saved = localStorage.getItem('veritas_theme') as 'dark' | 'light' | null;
    const initialTheme = saved || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('veritas_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 1. Start Interview Session (Instant view transition + async enrichment)
  const handleStartInterview = (interviewSetup: InterviewSetup) => {
    setSetup(interviewSetup);
    setRounds([]);
    setCurrentRoundNumber(1);
    setFinalReport(null);

    // Apply custom rounds and custom duration selected by candidate
    const roundsCount = interviewSetup.questionCount || 3;
    setMaxRounds(roundsCount);

    const timeLimit = interviewSetup.timeLimitPerQuestionSec ||
      (interviewSetup.mode === 'pt' ? 180 : 90);
    setRecommendedTimeSec(timeLimit);

    // Generate initial persona-tailored question immediately with randomized seed
    const initialPersonaData = getOpeningQuestionForPersona(
      interviewSetup,
      Math.floor(Math.random() * 100000) + Date.now()
    );

    setCurrentQuestion(initialPersonaData.question);
    setCurrentIntent(initialPersonaData.intent);
    setFocusKeywords(initialPersonaData.focusKeywords);
    setInterviewerAttitude(initialPersonaData.interviewerReaction);

    // INSTANT TRANSITION TO INTERVIEW COCKPIT
    setCurrentView('interview');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Asynchronously enrich with AI-tailored opening question in background
    setIsLoading(true);
    fetch('/api/interview/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interviewSetup),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data;
          if (data.question) setCurrentQuestion(data.question);
          if (data.intent) setCurrentIntent(data.intent);
          if (data.focusKeywords) setFocusKeywords(data.focusKeywords);
          if (data.recommendedTimeSec) setRecommendedTimeSec(data.recommendedTimeSec);
          if (data.interviewerReaction) setInterviewerAttitude(data.interviewerReaction);
        }
      })
      .catch((err) => {
        console.warn('AI question enrichment skipped, using robust baseline:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // 2. Submit Answer & Receive Follow-Up Pressure Tail Question
  const handleAnswerSubmit = async (
    answerText: string,
    speechStats: {
      durationSec: number;
      fillerCount: number;
      detectedFillers: { [key: string]: number };
      gazeOffCount: number;
      gazeCenterPercent: number;
    }
  ) => {
    if (!setup) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/interview/evaluate-and-tail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup,
          history: rounds,
          currentQuestion,
          candidateAnswer: answerText,
          speechStats,
          currentRound: currentRoundNumber,
          maxRounds,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '평가 및 꼬리 질문 생성 실패');
      }

      const evalData = json.data;

      const completedRound: InterviewRound = {
        roundNumber: currentRoundNumber,
        question: currentQuestion,
        intent: currentIntent,
        focusKeywords,
        recommendedTimeSec,
        candidateAnswer: answerText,
        speechStats,
        evaluation: evalData,
      };

      const updatedRounds = [...rounds, completedRound];
      setRounds(updatedRounds);

      if (evalData.isLastRound || currentRoundNumber >= maxRounds) {
        // Proceed to generate final comprehensive report
        await generateFinalReport(updatedRounds, speechStats);
      } else {
        // Transition to next deep tail question
        setCurrentRoundNumber((prev) => prev + 1);
        setCurrentQuestion(evalData.nextQuestion);
        setCurrentIntent(`${evalData.tailQuestionType} - 심층 공방 및 맹점 검증`);
        setInterviewerAttitude(evalData.interviewerAttitude);
      }
    } catch (err: any) {
      console.warn('Backend evaluation call failed or offline, computing dynamic evaluation:', err);
      const evalData = evaluateAnswerDynamically(
        setup,
        answerText,
        currentQuestion,
        speechStats,
        currentRoundNumber,
        maxRounds
      );

      const completedRound: InterviewRound = {
        roundNumber: currentRoundNumber,
        question: currentQuestion,
        intent: currentIntent,
        focusKeywords,
        recommendedTimeSec,
        candidateAnswer: answerText,
        speechStats,
        evaluation: evalData,
      };

      const updatedRounds = [...rounds, completedRound];
      setRounds(updatedRounds);

      if (evalData.isLastRound || currentRoundNumber >= maxRounds) {
        await generateFinalReport(updatedRounds, speechStats);
      } else {
        setCurrentRoundNumber((prev) => prev + 1);
        setCurrentQuestion(evalData.nextQuestion);
        setCurrentIntent(`${evalData.tailQuestionType} - 심층 공방 및 맹점 검증`);
        setInterviewerAttitude(evalData.interviewerAttitude);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Generate Final Comprehensive Report
  const generateFinalReport = async (
    allRounds: InterviewRound[],
    lastStats: { durationSec: number; fillerCount: number; gazeOffCount: number; gazeCenterPercent: number }
  ) => {
    if (!setup) return;
    setIsLoading(true);

    const totalDurationSec = allRounds.reduce((acc, r) => acc + (r.speechStats?.durationSec || 0), 0);
    const avgDurationSec = Math.round(totalDurationSec / Math.max(1, allRounds.length));
    const totalFillerCount = allRounds.reduce((acc, r) => acc + (r.speechStats?.fillerCount || 0), 0);
    const totalGazeOffCount = allRounds.reduce((acc, r) => acc + (r.speechStats?.gazeOffCount || 0), 0);
    const avgGazeCenter = Math.round(
      allRounds.reduce((acc, r) => acc + (r.speechStats?.gazeCenterPercent || 90), 0) /
        Math.max(1, allRounds.length)
    );

    const telemetry = {
      totalDurationSec,
      avgDurationSec,
      totalFillerCount,
      totalGazeOffCount,
      eyeContactScore: avgGazeCenter,
      topFillers: setup.mode === 'english' ? ['um', 'like', 'you know'] : ['어...', '솔직히', '약간'],
    };

    try {
      const res = await fetch('/api/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup,
          rounds: allRounds,
          telemetry,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setFinalReport(json.data);
      setCurrentView('report');
    } catch (err: any) {
      console.warn('Final report generation failed or offline, computing dynamic debrief:', err);
      const dynamicReport = generateReportDynamically(setup, allRounds, telemetry);
      setFinalReport(dynamicReport);
      setCurrentView('report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishEarly = () => {
    if (rounds.length === 0) {
      alert('최소 1개 이상의 답변을 제출하신 후 리포트를 확인할 수 있습니다.');
      return;
    }
    const lastRound = rounds[rounds.length - 1];
    generateFinalReport(rounds, lastRound.speechStats);
  };

  const handleResetInterview = () => {
    if (confirm('현재 면접 세션을 종료하고 새 면접 설정으로 돌아가시겠습니까?')) {
      setSetup(null);
      setRounds([]);
      setCurrentRoundNumber(1);
      setFinalReport(null);
      setCurrentView('setup');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-rose-500 selection:text-white">
      {/* Top Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onResetInterview={handleResetInterview}
        theme={theme}
        onToggleTheme={toggleTheme}
        hasActiveSession={rounds.length > 0 || currentView === 'interview'}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentView === 'setup' && (
          <SetupView onStartInterview={handleStartInterview} isLoading={isLoading} />
        )}

        {currentView === 'interview' && setup && (
          <InterviewCockpit
            setup={setup}
            currentRoundNumber={currentRoundNumber}
            maxRounds={maxRounds}
            currentQuestion={currentQuestion}
            currentIntent={currentIntent}
            focusKeywords={focusKeywords}
            recommendedTimeSec={recommendedTimeSec}
            interviewerAttitude={interviewerAttitude}
            history={rounds}
            isLoadingNext={isLoading}
            onAnswerSubmit={handleAnswerSubmit}
            onFinishInterviewEarly={handleFinishEarly}
          />
        )}

        {currentView === 'report' && setup && finalReport && (
          <ReportView
            setup={setup}
            report={finalReport}
            rounds={rounds}
            onRestart={() => {
              setSetup(null);
              setRounds([]);
              setCurrentView('setup');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">VERITAS AI INTERVIEW</span>
            <span>·</span>
            <span>실전 압박 면접 시뮬레이션 시스템</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>STT 음성 분석</span>
            <span>·</span>
            <span>시선 & 말버릇 트래킹</span>
            <span>·</span>
            <span>STAR 프레임워크 자동 채점</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
