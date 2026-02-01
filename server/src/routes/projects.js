import { requireRole } from "../rbac.js";

const projects = [
  { id: "proj_1", name: "Sample Kitchen Remodel", description: "Cabinet and flooring update", status: "pending_approval" },
  { id: "proj_2", name: "Office Rewire", description: "Electrical upgrade", status: "active" }
];

export default async function projectRoutes(app) {
  app.get("/", { preHandler: [app.authenticate, requireRole(["Owner", "Administrator", "Developer", "Employee"]) ] }, async () => {
    return { projects };
  });

  app.post("/", { preHandler: [app.authenticate, requireRole(["Owner", "Administrator", "Employee"]) ] }, async (request) => {
    const { name, description } = request.body || {};
    const project = {
      id: `proj_${projects.length + 1}`,
      name: name || "Untitled Project",
      description: description || "",
      status: "pending_approval"
    };
    projects.push(project);
    return project;
  });
}
