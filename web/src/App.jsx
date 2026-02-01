import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:3000";

function loadToken() {
  return localStorage.getItem("bms_token") || "";
}

function saveToken(token) {
  if (token) {
    localStorage.setItem("bms_token", token);
  } else {
    localStorage.removeItem("bms_token");
  }
}

export default function App() {
  const [token, setToken] = useState(loadToken());
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [email, setEmail] = useState("owner@bms.local");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [newProject, setNewProject] = useState({ name: "", description: "" });

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/auth/me`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));

    fetch(`${API_BASE}/projects`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, [token]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      setError("Login failed. Check credentials.");
      return;
    }

    const data = await res.json();
    saveToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  }

  function handleLogout() {
    saveToken("");
    setToken("");
    setUser(null);
    setProjects([]);
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    setError("");

    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(newProject)
    });

    if (!res.ok) {
      setError("Could not create project.");
      return;
    }

    const created = await res.json();
    setProjects((prev) => [...prev, created]);
    setNewProject({ name: "", description: "" });
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Business Management System</h1>
          <p>MVP login + projects flow.</p>
        </div>
        {user ? (
          <div className="user">
            <span>{user.name} ({user.role})</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : null}
      </header>

      {!token ? (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={handleLogin} className="form">
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="submit">Sign in</button>
          </form>
          <p className="hint">Demo users: owner@bms.local / admin@bms.local / employee@bms.local (password: demo123)</p>
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : (
        <section className="grid">
          <div className="card">
            <h2>Projects</h2>
            {projects.length === 0 ? (
              <p>No projects yet.</p>
            ) : (
              <ul className="list">
                {projects.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <span className={`status ${p.status}`}>{p.status}</span>
                    <p>{p.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>Create Project</h2>
            <form onSubmit={handleCreateProject} className="form">
              <label>
                Name
                <input
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </label>
              <button type="submit">Create</button>
            </form>
            {error ? <p className="error">{error}</p> : null}
          </div>
        </section>
      )}
    </div>
  );
}
