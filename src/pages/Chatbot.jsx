import React from "react";
import AppChatbot from "../components/chatbot/AppChatbot";

export default function Chatbot() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:px-8 lg:pt-7">
      <AppChatbot />
    </div>
  );
}