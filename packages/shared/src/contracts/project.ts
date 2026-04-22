export type ProjectOverviewPayload = {
  project: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    status: string;
    health: string;
    ownerId: string | null;
    startDate: string | null;
    targetDate: string | null;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
  };
  milestoneCount: number;
  milestones: Array<{
    id: string;
    name: string;
    description: string | null;
    dueAt: string | null;
    sortOrder: number;
  }>;
  decisions: Array<{
    id: string;
    title: string;
    context: string | null;
    decisionText: string;
    status: string;
    decidedAt: string | null;
  }>;
  recentMeetings: Array<{
    id: string;
    title: string;
    summary: string | null;
    notesMarkdown: string | null;
    meetingAt: string | null;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: string | null;
  }>;
  health: {
    status: string;
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    completionRatio: number;
  };
  nextActions: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    priority: string;
    statusId: string | null;
    statusName: string | null;
    statusKind: string | null;
  }>;
  allTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    priority: string;
    statusId: string | null;
    statusName: string | null;
    statusKind: string | null;
  }>;
  availableStatuses: Array<{
    id: string;
    name: string;
    kind: string;
  }>;
};
