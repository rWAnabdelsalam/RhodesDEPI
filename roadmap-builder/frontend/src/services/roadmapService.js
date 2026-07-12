import { api } from "./api";

export const roadmapService = {
    create({ userId, goal, category, skillLevel, weeklyHours, phaseTitles, phases, levelDescription }) {
        return api.post("/roadmap", { userId, goal, category, skillLevel, weeklyHours, phaseTitles, phases, levelDescription });
    },
    // Cheap check to run BEFORE generating with AI, so we never waste a
    // generation call on a goal + category + skill level that already exists.
    checkExists(userId, { goal, category, skillLevel }) {
        const params = new URLSearchParams({ goal, category: category || "learn", skillLevel: skillLevel || "Beginner" });
        return api.get(`/roadmap/${userId}/exists?${params.toString()}`);
    },
    getForUser(userId) { return api.get(`/roadmap/${userId}`); },
    getAllForUser(userId) { return api.get(`/roadmap/${userId}/all`); },
    activate(roadmapId) { return api.patch(`/roadmap/${roadmapId}/activate`, {}); },
    updatePhase(roadmapId, phaseId, payload) { return api.patch(`/roadmap/${roadmapId}/phase/${phaseId}`, payload); },
    completeLesson(roadmapId, phaseId, lessonIndex) { return api.patch(`/roadmap/${roadmapId}/phase/${phaseId}`, { lessonIndex, lessonDone: true }); },
    saveStreak(roadmapId) { return api.patch(`/roadmap/${roadmapId}/streak`, {}); },
    removeNotification(roadmapId, notificationId) {
        return api.delete(`/roadmap/${roadmapId}/notifications/${notificationId}`);
    },    readAllNotifications(roadmapId) { return api.patch(`/roadmap/${roadmapId}/notifications/read-all`, {}); },
};

export const taskService = {
    getForUser(userId) { return api.get(`/tasks/${userId}`); },
    // This week's tasks: roadmap lessons (auto-planned per track's weekly
    // hours) + manual tasks. The backend handles all planning/carry-over/
    // reminder logic server-side — nothing is generated or stored client-side.
    getWeekly(userId) { return api.get(`/tasks/${userId}/weekly`); },
    // Flattened feed of deadline reminders + "did you finish?" prompts.
    getNotifications(userId) { return api.get(`/tasks/${userId}/notifications`); },
    create(payload) { return api.post("/tasks", payload); },
    update(id, payload) { return api.patch(`/tasks/${id}`, payload); },
    remove(id) { return api.delete(`/tasks/${id}`); },
    clearNotificationsForTask(taskId) {
        return api.delete(`/tasks/${taskId}/notifications`);
    },
    removeNotification(notificationId) {
        return api.delete(`/tasks/notifications/${notificationId}`);
    },
};