import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faTriangleExclamation,
    faCheck,
} from "@fortawesome/free-solid-svg-icons";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/states/LoadingState";
import EmptyState from "../../components/states/EmptyState";
import { useAuth } from "../../services/AuthContext";
import { loadNotifications, removeNotification } from "../../services/notifications";

export default function NotificationsHistory() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState(null);
    const [loadingId, setLoadingId] = useState("");

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    function load() {
        loadNotifications(user.id)
            .then(setNotifications)
            .catch(() => setNotifications([]));
    }

    async function markAsRead(notification) {
        const notificationId = notification._id;

        if (!notificationId) return;

        setLoadingId(notificationId);

        try {
            await removeNotification(notification);

            setNotifications((prev) => {
                return (prev || []).filter((item) => item._id !== notificationId);
            });
        } catch (error) {
            console.error("Could not mark notification as read:", error);
            alert("Could not remove notification. Please try again.");
        } finally {
            setLoadingId("");
        }
    }

    if (!notifications) {
        return (
            <AppShell>
                <LoadingState title="Loading notifications..." />
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="page-header">
                <div className="breadcrumb">
                    <span>Notifications</span>
                </div>

                <h1 className="page-title">Notifications History</h1>

                <p className="page-sub">
                    Roadmap updates, streaks, and task reminders are all saved here.
                    Click mark as read to remove a notification from history.
                </p>
            </div>

            {notifications.length === 0 ? (
                <EmptyState
                    icon={faBell}
                    title="No notifications yet"
                    text="Complete lessons and tasks to see history here."
                />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {notifications.map((notification) => (
                        <Card key={notification._id || `${notification.title}-${notification.createdAt}`}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 12,
                                }}
                            >
                                <div
                                    className="stat-card-icon"
                                    style={{
                                        marginBottom: 0,
                                        color:
                                            notification.type === "warning"
                                                ? "var(--warning)"
                                                : undefined,
                                    }}
                                >
                                    <FontAwesomeIcon
                                        icon={
                                            notification.type === "warning"
                                                ? faTriangleExclamation
                                                : faBell
                                        }
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                                        {notification.title}
                                    </div>

                                    <p
                                        style={{
                                            color: "var(--text2)",
                                            fontSize: 13,
                                            lineHeight: 1.6,
                                            marginTop: 4,
                                        }}
                                    >
                                        {notification.message}
                                    </p>

                                    {notification.taskTitle && (
                                        <div
                                            style={{
                                                color: "var(--text3)",
                                                fontSize: 11,
                                                marginTop: 4,
                                            }}
                                        >
                                            Task: {notification.taskTitle}
                                        </div>
                                    )}

                                    {notification.createdAt && (
                                        <div
                                            style={{
                                                color: "var(--text3)",
                                                fontSize: 11,
                                                marginTop: 6,
                                            }}
                                        >
                                            {new Date(
                                                notification.createdAt
                                            ).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="secondary"
                                    onClick={() => markAsRead(notification)}
                                    disabled={loadingId === notification._id}
                                >
                                    <FontAwesomeIcon icon={faCheck} />{" "}
                                    {loadingId === notification._id
                                        ? "Removing..."
                                        : "Mark as read"}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}