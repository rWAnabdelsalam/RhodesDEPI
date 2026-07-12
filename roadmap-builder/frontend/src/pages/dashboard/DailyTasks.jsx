import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faListCheck,
    faPlus,
    faClock,
    faCircleCheck,
    faBookOpen,
    faCheck,
    faCalendarWeek,
    faPlay,
    faHourglassHalf,
    faBell,
    faFlag,
} from "@fortawesome/free-solid-svg-icons";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/states/LoadingState";
import ErrorState from "../../components/states/ErrorState";
import EmptyState from "../../components/states/EmptyState";
import { useAuth } from "../../services/AuthContext";
import { taskService } from "../../services/roadmapService";

// Weekly-lesson tasks are filtered by which of the 3 onboarding categories
// their roadmap belongs to. "Personal Tasks" covers manually-added tasks,
// which aren't tied to any roadmap/category.
const CATEGORY_FILTERS = [
    { key: "all", label: "All" },
    { key: "learn", label: "Learn" },
    { key: "career-path", label: "Career Path" },
    { key: "portfolio-projects", label: "Portfolio Projects" },
    { key: "personal", label: "Personal Tasks" },
];

const columns = [
    { id: "todo", label: "Not Started Yet" },
    { id: "in-progress", label: "In Progress" },
];

// Minutes alone under an hour ("25 min"), otherwise hours + leftover
// minutes ("1h 30m"), dropping the minutes part when it's a clean hour.
function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));

    if (total < 60) return `${total} min`;

    const hours = Math.floor(total / 60);
    const remainder = total % 60;

    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function getLocalDateKey(date = new Date()) {
    const localDate = new Date(date);

    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getWeekStartDate(date = new Date()) {
    const localDate = new Date(date);

    localDate.setHours(12, 0, 0, 0);

    const day = localDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    localDate.setDate(localDate.getDate() + diffToMonday);

    return localDate;
}

function getWeekEndDate(date = new Date()) {
    const start = getWeekStartDate(date);
    const end = new Date(start);

    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return end;
}

function isInCurrentWeek(dateValue) {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const start = getWeekStartDate();
    const end = getWeekEndDate();

    return date >= start && date <= end;
}

function daysUntil(dateValue) {
    const now = new Date();
    const target = new Date(dateValue);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.round((startOfTarget - startOfToday) / 86400000);
}


function deadlineBadge(dueDate) {
    if (!dueDate) return null;

    const days = daysUntil(dueDate);

    if (days < 0) {
        return { text: `Overdue by ${Math.abs(days)}d`, color: "var(--danger)" };
    }

    if (days === 0) {
        return { text: "Due today", color: "var(--warning)" };
    }

    if (days === 1) {
        return { text: "Due tomorrow", color: "var(--warning)" };
    }

    const dateLabel = new Date(dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });

    return { text: `Due ${dateLabel}`, color: "var(--text3)" };
}
function resolvePriority(dueDate, selectedPriority) {
    if (selectedPriority) return selectedPriority;

    if (!dueDate) return "medium";

    const days = daysUntil(dueDate);

    if (days <= 1) return "high";
    if (days <= 7) return "medium";

    return "low";
}

function priorityText(priority) {
    if (priority === "high") return "High";
    if (priority === "medium") return "Medium";
    return "Not urgent";
}

function categoryLabel(category) {
    const found = CATEGORY_FILTERS.find((item) => item.key === category);
    return found ? found.label : "Learn";
}

function taskMatchesFilter(task, filterKey) {
    if (filterKey === "all") return true;
    if (filterKey === "personal") return task.taskType !== "weekly-lesson";

    return task.taskType === "weekly-lesson" && (task.roadmap?.category || "learn") === filterKey;
}

function getTrackMinutes(weeklyLessons) {
    return weeklyLessons.reduce((result, task) => {
        const name = task.roadmap?.goal || "Roadmap";

        result[name] = result[name] || { minutes: 0, category: task.roadmap?.category };
        result[name].minutes += Number(task.duration || 0);

        return result;
    }, {});
}

export default function DailyTasks() {
    const { user } = useAuth();

    const [weekKey, setWeekKey] = useState("");
    const [tasks, setTasks] = useState(null);
    const [error, setError] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newDuration, setNewDuration] = useState(25);
    const [newDeadline, setNewDeadline] = useState("");
    const [newPriority, setNewPriority] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    useEffect(() => {
        load();
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    function load() {
        if (!user?.id) return;

        setError(false);

        Promise.allSettled([
            taskService.getWeekly(user.id),
            taskService.getForUser(user.id),
        ])
            .then(([weeklyRes, manualRes]) => {
                const weeklyData =
                    weeklyRes.status === "fulfilled" ? weeklyRes.value : {};

                const weeklyTasks = safeArray(weeklyData.tasks);

                const allUserTasks =
                    manualRes.status === "fulfilled" ? safeArray(manualRes.value) : [];

                const weeklyLessonTasks = weeklyTasks.filter((task) => {
                    return task.taskType === "weekly-lesson";
                });

                const manualTasks = allUserTasks.filter((task) => {
                    return task.taskType !== "weekly-lesson";
                });

                /*
                    Important:
                    Do NOT delete completed manual tasks from the frontend here.
                    They were disappearing on refresh because this page was deleting/filtering
                    them too early.

                    Completed manual tasks will stay visible in "Completed Manual Tasks This Week"
                    as long as their completedAt is inside the current week.
                */

                setWeekKey(weeklyData.weekKey || "");
                setTasks([...weeklyLessonTasks, ...manualTasks]);
            })
            .catch(() => setError(true));
    }
    async function moveTask(task, status) {
        const updated = await taskService.update(task._id, {
            status,
            completed: status === "done",
            completedAt: status === "done" ? new Date().toISOString() : undefined,
        });

        setTasks((prev) => safeArray(prev).map((item) => (item._id === updated._id ? updated : item)));
    }

    async function completeTask(task) {
        await moveTask(task, "done");

        if (task.taskType !== "weekly-lesson") {
            taskService.clearNotificationsForTask(task._id).catch(() => {});
        }
    }
    // "Start Task" begins the duration timer server-side. Once it runs out,
    // the next time tasks are fetched the task flips to awaitingConfirmation
    // and a "did you finish?" prompt appears here.
    async function startTask(task) {
        const updated = await taskService.update(task._id, {
            activeStartedAt: new Date().toISOString(),
            awaitingConfirmation: false,
            status: "in-progress",
        });

        setTasks((prev) => safeArray(prev).map((item) => (item._id === updated._id ? updated : item)));
    }

    async function respondToTimer(task, didFinish) {
        const updated = didFinish
            ? await taskService.update(task._id, {
                completed: true,
                status: "done",
                completedAt: new Date().toISOString(),
                awaitingConfirmation: false,
            })
            : await taskService.update(task._id, {
                activeStartedAt: null,
                awaitingConfirmation: false,
                status: "todo",
            });

        if (didFinish) {
            taskService.clearNotificationsForTask(task._id).catch(() => {});
        }

        setTasks((prev) => safeArray(prev).map((item) => (item._id === updated._id ? updated : item)));
    }

    async function addTask(event) {
        event.preventDefault();

        if (!newTitle.trim()) return;

        const finalPriority = resolvePriority(newDeadline, newPriority);

        const task = await taskService.create({
            userId: user.id,
            title: newTitle.trim(),
            description: newDescription.trim() || undefined,
            duration: Number(newDuration) || 25,
            dueDate: newDeadline || null,
            priority: finalPriority,
            status: "todo",
        });

        setTasks((prev) => [...safeArray(prev), task]);

        setNewTitle("");
        setNewDescription("");
        setNewDuration(25);
        setNewDeadline("");
        setNewPriority("");
    }
    if (error) {
        return (
            <AppShell>
                <ErrorState onRetry={load} />
            </AppShell>
        );
    }

    if (!tasks) {
        return (
            <AppShell>
                <LoadingState title="Loading weekly tasks..." />
            </AppShell>
        );
    }

    // The backend only ever returns weekly-lesson tasks that are either
    // still open (any week, carried over until finished) or completed within
    // the current week — so this is already exactly "this week's lesson set".
    const lessonTasks = tasks.filter((t) => t.taskType === "weekly-lesson");
    const weeklyLessons = lessonTasks.filter((t) => !t.completed); // still to learn — shown on the board
    const completedLessons = lessonTasks.filter((t) => t.completed); // learned this week

    const activeManualTasks = tasks.filter((t) => t.taskType !== "weekly-lesson" && !t.completed);

    const awaitingConfirmation = activeManualTasks.filter((t) => t.awaitingConfirmation);
    const manualTasksForBoard = activeManualTasks.filter((t) => !t.awaitingConfirmation);

    const completedManualTasks = tasks.filter(
        (t) => t.taskType !== "weekly-lesson" && t.completed && isInCurrentWeek(t.completedAt || t.updatedAt)
    );

    const combined = [...weeklyLessons, ...manualTasksForBoard];
    const filtered = combined.filter((task) => taskMatchesFilter(task, activeFilter));
    const filteredCompleted = completedManualTasks.filter((task) => taskMatchesFilter(task, activeFilter));
    const filteredCompletedLessons = completedLessons.filter((task) => taskMatchesFilter(task, activeFilter));

    // "Planned" is the total this week's lesson plan — it's fixed and never
    // shrinks as lessons get completed. Completing a lesson only moves its
    // minutes from "remaining" into "completed", it doesn't reduce the plan.
    const plannedMinutes = lessonTasks.reduce((sum, task) => sum + Number(task.duration || 0), 0);
    const completedLessonMinutes = completedLessons.reduce((sum, task) => sum + Number(task.duration || 0), 0);
    // What's left is simply what hasn't been learned yet.
    const remainingMinutes = weeklyLessons.reduce((sum, task) => sum + Number(task.duration || 0), 0);

    const completedMinutesThisWeek = completedManualTasks.reduce(
        (sum, task) => sum + Number(task.duration || 25),
        0
    );

    const trackMinutes = getTrackMinutes(lessonTasks);

    return (
        <AppShell>
            <div className="page-header">
                <div className="breadcrumb">
                    <span>Weekly Tasks</span>
                </div>

                <h1 className="page-title">This Week's Tasks</h1>

                <p className="page-sub">
                    Lessons are planned from all your roadmaps based on each track's weekly hours. Unfinished
                    weekly lessons stay, and a new weekly set is added next week.
                </p>
            </div>

            {awaitingConfirmation.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {awaitingConfirmation.map((task) => (
                        <Card
                            key={task._id}
                            style={{
                                border: "1px solid var(--warning)",
                                background: "rgba(245,158,11,0.08)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div className="stat-card-icon" style={{ marginBottom: 0, color: "var(--warning)" }}>
                                    <FontAwesomeIcon icon={faBell} />
                                </div>

                                <div style={{ flex: 1, minWidth: 220 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>Time's up on "{task.title}"</div>
                                    <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>
                                        Did you get it done?
                                    </p>
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button onClick={() => respondToTimer(task, true)}>
                                        <FontAwesomeIcon icon={faCheck} /> Yes, mark complete
                                    </Button>
                                    <Button variant="secondary" onClick={() => respondToTimer(task, false)}>
                                        Not yet
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <Card>
                    <div className="stat-card-icon">
                        <FontAwesomeIcon icon={faCalendarWeek} />
                    </div>
                    <div className="stat-label">Current Week</div>
                    <div className="stat-value" style={{ fontSize: 18 }}>{weekKey}</div>
                </Card>

                <Card>
                    <div className="stat-card-icon">
                        <FontAwesomeIcon icon={faCircleCheck} />
                    </div>
                    <div className="stat-label">Completed This Week</div>
                    <div className="stat-value">{completedManualTasks.length}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        {formatDuration(completedMinutesThisWeek)} done
                    </div>
                </Card>

                <Card>
                    <div
                        className="stat-card-icon"
                        style={{ color: "var(--success)", background: "rgba(34,197,94,0.12)" }}
                    >
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="stat-label">Planned Roadmap Lessons</div>
                    <div className="stat-value">{formatDuration(plannedMinutes)}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        Total to learn this week
                    </div>
                </Card>

                <Card>
                    <div
                        className="stat-card-icon"
                        style={{ color: "var(--success)", background: "rgba(34,197,94,0.12)" }}
                    >
                        <FontAwesomeIcon icon={faBookOpen} />
                    </div>
                    <div className="stat-label">Completed Lessons</div>
                    <div className="stat-value">{completedLessons.length}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        {formatDuration(completedLessonMinutes)} learned
                    </div>
                </Card>

                <Card>
                    <div
                        className="stat-card-icon"
                        style={{ color: "var(--warning)", background: "rgba(245,158,11,0.12)" }}
                    >
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="stat-label">Remaining This Week</div>
                    <div className="stat-value">{formatDuration(remainingMinutes)}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                        Still unlearned
                    </div>
                </Card>
            </div>

            {Object.keys(trackMinutes).length > 0 && (
                <Card style={{ marginBottom: 24 }}>
                    <div className="material-section-title" style={{ marginBottom: 12 }}>
                        Weekly plan by track
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 10,
                        }}
                    >
                        {Object.entries(trackMinutes).map(([trackName, info]) => (
                            <div
                                key={trackName}
                                style={{
                                    padding: 12,
                                    border: "1px solid var(--border)",
                                    borderRadius: 14,
                                    background: "var(--surface)",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{trackName}</div>
                                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                                    {categoryLabel(info.category)}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                                    Planned lessons: {formatDuration(info.minutes)}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="task-create-card">
                <form onSubmit={addTask} className="task-create-form">
                    <div className="task-create-main">
                        <input
                            className="form-input task-title-input"
                            placeholder="Add a task..."
                            value={newTitle}
                            onChange={(event) => setNewTitle(event.target.value)}
                        />

                        <input
                            className="form-input"
                            placeholder="Details optional"
                            value={newDescription}
                            onChange={(event) => setNewDescription(event.target.value)}
                        />
                    </div>

                    <div className="task-create-controls">
                        <label className="task-mini-field">
                            <span>Duration</span>
                            <div className="task-inline-input">
                                <input
                                    className="form-input task-duration-input"
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={newDuration}
                                    onChange={(event) => setNewDuration(event.target.value)}
                                    aria-label="Estimated minutes"
                                />
                                <small>min</small>
                            </div>
                        </label>

                        <label className="task-mini-field">
                            <span>Deadline</span>
                            <input
                                className="form-input"
                                type="date"
                                value={newDeadline}
                                onChange={(event) => setNewDeadline(event.target.value)}
                                aria-label="Deadline optional"
                            />
                        </label>

                        <label className="task-mini-field">
                            <span>Priority</span>
                            <select
                                className="form-input"
                                value={newPriority}
                                onChange={(event) => setNewPriority(event.target.value)}
                                aria-label="Task priority"
                            >
                                <option value="">Auto priority</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Not urgent</option>
                            </select>
                        </label>

                        <Button type="submit" icon={<FontAwesomeIcon icon={faPlus} />}>
                            Add
                        </Button>
                    </div>
                </form>
            </Card>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {CATEGORY_FILTERS.map((filter) => (
                    <button
                        key={filter.key}
                        type="button"
                        className={`filter-chip${activeFilter === filter.key ? " active" : ""}`}
                        onClick={() => setActiveFilter(filter.key)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={faListCheck}
                    title="No tasks in this view"
                    text="Generate a roadmap, add a manual task, or pick a different filter."
                />
            ) : (
                <div className="kanban-board two-cols">
                    {columns.map((column) => (
                        <div key={column.id}>
                            <div className="kanban-col-title">
                                <span>{column.label}</span>
                                <span>
                                    {filtered.filter((task) => (task.status || "todo") === column.id).length}
                                </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {filtered
                                    .filter((task) => (task.status || "todo") === column.id)
                                    .map((task) => {
                                        const isLesson = task.taskType === "weekly-lesson";
                                        const badge = deadlineBadge(task.dueDate);

                                        return (
                                            <Card key={task._id}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "start",
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    <span className={`priority-dot priority-${task.priority || "medium"}`} />

                                                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
    {isLesson ? "Weekly roadmap lesson" : `Personal task · ${priorityText(task.priority || "medium")}`}
</span>
                                                </div>

                                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                                    {task.title}
                                                </div>

                                                {task.description && (
                                                    <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, marginBottom: 10 }}>
                                                        {task.description}
                                                    </p>
                                                )}

                                                {isLesson && task.roadmap && (
                                                    <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>
                                                        Track: {task.roadmap.goal} · {categoryLabel(task.roadmap.category)} ·{" "}
                                                        {task.roadmap.weeklyHours}h/week
                                                    </div>
                                                )}

                                                {!isLesson && badge && (
                                                    <div style={{ fontSize: 11, color: badge.color, fontWeight: 700, marginBottom: 8 }}>
                                                        {badge.text}
                                                    </div>
                                                )}

                                                {!isLesson && task.activeStartedAt && (
                                                    <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>
                                                        <FontAwesomeIcon icon={faHourglassHalf} /> You've got this — we'll check in soon!
                                                    </div>
                                                )}

                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: 11, color: "var(--text2)" }}>
                                                        Est. {formatDuration(task.duration || 25)}
                                                    </span>

                                                    {isLesson ? (
                                                        <Link
                                                            to={`/roadmap/phase/${task.phaseId}/lesson/${task.lessonIndex}`}
                                                            style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}
                                                        >
                                                            <FontAwesomeIcon icon={faBookOpen} /> Start lesson
                                                        </Link>
                                                    ) : (
                                                        <Link to={`/tasks/${task._id}`} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
                                                            Details
                                                        </Link>
                                                    )}
                                                </div>

                                                {!isLesson && (
                                                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                                                        {!task.activeStartedAt && (
                                                            <button
                                                                type="button"
                                                                onClick={() => startTask(task)}
                                                                className="btn btn-ghost"
                                                                style={{ fontSize: 10, padding: "4px 8px" }}
                                                            >
                                                                <FontAwesomeIcon icon={faPlay} /> Start Task
                                                            </button>
                                                        )}



                                                        <button
                                                            type="button"
                                                            onClick={() => completeTask(task)}
                                                            className="btn btn-primary"
                                                            style={{ fontSize: 10, padding: "4px 8px" }}
                                                        >
                                                            <FontAwesomeIcon icon={faCheck} /> Complete task
                                                        </button>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 28 }}>
                <div className="kanban-col-title">
                    <span>Completed Lessons This Week</span>
                    <span>{filteredCompletedLessons.length}</span>
                </div>

                {filteredCompletedLessons.length === 0 ? (
                    <Card>
                        <p style={{ color: "var(--text2)", fontSize: 13 }}>
                            No lessons completed this week yet.
                        </p>
                    </Card>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 10,
                        }}
                    >
                        {filteredCompletedLessons.map((task) => (
                            <Card key={task._id} className="completed-task-card">
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textDecoration: "line-through",
                                        color: "var(--text2)",
                                    }}
                                >
                                    {task.title}
                                </div>

                                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                                    {task.roadmap ? `${task.roadmap.goal} · ` : ""}
                                    Est. {formatDuration(task.duration || 25)}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 28 }}>
                <div className="kanban-col-title">
                    <span>Completed Manual Tasks This Week</span>
                    <span>{filteredCompleted.length}</span>
                </div>

                {filteredCompleted.length === 0 ? (
                    <Card>
                        <p style={{ color: "var(--text2)", fontSize: 13 }}>
                            No manual tasks completed this week yet.
                        </p>
                    </Card>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 10,
                        }}
                    >
                        {filteredCompleted.map((task) => (
                            <Card key={task._id} className="completed-task-card">
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textDecoration: "line-through",
                                        color: "var(--text2)",
                                    }}
                                >
                                    {task.title}
                                </div>

                                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
                                    Completed this week · Est. {formatDuration(task.duration || 25)}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}