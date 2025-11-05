import React from "react";

export default function ChatMessage({ message }){
  if(message.role === "user"){
    return (
      <div className="msg user" style={{justifyContent:"flex-end"}}>
        <div className="bubble">{message.text}</div>
      </div>
    );
  }

  // AI message - we render steps if available as an ordered list inside a single bubble
  if(message.steps && message.steps.length){
    return (
      <div className="msg ai">
        <div className="bubble">
          <ol>
            {message.steps.map((s, idx)=> <li key={idx}>{s}</li>)}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="msg ai">
      <div className="bubble">{message.text}</div>
    </div>
  );
}