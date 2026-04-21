export type ProjectOverviewPayload = {
  project: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    status: string;
    health: string;
    ownerId: string | null;
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
    decisionText: string;
    status: string;
    decidedAt: string | null;
  }>;
  recentMeetings: Array<{
    id: string;
    title: string;
    summary: string | null;
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
  }>;
};
