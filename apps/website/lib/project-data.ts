import { getProjectsRuntime, viewProjectViaPublicLinkServer } from "../../../packages/projects/src/index.ts";

export async function getPublicSharedProject(token: string) {
  return viewProjectViaPublicLinkServer(getProjectsRuntime(), token);
}
