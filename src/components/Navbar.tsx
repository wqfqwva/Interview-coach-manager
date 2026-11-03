import React, { useState } from 'react';
import { Moon, Sun, ShieldAlert, Sparkles, RefreshCw, X, ArrowRight, CheckCircle2, AlertOctagon } from 'lucide-react';

interface NavbarProps {
  currentView: 'setup' | 'interview' | 'report';
  onNavigate: (view: 'setup' | 'interview' | 'report') => void;
  onResetInterview: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  hasActiveSession: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onResetInterview,
  theme,
  onToggleTheme,
  hasActiveSession,
}) => {
  const [guideModal, setGuideModal] = useState<'star' | 'tail' | null>(null);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand Zone */}
          <button
            onClick={() => onNavigate('setup')}
            className="flex items-center gap-2.5 text-left text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-950 shadow-sm transition-transform group-hover:scale-105">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              VERITAS INTERVIEW
            </span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => onNavigate('setup')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                currentView === 'setup' ? 'text-slate-900 dark:text-white font-semibold underline underline-offset-8 decoration-2 decoration-rose-500' : ''
              }`}
            >
              면접관 설정
            </button>
            {hasActiveSession && (
              <button
                onClick={() => onNavigate('interview')}
                className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                  currentView === 'interview' ? 'text-slate-900 dark:text-white font-semibold underline underline-offset-8 decoration-2 decoration-rose-500' : ''
                }`}
              >
                진행 중인 세션
              </button>
            )}
            <button
              type="button"
              onClick={() => setGuideModal('star')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                guideModal === 'star' ? 'text-rose-500 font-bold' : ''
              }`}
            >
              STAR 평가 기준
            </button>
            <button
              type="button"
              onClick={() => setGuideModal('tail')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                guideModal === 'tail' ? 'text-rose-500 font-bold' : ''
              }`}
            >
              꼬리 질문 원리
            </button>
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleTheme}
              aria-label="테마 전환"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentView !== 'setup' ? (
              <button
                onClick={onResetInterview}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>새 면접 시작</span>
              </button>
            ) : (
              <a
                href="#start-interview-btn"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-rose-600 hover:bg-slate-800 dark:hover:bg-rose-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-300 dark:text-white" />
                <span>시뮬레이션 준비</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Guide Modal: STAR / Tail Question Principles with Skip & Dismiss */}
      {guideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-800 dark:text-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  {guideModal === 'star' ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {guideModal === 'star' ? 'STAR 역량 평가 매트릭스' : '송곳 꼬리 질문(Probing) 발동 원리'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {guideModal === 'star'
                      ? '국내외 대기업 공통 적용 구조화 면접 평가 기준'
                      : '지원자 답변의 맹점과 회피를 파고드는 AI 면접관 알고리즘'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGuideModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {guideModal === 'star' ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">
                      S - Situation (상황 맥락 20%)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      어떤 문제나 제약 조건(일정, 기술 부채, 트래픽 폭증 등)에 직면했는지 육하원칙에 맞게 명확히 설정해야 합니다. 모호한 배경 설명은 즉시 감점됩니다.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
                      T - Task (본인의 역할/과제 20%)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      팀 전체 과제가 아니라 <strong>본인이 직접 해결해야 했던 책임 범위</strong>를 정의합니다. '우리가 했다' 대신 '제가 담당한 부분은'으로 명시하세요.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                      A - Action (구체적 실행 행동 40%)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      가장 배점이 높은 핵심 영역입니다. 어떤 기술 스택, 알고리즘, 엔지니어링 의사결정을 왜 내렸는지 구체적인 수치와 파라미터로 증명해야 합니다.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
                      R - Result (정량적 성과 지표 20%)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                      "개선되었다"는 정성적 표현은 50점 이하 처리됩니다. "P99 레이턴시 34% 단축", "웨이퍼 수율 편차 12%➔3.4% 축소" 등 <strong>숫자 기반 임팩트</strong>를 제시하십시오.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-900 dark:text-rose-300">
                  ⚠️ <strong>주의:</strong> 평가 점수가 80점 미만일 경우 불합격권이며, 58점 이하 항목이 1개라도 발생하면 즉시 과락(탈락) 처리됩니다.
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-rose-600 dark:text-rose-400 text-xs mb-1">
                      1. 정량 수치 부재 시 ➔ 정량 팩트 압박 발동
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      "열심히 개선했다", "속도가 빨라졌다"와 같이 숫자가 빠진 답변을 감지하면, 면접관이 즉시 "그 수치가 몇 %였고 기준점이 무엇이었습니까?"라고 파고듭니다.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-xs mb-1">
                      2. 기여도 모호성 시 ➔ 1인 기여도 분리 압박
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      팀원들과 함께했다는 모호한 진술 시, "그 프로젝트에서 본인이 직접 짠 코드 라인이나 직접 계산한 파라미터 비중은 몇 %였습니까?"라고 추궁합니다.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-sky-600 dark:text-sky-400 text-xs mb-1">
                      3. 말버릇(음/그/약간) 및 트레이드오프 누락 시 ➔ 한계점 추궁
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      장점만 나열하거나 자신감이 없는 어투가 반복되면, 기술의 트레이드오프나 가혹 조건에서의 장애 발생 시 대처 방안을 날카롭게 질의합니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Action Buttons: 건너뛰기 / 면접 바로가기 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGuideModal(guideModal === 'star' ? 'tail' : 'star')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {guideModal === 'star' ? '꼬리 질문 발동 원리도 확인하기' : 'STAR 평가 기준 다시 확인하기'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setGuideModal(null)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  건너뛰기 (닫기)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuideModal(null);
                    if (currentView === 'setup') {
                      const btn = document.getElementById('start-interview-btn');
                      btn?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>면접 실전으로 넘어가기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

