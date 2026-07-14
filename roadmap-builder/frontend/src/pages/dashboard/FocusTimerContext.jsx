import { createContext, useContext, useEffect, useRef, useState } from "react";
import { focusService } from "../../services/focusService";
const DEFAULT_SESSION_SECONDS = 25 * 60;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

const emptyStats = {
    sessions: 0,
    seconds: 0,
    daily: {},
    dailySessions: {},
};

function getSoundPath(filePath) {
    if (!filePath) return "";
    if (filePath.startsWith("/") || filePath.startsWith("http")) return filePath;
    if (filePath.includes("/")) return `/${filePath}`;
    return `/sounds/${filePath}`;
}

function prepareSound(sound) {
    return {
        name: sound.name || "Untitled Sound",
        sound: getSoundPath(sound.sound || sound.file || sound.attachment),
    };
}

const FocusTimerContext = createContext(null);

export function FocusTimerProvider({ children }) {
    const [sessionSeconds, setSessionSeconds] = useState(DEFAULT_SESSION_SECONDS);
    const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SESSION_SECONDS);
    const [running, setRunning] = useState(false);
    const [started, setStarted] = useState(false);
    const [sounds, setSounds] = useState([]);
    const [soundName, setSoundName] = useState("None");
    const [stats, setStats] = useState(emptyStats);
    const [savedSeconds, setSavedSeconds] = useState(0);
    const [message, setMessage] = useState("");

    const intervalRef = useRef(null);
    const audioRef = useRef(null);
    const secondsLeftRef = useRef(DEFAULT_SESSION_SECONDS);
    const endingRef = useRef(false);

    useEffect(() => {
        secondsLeftRef.current = secondsLeft;
    }, [secondsLeft]);

    // Runs once, when the provider mounts (app start) — not on every page visit
    useEffect(() => {
        loadSounds();
        loadStats();
    }, []);

    useEffect(() => {
        if (!running) return;

        intervalRef.current = setInterval(() => {
            setSecondsLeft((old) => Math.max(old - 1, 0));
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [running]);

    useEffect(() => {
        if (started && running && secondsLeft === 0) {
            endSession(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, started, running]);

    async function loadSounds() {
        try {
            const response = await fetch("/data/focusSounds.json");
            const data = await response.json();
            const loadedSounds = Array.isArray(data) ? data.map(prepareSound) : [];
            const hasNone = loadedSounds.some((s) => s.name === "None");
            setSounds(hasNone ? loadedSounds : [{ name: "None", sound: "" }, ...loadedSounds]);
        } catch {
            setSounds([{ name: "None", sound: "" }]);
        }
    }

    async function loadStats() {
        try {
            const databaseStats = await focusService.getStats();
            setStats(databaseStats);
        } catch (error) {
            console.error("Could not load focus stats:", error);
            setStats(emptyStats);
        }
    }

    function getSelectedSound(name = soundName) {
        return sounds.find((s) => s.name === name);
    }

    function startSound(name = soundName) {
        const selected = getSelectedSound(name);
        stopSound();
        if (!selected || selected.name === "None" || !selected.sound) return;

        const audio = new Audio(selected.sound);
        audio.loop = true;
        audio.volume = 0.4;
        audioRef.current = audio;
        audio.play().catch(() => {});
    }

    function pauseSound() {
        if (audioRef.current) audioRef.current.pause();
    }

    function resumeSound() {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {});
        } else {
            startSound();
        }
    }

    function stopSound() {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
    }

    function resetTimer() {
        clearInterval(intervalRef.current);
        endingRef.current = false;
        setRunning(false);
        setStarted(false);
        stopSound();
        setSecondsLeft(sessionSeconds);
        setSavedSeconds(0);
        setMessage("");
    }

    function applyDuration(minutes) {
        const clamped = Math.min(Math.max(minutes, MIN_MINUTES), MAX_MINUTES);
        const newSeconds = clamped * 60;
        setSessionSeconds(newSeconds);
        setSecondsLeft(newSeconds);
        setSavedSeconds(0);
        setMessage("");
    }

    function choosePreset(minutes) {
        applyDuration(minutes);
    }

    function handleDurationInputChange(event) {
        const value = parseInt(event.target.value, 10);
        if (Number.isNaN(value)) return;
        applyDuration(value);
    }

    function startSession() {
        setMessage("");
        setSavedSeconds(0);
        setStarted(true);
        setRunning(true);
        startSound();
    }

    function togglePause() {
        if (!started) {
            startSession();
            return;
        }
        if (running) {
            setRunning(false);
            pauseSound();
        } else {
            setRunning(true);
            resumeSound();
        }
    }

    function chooseSound(nextSoundName) {
        setSoundName(nextSoundName);
        if (!started) return;
        if (running) {
            startSound(nextSoundName);
        } else {
            stopSound();
        }
    }

    async function endSession(timedOut = false) {
        if (endingRef.current) return;
        endingRef.current = true;

        clearInterval(intervalRef.current);
        setRunning(false);
        stopSound();

        const elapsed = sessionSeconds - secondsLeftRef.current;

        if (elapsed > 0) {
            try {
                await focusService.saveSession(elapsed, sessionSeconds);
                await loadStats();
                setSavedSeconds(elapsed);
                setMessage(timedOut ? "Time's up! Focus session complete." : "Focus session saved.");
            } catch (error) {
                console.error("Could not save focus session:", error);
                setMessage("Session ended, but it could not be saved.");
            }
        }

        setStarted(false);
        setSecondsLeft(sessionSeconds);

        setTimeout(() => {
            endingRef.current = false;
        }, 0);
    }

    const value = {
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
    };

    return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer() {
    const ctx = useContext(FocusTimerContext);
    if (!ctx) throw new Error("useFocusTimer must be used within a FocusTimerProvider");
    return ctx;
}