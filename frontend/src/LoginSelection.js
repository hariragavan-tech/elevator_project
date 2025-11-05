import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginSelection(){
  const nav = useNavigate();
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
          <h2>Who are you?</h2>
          <p className="small">Choose your role for the demo.</p>
          <div style={{display:"flex", gap:12, marginTop:20}}>
            <button className="btn" onClick={()=>nav("/login?role=technician")}>Technician</button>
            <button className="btn outline" onClick={()=>nav("/login?role=expert")}>Expert</button>
          </div>
        </div>
      </div>
    </>
  );
}