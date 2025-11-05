import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./authcontext";

/*
 Demo credentials (hard-coded for presentation)
 Technician: id = tech123  password = 1234
 Expert:     id = expert123 password = 1234
*/

const CREDENTIALS = {
  technician: { id: "tech123", password: "1234" },
  expert: { id: "expert123", password: "1234" },
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function LoginPage(){
  const { login } = useAuth();
  const q = useQuery();
  const role = q.get("role") || "technician";
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  function attemptLogin(e){
    e?.preventDefault();
    const creds = CREDENTIALS[role];
    if (!creds) return;
    if (id === creds.id && password === creds.password) {
      
      // Store user ID and role in context
      login(id, role); 
      
      if (role === "technician") nav("/technician");
      else nav("/expert");
      return;
    }
    setErr("Invalid credentials for demo");
  }

  return (
    <>
      <div className="header">
        <div className="title">🚀 Elevator Support Assistant</div>
        <div style={{display:"flex", gap:12}}>
          <button className="btn outline" onClick={() => { document.body.classList.toggle("light"); }}>
            Toggle Light/Dark
          </button>
        </div>
      </div>

      <div style={{padding:30}}>
        <div className="center-card">
          <h3 style={{marginTop:0}}>Login — {role}</h3>
          <form onSubmit={attemptLogin} className="login-form">
            <input placeholder="ID" value={id} onChange={e=>setId(e.target.value)} />
            <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
            <div style={{display:"flex", gap:10, marginTop:10}}>
              <button type="submit" className="btn">Login</button>
              <button type="button" className="btn outline" onClick={()=>{ setId(""); setPassword(""); setErr(""); }}>Clear</button>
            </div>
            {err && <div style={{color:"#ff7b7b", marginTop:10}}>{err}</div>}
            <div style={{marginTop:12}} className="small">
              For demo: <br />
              Technician — id: <b>tech123</b>, password: <b>1234</b><br />
              Expert — id: <b>expert123</b>, password: <b>1234</b>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}