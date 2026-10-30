import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowLeft, ChevronRight, Clock, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAssignmentProgress } from '../../utils/planner';
import { plannerHistoryPlans, summarizePlannerHistory, historyDuration } from '../../utils/plannerHistory';
import './plannerHistory.css';

function historyDate(date) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PlannerHistory({ onClose }) {
    const live = useAppStore(s => s.planners);
    const archived = useAppStore(s => s.archivedPlanners);
    const timers = useAppStore(s => s.plannerSessionTimers);
    const reflections = useAppStore(s => s.plannerReflections);
    const bookmarks = useAppStore(s => s.plannerBookmarks);
    const plans = useMemo(() => plannerHistoryPlans(live, archived), [live, archived]);
    const summaries = useMemo(() => Object.fromEntries(plans.map(p => [p.id, summarizePlannerHistory(p, timers?.[p.id])])), [plans, timers]);
    const [selectedId, setSelectedId] = useState(null);
    const [completedOnly, setCompletedOnly] = useState(false);
    const selected = plans.find(p => p.id === selectedId);
    const summary = selected ? summaries[selected.id] : null;
    const dialog = useRef(null);
    useEffect(() => {
        const before = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; before?.focus?.(); };
    }, []);
    useEffect(() => { dialog.current?.querySelector('button')?.focus(); }, [selectedId]);
    const handleKeys = e => {
        if (e.key === 'Escape') { e.stopPropagation(); selected ? setSelectedId(null) : onClose(); }
        if (e.key === 'Tab') {
            const controls = [...dialog.current.querySelectorAll('button, [href], [tabindex="0"]')];
            const first = controls[0], last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
    };
    const visible = plans.filter(p => !completedOnly || summaries[p.id].completed);
    return <div className="planner-history-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <section className="planner-history" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="planner-history-title" onKeyDown={handleKeys}>
            <header>
                {selected && <button aria-label="Back to planner history" onClick={() => setSelectedId(null)}><ArrowLeft size={20} /></button>}
                <h2 id="planner-history-title">{selected ? 'Plan details' : 'Planner history'}</h2>
                <button aria-label="Close history" onClick={onClose}><X size={20} /></button>
            </header>
            <div className="planner-history-content" key={selectedId || 'list'}>
                {!selected ? <>
                    <h3>Your reading journey</h3>
                    <p>{Object.values(summaries).filter(s => s.completed).length} completed plans · {historyDuration(Object.values(summaries).reduce((sum, s) => sum + s.totalSeconds, 0))} recorded</p>
                    <nav aria-label="History filter">
                        <button aria-pressed={!completedOnly} onClick={() => setCompletedOnly(false)}>All past plans</button>
                        <button aria-pressed={completedOnly} onClick={() => setCompletedOnly(true)}>Completed</button>
                    </nav>
                    {!visible.length && <div className="planner-history-empty"><Archive size={28} aria-hidden="true" /><h3>No completed plans yet</h3><p>Finish a plan to see its reading time, progress and reflections here. Archived plans are kept here too.</p></div>}
                    <ul className="planner-history-plans">{visible.map(plan => {
                        const s = summaries[plan.id];
                        return <li key={plan.id}><button className="planner-history-plan" onClick={() => setSelectedId(plan.id)}>
                            <span className="planner-history-status">{s.completed ? 'Completed' : 'Ended early'}</span>
                            <strong>{plan.title}</strong>
                            <span>{s.completedDays}/{s.totalDays} days · {s.pagesRead}/{s.totalPages} pages</span>
                            <span className="planner-history-time"><Clock size={16} aria-hidden="true" />{s.totalSeconds > 0 ? `${historyDuration(s.totalSeconds)} recorded` : 'No reading time recorded'}<ChevronRight size={18} aria-hidden="true" /></span>
                        </button></li>;
                    })}</ul>
                </> : <>
                    <span className="planner-history-status">{summary.completed ? 'Completed plan' : 'Ended plan'}</span>
                    <h3>{selected.title}</h3>
                    <p>Started {historyDate(selected.startDate)}{summary.completedOn && <><br />Completed {historyDate(summary.completedOn)}</>}{selected.archivedAt && <><br />Archived {historyDate(selected.archivedAt.slice(0, 10))}</>}</p>
                    <div className="planner-history-total">{historyDuration(summary.totalSeconds)}</div>
                    <p>Total recorded reading time</p>
                    <p className="planner-history-progress">{summary.completedDays}/{summary.totalDays} days finished · {summary.pagesRead}/{summary.totalPages} pages read</p>
                    {summary.timedDays > 0 && <p>{summary.timedDays} dated reading days · {historyDuration(summary.averageSeconds)} daily average</p>}
                    {!!bookmarks?.[selected.id]?.length && <p>{bookmarks[selected.id].length} saved verse highlights</p>}
                    <h4>Reading time</h4>
                    {!summary.readingDays.length && <p>No reading time was recorded for this plan. Completed reading is still shown below.</p>}
                    <ol className="planner-history-days">{summary.readingDays.map(day => <li key={day.date || `legacy-${day.dayNumber}`}>
                        <div><span>{day.date ? historyDate(day.date) : `Earlier reading · day ${day.dayNumber}`}</span><strong>{historyDuration(day.seconds)}</strong></div>
                        <small>{historyDuration(day.cumulativeSeconds)} accumulated{!day.date && ' · date not recorded'}</small>
                    </li>)}</ol>
                    <h4>Daily reading &amp; reflections</h4>
                    <ol className="planner-history-assignments">{selected.assignments.map(a => {
                        const progress = getAssignmentProgress(selected, a);
                        const reflection = reflections?.[selected.id]?.[a.dayNumber]?.text ?? selected.assignmentReflections?.[a.dayNumber];
                        return <li key={a.dayNumber}><h5>Day {a.dayNumber} · {a.title}</h5>
                            <span>{progress.readPagesCount}/{progress.totalPagesCount} pages · {progress.isComplete ? 'Completed' : progress.readPagesCount ? 'Partially read' : 'Not read'}</span>
                            <small>Scheduled {historyDate(a.date)}{progress.completedAt && <><br />Finished {historyDate(progress.completedAt)}</>}</small>
                            {reflection && <p className="planner-history-reflection">{reflection}</p>}
                        </li>;
                    })}</ol>
                </>}
            </div>
        </section>
    </div>;
}
