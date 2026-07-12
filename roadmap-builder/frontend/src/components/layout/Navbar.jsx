import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faGear,
    faUser,
    faRightFromBracket,
    faTrophy,
    faClockRotateLeft,
    faBars,
    faXmark,
    faRoad,
    faChartLine,
    faBullseye,
    faMoon,
    faSun,
    faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { loadNotifications, removeNotification } from "../../services/notifications";
import { useAuth } from "../../services/AuthContext";
import {
    getProfilePicture,
    readStoredProfile,
} from "../../services/profilePicture";
import AppLogo from "./AppLogo";
import Button from "../ui/Button";
import "./Navbar.css";

const THEME_KEY = "rb_theme";

const mobileLinks = [
    { label: "Roadmap", path: "/roadmap", icon: faRoad },
    { label: "Progress", path: "/dashboard", icon: faChartLine },
    { label: "Focus Mode", path: "/focus", icon: faBullseye },
    { label: "Achievements", path: "/achievements", icon: faTrophy },
    { label: "Profile", path: "/settings/profile", icon: faUser },
    { label: "Account Settings", path: "/settings/account", icon: faGear },
];

export default function Navbar({ user, variant }) {
    const { logout } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [removingId, setRemovingId] = useState("");
    const [profile, setProfile] = useState(readStoredProfile());
    const [badgeCleared, setBadgeCleared] = useState(false);

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(THEME_KEY) || "dark";
    });
    const NOTIFICATION_BADGE_READ_KEY = "rb_seen_notification_ids";

    const wrapperRef = useRef(null);

    const profilePicture = getProfilePicture(profile);
    // A notification only exists while it's unread — "mark as read" deletes
    // it — so the total count IS the unread count.
    const seenNotificationIds = readSeenNotificationIds(user?.id);

    const unread = notifications.filter((notification) => {
        return !seenNotificationIds.includes(getNotificationId(notification));
    }).length;    const NOTIFICATIONS_PREVIEW_LIMIT = 6;
    const recent = notifications.slice(0, NOTIFICATIONS_PREVIEW_LIMIT);
    function readSeenNotificationIds(userId) {
        if (!userId) return [];

        try {
            const raw = localStorage.getItem(`${NOTIFICATION_BADGE_READ_KEY}:${userId}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveSeenNotificationIds(userId, ids) {
        if (!userId) return;

        localStorage.setItem(
            `${NOTIFICATION_BADGE_READ_KEY}:${userId}`,
            JSON.stringify([...new Set(ids)])
        );
    }

    function getNotificationId(notification) {
        return String(notification?._id || `${notification?.title}-${notification?.createdAt}`);
    }
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        document.body.setAttribute("data-theme", theme);

        document.documentElement.classList.toggle("light", theme === "light");
        document.documentElement.classList.toggle("dark", theme === "dark");

        localStorage.setItem(THEME_KEY, theme);

        window.dispatchEvent(
            new CustomEvent("themeUpdated", {
                detail: theme,
            })
        );
    }, [theme]);

    useEffect(() => {
        if (!user?.id || variant === "landing") return;

        loadNotifications(user.id)
            .then(setNotifications)
            .catch(() => {});
    }, [user?.id, variant]);
    useEffect(() => {
        if (!user?.id || variant === "landing") return;

        let isMounted = true;

        async function refreshNotifications() {
            try {
                const latestNotifications = await loadNotifications(user.id);

                if (!isMounted) return;

                setNotifications(latestNotifications);
            } catch (error) {
                console.error("Could not refresh notifications:", error);
            }
        }

        refreshNotifications();

        const intervalId = setInterval(() => {
            refreshNotifications();
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [user?.id, variant]);

    useEffect(() => {
        function updateNavbarProfile() {
            setProfile(readStoredProfile());
        }

        window.addEventListener("profileUpdated", updateNavbarProfile);

        return () => {
            window.removeEventListener("profileUpdated", updateNavbarProfile);
        };
    }, []);

    function toggleTheme() {
        setTheme((currentTheme) => {
            return currentTheme === "dark" ? "light" : "dark";
        });
    }

    function scrollToTop(event) {
        if (event) {
            event.preventDefault();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function handleLandingNavClick(event, id) {
        event.preventDefault();

        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    function openNotifications() {
        const nextOpenState = !notesOpen;

        setNotesOpen(nextOpenState);
        setMenuOpen(false);
        setMobileMenuOpen(false);

        if (nextOpenState) {
            const currentNotificationIds = notifications.map(getNotificationId);
            const oldSeenIds = readSeenNotificationIds(user?.id);

            saveSeenNotificationIds(user?.id, [
                ...oldSeenIds,
                ...currentNotificationIds,
            ]);
        }
    }

    async function markAsRead(notification) {
        const notificationId = notification._id;

        if (!notificationId) return;

        setRemovingId(notificationId);

        try {
            await removeNotification(notification);

            setNotifications(Array.isArray(latestNotifications) ? latestNotifications : []);            console.error("Could not mark notification as read:", error);
        } finally {
            setRemovingId("");
        }
    }
    function openProfileMenu() {
        setProfile(readStoredProfile());
        setMenuOpen(!menuOpen);
        setNotesOpen(false);
        setMobileMenuOpen(false);
    }

    function toggleMobileMenu() {
        setMobileMenuOpen(!mobileMenuOpen);
        setMenuOpen(false);
        setNotesOpen(false);
    }

    function closeMobileMenu() {
        setMobileMenuOpen(false);
    }

    function handleLogout() {
        setMenuOpen(false);
        setMobileMenuOpen(false);
        logout();
    }

    if (variant === "landing") {
        return (
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <Link to="/" className="landing-logo" onClick={scrollToTop}>
                        <AppLogo />
                    </Link>

                    <nav className="landing-nav-links">
                        <a
                            href="#features"
                            onClick={(event) =>
                                handleLandingNavClick(event, "features")
                            }
                        >
                            Features
                        </a>

                        <a
                            href="#why"
                            onClick={(event) =>
                                handleLandingNavClick(event, "why")
                            }
                        >
                            Why Rhodes
                        </a>

                        <a
                            href="#how"
                            onClick={(event) =>
                                handleLandingNavClick(event, "how")
                            }
                        >
                            How it works
                        </a>
                    </nav>

                    <div className="landing-nav-actions">
                        <button
                            type="button"
                            className="nav-btn theme-toggle-btn"
                            aria-label="Toggle theme"
                            onClick={toggleTheme}
                        >
                            <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
                        </button>

                        <Link to="/login" className="landing-nav-login">
                            Log in
                        </Link>

                        <Link to="/signup">
                            <Button>Get started</Button>
                        </Link>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <nav className="navbar" ref={wrapperRef}>
            <Link

                className="navbar-logo"
                onClick={() => {scrollToTop()
                }}
            >
                <img
                    src="/AppLogo.png"
                    alt="Rhodes Logo"
                    className="navbar-logo-img"
                />

                <span className="navbar-logo-text">Rhodes</span>
            </Link>

            <div className="navbar-right">
                <button
                    className="nav-btn theme-toggle-btn"
                    type="button"
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                >
                    <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
                </button>

                <button
                    className="nav-btn notification-button"
                    type="button"
                    aria-label="Notifications"
                    onClick={openNotifications}
                >
                    <FontAwesomeIcon icon={faBell} />

                    {unread > 0 && (
                        <span className="notification-dot">{unread}</span>
                    )}
                </button>

                {notesOpen && (
                    <div className="dropdown-panel notifications-panel">
                        <div className="dropdown-title">Recent notifications</div>

                        {notifications.length === 0 ? (
                            <div className="dropdown-empty">
                                No notifications yet. Finish a lesson or save your streak.
                            </div>
                        ) : (
                            recent.map((notification) => (
                                <div
                                    className="notification-row"
                                    key={notification._id || notification.title}
                                >
                                    <div className="notification-icon-wrap">
                                        <FontAwesomeIcon icon={faBell} />
                                    </div>

                                    <div className="notification-content">
                                        <div className="notification-card-head">
                                            <strong>{notification.title}</strong>
                                        </div>

                                        <span>{notification.message}</span>

                                        {notification.createdAt && (
                                            <small>
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </small>
                                        )}

                                        <button
                                            type="button"
                                            className="notification-mark-read"
                                            onClick={() => markAsRead(notification)}
                                            disabled={removingId === notification._id}
                                        >
                                            <FontAwesomeIcon icon={faCheck} />
                                            {removingId === notification._id ? "Removing..." : "Mark as read"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {notifications.length > NOTIFICATIONS_PREVIEW_LIMIT && (
                            <Link
                                className="dropdown-link"
                                to="/notifications"
                                onClick={() => setNotesOpen(false)}
                            >
                                <FontAwesomeIcon icon={faClockRotateLeft} /> View
                                notification history
                            </Link>
                        )}
                    </div>
                )}

                <Link
                    to="/settings/account"
                    className="nav-btn desktop-nav-item"
                    aria-label="Settings"
                >
                    <FontAwesomeIcon icon={faGear} />
                </Link>

                <button
                    className="avatar desktop-nav-item"
                    type="button"
                    aria-label="Profile menu"
                    onClick={openProfileMenu}
                >
                    <img
                        src={profilePicture}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="navbar-avatar-img"
                    />
                </button>

                <button
                    className="nav-btn hamburger-button"
                    type="button"
                    aria-label="Open menu"
                    onClick={toggleMobileMenu}
                >
                    <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
                </button>

                {menuOpen && (
                    <div className="dropdown-panel profile-menu">
                        <div className="profile-menu-head">
                            <strong>{user?.name || "Learner"}</strong>
                            <span>{user?.email}</span>
                        </div>

                        <Link
                            to="/settings/profile"
                            onClick={() => setMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon={faUser} /> Profile
                        </Link>

                        <Link
                            to="/achievements"
                            onClick={() => setMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon={faTrophy} /> Achievements
                        </Link>

                        <Link
                            to="/settings/account"
                            onClick={() => setMenuOpen(false)}
                        >
                            <FontAwesomeIcon icon={faGear} /> Account settings
                        </Link>

                        <button type="button" onClick={handleLogout}>
                            <FontAwesomeIcon icon={faRightFromBracket} /> Log out
                        </button>
                    </div>
                )}

                {mobileMenuOpen && (
                    <div className="mobile-menu-panel">
                        <div className="mobile-menu-head">
                            <img
                                src={profilePicture}
                                alt="Profile"
                                width={38}
                                height={38}
                                className="navbar-avatar-img"
                            />

                            <div>
                                <strong>{user?.name || "Learner"}</strong>
                                <span>{user?.email}</span>
                            </div>
                        </div>

                        <div className="mobile-menu-links">
                            {mobileLinks.map((link) => (
                                <NavLink
                                    key={link.path}
                                    to={link.path}
                                    onClick={closeMobileMenu}
                                    className={({ isActive }) =>
                                        `mobile-menu-link${isActive ? " active" : ""}`
                                    }
                                >
                                    <FontAwesomeIcon icon={link.icon} />
                                    <span>{link.label}</span>
                                </NavLink>
                            ))}

                            <button
                                type="button"
                                className="mobile-menu-link logout-link"
                                onClick={handleLogout}
                            >
                                <FontAwesomeIcon icon={faRightFromBracket} />
                                <span>Log out</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}