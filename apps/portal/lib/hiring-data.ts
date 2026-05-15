import {
  getApplicationDetailForActor,
  getHiringRuntime,
  getInterviewDetailForActor,
  getOnboardingChecklistForActor,
  listVisibleApplicationsForActor,
  listVisibleInterviewsForActor,
  listVisibleOffersForActor
} from "../../../packages/hiring/src/index.ts";
import type { AuthorizationActor } from "../../../packages/types/src/index.ts";
import { getPortalActor, getPortalPrimaryRole } from "./shell-data.ts";

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function isApplicant(actor: AuthorizationActor): boolean {
  return getPortalPrimaryRole(actor) === "applicant";
}

export async function getApplicantApplicationsData(actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return [];
  }

  return listVisibleApplicationsForActor(getHiringRuntime(), actor);
}

export async function getApplicantApplicationDetail(applicationId: string, actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return undefined;
  }

  return getApplicationDetailForActor(getHiringRuntime(), actor, applicationId);
}

export async function getApplicantInterviewsData(actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return [];
  }

  return listVisibleInterviewsForActor(getHiringRuntime(), actor);
}

export async function getApplicantInterviewDetail(interviewId: string, actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return undefined;
  }

  return getInterviewDetailForActor(getHiringRuntime(), actor, interviewId);
}

export async function getApplicantOffersData(actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return [];
  }

  return listVisibleOffersForActor(getHiringRuntime(), actor);
}

export async function getApplicantOnboardingData(actor: AuthorizationActor = getPortalActor()) {
  if (!isApplicant(actor)) {
    return [];
  }

  const applications = await listVisibleApplicationsForActor(getHiringRuntime(), actor);
  const checklists = await Promise.all(
    applications.map(async (application) => {
      const detail = await getOnboardingChecklistForActor(getHiringRuntime(), actor, application.id);

      if (!detail) {
        return undefined;
      }

      return {
        application,
        checklist: detail.checklist,
        tasks: detail.tasks
      };
    })
  );

  return checklists.filter(isPresent);
}
