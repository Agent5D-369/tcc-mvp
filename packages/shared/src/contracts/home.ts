export type HomePayload = {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  metrics: {
    activeProjects: number;
    openTasks: number;
    overdueTasks: number;
    decisionsLogged: number;
    pendingApprovals: number;
    capturedInteractions: number;
  };
  activeProjects: Array<{
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "completed" | "archived";
    health: "green" | "yellow" | "red" | "unknown";
    openTaskCount: number;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    status: string;
    decidedAt: string | null;
    projectName: string | null;
  }>;
  recentMeetings: Array<{
    id: string;
    title: string;
    meetingAt: string | null;
    summary: string | null;
    projectName: string | null;
  }>;
  recentInteractions: Array<{
    id: string;
    title: string;
    sourceLabel: string | null;
    summary: string | null;
    queueName: string | null;
    createdAt: string;
  }>;
  approvalQueues: Array<{
    id: string;
    name: string;
    slug: string;
    pendingCount: number;
  }>;
  compiledPages: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    updatedAt: string;
  }>;
  attentionItems: string[];
  commandBrief: {
    summary: string;
    priorities: string[];
    blockers: string[];
  } | null;
};
