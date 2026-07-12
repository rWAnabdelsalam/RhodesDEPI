import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPlay, faTrash, faCheck, faHourglassHalf, faBell } from "@fortawesome/free-solid-svg-icons";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/states/LoadingState";
import { useAuth } from "../../services/AuthContext";
import { taskService } from "../../services/roadmapService";

const priorityLabel = { low: "Low Priority", medium: "Medium Priority", high: "High Priority" };

// Minutes alone under an hour ("25 min"), otherwise hours + leftover
// minutes ("1h 30m"), dropping the minutes part when it's a clean hour.
function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));

    if (total < 60) return `${total} min`;

    const hours = Math.floor(total / 60);
    const remainder = total % 60;

    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function daysUntil(dateValue) {
    const now = new Date();
    const target = new Date(dateValue);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.round((startOfTarget - startOfToday) / 86400000);
}

// Mirrors the tone of the server-side deadline reminders, so what you read
// here matches what you get notified about.
function deadlineInfo(dueDate) {
    if (!dueDate) return null;

    const days = daysUntil(dueDate);

    if (days < 0) {
        const daysLate = Math.abs(days);
        return {
            text: `Overdue by ${daysLate} day${daysLate === 1 ? "" : "s"}`,
            color: "var(--danger)",
        };
    }

    if (days === 0) return { text: "Due today", color: "var(--warning)" };
    if (days === 1) return { text: "Due tomorrow", color: "var(--warning)" };

    return {
        text: `Due ${new Date(dueDate).toLocaleDateString(undefined, { month: "long", day: "numeric" })}`,
        color: "var(--text2)",
    };
}

function statusLabel(task) {
    if (task.status === "done") return { text: "Completed", color: "var(--success)" };
    if (task.activeStartedAt) return { text: "In Progress", color: "var(--warning)" };
    return { text: "Not Started Yet", color: "var(--text3)" };
}

export default function TaskDetails() {
    const { taskId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [titleDraft, setTitleDraft] = useState("");
    const [descriptionDraft, setDescriptionDraft] = useState("");

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id, taskId]);

    function load() {
        taskService.getForUser(user.id).then((tasks) => {
            const found = tasks.find((t) => t._id === taskId);
            setTask(found);
            setTitleDraft(found?.title || "");
            setDescriptionDraft(found?.description || "");
        });
    }

    if (!task) return <AppShell><LoadingState title="Loading task..." /></AppShell>;

    async function handleDelete() {
        await taskService.remove(taskId);
        navigate("/tasks");
    }

    async function handleComplete() {
        await taskService.update(taskId, {
            status: "done",
            completed: true,
            completedAt: new Date().toISOString(),
            awaitingConfirmation: false,
        });

        taskService.clearNotificationsForTask(taskId).catch(() => {});

        navigate("/tasks");
    }

    async function handleStartTask() {
        await taskService.update(taskId, {
            activeStartedAt: new Date().toISOString(),
            awaitingConfirmation: false,
            status: "in-progress",
        });
        load();
    }

    async function handleTimerResponse(didFinish) {
        if (didFinish) {
            await handleComplete();
            return;
        }

        await taskService.update(taskId, {
            activeStartedAt: null,
            awaitingConfirmation: false,
            status: "todo",
        });
        load();
    }

    // Title/details are saved as soon as you click away, so this reads more
    // like a live document than a form you have to remember to submit.
    async function saveTitle() {
        const trimmed = titleDraft.trim();

        if (!trimmed || trimmed === task.title) {
            setTitleDraft(task.title);
            return;
        }

        const updated = await taskService.update(taskId, { title: trimmed });
        setTask(updated);
    }

    async function saveDescription() {
        if (descriptionDraft === (task.description || "")) return;

        const updated = await taskService.update(taskId, { description: descriptionDraft });
        setTask(updated);
    }

    const deadline = deadlineInfo(task.dueDate);
    const status = statusLabel(task);
    const estimatedFinish = task.activeStartedAt
        ? new Date(new Date(task.activeStartedAt).getTime() + Number(task.duration || 25) * 60000)
        : null;

    return (
        <AppShell>
            <Link to="/tasks" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>
                <FontAwesomeIcon icon={faArrowLeft} /> Back to tasks
            </Link>

            <div className="page-header">
                <input
                    className="page-title"
                    style={{ border: "none", background: "transparent", width: "100%", padding: 0 }}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={saveTitle}
                    aria-label="Task title"
                />
                <p className="page-sub">
                    <span className={`priority-dot priority-${task.priority || "medium"}`} style={{ marginRight: 4 }} />
                    {priorityLabel[task.priority || "medium"]} &middot; {formatDuration(task.duration || 25)} estimated
                    {" "}&middot; <span style={{ color: status.color, fontWeight: 700 }}>{status.text}</span>
                    {deadline && (
                        <>
                            {" "}&middot; <span style={{ color: deadline.color, fontWeight: 700 }}>{deadline.text}</span>
                        </>
                    )}
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
                <div>
                    {task.awaitingConfirmation && (
                        <Card
                            style={{
                                marginBottom: 16,
                                border: "1px solid var(--warning)",
                                background: "rgba(245,158,11,0.08)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div className="stat-card-icon" style={{ marginBottom: 0, color: "var(--warning)" }}>
                                    <FontAwesomeIcon icon={faBell} />
                                </div>

                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>Time's up! Did you finish?</div>
                                    <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>
                                        Your timer for this task has run out.
                                    </p>
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button onClick={() => handleTimerResponse(true)}>
                                        <FontAwesomeIcon icon={faCheck} /> Yes, done
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleTimerResponse(false)}>
                                        Not yet
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card style={{ marginBottom: 16 }}>
                        <div className="material-section-title" style={{ marginBottom: 12 }}>Focus Timer</div>

                        {task.activeStartedAt && !task.awaitingConfirmation ? (
                            <p style={{ fontSize: 13, color: "var(--text2)" }}>
                                <FontAwesomeIcon icon={faHourglassHalf} /> You can do this! Your timer's been running since{" "}
                                {new Date(task.activeStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {estimatedFinish && (
                                    <> — we'll quietly check in around {estimatedFinish.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to see how it went.</>
                                )}
                            </p>
                        ) : (
                            <p style={{ fontSize: 13, color: "var(--text2)" }}>
                                You can do it! Hit start whenever you dive in — we'll be checking up on you once your{" "}
                                {formatDuration(task.duration || 25)} are up, no pressure.
                            </p>
                        )}
                    </Card>

                    <Card>
                        <div className="material-section-title" style={{ marginBottom: 12 }}>Details</div>
                        <textarea
                            className="form-input"
                            style={{ width: "100%", minHeight: 100, resize: "vertical", fontSize: 13, lineHeight: 1.7 }}
                            placeholder="Add any details for this task..."
                            value={descriptionDraft}
                            onChange={(event) => setDescriptionDraft(event.target.value)}
                            onBlur={saveDescription}
                        />
                    </Card>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {task.status !== "done" && !task.activeStartedAt && (
                        <Button icon={<FontAwesomeIcon icon={faPlay} />} onClick={handleStartTask}>
                            Start task
                        </Button>
                    )}

                    {task.status !== "done" && (
                        <Button icon={<FontAwesomeIcon icon={faCheck} />} onClick={handleComplete}>
                            Complete task
                        </Button>
                    )}

                    <Button icon={<FontAwesomeIcon icon={faPlay} />} onClick={() => navigate("/focus")}>
                        Start focus session
                    </Button>

                    <Button variant="danger" icon={<FontAwesomeIcon icon={faTrash} />} onClick={handleDelete}>
                        Delete task
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}