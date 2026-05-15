import type {
  ChangeOrderRecord,
  ProjectAssignmentRecord,
  ProjectChangeRequestRecord,
  ProjectPhaseRecord,
  ProjectProgressUpdateRecord,
  ProjectPublicShareLinkRecord,
  ProjectRecord,
  ProjectRepository,
  ProjectTaskRecord,
  ProjectTimelineEventRecord
} from "../../types/src/index.ts";

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly phases = new Map<string, ProjectPhaseRecord>();
  private readonly tasks = new Map<string, ProjectTaskRecord>();
  private readonly assignments = new Map<string, ProjectAssignmentRecord>();
  private readonly progressUpdates = new Map<string, ProjectProgressUpdateRecord>();
  private readonly changeRequests = new Map<string, ProjectChangeRequestRecord>();
  private readonly changeOrders = new Map<string, ChangeOrderRecord>();
  private readonly timelineEvents = new Map<string, ProjectTimelineEventRecord>();
  private readonly publicShareLinks = new Map<string, ProjectPublicShareLinkRecord>();

  constructor(seed?: {
    projects?: readonly ProjectRecord[];
    phases?: readonly ProjectPhaseRecord[];
    tasks?: readonly ProjectTaskRecord[];
    assignments?: readonly ProjectAssignmentRecord[];
    progressUpdates?: readonly ProjectProgressUpdateRecord[];
    changeRequests?: readonly ProjectChangeRequestRecord[];
    changeOrders?: readonly ChangeOrderRecord[];
    timelineEvents?: readonly ProjectTimelineEventRecord[];
    publicShareLinks?: readonly ProjectPublicShareLinkRecord[];
  }) {
    seed?.projects?.forEach((project) => {
      this.projects.set(project.id, project);
    });
    seed?.phases?.forEach((phase) => {
      this.phases.set(phase.id, phase);
    });
    seed?.tasks?.forEach((task) => {
      this.tasks.set(task.id, task);
    });
    seed?.assignments?.forEach((assignment) => {
      this.assignments.set(assignment.id, assignment);
    });
    seed?.progressUpdates?.forEach((update) => {
      this.progressUpdates.set(update.id, update);
    });
    seed?.changeRequests?.forEach((changeRequest) => {
      this.changeRequests.set(changeRequest.id, changeRequest);
    });
    seed?.changeOrders?.forEach((changeOrder) => {
      this.changeOrders.set(changeOrder.id, changeOrder);
    });
    seed?.timelineEvents?.forEach((event) => {
      this.timelineEvents.set(event.id, event);
    });
    seed?.publicShareLinks?.forEach((link) => {
      this.publicShareLinks.set(link.id, link);
    });
  }

  createProject(project: ProjectRecord): void {
    this.projects.set(project.id, project);
  }

  updateProject(project: ProjectRecord): void {
    this.projects.set(project.id, project);
  }

  getProjectById(projectId: string): ProjectRecord | undefined {
    return this.projects.get(projectId);
  }

  listProjects(): readonly ProjectRecord[] {
    return [...this.projects.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createPhase(phase: ProjectPhaseRecord): void {
    this.phases.set(phase.id, phase);
  }

  updatePhase(phase: ProjectPhaseRecord): void {
    this.phases.set(phase.id, phase);
  }

  listPhasesByProjectId(projectId: string): readonly ProjectPhaseRecord[] {
    return [...this.phases.values()]
      .filter((phase) => phase.projectId === projectId)
      .sort((left, right) => left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt));
  }

  getPhaseById(phaseId: string): ProjectPhaseRecord | undefined {
    return this.phases.get(phaseId);
  }

  createTask(task: ProjectTaskRecord): void {
    this.tasks.set(task.id, task);
  }

  updateTask(task: ProjectTaskRecord): void {
    this.tasks.set(task.id, task);
  }

  listTasksByProjectId(projectId: string): readonly ProjectTaskRecord[] {
    return [...this.tasks.values()]
      .filter((task) => task.projectId === projectId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  getTaskById(taskId: string): ProjectTaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  createAssignment(assignment: ProjectAssignmentRecord): void {
    this.assignments.set(assignment.id, assignment);
  }

  listAssignmentsByProjectId(projectId: string): readonly ProjectAssignmentRecord[] {
    return [...this.assignments.values()]
      .filter((assignment) => assignment.projectId === projectId && !assignment.taskId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  listAssignmentsByTaskId(taskId: string): readonly ProjectAssignmentRecord[] {
    return [...this.assignments.values()]
      .filter((assignment) => assignment.taskId === taskId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  createProgressUpdate(update: ProjectProgressUpdateRecord): void {
    this.progressUpdates.set(update.id, update);
  }

  listProgressUpdatesByProjectId(projectId: string): readonly ProjectProgressUpdateRecord[] {
    return [...this.progressUpdates.values()]
      .filter((update) => update.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createChangeRequest(changeRequest: ProjectChangeRequestRecord): void {
    this.changeRequests.set(changeRequest.id, changeRequest);
  }

  updateChangeRequest(changeRequest: ProjectChangeRequestRecord): void {
    this.changeRequests.set(changeRequest.id, changeRequest);
  }

  getChangeRequestById(changeRequestId: string): ProjectChangeRequestRecord | undefined {
    return this.changeRequests.get(changeRequestId);
  }

  listChangeRequestsByProjectId(projectId: string): readonly ProjectChangeRequestRecord[] {
    return [...this.changeRequests.values()]
      .filter((changeRequest) => changeRequest.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createChangeOrder(changeOrder: ChangeOrderRecord): void {
    this.changeOrders.set(changeOrder.id, changeOrder);
  }

  updateChangeOrder(changeOrder: ChangeOrderRecord): void {
    this.changeOrders.set(changeOrder.id, changeOrder);
  }

  getChangeOrderById(changeOrderId: string): ChangeOrderRecord | undefined {
    return this.changeOrders.get(changeOrderId);
  }

  listChangeOrdersByProjectId(projectId: string): readonly ChangeOrderRecord[] {
    return [...this.changeOrders.values()]
      .filter((changeOrder) => changeOrder.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createTimelineEvent(event: ProjectTimelineEventRecord): void {
    this.timelineEvents.set(event.id, event);
  }

  listTimelineEventsByProjectId(projectId: string): readonly ProjectTimelineEventRecord[] {
    return [...this.timelineEvents.values()]
      .filter((event) => event.projectId === projectId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }

  createPublicShareLink(link: ProjectPublicShareLinkRecord): void {
    this.publicShareLinks.set(link.id, link);
  }

  updatePublicShareLink(link: ProjectPublicShareLinkRecord): void {
    this.publicShareLinks.set(link.id, link);
  }

  getPublicShareLinkById(linkId: string): ProjectPublicShareLinkRecord | undefined {
    return this.publicShareLinks.get(linkId);
  }

  listPublicShareLinksByProjectId(projectId: string): readonly ProjectPublicShareLinkRecord[] {
    return [...this.publicShareLinks.values()]
      .filter((link) => link.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
