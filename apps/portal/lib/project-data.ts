import type { AuthorizationActor } from "../../../packages/types/src/index.ts";
import { getProjectDetailForActor, getProjectsRuntime, listVisibleProjectsForActor } from "../../../packages/projects/src/index.ts";
import { getPortalActor } from "./shell-data.ts";

export async function getPortalProjectsData(actor: AuthorizationActor = getPortalActor()) {
  const runtime = getProjectsRuntime();
  return listVisibleProjectsForActor(runtime, actor);
}

export async function getPortalProjectDetail(projectId: string, actor: AuthorizationActor = getPortalActor()) {
  const runtime = getProjectsRuntime();
  return getProjectDetailForActor(runtime, actor, projectId);
}
