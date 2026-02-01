import { requireRole } from "../rbac.js";

const demoUsers = [
  { id: "u_owner", email: "owner@bms.local", password: "demo123", role: "Owner", name: "Owner" },
  { id: "u_admin", email: "admin@bms.local", password: "demo123", role: "Administrator", name: "Admin" },
  { id: "u_employee", email: "employee@bms.local", password: "demo123", role: "Employee", name: "Employee" }
];

export default async function authRoutes(app) {
  app.post("/login", async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.code(400).send({ error: "Missing credentials" });
    }

    const user = demoUsers.find((u) => u.email === email && u.password === password);
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name });
    return { access_token: token, user: { id: user.id, email: user.email, role: user.role, name: user.name } };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    return { user: request.user };
  });

  app.post("/logout", async () => ({ ok: true }));
}
