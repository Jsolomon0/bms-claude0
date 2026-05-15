import {
  type PermissionDefinition,
  type PermissionKey,
  type RoleKey,
  type VisibilityFlag
} from "../../types/src/index.ts";

function definePermission(definition: PermissionDefinition): PermissionDefinition {
  return definition;
}

const internalOnly: readonly VisibilityFlag[] = ["internal"];
const applicantOnly: readonly VisibilityFlag[] = ["applicant"];
const internalAndCustomer: readonly VisibilityFlag[] = ["internal", "customer"];
const internalAndApplicant: readonly VisibilityFlag[] = ["internal", "applicant"];
const internalAndPublicLink: readonly VisibilityFlag[] = ["internal", "public_link"];
const applicantAndPublicLink: readonly VisibilityFlag[] = ["applicant", "public_link"];
const internalCustomerAndPublicLink: readonly VisibilityFlag[] = ["internal", "customer", "public_link"];
const customerAndPartner: readonly VisibilityFlag[] = ["customer", "subcontractor", "supercontractor"];
const internalAndPartner: readonly VisibilityFlag[] = ["internal", "subcontractor", "supercontractor"];
const internalPartnerAndPublicLink: readonly VisibilityFlag[] = [
  "internal",
  "subcontractor",
  "supercontractor",
  "public_link"
] as const;

export const PERMISSION_REGISTRY = [
  definePermission({
    key: "security.role.view.all",
    description: "View role definitions and assignments.",
    scope: "all",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "security.role.manage.all",
    description: "Create, update, or revoke role assignments.",
    scope: "all",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "security.permission.view.all",
    description: "View the permission registry and effective grants.",
    scope: "all",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "security.membership.manage.org",
    description: "Manage role memberships inside an organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "automation.view.org",
    description: "View workflow automation job runs, failures, and reminder activity for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "automation.run.org",
    description: "Trigger or retry workflow automation jobs for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "audit.view.org",
    description: "Read audit records for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "audit.view.all",
    description: "Read audit records across all organizations.",
    scope: "all",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "audit.export.all",
    description: "Export audit records across all organizations.",
    scope: "all",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "public_link.issue.org",
    description: "Issue signed public links for records in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "public_link.revoke.org",
    description: "Revoke signed public links for records in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "crm.view.org",
    description: "View CRM workspace records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "intake.view.org",
    description: "View intake requests inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "intake.review.org",
    description: "Review and update intake requests inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "lead.view.org",
    description: "View lead pipeline records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "lead.convert.org",
    description: "Convert reviewed intake requests into project drafts.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "consultation.schedule.org",
    description: "Schedule consultation follow-ups from intake review.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "customer.invite.org",
    description: "Invite short-term requesters to become long-term customers.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "finance.view.org",
    description: "View finance workspace records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "report.view.org",
    description: "View derived operational and profitability reports inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "report.export.org",
    description: "Export derived operational and profitability reports inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "vendor.view.org",
    description: "View vendor records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "vendor.manage.org",
    description: "Create and update vendor records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "expense.view.self",
    description: "View the actor's own expense records.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "expense.view.org",
    description: "View expense records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "expense.create.self",
    description: "Create expense entries for the actor's own reimbursement or cost records.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "expense.manage.org",
    description: "Edit expense records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "expense.approve.org",
    description: "Approve or reject expense records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "purchase_order.view.org",
    description: "View purchase orders inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "purchase_order.manage.org",
    description: "Create and edit purchase orders inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "purchase_order.approve.org",
    description: "Approve or reject purchase orders inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "bill.view.org",
    description: "View vendor bills inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "bill.manage.org",
    description: "Create and edit vendor bills inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "bill.approve.org",
    description: "Approve or move vendor bills into payable states inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "inventory.view.org",
    description: "View inventory workspace records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "partner.view.org",
    description: "View partner workspace records inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "settings.view.org",
    description: "View tenant settings and operational configuration.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "notification.view.self",
    description: "View the actor's own notification center.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "message.view.self",
    description: "View stakeholder-safe message threads scoped to the actor's own account or partner organization.",
    scope: "self",
    allowedVisibilities: customerAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "message.reply.self",
    description: "Reply inside stakeholder-safe message threads scoped to the actor's own account or partner organization.",
    scope: "self",
    allowedVisibilities: customerAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.all",
    description: "View every project across the tenant.",
    scope: "all",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.org",
    description: "View projects inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.assigned",
    description: "View assigned projects only.",
    scope: "assigned",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.self",
    description: "View projects linked to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.partner",
    description: "View projects belonging to the actor's partner organization.",
    scope: "partner",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.view.public_link",
    description: "View a project through a signed public link.",
    scope: "public_link",
    allowedVisibilities: internalPartnerAndPublicLink,
    sensitive: true,
    publicLinkAllowed: true
  }),
  definePermission({
    key: "project.create.org",
    description: "Create a project from an approved intake request inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.phase.manage.org",
    description: "Create and update project phases inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.task.manage.org",
    description: "Create and update project tasks inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.assign.org",
    description: "Assign employees and partner organizations to projects and tasks.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.progress.create.org",
    description: "Publish project progress updates for projects inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.progress.create.assigned",
    description: "Publish project progress updates for assigned projects only.",
    scope: "assigned",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.progress.create.partner",
    description: "Publish project progress updates for managed partner projects.",
    scope: "partner",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.status.manage.org",
    description: "Change project lifecycle status inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.visibility.manage.org",
    description: "Change project visibility flags inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.change_request.create.self",
    description: "Submit a project change request for the actor's own customer project.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.change_order.review.org",
    description: "Review and update change orders inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "project.change_order.approve.self",
    description: "Approve or reject submitted customer-visible change orders scoped to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.view.org",
    description: "View documents for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.view.assigned",
    description: "View documents for assigned work only.",
    scope: "assigned",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.view.self",
    description: "View documents linked to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.view.partner",
    description: "View documents visible to the actor's partner organization.",
    scope: "partner",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.view.public_link",
    description: "View a document through a signed public link.",
    scope: "public_link",
    allowedVisibilities: internalPartnerAndPublicLink,
    sensitive: true,
    publicLinkAllowed: true
  }),
  definePermission({
    key: "document.upload.org",
    description: "Upload documents inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.upload.assigned",
    description: "Upload documents for assigned records only.",
    scope: "assigned",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.upload.self",
    description: "Upload documents linked to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.upload.partner",
    description: "Upload documents for the actor's partner organization.",
    scope: "partner",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.version.upload.org",
    description: "Upload new versions for documents in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndPartner,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.version.upload.assigned",
    description: "Upload new versions for assigned documents only.",
    scope: "assigned",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.version.upload.self",
    description: "Upload new versions for documents linked to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.version.upload.partner",
    description: "Upload new versions for documents visible to the actor's partner organization.",
    scope: "partner",
    allowedVisibilities: internalAndPartner,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.manage.org",
    description: "Manage document metadata in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.visibility.manage.org",
    description: "Change document visibility flags in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.access.manage.org",
    description: "Manage document access rules in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "document.archive.manage.org",
    description: "Archive or restore documents in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.view.org",
    description: "View invoices for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.view.self",
    description: "View invoices tied to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.view.public_link",
    description: "View an invoice through a signed public payment link.",
    scope: "public_link",
    allowedVisibilities: internalCustomerAndPublicLink,
    sensitive: true,
    publicLinkAllowed: true
  }),
  definePermission({
    key: "invoice.create.org",
    description: "Create invoices inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.send.org",
    description: "Send invoices and customer reminders inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.manage.org",
    description: "Manage invoice lifecycle state inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "invoice.approve.org",
    description: "Approve invoices inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payment.view.self",
    description: "View payment records linked to the actor's own account.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payment.record.org",
    description: "Record manual payments inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payment.collect.self",
    description: "Start a customer-authenticated payment flow for the actor's own invoice.",
    scope: "self",
    allowedVisibilities: internalAndCustomer,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payment.view.public_link",
    description: "View a payment page through a signed public link.",
    scope: "public_link",
    allowedVisibilities: internalCustomerAndPublicLink,
    sensitive: true,
    publicLinkAllowed: true
  }),
  definePermission({
    key: "payment.collect.public_link",
    description: "Start a public-link payment flow through a signed payment link.",
    scope: "public_link",
    allowedVisibilities: internalCustomerAndPublicLink,
    sensitive: true,
    publicLinkAllowed: true
  }),
  definePermission({
    key: "time.clock.self",
    description: "Record the actor's own clock events for attendance tracking.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "time.entry.view.self",
    description: "View the actor's own time entries.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "time.entry.view.org",
    description: "View time entries for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "timesheet.view.self",
    description: "View the actor's own weekly timesheets.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "timesheet.view.org",
    description: "View timesheets across the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "timesheet.submit.self",
    description: "Submit the actor's own timesheet for review.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "timesheet.review.org",
    description: "Approve or reject employee timesheets inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.profile.view.self",
    description: "View the actor's own payroll profile summary.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.profile.view.org",
    description: "View payroll profile summaries for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.profile.manage.org",
    description: "Create and update employee payroll provider profiles inside the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.document.view.self",
    description: "View the actor's own payroll provider documents.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.document.view.org",
    description: "View payroll provider documents across the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.run.view.self",
    description: "View payroll run history linked to the actor's own pay records.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.run.view.org",
    description: "View payroll run history across the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.export.org",
    description: "Export approved time into the embedded payroll provider.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.run.manage.org",
    description: "Sync payroll run status with the embedded payroll provider.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.labor_cost.view.org",
    description: "View payroll-derived labor cost allocations by project.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.view.self",
    description: "View the actor's own payroll and time records.",
    scope: "self",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "payroll.view.org",
    description: "View payroll records for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.job_post.view.all",
    description: "View job postings that are visible to the actor, including published career postings.",
    scope: "all",
    allowedVisibilities: internalAndPublicLink,
    sensitive: false,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.job_post.manage.org",
    description: "Create, edit, publish, and archive job postings in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.profile.view.self",
    description: "View the actor's own applicant profile.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.view.self",
    description: "View the actor's own hiring application records.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.update.self",
    description: "Update the actor's own draft hiring application before submission.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.submit.self",
    description: "Submit the actor's own draft hiring application.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.withdraw.self",
    description: "Withdraw the actor's own submitted hiring application.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.view.org",
    description: "View hiring applications in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.review.org",
    description: "Review applications and add internal hiring notes in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.application.status.manage.org",
    description: "Move hiring applications through review, interview, offer, reject, and withdraw states in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.note.manage.org",
    description: "Create and review internal-only hiring notes in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.document.upload.self",
    description: "Upload the actor's own applicant documents such as resumes and certifications.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.view.self",
    description: "View the actor's own interview schedule and requests.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.respond.self",
    description: "Respond to the actor's own interview request.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.view.org",
    description: "View interview schedules across the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.view.assigned",
    description: "View interview schedules only when explicitly assigned as an interviewer.",
    scope: "assigned",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.schedule.org",
    description: "Schedule, reschedule, and cancel interviews in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.feedback.submit.assigned",
    description: "Submit interview feedback only for interviews assigned to the actor.",
    scope: "assigned",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.interview.feedback.view.org",
    description: "View interview feedback for the actor's organization.",
    scope: "org",
    allowedVisibilities: internalOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.offer.view.self",
    description: "View the actor's own sent offer and onboarding status.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.offer.manage.org",
    description: "Create, send, withdraw, and review offers in the actor's organization.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.onboarding.view.self",
    description: "View the actor's own onboarding checklist after offer acceptance or conversion.",
    scope: "self",
    allowedVisibilities: applicantOnly,
    sensitive: true,
    publicLinkAllowed: false
  }),
  definePermission({
    key: "hiring.convert.org",
    description: "Convert an accepted applicant into an employee while preserving hiring history.",
    scope: "org",
    allowedVisibilities: internalAndApplicant,
    sensitive: true,
    publicLinkAllowed: false
  })
] as const;

export const PERMISSIONS_BY_KEY = new Map(
  PERMISSION_REGISTRY.map((definition) => [definition.key, definition])
);

export const ROLE_DEFAULT_GRANTS: Record<RoleKey, readonly PermissionKey[] | readonly ["*"]> = {
  owner: ["*"],
  administrator: PERMISSION_REGISTRY.map((definition) => definition.key),
  developer: ["security.permission.view.all", "notification.view.self"],
  employee: [
    "project.view.assigned",
    "project.progress.create.assigned",
    "document.view.assigned",
    "document.upload.assigned",
    "document.version.upload.assigned",
    "expense.view.self",
    "expense.create.self",
    "time.clock.self",
    "time.entry.view.self",
    "timesheet.view.self",
    "timesheet.submit.self",
    "payroll.profile.view.self",
    "payroll.document.view.self",
    "payroll.run.view.self",
    "payroll.view.self",
    "notification.view.self"
  ],
  applicant: [
    "hiring.job_post.view.all",
    "hiring.profile.view.self",
    "hiring.application.view.self",
    "hiring.application.update.self",
    "hiring.application.submit.self",
    "hiring.application.withdraw.self",
    "hiring.document.upload.self",
    "hiring.interview.view.self",
    "hiring.interview.respond.self",
    "hiring.offer.view.self",
    "hiring.onboarding.view.self",
    "notification.view.self"
  ],
  customer: [
    "project.view.self",
    "project.change_request.create.self",
    "project.change_order.approve.self",
    "document.view.self",
    "document.upload.self",
    "document.version.upload.self",
    "invoice.view.self",
    "payment.view.self",
    "payment.collect.self",
    "message.view.self",
    "message.reply.self",
    "notification.view.self"
  ],
  subcontractor: [
    "project.view.assigned",
    "project.progress.create.assigned",
    "document.view.assigned",
    "document.upload.assigned",
    "document.version.upload.assigned",
    "message.view.self",
    "message.reply.self",
    "notification.view.self"
  ],
  supercontractor: [
    "project.view.partner",
    "project.progress.create.partner",
    "document.view.partner",
    "document.upload.partner",
    "document.version.upload.partner",
    "message.view.self",
    "message.reply.self",
    "notification.view.self"
  ]
};

export function getPermissionDefinition(permissionKey: PermissionKey): PermissionDefinition | undefined {
  return PERMISSIONS_BY_KEY.get(permissionKey);
}

export function isKnownPermission(permissionKey: PermissionKey): boolean {
  return PERMISSIONS_BY_KEY.has(permissionKey);
}
