import { actorHasPermission } from "../../../packages/permissions/src/index.ts";
import {
  getProjectDetailForActor,
  getProjectsRuntime,
  listVisibleProjectsForActor,
  respondToCustomerChangeOrderServer
} from "../../../packages/projects/src/index.ts";
import type { AuthorizationActor, ChangeOrderRecord } from "../../../packages/types/src/index.ts";
import { getPortalActor } from "./shell-data.ts";

export interface PortalApprovalItem {
  projectId: string;
  projectName: string;
  changeOrder: ChangeOrderRecord;
}

export async function getPortalApprovalsData(actor: AuthorizationActor = getPortalActor()) {
  const canViewApprovals = actorHasPermission(actor, "project.change_order.approve.self");

  if (!canViewApprovals) {
    return {
      canViewApprovals,
      pending: [],
      history: []
    };
  }

  const runtime = getProjectsRuntime();
  const visibleProjects = await listVisibleProjectsForActor(runtime, actor);
  const approvals: PortalApprovalItem[] = [];

  for (const project of visibleProjects) {
    const detail = await getProjectDetailForActor(runtime, actor, project.id);

    if (!detail?.project) {
      continue;
    }

    for (const changeOrder of detail.changeOrders) {
      approvals.push({
        projectId: project.id,
        projectName: project.name,
        changeOrder
      });
    }
  }

  const pending = approvals.filter((item) => item.changeOrder.status === "submitted");
  const history = approvals.filter((item) => item.changeOrder.status !== "submitted");

  return {
    canViewApprovals,
    pending,
    history
  };
}

export async function respondToPortalApproval(
  input: {
    changeOrderId: string;
    status: "approved" | "rejected";
  },
  actor: AuthorizationActor = getPortalActor()
) {
  return respondToCustomerChangeOrderServer(getProjectsRuntime(), actor, {
    changeOrderId: input.changeOrderId,
    actorUserId: actor.userId,
    status: input.status
  });
}
