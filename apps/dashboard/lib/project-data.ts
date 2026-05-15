import { getProjectsRuntime } from "../../../packages/projects/src/index.ts";

export function getDashboardProjectsHomeData() {
  const runtime = getProjectsRuntime();
  const projects = runtime.service.listProjects();
  const detail = projects[0] ? runtime.service.getProjectDetail(projects[0].id) : undefined;

  return {
    projects,
    auditPreview: runtime.auditSink.list().slice(0, 4),
    stats: {
      totalProjects: projects.length,
      activeProjects: projects.filter((project) => project.status === "active").length,
      openChangeRequests: projects.reduce(
        (count, project) => count + runtime.service.getProjectDetail(project.id).changeRequests.filter((request) => request.status !== "rejected").length,
        0
      ),
      publicShares: projects.reduce(
        (count, project) => count + runtime.service.getProjectDetail(project.id).publicShareLinks.length,
        0
      )
    },
    featuredProject: detail
  };
}

export function getDashboardProjectDetail(projectId: string) {
  return getProjectsRuntime().service.getProjectDetail(projectId);
}
