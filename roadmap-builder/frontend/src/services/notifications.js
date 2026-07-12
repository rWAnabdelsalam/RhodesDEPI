import { roadmapService, taskService } from "./roadmapService";

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

// Combines a roadmap's own notifications (streaks, lesson nudges, etc.) with
// a user's task notifications (deadline reminders, "did you finish?"
// prompts) into a single, most-recent-first feed. Each notification is
// tagged with where it came from so it can be removed later with a single
// call to removeNotification().
export async function loadNotifications(userId) {
    const [roadmapRes, taskNotesRes] = await Promise.allSettled([
        roadmapService.getForUser(userId),
        taskService.getNotifications(userId),
    ]);

    const roadmap = roadmapRes.status === "fulfilled" ? roadmapRes.value : null;

    const roadmapNotifications = safeArray(roadmap?.notifications).map((notification) => ({
        ...notification,
        source: "roadmap",
        roadmapId: roadmap?._id,
    }));

    const taskNotifications = safeArray(
        taskNotesRes.status === "fulfilled" ? taskNotesRes.value : []
    ).map((notification) => ({
        ...notification,
        source: "task",
    }));

    return [...roadmapNotifications, ...taskNotifications].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
}

// There's no unread/read state to track — a notification simply exists
// until it's dismissed. "Mark as read" removes it for good, both here and
// on the server, so it won't come back on the next load.
export function removeNotification(notification) {
    if (notification.source === "roadmap") {
        return roadmapService.removeNotification(notification.roadmapId, notification._id);
    }

    return taskService.removeNotification(notification._id);
}