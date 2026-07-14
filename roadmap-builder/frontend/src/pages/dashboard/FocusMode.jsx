import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useFocusTimer } from "./FocusTimerContext.jsx";
import "./focusMode.css";

const SUGGESTED_MINUTES = [25, 30, 45, 60];

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
}

function todayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function FocusMode() {
    const {
        sessionSeconds,
        secondsLeft,
        running,
        started,
        sounds,
        soundName,
        stats,
        savedSeconds,
        message,
        MIN_MINUTES,
        MAX_MINUTES,
        applyDuration,
        choosePreset,
        handleDurationInputChange,
        startSession,
        togglePause,
        chooseSound,
        endSession,
        resetTimer,
    } = useFocusTimer();

    const elapsedSeconds = sessionSeconds - secondsLeft;
    const percent = (elapsedSeconds / sessionSeconds) * 100;

    const today = todayKey();
    const todaySeconds = stats.daily?.[today] || 0;
    const todaySessions = stats.dailyCompletedSessions?.[today] || 0;

    return (
        <AppShell>
            <div className="page-header">
                <div className="breadcrumb"><span>Focus Mode</span></div>
                <h1 className="page-title">Focus Session</h1>
                <p className="page-sub">
                    Start a session, stop whenever you need, and only the actual focused time is saved.
                </p>
            </div>

            <div className="focus-layout">
                <Card>
                    <div className="focus-timer-card">
                        <div className="focus-circle" style={{ "--focus-progress": `${percent}%` }}>
                            <div className="focus-circle-inner">{formatTime(secondsLeft)}</div>
                        </div>

                        {!started && (
                            <div className="focus-duration-control">
                                <Button
                                    variant="secondary"
                                    onClick={() => applyDuration(sessionSeconds / 60 - 1)}
                                    disabled={sessionSeconds / 60 <= MIN_MINUTES}
                                >
                                    −
                                </Button>
                                <input
                                    type="number"
                                    className="focus-duration-input"
                                    min={MIN_MINUTES}
                                    max={MAX_MINUTES}
                                    value={sessionSeconds / 60}
                                    onChange={handleDurationInputChange}
                                />
                                <span className="focus-duration-unit">min</span>
                                <Button
                                    variant="secondary"
                                    onClick={() => applyDuration(sessionSeconds / 60 + 1)}
                                    disabled={sessionSeconds / 60 >= MAX_MINUTES}
                                >
                                    +
                                </Button>
                            </div>
                        )}

                        <p className="focus-message">
                            {savedSeconds > 0
                                ? `Saved ${Math.floor(savedSeconds / 60)} min ${savedSeconds % 60}s from your last session.`
                                : message || "Stay focused. You've got this."}
                        </p>

                        <div className="focus-actions">
                            {!started ? (
                                <Button onClick={startSession}>Start session</Button>
                            ) : (
                                <Button variant="secondary" onClick={togglePause}>
                                    {running ? "Pause" : "Resume"}
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={resetTimer}
                                disabled={!started && secondsLeft === sessionSeconds}
                            >
                                Reset
                            </Button>
                            <Button variant="danger" onClick={() => endSession(false)} disabled={!started}>
                                End session
                            </Button>
                        </div>
                    </div>
                </Card>

                <div>
                    <div className="focus-side-card">
                        <Card>
                            <div className="material-section-title focus-section-title">Ambient Sounds</div>
                            <div className="focus-sound-list">
                                {sounds.map((sound) => (
                                    <button
                                        key={sound.name}
                                        type="button"
                                        className={`chip-tag focus-sound-button${soundName === sound.name ? " active" : ""}`}
                                        onClick={() => chooseSound(sound.name)}
                                    >
                                        {sound.name}
                                    </button>
                                ))}
                            </div>
                            <p className="focus-note">
                                Sounds start after pressing Start session because browsers block autoplay.
                            </p>
                        </Card>
                    </div>

                    <Card>
                        <div className="material-section-title focus-stats-title">Today's Focus</div>
                        <div className="stat-grid focus-stat-grid">
                            <div>
                                <div className="stat-label">Sessions Today</div>
                                <div className="stat-value">{todaySessions}</div>
                            </div>
                            <div>
                                <div className="stat-label">Minutes Today</div>
                                <div className="stat-value">{Math.floor(todaySeconds / 60)}</div>
                            </div>
                        </div>
                        <div className="focus-total">
                            Total completed sessions: {stats.completedSessions || stats.sessions || 0} · Total time:{" "}
                            {(Number(stats.seconds || 0) / 3600).toFixed(1)}h
                        </div>
                    </Card>
                </div>

                <div className="focus-suggested-card">
                    <Card>
                        <div className="material-section-title focus-section-title">Suggested Times</div>
                        <div className="focus-preset-list">
                            {SUGGESTED_MINUTES.map((minutes) => (
                                <button
                                    key={minutes}
                                    type="button"
                                    className={`chip-tag focus-preset-button${sessionSeconds === minutes * 60 ? " active" : ""}`}
                                    onClick={() => choosePreset(minutes)}
                                    disabled={started}
                                >
                                    {minutes} min
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}