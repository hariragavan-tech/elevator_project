import React, { useState, useEffect } from "react";
import ChatPanel from "./ChatPanel";
import previousLogs from "./previousLogs";

export default function TechnicianPage(){
  // load or create a per-technician history key (for demo simple)
  const TECH_KEY = "chatHistory_technician";
  const [histories, setHistories] = useState(()=>{
    const raw = localStorage.getItem(TECH_KEY);
    return raw ? JSON.parse(raw) : [...previousLogs]; // previousLogs contains example items
  });
  const [active, setActive] = useState(histories.length ? histories[0] : null);

  useEffect(()=>{
    localStorage.setItem(TECH_KEY, JSON.stringify(histories));
  },[histories]);

  const openHistory = (h) => {
    setActive(h);
  };

  // When ChatPanel saves a new conversation it calls onSaveConversation
  const onSaveConversation = (conv) => {
    const newItem = {
      id: Date.now(),
      title: conv.title || (conv.messages[0]?.text?.slice(0,30) || "New conversation"),
      messages: conv.messages
    };
    setHistories(prev => [newItem, ...prev]);
    setActive(newItem);
  };

  return (
    <div className="page-grid">
      <aside className="left-col">
        <div className="col-header">
          <h3>Previous Chats</h3>
        </div>
        <div className="history-list">
          {histories.map(h=>(
            <div key={h.id || h.title} className="history-item" onClick={()=>openHistory(h)}>
              <div className="history-title">{h.title}</div>
              <div className="history-sub">{h.messages ? h.messages.slice(-1)[0]?.text : ""}</div>
            </div>
          ))}
        </div>
      </aside>

      <section className="right-col">
        <ChatPanel initialConversation={active} onSave={onSaveConversation} />
      </section>
    </div>
  );
}
